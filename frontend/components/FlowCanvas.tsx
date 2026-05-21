import React, { useCallback, useRef, useState, useEffect } from "react";
import { Copy, Download, Play, X } from "lucide-react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ConnectionMode,
} from "reactflow";
import { Icon } from "@iconify/react";
import { Card, CardBody, CardFooter, RadioGroup, Radio } from "@heroui/react";
import { Button } from "@heroui/button";

import { nodeTypes } from "./nodes/CustomNodes";
import CustomEdge from "./nodes/CustomEdge";
import { NetworkCodeGenerator } from "./CodeGenerator";
import { getLayoutedElements } from "./utils/layoutUtils";
import { getTemplateByType } from "./templates/templateDefinitions";
import HelpSystem from "./HelpSystem";
import FloatingToolbar from "./FloatingToolbar";
import SaveProjectModal from "./SaveProjectModal";
import { useToast } from "./ToastProvider";

import ProjectStorage, { SavedProject } from "@/utils/projectStorage";
import { startTraining, validateGraphNodes, runGraphPreprocessing } from "@/lib/api";
import { usePlexusStore } from "@/store/plexusStore";
import { useTrainingSocket } from "@/hooks/useTrainingSocket";
import { useGraphValidation } from "@/hooks/useGraphValidation";
import {
  detectModelPipelines,
  pipelineModelLabel,
} from "@/utils/pipelineDetection";
import "reactflow/dist/style.css";

// Pipeline colour palette — each pipeline gets a distinct accent colour
const PIPELINE_COLOURS = [
  "#006FEE", // blue
  "#17C964", // green
  "#F5A524", // amber
  "#9353D3", // purple
  "#F31260", // red
  "#00B8D9", // cyan
];

let _pipelineColourIndex = 0;
const _pipelineColourMap = new Map<string, string>();
function getPipelineColour(pipelineId: string): string {
  if (!_pipelineColourMap.has(pipelineId)) {
    _pipelineColourMap.set(pipelineId, PIPELINE_COLOURS[_pipelineColourIndex % PIPELINE_COLOURS.length]);
    _pipelineColourIndex++;
  }
  return _pipelineColourMap.get(pipelineId)!;
}

function bindFallbackDatasetToNodes(
  nodes: Node[],
  selectedDataset: { id: string; name: string; type: string; columns?: string[]; row_count?: number } | undefined,
) {
  if (!selectedDataset) return nodes;
  let changed = false;

  const nextNodes = nodes.map((node) => {
    if (node.type !== "dataset" || node.data?.datasetId) return node;
    changed = true;

    return {
      ...node,
      data: {
        ...node.data,
        datasetId: selectedDataset.id,
        datasetName: selectedDataset.name,
        datasetType: selectedDataset.type,
        columns: selectedDataset.columns ?? [],
        rowCount: selectedDataset.row_count ?? 0,
      },
    };
  });

  return changed ? nextNodes : nodes;
}

