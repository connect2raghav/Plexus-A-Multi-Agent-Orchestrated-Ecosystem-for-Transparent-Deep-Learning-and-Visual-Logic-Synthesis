/**
 * store/plexusStore.ts
 * --------------------
 * Global Zustand store for Plexus.
 *
 * KEY CHANGE: training is now a map of jobId → TrainingJobState so that
 * multiple independent pipelines on the same canvas each get their own
 * isolated metrics, results, and status.
 */

import type {
  DatasetRecord,
  ResourceResult,
  PreprocessingSuggestion,
  CleaningStatus,
  DatasetIntelligence,
  GraphValidationWarning,
} from "@/lib/api";

import { create } from "zustand";

// ── Log entry ────────────────────────────────────────────────────────────────
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "success" | "warning" | "error" | "agent";
  message: string;
  source?: string;
}

// ── Per-job training metrics ─────────────────────────────────────────────────
export interface TrainingMetrics {
  loss: number[];
  accuracy: number[];
  val_loss: number[];
  val_accuracy: number[];
}

export type TrainingStatus =
  | "idle"
  | "queued"
  | "running"
  | "paused"
  | "stopped"
  | "completed"
  | "error";

export interface TrainingJobState {
  jobId: string;
  /** The canvas dataset-node ID that is the root of this pipeline */
  pipelineId: string;
  /** Human-readable label, e.g. "Pipeline A – iris.csv + normalize + RF" */
  label: string;
  status: TrainingStatus;
  progress: number;
  epoch: number;
  epochs: number;
  metrics: TrainingMetrics;
  gradientNorms: Record<string, number>;
  result: Record<string, unknown> | null;
  error: string | null;
  /** Preprocessing steps applied before training */
  preprocessingSteps: string[];
  /** Dataset name used for this pipeline */
  datasetName: string;
  /** Model node types in this pipeline */
  modelTypes: string[];
  startedAt: string;
}

// ── Dataset profiling progress ───────────────────────────────────────────────
export interface DatasetProfilingState {
  progress: number;
  message: string;
  done: boolean;
  error: string | null;
  preprocessing_suggestions: PreprocessingSuggestion[];
  cleaning_status?: CleaningStatus;
}

// ── Agent notifications ──────────────────────────────────────────────────────
export interface AgentNotification {
  id: string;
  agentName: string;
  type: "suggestion" | "warning" | "error" | "info";
  message: string;
  details?: unknown;
  timestamp: Date;
  dismissed: boolean;
}

// ── Store shape ──────────────────────────────────────────────────────────────
export interface PlexusStore {
  backendOnline: boolean;
  setBackendOnline: (online: boolean) => void;

  // Datasets
  datasets: DatasetRecord[];
  setDatasets: (datasets: DatasetRecord[]) => void;
  addDataset: (d: DatasetRecord) => void;
  removeDataset: (id: string) => void;
  patchDataset: (id: string, patch: Partial<DatasetRecord>) => void;
  selectedDatasetId: string | null;
  selectDataset: (id: string | null) => void;

  // Per-dataset profiling progress
  datasetProgress: Record<string, DatasetProfilingState>;
  setDatasetProgress: (id: string, state: DatasetProfilingState) => void;
  clearDatasetProgress: (id: string) => void;

  // ── Multi-pipeline training ──────────────────────────────────────────────
  /** Map of jobId → TrainingJobState */
  trainingJobs: Record<string, TrainingJobState>;
  /** Which job tab is active in the TrainingPanel */
  activeJobId: string | null;

  startJob: (
    jobId: string,
    pipelineIdOrEpochs: string | number,
    label?: string,
    epochs?: number,
    datasetName?: string,
    preprocessingSteps?: string[],
    modelTypes?: string[],
  ) => void;
  updateJob: (jobId: string, patch: Partial<TrainingJobState>) => void;
  removeJob: (jobId: string) => void;
  setActiveJobId: (jobId: string | null) => void;
  clearAllJobs: () => void;

