/**
 * components/DatasetManager.tsx
 * ------------------------------
 * Dataset management panel – upload, browse, and select datasets.
 *
 * Real functionality:
 *  - Upload CSV / image-zip / text files to the Plexus backend.
 *  - Immediately returns a stub record; profiles in background.
 *  - Polls /api/datasets/{id}/status until profiling completes.
 *  - Shows progress bar + message during profiling.
 *  - Unlocks "Use" button and shows preprocessing suggestions when ready.
 *  - Run the Data Agent on a selected dataset.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Progress,
  Spinner,
  Tab,
  Tabs,
  Tooltip,
} from "@heroui/react";
import {
  Upload,
  Database,
  FileText,
  Image,
  Trash2,
  Search,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Bot,
  Eye,
  Sparkles,
  Clock,
} from "lucide-react";

import {
  uploadDataset,
  listDatasets,
  deleteDataset,
  runDataAgent,
  getDatasetStatus,
  applyPreprocessing,
  updateDatasetAPI,
  type DatasetRecord,
  type PreprocessingSuggestion,
} from "@/lib/api";
import { usePlexusStore } from "@/store/plexusStore";

// ---- Props ----
interface DatasetManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---- Helpers ----
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

function typeIcon(type: string) {
  if (type === "image_folder") return <Image className="w-4 h-4" />;
  if (type === "text") return <FileText className="w-4 h-4" />;

  return <Database className="w-4 h-4" />;
}

const SUGGESTION_COLORS: Record<
  string,
  "primary" | "secondary" | "warning" | "success" | "default"
> = {
  dropNulls: "warning",
  normalize: "primary",
  oneHotEncode: "secondary",
  embedEncode: "secondary",
  scale: "success",
};

// ---- Component ----
const DatasetManager: React.FC<DatasetManagerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("my");
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agentRunning, setAgentRunning] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [previewDataset, setPreviewDataset] = useState<DatasetRecord | null>(
    null,
  );
  const [agentResult, setAgentResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [applyingPreprocess, setApplyingPreprocess] = useState<string | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Refs to track active polling intervals per dataset id
  const pollingRefs = useRef<Record<string, ReturnType<typeof setInterval>>>(
    {},
  );

  const selectedDatasetId = usePlexusStore((s) => s.selectedDatasetId);
  const selectDataset = usePlexusStore((s) => s.selectDataset);
  const addDataset = usePlexusStore((s) => s.addDataset);
  const removeDatasetStore = usePlexusStore((s) => s.removeDataset);
  const addLog = usePlexusStore((s) => s.addLog);
  const addAgentNotification = usePlexusStore((s) => s.addAgentNotification);
  const datasetProgress = usePlexusStore((s) => s.datasetProgress);
  const setDatasetProgress = usePlexusStore((s) => s.setDatasetProgress);
  const clearDatasetProgress = usePlexusStore((s) => s.clearDatasetProgress);
  const patchDataset = usePlexusStore((s) => s.patchDataset);
  const setDatasetIntelligence = usePlexusStore((s) => s.setDatasetIntelligence);

  // Stop all polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRefs.current).forEach(clearInterval);
    };
  }, []);

  const stopPolling = useCallback((id: string) => {
    if (pollingRefs.current[id]) {
      clearInterval(pollingRefs.current[id]);
      delete pollingRefs.current[id];
    }
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      // Avoid double-polling
      if (pollingRefs.current[id]) return;

      pollingRefs.current[id] = setInterval(async () => {
        try {
          const status = await getDatasetStatus(id);
          // Wait until BOTH profiling AND auto-cleaning (if applicable) are done
          const isDone =
            status.done &&
            (!status.cleaning_status ||
              status.cleaning_status.status === "done" ||
              status.cleaning_status.status === "error");

          setDatasetProgress(id, {
            progress: status.progress,
            message: status.message,
            done: isDone,
            error: status.error,
            preprocessing_suggestions: status.preprocessing_suggestions,
            cleaning_status: status.cleaning_status,
          });

          if (isDone || status.error) {
            stopPolling(id);

            if (isDone && !status.error) {
              // Refresh the dataset record with full metadata
              setDatasets((prev) =>
                prev.map((d) =>
                  d.id === id
                    ? {
                        ...d,
                        status: "ready",
                        columns: status.columns,
                        row_count: status.row_count,
                        preprocessing_suggestions:
                          status.preprocessing_suggestions,
                        cleaning_status: status.cleaning_status,
                        architect_status: status.architect_status,
                      }
                    : d,
                ),
              );
              // Merge into the Zustand store (non-destructive patch)
              const patch = {
                status: "ready" as const,
                columns: status.columns,
                row_count: status.row_count,
                preprocessing_suggestions: status.preprocessing_suggestions,
                cleaning_status: status.cleaning_status,
                architect_status: status.architect_status,
                dataset_intelligence: status.dataset_intelligence,
              };

              // Store intelligence in dedicated map for canvas validation
              if (status.dataset_intelligence) {
                setDatasetIntelligence(id, status.dataset_intelligence);
              }

              // Persist to backend database
              updateDatasetAPI(id, patch).catch((e) => console.error("Failed to persist dataset status:", e));

              patchDataset(id, patch);
              addLog(
                "success",
                `Dataset profiling complete. ${status.columns.length} columns, ${status.row_count.toLocaleString()} rows, ${status.preprocessing_suggestions.length} suggestion(s).`,
                "Dataset",
              );
              if (status.preprocessing_suggestions.length > 0) {
                addAgentNotification(
                  "Data Agent",
                  "suggestion",
                  `${status.preprocessing_suggestions.length} preprocessing suggestion(s) ready for dataset ${id}.`,
                  status.preprocessing_suggestions,
                );
              }
            } else if (status.error) {
              setDatasets((prev) =>
                prev.map((d) => (d.id === id ? { ...d, status: "error" } : d)),
              );
              patchDataset(id, { status: "error" });
              addLog(
                "error",
                `Dataset profiling failed: ${status.error}`,
                "Dataset",
              );
            }
          }
        } catch {
          // Network blip — leave polling running, it will retry
        }
      }, 900);
    },
    [
      setDatasetProgress,
      stopPolling,
      patchDataset,
      addLog,
      addAgentNotification,
    ],
  );

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await listDatasets();

      setDatasets(list);
      list.forEach((d) => {
        addDataset(d);
        // Resume polling for any datasets still marked as profiling
        if ((d as DatasetRecord & { status?: string }).status === "profiling") {
          startPolling(d.id);
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      setErrorMsg(`Could not reach backend: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [addDataset, startPolling]);

  useEffect(() => {
    if (isOpen) loadDatasets();
  }, [isOpen, loadDatasets]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setErrorMsg(null);
      try {
        const record = await uploadDataset(file);

        // Backend returns stub with status:"profiling" immediately
        addDataset(record);
        setDatasets((prev) => [
          ...prev.filter((d) => d.id !== record.id),
          record,
        ]);
        addLog(
          "info",
          `Dataset "${record.name}" uploaded (${formatBytes(record.size_bytes)}). Profiling in background…`,
          "Dataset",
        );
        // Seed initial progress state
        setDatasetProgress(record.id, {
          progress: 5,
          message: "Dataset received, profiling…",
          done: false,
          error: null,
          preprocessing_suggestions: [],
        });
        startPolling(record.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);

        setErrorMsg(`Upload failed: ${msg}`);
        addLog("error", `Dataset upload failed: ${msg}`, "Dataset");
      } finally {
        setUploading(false);
      }
    },
    [addDataset, addLog, setDatasetProgress, startPolling],
  );

  const handleDrop = useCallback(
    (evt: React.DragEvent) => {
      evt.preventDefault();
      const file = evt.dataTransfer.files[0];

      if (file) handleFileUpload(file);
    },
    [handleFileUpload],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      stopPolling(id);
      clearDatasetProgress(id);
      try {
        await deleteDataset(id);
        setDatasets((prev) => prev.filter((d) => d.id !== id));
        removeDatasetStore(id);
        addLog("info", `Dataset ${id} deleted.`, "Dataset");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);

        addLog("error", `Delete failed: ${msg}`, "Dataset");
      }
    },
    [removeDatasetStore, addLog, stopPolling, clearDatasetProgress],
  );

  const handleRunDataAgent = useCallback(
    async (datasetId: string) => {
      setAgentRunning(datasetId);
      setAgentResult(null);
      setActiveTab("agent");
      addLog("agent", "Running Data Agent…", "DataAgent");
      try {
        const result = await runDataAgent(datasetId);

        setAgentResult(result as unknown as Record<string, unknown>);
        addLog(
          "success",
          `Data Agent completed. ${result.steps.length} cleaning step(s) found.`,
          "DataAgent",
        );
        addAgentNotification(
          "Data Agent",
          "suggestion",
          `${result.steps.length} preprocessing step(s) suggested for dataset ${datasetId}.`,
          result,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);

        addLog("error", `Data Agent failed: ${msg}`, "DataAgent");
        addAgentNotification("Data Agent", "error", msg);
      } finally {
        setAgentRunning(null);
      }
    },
    [addLog, addAgentNotification],
  );

  const handleApplyPreprocessing = useCallback(
    async (datasetId: string) => {
      setApplyingPreprocess(datasetId);
      addLog(
        "info",
        `Applying generated cleaning code to dataset...`,
        "DataAgent",
      );
      try {
        const newDataset = await applyPreprocessing(datasetId);

        addDataset(newDataset);
        setDatasets((prev) => [newDataset, ...prev]);
        addLog(
          "success",
          `Preprocessing applied. New dataset created: ${newDataset.name}`,
          "DataAgent",
        );
        // Start polling the new dataset if it needs profiling
        if (newDataset.status === "profiling") {
          startPolling(newDataset.id);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);

        addLog("error", `Failed to apply preprocessing: ${msg}`, "DataAgent");
      } finally {
        setApplyingPreprocess(null);
      }
    },
    [addLog, addDataset, startPolling],
  );

  const filtered = datasets.filter(
    (d) => !search || d.name.toLowerCase().includes(search.toLowerCase()),
  );

  // ---- Dataset card renderer ----
  const renderDatasetCard = (d: DatasetRecord) => {
    const isSelected = d.id === selectedDatasetId;
    const progress = datasetProgress[d.id];
    const isProfiling = progress && !progress.done && !progress.error;
    const profilingError = progress?.error;
    const isReady = !isProfiling && !profilingError;
    const suggestions: PreprocessingSuggestion[] =
      (
        d as DatasetRecord & {
          preprocessing_suggestions?: PreprocessingSuggestion[];
        }
      ).preprocessing_suggestions ??
      progress?.preprocessing_suggestions ??
      [];

    const cleaningStatus = progress?.cleaning_status;
    const isAutoCleaning =
      cleaningStatus?.status === "running" ||
      cleaningStatus?.status === "pending";
    const autoCleanDone = cleaningStatus?.status === "done";

    return (
      <Card
        key={d.id}
        className={`border transition-all ${
          isSelected
            ? "border-primary bg-primary-50 dark:bg-primary-900/20"
            : profilingError
              ? "border-danger-200"
              : "border-default-200"
        }`}
      >
        <CardBody className="p-3 space-y-2">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-default-500">{typeIcon(d.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{d.name}</span>
                <Chip size="sm" variant="flat">
                  {d.type}
                </Chip>
                {isSelected && (
                  <Chip color="primary" size="sm" variant="flat">
                    selected
                  </Chip>
                )}
                {isProfiling && (
                  <Chip
                    color="warning"
                    size="sm"
                    startContent={<Clock className="w-3 h-3" />}
                    variant="flat"
                  >
                    profiling
                  </Chip>
                )}
                {profilingError && (
                  <Chip color="danger" size="sm" variant="flat">
                    error
                  </Chip>
                )}
                {d.is_cleaned_duplicate && (
                  <Chip color="success" size="sm" startContent={<Sparkles className="w-3 h-3" />} variant="flat">
                    cleaned
                  </Chip>
                )}
                {d.is_graph_processed && (
                  <Chip color="primary" size="sm" startContent={<Sparkles className="w-3 h-3" />} variant="flat">
                    graph-processed
                  </Chip>
                )}
                {d.dataset_intelligence && (
                  <Tooltip content={`Domain: ${d.dataset_intelligence.domain} | Task: ${d.dataset_intelligence.task_type}`} size="sm">
                    <Chip color="secondary" size="sm" variant="dot">AI ✓</Chip>
                  </Tooltip>
                )}
              </div>

              {/* Progress bar during profiling */}
              {(isProfiling || isAutoCleaning) && (
                <div className="space-y-1">
                  <Progress
                    aria-label="Processing progress"
                    className="max-w-full"
                    color={
                      isAutoCleaning && progress.progress === 100
                        ? "secondary"
                        : "warning"
                    }
                    isIndeterminate={
                      isAutoCleaning && progress.progress === 100
                    }
                    size="sm"
                    value={
                      isAutoCleaning && progress.progress === 100
                        ? undefined
                        : progress.progress
                    } // Indeterminate during auto-clean
                  />
                  <p className="text-xs text-default-500">
                    {isAutoCleaning && progress.progress === 100
                      ? "Generating AI cleaning script…"
                      : progress.message}
                  </p>
                </div>
              )}

              {/* Error state */}
              {profilingError && (
                <p className="text-xs text-danger">{profilingError}</p>
              )}

              {/* Normal metadata (shown when ready) */}
              {isReady && (
                <div className="flex items-center gap-3 text-xs text-default-500">
                  <span>{formatBytes(d.size_bytes)}</span>
                  {d.row_count > 0 && (
                    <span>{d.row_count.toLocaleString()} rows</span>
                  )}
                  {d.columns.length > 0 && <span>{d.columns.length} cols</span>}
                  <span>{new Date(d.uploaded_at).toLocaleDateString()}</span>
                </div>
              )}

              {/* Static preprocessing suggestions */}
              {isReady && suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <Sparkles className="w-3 h-3 text-default-400 mt-0.5" />
                  {suggestions.map((s, i) => (
                    <Tooltip key={i} content={s.reason} size="sm">
                      <Chip
                        color={SUGGESTION_COLORS[s.node_type] ?? "default"}
                        size="sm"
                        variant="flat"
                      >
                        {s.node_type}
                      </Chip>
                    </Tooltip>
                  ))}
                </div>
              )}

              {/* Manual preprocessing fallback — shown when AI cleaning fails */}
              {isReady &&
                cleaningStatus?.status === "error" &&
                d.type === "csv" && (
                  <div className="mt-2 p-2 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="w-3 h-3 text-warning" />
                      <span className="text-xs font-medium text-warning-700 dark:text-warning-400">
                        AI preprocessing failed — try manual options:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Chip
                        className="cursor-pointer hover:opacity-80"
                        color="warning"
                        size="sm"
                        variant="flat"
                        onClick={() => {
                          addLog(
                            "info",
                            "Applying manual: Drop NaN rows",
                            "Manual",
                          );
                        }}
                      >
                        Drop NaN
                      </Chip>
                      <Chip
                        className="cursor-pointer hover:opacity-80"
                        color="secondary"
                        size="sm"
                        variant="flat"
                        onClick={() => {
                          addLog(
                            "info",
                            "Applying manual: One-Hot Encode",
                            "Manual",
                          );
                        }}
                      >
                        One-Hot Encode
                      </Chip>
                      <Chip
                        className="cursor-pointer hover:opacity-80"
                        color="success"
                        size="sm"
                        variant="flat"
                        onClick={() => {
                          addLog(
                            "info",
                            "Applying manual: Standard Scale",
                            "Manual",
                          );
                        }}
                      >
                        Standard Scale
                      </Chip>
                    </div>
                  </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {isReady && (
                <Button
                  isIconOnly
                  size="sm"
                  title="Preview"
                  variant="light"
                  onPress={() => setPreviewDataset(d)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              {isReady && autoCleanDone && (
                <Button
                  color="secondary"
                  isLoading={applyingPreprocess === d.id}
                  size="sm"
                  startContent={
                    applyingPreprocess === d.id ? undefined : (
                      <Sparkles className="w-4 h-4" />
                    )
                  }
                  variant="flat"
                  onPress={() => handleApplyPreprocessing(d.id)}
                >
                  AI Preprocess
                </Button>
              )}
              {isReady && d.type === "csv" && !autoCleanDone && (
                <Button
                  isIconOnly
                  isLoading={agentRunning === d.id}
                  size="sm"
                  title="Run Data Agent"
                  variant="light"
                  onPress={() => handleRunDataAgent(d.id)}
                >
                  <Bot className="w-4 h-4" />
                </Button>
              )}
              <Tooltip
                content={
                  isProfiling ? "Dataset is still profiling…" : undefined
                }
                isDisabled={!isProfiling}
              >
                <Button
                  color={isSelected ? "primary" : "default"}
                  isDisabled={isProfiling || !!profilingError}
                  size="sm"
                  variant={isSelected ? "solid" : "flat"}
                  onPress={() => selectDataset(isSelected ? null : d.id)}
                >
                  {isSelected ? <CheckCircle className="w-4 h-4" /> : "Use"}
                </Button>
              </Tooltip>
              <Button
                isIconOnly
                color="danger"
                size="sm"
                title="Delete"
                variant="light"
                onPress={() => handleDelete(d.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="3xl" onClose={onClose}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Dataset Manager
        </ModalHeader>
        <ModalBody>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(k) => setActiveTab(k as string)}
          >
            {/* ---- My Datasets ---- */}
            <Tab key="my" title="My Datasets">
              <div className="space-y-4 pt-2">
                {/* Upload drop zone */}
                <div
                  className="border-2 border-dashed border-default-300 rounded-xl p-6 text-center transition-colors hover:border-primary cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    accept=".csv,.txt,.text,.zip"
                    className="hidden"
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];

                      if (f) handleFileUpload(f);
                      e.target.value = "";
                    }}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Spinner size="sm" />
                      <p className="text-sm text-default-600">Uploading…</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-default-400 mx-auto mb-2" />
                      <p className="text-sm font-medium">
                        Drop a file here or click to upload
                      </p>
                      <p className="text-xs text-default-500 mt-1">
                        Supported: CSV, TXT, ZIP (image folder)
                      </p>
                    </>
                  )}
                </div>

                {errorMsg && (
                  <Card className="border border-danger-200 bg-danger-50 dark:bg-danger-900/20">
                    <CardBody className="p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                      <p className="text-sm text-danger">{errorMsg}</p>
                    </CardBody>
                  </Card>
                )}

                {/* Search + refresh */}
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Search datasets…"
                    startContent={<Search className="w-4 h-4" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Button
                    isIconOnly
                    isLoading={loading}
                    title="Refresh"
                    variant="flat"
                    onPress={loadDatasets}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Dataset list */}
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-default-500 py-8">
                    {datasets.length === 0
                      ? "No datasets yet. Upload one above."
                      : "No datasets match your search."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(renderDatasetCard)}
                  </div>
                )}
              </div>
            </Tab>

            {/* ---- Agent Results tab ---- */}
            <Tab key="agent" title="Data Agent">
              <div className="pt-2">
                {agentRunning && (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Spinner size="sm" />
                    <p className="text-sm text-default-600">
                      Data Agent analysing dataset…
                    </p>
                  </div>
                )}
                {!agentRunning && agentResult ? (
                  <div className="space-y-4">
                    {/* Cleaning steps */}
                    {Array.isArray((agentResult as any).steps) && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">
                          Suggested Preprocessing Steps
                        </h4>
                        <div className="space-y-2">
                          {(agentResult as any).steps.map(
                            (step: Record<string, unknown>, i: number) => (
                              <Card key={i}>
                                <CardBody className="p-3">
                                  <div className="flex items-start gap-2">
                                    <Chip
                                      color="primary"
                                      size="sm"
                                      variant="flat"
                                    >
                                      {step.type as string}
                                    </Chip>
                                    <div className="text-xs">
                                      {(step.columns as string[])?.join(", ")}
                                      {typeof step.method === "string" &&
                                        step.method && (
                                          <span className="text-default-500">
                                            {" "}
                                            · {step.method}
                                          </span>
                                        )}
                                    </div>
                                  </div>
                                </CardBody>
                              </Card>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Validation result */}
                    {(agentResult as any).validation && (
                      <Card
                        className={`border ${
                          (agentResult as any).validation.passed
                            ? "border-success-200"
                            : "border-danger-200"
                        }`}
                      >
                        <CardBody className="p-3">
                          <div className="flex items-center gap-2">
                            {(agentResult as any).validation.passed ? (
                              <CheckCircle className="w-4 h-4 text-success" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-danger" />
                            )}
                            <span className="text-sm">
                              Code validation:{" "}
                              {(agentResult as any).validation.passed
                                ? "passed"
                                : (agentResult as any).validation.error}
                            </span>
                          </div>
                        </CardBody>
                      </Card>
                    )}

                    {/* Generated cleaning code */}
                    {(agentResult as any).code && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">
                          Generated Cleaning Function
                        </h4>
                        <pre className="bg-default-100 rounded-lg p-3 text-xs overflow-x-auto max-h-64 font-mono">
                          {(agentResult as any).code as string}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  !agentRunning && (
                    <p className="text-center text-default-500 py-12">
                      Select a CSV dataset and click the{" "}
                      <Bot className="w-4 h-4 inline" /> icon to run the Data
                      Agent. It will analyse your data and suggest a cleaning
                      pipeline.
                    </p>
                  )
                )}
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>

      {/* ---- Dataset Preview Modal ---- */}
      {previewDataset && (
        <Modal
          isOpen={!!previewDataset}
          scrollBehavior="inside"
          size="4xl"
          onClose={() => setPreviewDataset(null)}
        >
          <ModalContent>
            <ModalHeader>{previewDataset.name} – Preview</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-default-500">Type:</span>{" "}
                    {previewDataset.type}
                  </div>
                  <div>
                    <span className="text-default-500">Rows:</span>{" "}
                    {previewDataset.row_count.toLocaleString()}
                  </div>
                  <div>
                    <span className="text-default-500">Columns:</span>{" "}
                    {previewDataset.columns.length}
                  </div>
                </div>

                {previewDataset.type === "csv" &&
                  Array.isArray(previewDataset.preview) &&
                  previewDataset.preview.length > 0 && (
                    <div className="overflow-x-auto">
                      <h4 className="font-medium text-sm mb-2">
                        First {previewDataset.preview.length} rows
                      </h4>
                      <table className="text-xs border-collapse w-full">
                        <thead>
                          <tr>
                            {previewDataset.columns.map((col) => (
                              <th
                                key={col}
                                className="border border-default-200 bg-default-100 px-2 py-1 text-left font-medium"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            previewDataset.preview as Record<string, unknown>[]
                          ).map((row, i) => (
                            <tr key={i}>
                              {previewDataset.columns.map((col) => (
                                <td
                                  key={col}
                                  className="border border-default-100 px-2 py-1 max-w-xs truncate"
                                >
                                  {String(row[col] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {previewDataset.type === "csv" &&
                  Object.keys(previewDataset.stats ?? {}).length > 0 && (
                    <div className="overflow-x-auto">
                      <h4 className="font-medium text-sm mb-2">
                        Column Statistics
                      </h4>
                      <table className="text-xs border-collapse w-full">
                        <thead>
                          <tr>
                            {[
                              "Column",
                              "Type",
                              "Missing",
                              "Min",
                              "Max",
                              "Mean",
                              "Unique",
                            ].map((h) => (
                              <th
                                key={h}
                                className="border border-default-200 bg-default-100 px-2 py-1 text-left"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(previewDataset.stats ?? {}).map(
                            ([col, s]) => {
                              const stat = s as Record<string, unknown>;

                              return (
                                <tr key={col}>
                                  <td className="border border-default-100 px-2 py-1 font-medium">
                                    {col}
                                  </td>
                                  <td className="border border-default-100 px-2 py-1 text-default-500">
                                    {(stat.dtype as string) || "—"}
                                  </td>
                                  <td className="border border-default-100 px-2 py-1">
                                    {stat.missing_pct !== undefined
                                      ? `${stat.missing_pct}%`
                                      : "—"}
                                  </td>
                                  <td className="border border-default-100 px-2 py-1">
                                    {stat.min !== undefined
                                      ? Number(stat.min).toFixed(3)
                                      : "—"}
                                  </td>
                                  <td className="border border-default-100 px-2 py-1">
                                    {stat.max !== undefined
                                      ? Number(stat.max).toFixed(3)
                                      : "—"}
                                  </td>
                                  <td className="border border-default-100 px-2 py-1">
                                    {stat.mean !== undefined
                                      ? Number(stat.mean).toFixed(3)
                                      : "—"}
                                  </td>
                                  <td className="border border-default-100 px-2 py-1">
                                    {stat.unique !== undefined
                                      ? (stat.unique as number)
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setPreviewDataset(null)}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Modal>
  );
};

export default DatasetManager;
