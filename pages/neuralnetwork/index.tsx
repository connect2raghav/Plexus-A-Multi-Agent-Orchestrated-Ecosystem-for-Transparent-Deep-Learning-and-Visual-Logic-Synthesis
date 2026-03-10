import React, { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardBody, Chip, Tooltip } from "@heroui/react";
import {
  ActivitySquare,
  AlertCircle,
  CheckCircle2,
  Database,
  PlayCircle,
  Terminal,
  WifiOff,
} from "lucide-react";
import { useRouter } from "next/router";
import { Node, Edge } from "reactflow";

import ConsolePanel from "@/components/ConsolePanel";
import DatasetManager from "@/components/DatasetManager";
import EnhancedSidebar from "@/components/EnhancedSidebar";
import FlowCanvasWrapper from "@/components/FlowCanvasWrapper";
import TrainingPanel from "@/components/TrainingPanel";
import { checkHealth, listDatasets, startTraining } from "@/lib/api";
import { usePlexusStore } from "@/store/plexusStore";

// Small floating agent notifications
function AgentBadge() {
  // Select the whole array (stable reference) and filter *outside* the selector.
  // Filtering inside a selector creates a new array on every call, causing
  // useSyncExternalStore to think the state changed → infinite re-renders.
  const allNotifications = usePlexusStore((s) => s.agentNotifications);
  const notifications = allNotifications.filter((n) => !n.dismissed);
  const dismiss = usePlexusStore((s) => s.dismissNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 space-y-2 max-w-xs pointer-events-none">
      {notifications.slice(-3).map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto bg-background border border-primary-200 rounded-xl shadow-lg p-3 flex items-start gap-2 text-xs"
        >
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary">{n.agentName}</p>
            <p className="text-default-600 line-clamp-2">{n.message}</p>
          </div>
          <button
            className="text-default-400 hover:text-default-700 text-sm font-bold"
            onClick={() => dismiss(n.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default function NeuralNetworkPage() {
  const [templateType, setTemplateType] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [canvasNodes, setCanvasNodes] = useState<Node[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<Edge[]>([]);
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Store selectors
  const backendOnline = usePlexusStore((s) => s.backendOnline);
  const setBackendOnline = usePlexusStore((s) => s.setBackendOnline);
  const consolePanelOpen = usePlexusStore((s) => s.consolePanelOpen);
  const setConsolePanelOpen = usePlexusStore((s) => s.setConsolePanelOpen);
  const trainingPanelOpen = usePlexusStore((s) => s.trainingPanelOpen);
  const setTrainingPanelOpen = usePlexusStore((s) => s.setTrainingPanelOpen);
  const addLog = usePlexusStore((s) => s.addLog);
  const setDatasetsStore = usePlexusStore((s) => s.setDatasets);
  const selectedDatasetId = usePlexusStore((s) => s.selectedDatasetId);
  const trainingStatus = usePlexusStore((s) => s.training.status);
  const startJob = usePlexusStore((s) => s.startJob);
  const logs = usePlexusStore((s) => s.logs);
  const agentNotifications = usePlexusStore((s) => s.agentNotifications);

  const unreadErrors = logs.filter((l) => l.level === "error").length;
  const pendingNotifications = agentNotifications.filter((n) => !n.dismissed).length;
  const isTraining = trainingStatus === "running" || trainingStatus === "queued";

  // Parse URL query on mount
  useEffect(() => {
    if (router.query.template) setTemplateType(router.query.template as string);
    if (router.query.project) setProjectId(router.query.project as string);
  }, [router.query]);

  // Poll backend health every 10 s
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await checkHealth()
        .then(() => true)
        .catch(() => false);
      if (!mounted) return;
      setBackendOnline(ok);
      if (ok) {
        listDatasets()
          .then((ds) => {
            if (mounted) {
              setDatasetsStore(ds);
              if (ds.length > 0 && !selectedDatasetId) {
                addLog("info", `${ds.length} dataset(s) available.`, "System");
              }
            }
          })
          .catch(() => {});
      }
    };
    check();
    const interval = setInterval(check, 10_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [setBackendOnline, addLog, setDatasetsStore, selectedDatasetId]);

  // Start training handler
  const handleTrain = useCallback(async () => {
    if (!backendOnline) {
      addLog("error", "Backend is offline. Cannot start training.", "Training");
      return;
    }
    if (!selectedDatasetId) {
      addLog("warning", "Select a dataset first.", "Training");
      setDatasetModalOpen(true);
      return;
    }
    if (canvasNodes.length < 2) {
      addLog("warning", "Add at least 2 nodes to the canvas before training.", "Training");
      return;
    }
    try {
      addLog("info", "Submitting training job…", "Training");
      const job = await startTraining({
        nodes: canvasNodes as unknown[],
        edges: canvasEdges as unknown[],
        datasetId: selectedDatasetId,
        epochs: 20,
        batchSize: 32,
      });
      startJob(job.job_id, 20);
      addLog("success", `Training job started (ID: ${job.job_id}).`, "Training");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog("error", `Failed to start training: ${msg}`, "Training");
    }
  }, [backendOnline, selectedDatasetId, canvasNodes, canvasEdges, addLog, startJob]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Left sidebar */}
      <EnhancedSidebar />

      {/* Main canvas area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top status bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-default-100 bg-background/80 backdrop-blur-sm text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-default-700">Plexus Studio</span>
            {backendOnline ? (
              <div className="flex items-center gap-1 text-success-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>Backend connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-warning-600">
                <WifiOff className="w-3 h-3" />
                <span>
                  Backend offline –{" "}
                  <code className="text-xs bg-default-100 px-1 rounded">
                    uvicorn orchestration.api:app --reload
                  </code>
                </span>
              </div>
            )}
            {selectedDatasetId && (
              <Chip color="primary" size="sm" variant="flat">
                {selectedDatasetId}
              </Chip>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Dataset manager */}
            <Tooltip content="Manage Datasets">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => setDatasetModalOpen(true)}
              >
                <Database className="w-4 h-4" />
              </Button>
            </Tooltip>

            {/* Agent notifications badge */}
            {pendingNotifications > 0 && (
              <Tooltip content={`${pendingNotifications} agent suggestion(s)`}>
                <Badge color="secondary" content={pendingNotifications} size="sm">
                  <Button isIconOnly size="sm" variant="light">
                    <AlertCircle className="w-4 h-4 text-secondary" />
                  </Button>
                </Badge>
              </Tooltip>
            )}

            {/* Training panel toggle */}
            <Tooltip content="Training panel">
              <Button
                color={trainingPanelOpen ? "primary" : "default"}
                isIconOnly
                size="sm"
                variant={trainingPanelOpen ? "flat" : "light"}
                onPress={() => setTrainingPanelOpen(!trainingPanelOpen)}
              >
                <ActivitySquare className="w-4 h-4" />
              </Button>
            </Tooltip>

            {/* Console panel toggle */}
            <Tooltip content="Console / logs">
              <Badge
                color="danger"
                content={unreadErrors > 0 ? unreadErrors : undefined}
                isInvisible={unreadErrors === 0}
                size="sm"
              >
                <Button
                  color={consolePanelOpen ? "primary" : "default"}
                  isIconOnly
                  size="sm"
                  variant={consolePanelOpen ? "flat" : "light"}
                  onPress={() => setConsolePanelOpen(!consolePanelOpen)}
                >
                  <Terminal className="w-4 h-4" />
                </Button>
              </Badge>
            </Tooltip>

            {/* Train button */}
            <Button
              color="primary"
              isDisabled={!backendOnline || isTraining}
              isLoading={isTraining}
              size="sm"
              startContent={!isTraining ? <PlayCircle className="w-4 h-4" /> : undefined}
              onPress={handleTrain}
            >
              {isTraining ? "Training…" : "Train"}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <Card
          className="flex-1 m-2 overflow-hidden"
          radius="sm"
          style={{ marginBottom: consolePanelOpen ? "13rem" : "2.5rem" }}
        >
          <CardBody className="p-0 overflow-hidden">
            {isMounted ? (
              <FlowCanvasWrapper
                projectId={projectId}
                templateType={templateType}
                onEdgesChange={setCanvasEdges as any}
                onNodeSelect={() => null}
                onNodesChange={setCanvasNodes as any}
              />
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* Right: Training panel (slide-over) */}
      <TrainingPanel />

      {/* Bottom: Console panel (slide-up) */}
      <ConsolePanel />

      {/* Floating agent notifications */}
      <AgentBadge />

      {/* Dataset manager modal */}
      <DatasetManager
        isOpen={datasetModalOpen}
        onClose={() => setDatasetModalOpen(false)}
      />
    </div>
  );
}