  // Legacy single-training shim for existing visualisation nodes/pages
  training: TrainingJobState;
  updateTraining: (patch: Partial<TrainingJobState>) => void;
  resetTraining: () => void;

  // Console
  logs: LogEntry[];
  addLog: (level: LogEntry["level"], message: string, source?: string) => void;
  clearLogs: () => void;

  // Agent notifications
  agentNotifications: AgentNotification[];
  addAgentNotification: (
    agentName: string,
    type: AgentNotification["type"],
    message: string,
    details?: unknown,
  ) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  // Dataset intelligence
  datasetIntelligence: Record<string, DatasetIntelligence>;
  setDatasetIntelligence: (id: string, intel: DatasetIntelligence) => void;

  // Graph validation warnings
  graphWarnings: GraphValidationWarning[];
  setGraphWarnings: (warnings: GraphValidationWarning[]) => void;
  clearGraphWarnings: () => void;

  // Resource estimates
  resourceEstimate: ResourceResult | null;
  setResourceEstimate: (r: ResourceResult | null) => void;

  // UI panels
  consolePanelOpen: boolean;
  setConsolePanelOpen: (open: boolean) => void;
  agentPanelOpen: boolean;
  setAgentPanelOpen: (open: boolean) => void;
  trainingPanelOpen: boolean;
  setTrainingPanelOpen: (open: boolean) => void;
}

const EMPTY_JOB: TrainingJobState = {
  jobId: "",
  pipelineId: "",
  label: "No active job",
  status: "idle",
  progress: 0,
  epoch: 0,
  epochs: 10,
  metrics: { loss: [], accuracy: [], val_loss: [], val_accuracy: [] },
  gradientNorms: {},
  result: null,
  error: null,
  preprocessingSteps: [],
  datasetName: "",
  modelTypes: [],
  startedAt: "",
};