/** Inject evaluation/confusion/prediction/comparison nodes for a completed job. */
function _injectResultNodes(
  jobId: string,
  job: import("@/store/plexusStore").TrainingJobState,
  nodes: Node[],
  setNodes: (fn: (nds: Node[]) => Node[]) => void,
  setEdges: (fn: (eds: Edge[]) => Edge[]) => void,
  addLog: (level: any, msg: string, src: string) => void,
) {
  const result = job.result as Record<string, any>;
  const colour = getPipelineColour(job.pipelineId);
  const datasetNodeId = job.pipelineId.split("::")[0];
  const datasetNode = nodes.find((n) => n.id === datasetNodeId);

  if (!datasetNode) return;

  const modelResults: Record<string, any>[] =
    result?.model_results?.length > 0
      ? result.model_results
      : result?.best_model ? [result.best_model] : [];

  if (modelResults.length === 0) return;

  // Anchor result positions beside the dataset/model path that launched this job.
  const baseAnchorX = datasetNode.position.x + 640;
  const baseAnchorY = datasetNode.position.y;

  // Offset each pipeline's results vertically so they don't overlap
  const pipelineIndex = _pipelineColourIndex - 1;
  const yOffset = pipelineIndex * 320;

  let addedCount = 0;

  setNodes((nds) => {
    const next = [...nds];

    modelResults.forEach((modelResult, index) => {
      const modelNode = nds.find((n) => n.id === modelResult.node_id);
      const baseX = modelNode ? modelNode.position.x + 320 : baseAnchorX;
      const baseY = modelNode ? modelNode.position.y + yOffset : baseAnchorY + yOffset + index * 260;
      const modelLabel = modelResult.label || modelResult.model_type || "Model";
      const modelKey = `${jobId}-${modelResult.node_id || modelResult.model_type || index}`;

      const perModelResult = {
        ...result,
        final_loss: modelResult.metrics?.loss ?? result.final_loss,
        final_accuracy: modelResult.metrics?.accuracy ?? result.final_accuracy,
        final_val_loss: modelResult.metrics?.val_loss ?? result.final_val_loss,
        final_val_accuracy: modelResult.metrics?.val_accuracy ?? result.final_val_accuracy,
        best_model: modelResult,
        model_results: [modelResult],
        _pipelineLabel: job.label,
        _pipelineColour: colour,
        _jobId: jobId,
      };

      const evalId = `eval-${modelKey}`;
      const confId = `conf-${modelKey}`;
      const predId = `pred-${modelKey}`;

      if (!next.find((n) => n.id === evalId)) {
        next.push({
          id: evalId, type: "evaluationResults",
          position: { x: baseX, y: baseY },
          data: { label: `Results: ${modelLabel}`, result: perModelResult },
          style: { borderColor: colour },
        });
        addedCount++;
      }
      if (!next.find((n) => n.id === confId)) {
        next.push({
          id: confId, type: "confMatrix",
          position: { x: baseX, y: baseY + 220 },
          data: { label: `Confusion: ${modelLabel}`, result: perModelResult },
          style: { borderColor: colour },
        });
        addedCount++;
      }
      if (!next.find((n) => n.id === predId)) {
        next.push({
          id: predId, type: "predTable",
          position: { x: baseX + 320, y: baseY + 220 },
          data: { label: `Predictions: ${modelLabel}`, result: perModelResult },
          style: { borderColor: colour },
        });
        addedCount++;
      }
    });

    // Model comparison node anchored below the dataset node
    if (result?.comparison?.length > 0) {
      const compareId = `compare-${jobId}`;
      if (!next.find((n) => n.id === compareId)) {
        next.push({
          id: compareId, type: "modelComparison",
          position: { x: baseAnchorX - 320, y: baseAnchorY + yOffset + 260 },
          data: { label: `Comparison – ${job.datasetName}`, result: { ...result, _pipelineLabel: job.label, _pipelineColour: colour } },
          style: { borderColor: colour },
        });
        addedCount++;
      }
    }

    return next;
  });

  setEdges((eds) => {
    const next = [...eds];
    const has = (s: string, t: string) => next.some((e) => e.source === s && e.target === t);
    const add = (s: string, t: string) => {
      if (!has(s, t)) next.push({ id: `e-${s}-${t}`, source: s, target: t, animated: true, style: { stroke: colour, strokeWidth: 2 } });
    };
    modelResults.forEach((mr) => {
      const mn = nodes.find((n) => n.id === mr.node_id);
      if (!mn) return;
      const mk = `${jobId}-${mr.node_id || mr.model_type}`;
      add(mn.id, `eval-${mk}`);
      add(mn.id, `conf-${mk}`);
      add(mn.id, `pred-${mk}`);
    });
    if (result?.comparison?.length > 0) {
      add(datasetNode.id, `compare-${jobId}`);
    }
    return next;
  });

  if (addedCount > 0) {
    addLog("success", `[${job.label}] Auto-added ${addedCount} result node(s) in ${colour} colour.`, "FlowCanvas");
  }
}

const edgeTypes = {
  custom: CustomEdge,
};

