/**
 * store/plexusStore.ts
 * --------------------
 * Global Zustand store for Plexus.
 * Manages: datasets, training job state, console logs, agent results.
 */

import { create } from "zustand";
import type { DatasetRecord, ResourceResult, PreprocessingSuggestion, CleaningStatus } from "@/lib/api";

// ---- Log entry ----
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "success" | "warning" | "error" | "agent";
  message: string;
  source?: string;
}

// ---- Training state ----
export interface TrainingMetrics {
  loss: number[];
  accuracy: number[];
  val_loss: number[];
  val_accuracy: number[];
}

export interface TrainingState {
  jobId: string | null;
  status: "idle" | "queued" | "running" | "completed" | "error";
  progress: number;
  epoch: number;
  epochs: number;
  metrics: TrainingMetrics;
  gradientNorms: Record<string, number>;
  highlightedNodes: string[];
  result: Record<string, unknown> | null;
  error: string | null;
}

// ---- Dataset profiling progress ----
export interface DatasetProfilingState {
  progress: number;          // 0-100
  message: string;
  done: boolean;
  error: string | null;
  preprocessing_suggestions: PreprocessingSuggestion[];
  cleaning_status?: CleaningStatus;
}

// ---- Agent results ----
export interface AgentNotification {
  id: string;
  agentName: string;
  type: "suggestion" | "warning" | "error" | "info";
  message: string;
  details?: unknown;
  timestamp: Date;
  dismissed: boolean;
}

// ---- Store shape ----
export interface PlexusStore {
  // Backend connectivity
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

  // Training
  training: TrainingState;
  startJob: (jobId: string, epochs: number) => void;
  updateTraining: (patch: Partial<TrainingState>) => void;
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
    details?: unknown
  ) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  // Resource estimates (live as graph changes)
  resourceEstimate: ResourceResult | null;
  setResourceEstimate: (r: ResourceResult | null) => void;

  // UI state
  consolePanelOpen: boolean;
  setConsolePanelOpen: (open: boolean) => void;
  agentPanelOpen: boolean;
  setAgentPanelOpen: (open: boolean) => void;
  trainingPanelOpen: boolean;
  setTrainingPanelOpen: (open: boolean) => void;
}

const INITIAL_TRAINING: TrainingState = {
  jobId: null,
  status: "idle",
  progress: 0,
  epoch: 0,
  epochs: 10,
  metrics: { loss: [], accuracy: [], val_loss: [], val_accuracy: [] },
  gradientNorms: {},
  highlightedNodes: [],
  result: null,
  error: null,
};

export const usePlexusStore = create<PlexusStore>((set) => ({
  // Backend
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
      datasets: state.datasets.map((d) => (d.id === id ? { ...d, ...patch } : d)),
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

  // Training
  training: INITIAL_TRAINING,
  startJob: (jobId, epochs) =>
    set({
      training: {
        ...INITIAL_TRAINING,
        jobId,
        epochs,
        status: "queued",
      },
      trainingPanelOpen: true,
    }),
  updateTraining: (patch) =>
    set((state) => ({ training: { ...state.training, ...patch } })),
  resetTraining: () => set({ training: INITIAL_TRAINING }),

  // Console
  logs: [],
  addLog: (level, message, source) =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-499), // keep last 500
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
        n.id === id ? { ...n, dismissed: true } : n
      ),
    })),
  clearNotifications: () => set({ agentNotifications: [] }),

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