export const usePlexusStore = create<PlexusStore>((set, get) => ({
  backendOnline: false,
  setBackendOnline: (online) => set({ backendOnline: online }),

  // Datasets
  datasets: [],
  setDatasets: (datasets) => set({ datasets }),
  addDataset: (d) =>
    set((state) => ({
      datasets: [...state.datasets.filter((x) => x.id !== d.id), d],
    })),
  removeDataset: (id) =>
    set((state) => ({
      datasets: state.datasets.filter((d) => d.id !== id),
      selectedDatasetId:
        state.selectedDatasetId === id ? null : state.selectedDatasetId,
    })),
  patchDataset: (id, patch) =>
    set((state) => ({
      datasets: state.datasets.map((d) =>
        d.id === id ? { ...d, ...patch } : d,
      ),
    })),
  selectedDatasetId: null,
  selectDataset: (id) => set({ selectedDatasetId: id }),

  // Dataset profiling progress
  datasetProgress: {},
  setDatasetProgress: (id, progressState) =>
    set((state) => ({
      datasetProgress: { ...state.datasetProgress, [id]: progressState },
    })),
  clearDatasetProgress: (id) =>
    set((state) => {
      const next = { ...state.datasetProgress };
      delete next[id];
      return { datasetProgress: next };
    }),

  // ── Multi-pipeline training ────────────────────────────────────────────────
  trainingJobs: {},
  activeJobId: null,

  startJob: (
    jobId,
    pipelineIdOrEpochs,
    label,
    epochs,
    datasetName,
    preprocessingSteps = [],
    modelTypes = [],
  ) =>
    set((state) => {
      const isLegacyCall = typeof pipelineIdOrEpochs === "number";
      const resolvedEpochs = isLegacyCall ? pipelineIdOrEpochs : (epochs ?? 10);
      const resolvedPipelineId = isLegacyCall ? jobId : pipelineIdOrEpochs;
      const resolvedDatasetName = datasetName ?? "Dataset";
      const resolvedLabel =
        label ??
        (isLegacyCall
          ? `Training ${jobId}`
          : `${resolvedDatasetName} → ${modelTypes.length ? modelTypes.join("+") : "model"}`);

      const newJob: TrainingJobState = {
        jobId,
        pipelineId: resolvedPipelineId,
        label: resolvedLabel,
        status: "queued",
        progress: 0,
        epoch: 0,
        epochs: resolvedEpochs,
        metrics: { loss: [], accuracy: [], val_loss: [], val_accuracy: [] },
        gradientNorms: {},
        result: null,
        error: null,
        preprocessingSteps,
        datasetName: resolvedDatasetName,
        modelTypes,
        startedAt: new Date().toISOString(),
      };
      return {
        trainingJobs: { ...state.trainingJobs, [jobId]: newJob },
        activeJobId: jobId,
        trainingPanelOpen: true,
      };
    }),

  updateJob: (jobId, patch) =>
    set((state) => {
      const existing = state.trainingJobs[jobId];
      if (!existing) return state;
      return {
        trainingJobs: {
          ...state.trainingJobs,
          [jobId]: { ...existing, ...patch },
        },
      };
    }),

  removeJob: (jobId) =>
    set((state) => {
      const next = { ...state.trainingJobs };
      delete next[jobId];
      const ids = Object.keys(next);
      return {
        trainingJobs: next,
        activeJobId:
          state.activeJobId === jobId ? (ids[ids.length - 1] ?? null) : state.activeJobId,
      };
    }),

  setActiveJobId: (jobId) => set({ activeJobId: jobId }),

  clearAllJobs: () => set({ trainingJobs: {}, activeJobId: null }),

  // Legacy shim — returns the active job or an empty placeholder
  get training() {
    const state = get();
    const id = state.activeJobId;
    return (id ? state.trainingJobs[id] : undefined) ?? EMPTY_JOB;
  },

  updateTraining: (patch) =>
    set((state) => {
      const jobId = state.activeJobId;
      if (!jobId || !state.trainingJobs[jobId]) return state;
      return {
        trainingJobs: {
          ...state.trainingJobs,
          [jobId]: { ...state.trainingJobs[jobId], ...patch },
        },
      };
    }),

  resetTraining: () => set({ trainingJobs: {}, activeJobId: null }),

  // Console
  logs: [],
  addLog: (level, message, source) =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-499),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: new Date(),
          level,
          message,
          source,
        },
      ],
    })),
  clearLogs: () => set({ logs: [] }),

  // Agent notifications
  agentNotifications: [],
  addAgentNotification: (agentName, type, message, details) =>
    set((state) => ({
      agentNotifications: [
        ...state.agentNotifications,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          agentName,
          type,
          message,
          details,
          timestamp: new Date(),
          dismissed: false,
        },
      ],
    })),
  dismissNotification: (id) =>
    set((state) => ({
      agentNotifications: state.agentNotifications.map((n) =>
        n.id === id ? { ...n, dismissed: true } : n,
      ),
    })),
  clearNotifications: () => set({ agentNotifications: [] }),

  // Dataset intelligence
  datasetIntelligence: {},
  setDatasetIntelligence: (id, intel) =>
    set((state) => ({
      datasetIntelligence: { ...state.datasetIntelligence, [id]: intel },
    })),

  // Graph validation warnings
  graphWarnings: [],
  setGraphWarnings: (warnings) => set({ graphWarnings: warnings }),
  clearGraphWarnings: () => set({ graphWarnings: [] }),

  // Resource estimate
  resourceEstimate: null,
  setResourceEstimate: (r) => set({ resourceEstimate: r }),

  // UI panels
  consolePanelOpen: false,
  setConsolePanelOpen: (open) => set({ consolePanelOpen: open }),
  agentPanelOpen: false,
  setAgentPanelOpen: (open) => set({ agentPanelOpen: open }),
  trainingPanelOpen: false,
  setTrainingPanelOpen: (open) => set({ trainingPanelOpen: open }),
}));