interface FlowCanvasProps {
  onNodeSelect: (node: Node | null) => void;
  templateType?: string | null;
  projectId?: string | null;
  /** Optional callback – called after every nodes state update */
  onNodesChange?: (nodes: Node[]) => void;
  /** Optional callback – called after every edges state update */
  onEdgesChange?: (edges: Edge[]) => void;
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({
  onNodeSelect,
  templateType,
  projectId,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
}) => {
  const { showSuccess, showError } = useToast();
  // Canvas starts empty – everything is drag-and-drop from the sidebar
  const getDefaultNodes = (): Node[] => [];
  const getDefaultEdges = (): Edge[] => [];

  const [nodes, setNodes, onNodesChange] = useNodesState(getDefaultNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(getDefaultEdges());
  const clearAllJobs = usePlexusStore((s) => s.clearAllJobs);
  const loadedTemplateRef = useRef<string | null | undefined>(undefined);
  const loadedProjectRef = useRef<string | null | undefined>(undefined);
  const spawnedGhostsRef = useRef<Set<string>>(new Set());

  // Propagate node/edge changes to parent page (for training, etc.)
  useEffect(() => {
    onNodesChangeProp?.(nodes);
  }, [nodes, onNodesChangeProp]);
  useEffect(() => {
    onEdgesChangeProp?.(edges);
  }, [edges, onEdgesChangeProp]);

  // Update nodes and edges when template type changes
  useEffect(() => {
    if (loadedTemplateRef.current === templateType) return;
    loadedTemplateRef.current = templateType;

    if (templateType) {
      const template = getTemplateByType(templateType);

      if (template) {
        setNodes(template.nodes);
        setEdges(template.edges);
        clearAllJobs();
      }
    }
  }, [templateType, setNodes, setEdges, clearAllJobs]);

  // Load project when projectId changes
  useEffect(() => {
    if (loadedProjectRef.current === projectId) return;
    loadedProjectRef.current = projectId;

    if (projectId) {
      const project = ProjectStorage.getProject(projectId);

      if (project) {
        setNodes(project.nodes);
        setEdges(project.edges);
        setCurrentProjectId(projectId);
        setCurrentProject(project);
      }
    } else {
      setNodes(getDefaultNodes());
      setEdges(getDefaultEdges());
      setCurrentProjectId(null);
      setCurrentProject(null);
      clearAllJobs();
      spawnedGhostsRef.current.clear();
    }
  }, [projectId, setNodes, setEdges, clearAllJobs]);
  const [showPanel, setShowPanel] = useState(false);
  const [framework, setFramework] = useState<"tensorflow" | "pytorch">(
    "tensorflow",
  );
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<SavedProject | null>(
    null,
  );

  const selectedDatasetId = usePlexusStore((s) => s.selectedDatasetId);
  const datasets = usePlexusStore((s) => s.datasets);
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);
  const backendOnline = usePlexusStore((s) => s.backendOnline);
  const trainingJobs = usePlexusStore((s) => s.trainingJobs);
  const activeJobId = usePlexusStore((s) => s.activeJobId);
  const startJob = usePlexusStore((s) => s.startJob);
  const setTrainingPanelOpen = usePlexusStore((s) => s.setTrainingPanelOpen);
  const addLog = usePlexusStore((s) => s.addLog);
  const setGraphWarnings = usePlexusStore((s) => s.setGraphWarnings);
  const graphWarnings = usePlexusStore((s) => s.graphWarnings);
  const [isStartingTraining, setIsStartingTraining] = useState(false);

  // Connect WebSockets for ALL active jobs simultaneously
  const activeJobIds = Object.keys(trainingJobs);
  useTrainingSocket(activeJobIds);

  // For the Train button label — any job currently running?
  const anyRunning = Object.values(trainingJobs).some((j) => j.status === "running" || j.status === "queued");
  const trainingStatus = anyRunning ? "running" : (activeJobId ? (trainingJobs[activeJobId]?.status ?? "idle") : "idle");

  // Validate canvas nodes against dataset intelligence
  useEffect(() => {
    if (!selectedDatasetId || nodes.length === 0) { setGraphWarnings([]); return; }
    const timer = setTimeout(async () => {
      try {
        const result = await validateGraphNodes(selectedDatasetId, nodes as unknown[]);
        setGraphWarnings(result.warnings);
        result.warnings.filter((w) => w.severity === "error").forEach((w) => {
          addLog("warning", `Node '${w.node_type}' incompatible: ${w.message}`, "GraphValidator");
        });
      } catch { /* best-effort */ }
    }, 800);
    return () => clearTimeout(timer);
  }, [nodes, selectedDatasetId, setGraphWarnings, addLog]);

  // Spawn ghost nodes when Architect suggestions are available
  useEffect(() => {
    if (!selectedDatasetId || !selectedDataset?.architect_status?.suggested_nodes) return;
    const datasetNode = nodes.find(
      (node) =>
        node.type === "dataset" && node.data?.datasetId === selectedDatasetId,
    );
    if (!datasetNode) return;

    const spawnKey = `${selectedDatasetId}-${selectedDataset.architect_status.status}`;
    if (spawnedGhostsRef.current.has(spawnKey)) return;
    const suggestions = selectedDataset.architect_status.suggested_nodes;
    if (suggestions.length === 0) return;
    spawnedGhostsRef.current.add(spawnKey);
    const maxX = datasetNode.position.x + 300;
    const maxY = datasetNode.position.y;
    const baseId = `ghost-${selectedDatasetId}-${Date.now()}`;
    setNodes((nds) => [...nds, ...suggestions.map((nodeType: string, index: number) => {
      const ghostId = `${baseId}-${index}`;
      return {
        id: ghostId, type: "ghost",
        position: { x: maxX + index * 250, y: maxY },
        data: {
          label: `Suggest: ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`,
          icon: "lucide:plus-circle",
          onClick: () => setNodes(nds2 => nds2.map(n => n.id === ghostId
            ? { ...n, type: nodeType, data: { label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1), details: "From AI suggestion" } }
            : n)),
        },
      };
    })]);
  }, [selectedDataset, selectedDatasetId, nodes, setNodes]);

  // Client-side graph validation
  const validation = useGraphValidation(nodes, edges);

  // ── Multi-pipeline Train handler ──────────────────────────────────────────────────
  const handleStartTraining = async () => {
    if (!backendOnline) { showError("Backend is offline."); return; }

    const trainNodes = bindFallbackDatasetToNodes(nodes, selectedDataset);
    if (trainNodes !== nodes) {
      setNodes(trainNodes);
    }

    const pipelines = detectModelPipelines(trainNodes, edges);
    if (pipelines.length === 0) {
      const hasDatasetNode = trainNodes.some((node) => node.type === "dataset");
      const hasBoundDatasetNode = trainNodes.some(
        (node) => node.type === "dataset" && node.data?.datasetId,
      );
      showError(
        !hasDatasetNode
          ? "No dataset nodes found. Drag a dataset onto the canvas first."
          : !hasBoundDatasetNode
            ? "This Dataset node is not linked to an uploaded dataset. Select a dataset in the sidebar or drag a specific dataset from the Data tab."
            : "Connect at least one model node to a dataset node.",
      );
      return;
    }

    setIsStartingTraining(true);
    const trainingConfigNode = nodes.find((n) => n.type === "training_config");
    const trainingConfig = (trainingConfigNode?.data?.config || {}) as {
      epochs?: number; batch_size?: number; learning_rate?: number; lr?: number;
    };
    const selectedEpochs = Number(trainingConfig.epochs || 20);
    const selectedBatchSize = Number(trainingConfig.batch_size || 32);
    const selectedLearningRate = Number(trainingConfig.learning_rate || trainingConfig.lr || 0.001);

    let launchedCount = 0;
    for (const pipeline of pipelines) {
      try {
        // Apply graph preprocessing for this pipeline's dataset
        let activeDatasetId = pipeline.datasetId;
        if (pipeline.preprocessingNodes.length > 0) {
          try {
            addLog("info", `[Pipeline: ${pipeline.datasetName}] Applying ${pipeline.preprocessingNodes.length} preprocessing node(s)…`, "FlowCanvas");
            const gpResult = await runGraphPreprocessing(
              pipeline.datasetId,
              pipeline.allNodes as unknown[],
              pipeline.allEdges as unknown[],
            );
            if (gpResult.processed_dataset_id !== pipeline.datasetId) {
              activeDatasetId = gpResult.processed_dataset_id;
              addLog("success", `[Pipeline: ${pipeline.datasetName}] Preprocessing done (${gpResult.steps.length} steps). Training on processed data.`, "FlowCanvas");
            }
          } catch (gpErr) {
            addLog("warning", `[Pipeline: ${pipeline.datasetName}] Preprocessing failed, using raw data: ${gpErr}`, "FlowCanvas");
          }
        }

        const job = await startTraining({
          nodes: pipeline.allNodes as unknown[],
          edges: pipeline.allEdges as unknown[],
          datasetId: activeDatasetId,
          framework,
          epochs: selectedEpochs,
          batchSize: selectedBatchSize,
          learningRate: selectedLearningRate,
        });

        const prepSteps = pipeline.preprocessingNodes.map((n) => n.type ?? "");
        const modelTypes = [
          pipeline.targetModelNode.type ?? pipelineModelLabel(pipeline),
        ];
        const label = [
          pipeline.datasetName,
          prepSteps.length ? prepSteps.join("+") : "raw",
          pipelineModelLabel(pipeline),
        ].join(" → ");

        startJob(
          job.job_id,
          pipeline.pipelineId,
          label,
          selectedEpochs,
          pipeline.datasetName,
          prepSteps,
          modelTypes,
        );
        setTrainingPanelOpen(true);
        addLog("info", `[Pipeline: ${pipeline.datasetName}] Job ${job.job_id} started.`, "FlowCanvas");
        showSuccess(`Pipeline "${label}" started! Job: ${job.job_id}`);
        launchedCount++;

        // Auto-inject per-pipeline viz nodes
        const pipelineNodeIds = new Set(pipeline.allNodes.map((n) => n.id));
        const hasLoss = nodes.some((n) => n.type === "lossCurve" && pipelineNodeIds.has(n.id));
        if (!hasLoss) {
          const maxX = pipeline.allNodes.reduce((acc, n) => Math.max(acc, n.position.x), 0);
          const maxY = pipeline.allNodes.reduce((acc, n) => Math.max(acc, n.position.y), 0);
          setNodes((nds) => [
            ...nds,
            {
              id: `viz-loss-${job.job_id}`,
              type: "lossCurve",
              position: { x: maxX + 40, y: maxY + 140 },
              data: { label: `Loss – ${label}`, jobId: job.job_id, pipelineId: pipeline.pipelineId },
            },
          ]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showError(`Pipeline "${pipeline.datasetName}" failed: ${msg}`);
        addLog("error", `Pipeline ${pipeline.datasetName} start failed: ${msg}`, "FlowCanvas");
      }
    }

    if (launchedCount > 1) {
      showSuccess(`${launchedCount} independent model jobs launched in parallel!`);
    }
    setIsStartingTraining(false);
  };

  useEffect(() => {
    const handleGlobalStartTraining = () => {
      void handleStartTraining();
    };

    window.addEventListener("plexus:start-training", handleGlobalStartTraining);

    return () => {
      window.removeEventListener(
        "plexus:start-training",
        handleGlobalStartTraining,
      );
    };
  }, [handleStartTraining]);

  // ── Auto-inject result nodes when any job completes ───────────────────────────────────
  const prevJobStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    Object.entries(trainingJobs).forEach(([jobId, job]) => {
      const prev = prevJobStatuses.current[jobId];
      if (prev !== "completed" && job.status === "completed" && job.result) {
        _injectResultNodes(jobId, job, nodes, setNodes, setEdges, addLog);
      }
      prevJobStatuses.current[jobId] = job.status;
    });
  }, [trainingJobs, nodes, setNodes, setEdges, addLog]);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { project, fitView } = useReactFlow();

  // Helper function to close panel and reset state
  const closePanel = useCallback(() => {
    setShowPanel(false);
    setGeneratedCode("");
    setError("");
  }, []);

  // Handle clicking outside the panel to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showPanel &&
        panelRef.current &&
        !panelRef.current.contains(event.target as HTMLElement) &&
        !(event.target as Element).closest('[aria-label="Show code panel"]')
      ) {
        closePanel();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showPanel) {
        closePanel();
      }
    };

    if (showPanel) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showPanel, closePanel]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Auto layout function
  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      "LR",
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

    window.requestAnimationFrame(() => {
      fitView();
    });
  }, [nodes, edges, setNodes, setEdges, fitView]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
      const nodeData = JSON.parse(
        event.dataTransfer.getData("application/reactflow"),
      );

      if (!nodeData) return;

      // Check if trying to add input/output node when one already exists
      const hasInputNode = nodes.some(
        (node) => node.type === "textInput" || node.type === "inputLayer",
      );
      const hasOutputNode = nodes.some((node) => node.type === "outputLayer");

      if (
        (nodeData.type === "textInput" || nodeData.type === "inputLayer") &&
        hasInputNode
      ) {
        showError("Only one input node is allowed");

        return;
      }
      if (nodeData.type === "outputLayer" && hasOutputNode) {
        showError("Only one output node is allowed");

        return;
      }

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: Date.now().toString(),
        type: nodeData.type,
        position,
        data: {
          label: nodeData.label,
          icon: nodeData.icon,
          details: nodeData.details,
          ...(nodeData.dataProps || {}),
          ...([
            "inputLayer",
            "outputLayer",
            "hidden",
            "dense",
            "embedding",
            "lstm",
          ].includes(nodeData.type)
            ? {
                count:
                  nodeData.type === "inputLayer"
                    ? 784
                    : nodeData.type === "outputLayer"
                      ? 1
                      : nodeData.type === "embedding"
                        ? 64
                        : nodeData.type === "lstm"
                          ? 128
                          : 128,
                onChange: (newCount: number) => {
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === newNode.id
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              count: Math.max(1, newCount),
                            },
                          }
                        : node,
                    ),
                  );
                },
              }
            : {}),
          // Add text value handling for text input nodes
          ...(nodeData.type === "textInput"
            ? {
                value: "Enter name...",
                onChange: (newValue: string) => {
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === newNode.id
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              value: newValue,
                            },
                          }
                        : node,
                    ),
                  );
                },
              }
            : {}),
          // Add parameter handling for algorithm, optimizer, loss, and scheduler nodes
          ...([
            "cnn",
            "rnn",
            "lstm",
            "transformer",
            "autoencoder",
            "gan",
            "resnet",
            "vae",
            "adam",
            "sgd",
            "rmsprop",
            "adagrad",
            "adamw",
            "crossentropy",
            "mse",
            "mae",
            "bce",
            "steplr",
            "exponentiallr",
            "cosineannealinglr",
            "reducelronplateau",
          ].includes(nodeData.type)
            ? {
                params: {},
                onParamsChange: (newParams: any) => {
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === newNode.id
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              params: newParams,
                            },
                          }
                        : node,
                    ),
                  );
                },
              }
            : {}),
          // Add configuration handling for training config nodes
          ...(nodeData.type === "training_config"
            ? {
                config: {
                  epochs: 10,
                  batch_size: 32,
                  learning_rate: 0.001,
                  validation_split: 0.2,
                  early_stopping: false,
                  save_best: true,
                },
                onConfigChange: (newConfig: any) => {
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === newNode.id
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              config: newConfig,
                            },
                          }
                        : node,
                    ),
                  );
                },
              }
            : {}),
          // Add metrics handling for metrics nodes
          ...(nodeData.type === "metrics"
            ? {
                metrics: {
                  accuracy: 0.0,
                  loss: 0.0,
                  val_accuracy: 0.0,
                  val_loss: 0.0,
                },
              }
            : {}),
          // Dataset node default data
          ...(nodeData.type === "dataset"
            ? {
                datasetId: nodeData.datasetId || selectedDataset?.id || null,
                datasetName:
                  nodeData.datasetName ||
                  selectedDataset?.name ||
                  nodeData.label ||
                  "Dataset",
                datasetType: nodeData.datasetType || selectedDataset?.type || "csv",
                columns: nodeData.columns || selectedDataset?.columns || [],
                rowCount: nodeData.rowCount || selectedDataset?.row_count || 0,
              }
            : {}),
          // Preprocessing nodes default data
          ...([
            "normalize",
            "dropNulls",
            "oneHotEncode",
            "embedEncode",
            "scale",
          ].includes(nodeData.type)
            ? { columns: nodeData.columns || [] }
            : {}),
          // Export code node default data
          ...(nodeData.type === "exportCode"
            ? { framework: "tensorflow", format: "python" }
            : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, project, nodes, selectedDataset],
  );

  // Handle loading a template
  const handleLoadTemplate = useCallback(
    (template: any) => {
      setNodes(template.nodes);
      setEdges(template.edges);

      // Auto-layout the loaded template
      setTimeout(() => {
        onLayout();
      }, 100);
    },
    [setNodes, setEdges],
  );

  // Handle loading a project
  const handleLoadProject = useCallback(
    (project: any) => {
      setNodes(project.nodes);
      setEdges(project.edges);

      // Auto-layout the loaded project
      setTimeout(() => {
        onLayout();
      }, 100);
    },
    [setNodes, setEdges],
  );

  // Handle highlighting a node (from validator)
  const handleIssueSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);

    // Clear highlight after 3 seconds
    setTimeout(() => {
      setSelectedNodeId(null);
    }, 3000);
  }, []);

  // Handle saving a project
  const handleSaveProject = useCallback(() => {
    // If we're working on an existing project, update it directly
    if (currentProjectId && currentProject) {
      const updatedProject = ProjectStorage.updateProject(currentProjectId, {
        nodes,
        edges,
        nodeCount: nodes.length,
      });

      if (updatedProject) {
        setCurrentProject(updatedProject);
        showSuccess(
          "Project Updated!",
          `"${updatedProject.name}" has been saved with your latest changes.`,
        );
      } else {
        showError(
          "Update Failed",
          "Failed to update the project. Please try again.",
        );
      }
    } else {
      // If it's a new project, show the save modal
      setShowSaveModal(true);
    }
  }, [currentProjectId, currentProject, nodes, edges, showSuccess, showError]);

  // Handle save success for new projects
  const handleSaveSuccess = useCallback(
    (project: SavedProject) => {
      setCurrentProjectId(project.id);
      setCurrentProject(project);
      showSuccess(
        "Project Saved!",
        `"${project.name}" has been saved successfully.`,
      );
    },
    [showSuccess],
  );

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError("");

      const generator = new NetworkCodeGenerator(nodes, edges);

      let code;

      if (framework === "tensorflow") {
        code = generator.generateTensorFlowCode();
      } else {
        code = generator.generatePyTorchCode();
      }

      setGeneratedCode(code);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      setGeneratedCode("");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const downloadCode = () => {
    const extension = framework === "tensorflow" ? "tf.py" : "torch.py";
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `neural_network_${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadNotebook = () => {
    try {
      const generator = new NetworkCodeGenerator(nodes, edges);
      let notebook;
      let filename;

      if (framework === "tensorflow") {
        notebook = generator.generateTensorFlowNotebook();
        filename = "tensorflow_training_notebook.ipynb";
      } else {
        notebook = generator.generatePyTorchNotebook();
        filename = "pytorch_training_notebook.ipynb";
      }

      const blob = new Blob([JSON.stringify(notebook, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate notebook",
      );
    }
  };

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <ReactFlow
        fitView
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: "custom",
          animated: true,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        edges={edges}
        fitViewOptions={{ padding: 0.2 }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodes={nodes.map((node) => {
          const warning = graphWarnings.find((w) => w.node_id === node.id);
          return {
            ...node,
            style: {
              ...node.style,
              ...(selectedNodeId === node.id
                ? { boxShadow: "0 0 0 3px #3b82f6", border: "2px solid #3b82f6" }
                : warning?.severity === "error"
                  ? { boxShadow: "0 0 0 3px #ef4444", border: "2px solid #ef4444", borderRadius: "0.75rem" }
                  : warning?.severity === "warning"
                    ? { boxShadow: "0 0 0 2px #f59e0b", border: "2px solid #f59e0b", borderRadius: "0.75rem" }
                    : validation.errorNodeIds.has(node.id)
                      ? { boxShadow: "0 0 0 2px #ef4444", border: "2px solid #ef4444", borderRadius: "0.75rem" }
                      : validation.warningNodeIds.has(node.id)
                        ? { boxShadow: "0 0 0 2px #f59e0b", border: "2px solid #f59e0b", borderRadius: "0.75rem" }
                        : {}),
            },
            data: {
              ...node.data,
              _validationMessages: validation.nodeMessages[node.id] ?? [],
              _incompatibleWarning: warning ? warning.message : null,
              _suggestDelete: warning?.suggest_delete ?? false,
            },
          };
        })}
        selectNodesOnDrag={false}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeSelect(node)}
        onNodesChange={onNodesChange}
      >
        <Controls />
        <Background color="#aaa" gap={20} />
      </ReactFlow>

      {/* Collapsible Toolbar - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <FloatingToolbar
          currentProject={currentProject}
          edges={edges}
          nodes={nodes}
          showCodePanel={showPanel}
          onIssueSelect={handleIssueSelect}
          onLayout={onLayout}
          onLoadProject={handleLoadProject}
          onLoadTemplate={handleLoadTemplate}
          onSaveProject={handleSaveProject}
          onToggleCodePanel={() => setShowPanel((prev) => !prev)}
        />
      </div>

      {/* Help System - Positioned below toolbar */}
      <div className="absolute top-16 right-4 z-10">
        <HelpSystem />
      </div>

      {showPanel && (
        <Card
          ref={panelRef}
          className="shadow-lg border animate-in slide-in-from-right-4 fade-in-0 duration-200"
          style={{
            position: "absolute",
            top: 60,
            right: 20,
            width: generatedCode ? 600 : 360,
            maxHeight: "calc(100vh - 100px)",
            zIndex: 30, // Higher than toolbar
            maxWidth: "calc(100vw - 40px)",
          }}
        >
          <CardBody className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Generate Neural Network Code
              </h2>
              <Button
                isIconOnly
                aria-label="Close panel"
                className="text-foreground-400 hover:text-foreground-600 hover:bg-default-100"
                size="sm"
                variant="light"
                onClick={closePanel}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!generatedCode && (
              <>
                <p className="text-foreground-500 mb-4">
                  Select your preferred framework to generate code for your
                  neural network.
                </p>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Icon
                      className="text-blue-600 text-xl mt-0.5"
                      icon="simple-icons:jupyter"
                    />
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                        Ready for Google Colab!
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Get a complete Jupyter notebook with data loading,
                        training, and evaluation code. Perfect for uploading
                        directly to Google Colab to start training your model.
                      </p>
                    </div>
                  </div>
                </div>

                <RadioGroup
                  classNames={{
                    base: "gap-6",
                    label: "text-foreground-600 font-medium mb-3",
                  }}
                  label="Select Framework"
                  orientation="horizontal"
                  value={framework}
                  onValueChange={(value) =>
                    setFramework(value as "tensorflow" | "pytorch")
                  }
                >
                  <Radio value="tensorflow">
                    <div className="flex items-center gap-2">
                      <Icon className="text-xl" icon="logos:tensorflow" />
                      TensorFlow
                    </div>
                  </Radio>
                  <Radio value="pytorch">
                    <div className="flex items-center gap-2">
                      <Icon className="text-xl" icon="logos:pytorch-icon" />
                      PyTorch
                    </div>
                  </Radio>
                </RadioGroup>
              </>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {generatedCode && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Generated{" "}
                    {framework === "tensorflow" ? "TensorFlow" : "PyTorch"}{" "}
                    Code:
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      startContent={<Copy size={16} />}
                      variant="ghost"
                      onClick={copyToClipboard}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      startContent={<Download size={16} />}
                      variant="ghost"
                      onClick={downloadCode}
                    >
                      Download .py
                    </Button>
                    <Button
                      color="primary"
                      size="sm"
                      startContent={<Icon icon="simple-icons:jupyter" />}
                      variant="ghost"
                      onClick={downloadNotebook}
                    >
                      Download .ipynb
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setGeneratedCode("");
                        setError("");
                      }}
                    >
                      Back
                    </Button>
                  </div>
                </div>
                <pre className=" p-4 rounded overflow-auto text-sm max-h-96 font-mono">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            )}
          </CardBody>

          {!generatedCode && (
            <CardFooter className="px-6 pb-6 pt-0">
              <div className="flex gap-2 w-full">
                <Button
                  className="flex-1"
                  color="success"
                  isDisabled={!backendOnline || !selectedDatasetId}
                  isLoading={isStartingTraining || trainingStatus === "running"}
                  startContent={
                    !isStartingTraining &&
                    trainingStatus !== "running" && <Play className="w-4 h-4" />
                  }
                  title={
                    !selectedDatasetId
                      ? "Select a dataset first"
                      : !backendOnline
                        ? "Backend offline"
                        : "Train model"
                  }
                  variant="solid"
                  onPress={handleStartTraining}
                >
                  {trainingStatus === "running"
                    ? "Training..."
                    : isStartingTraining
                      ? "Starting..."
                      : "Train"}
                </Button>
                <Button
                  className="flex-1"
                  color="primary"
                  isLoading={isGenerating}
                  startContent={!isGenerating && <Icon icon="lucide:code" />}
                  variant="solid"
                  onPress={handleGenerate}
                >
                  {isGenerating ? "Generating..." : "Generate Code"}
                </Button>
                <Button
                  className="flex-1"
                  color="secondary"
                  isLoading={isGenerating}
                  startContent={
                    !isGenerating && <Icon icon="simple-icons:jupyter" />
                  }
                  variant="solid"
                  onPress={downloadNotebook}
                >
                  {isGenerating ? "Generating..." : "Get Colab Notebook"}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Save Project Modal */}
      <SaveProjectModal
        edges={edges}
        isOpen={showSaveModal}
        nodes={nodes}
        templateType={templateType || undefined}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveSuccess}
      />
    </div>
  );
};

export default FlowCanvas;
