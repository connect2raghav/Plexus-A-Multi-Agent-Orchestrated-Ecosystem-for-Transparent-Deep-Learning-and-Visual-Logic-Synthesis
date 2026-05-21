/**
 * lib/api.ts
 * ----------
 * Typed API client for the Plexus FastAPI backend.
 *
 * All functions return plain objects. Errors throw { message: string }.
 * The base URL is read from NEXT_PUBLIC_PLEXUS_API_URL (default: http://localhost:8000).
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_PLEXUS_API_URL || "http://localhost:8000";

async function request<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init.headers },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let msg = text;

    try {
      const json = JSON.parse(text);

      msg = json.detail || json.message || text;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ============================================================
// Health
// ============================================================

export const checkHealth = () => request<{ status: string }>("/api/health");

// ============================================================
// Datasets
// ============================================================

export interface DatasetRecord {
  id: string;
  name: string;
  type: "csv" | "image_folder" | "text" | "unknown";
  size_bytes: number;
  path: string;
  uploaded_at: string;
  columns: string[];
  row_count: number;
  preview: Record<string, unknown>[] | string[];
  stats: Record<string, unknown>;
  status?: "profiling" | "ready" | "error";
  preprocessing_suggestions?: PreprocessingSuggestion[];
  cleaning_status?: CleaningStatus;
  architect_status?: {
    status: "pending" | "running" | "done" | "error";
    suggested_nodes?: string[];
    description?: string;
    error?: string;
  };
  is_cleaned_duplicate?: boolean;
  parent_dataset_id?: string;
}

export interface PreprocessingSuggestion {
  type: string;
  columns: string[];
  reason: string;
  node_type: string;
}

export interface CleaningStatus {
  status: "pending" | "running" | "done" | "error";
  code?: string;
  steps?: AgentStep[];
  validation?: { passed: boolean; error: string | null };
  error?: string;
}

export interface DatasetStatusRecord {
  progress: number;
  message: string;
  done: boolean;
  error: string | null;
  dataset_status: "profiling" | "ready" | "error";
  columns: string[];
  row_count: number;
  preprocessing_suggestions: PreprocessingSuggestion[];
  cleaning_status?: CleaningStatus;
  architect_status?: DatasetRecord["architect_status"];
}

export const uploadDataset = async (file: File): Promise<DatasetRecord> => {
  const form = new FormData();

  form.append("file", file);
  const res = await fetch(`${BASE_URL}/api/datasets/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error(await res.text());

  return res.json();
};

export const listDatasets = () =>
  request<{ datasets: DatasetRecord[] }>("/api/datasets").then(
    (r) => r.datasets,
  );

export const getDataset = (id: string) =>
  request<DatasetRecord>(`/api/datasets/${id}`);

export const deleteDataset = (id: string) =>
  request(`/api/datasets/${id}`, { method: "DELETE" });

export const updateDatasetAPI = (id: string, payload: Partial<DatasetRecord>) =>
  request<DatasetRecord>(`/api/datasets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const getDatasetStatus = (id: string) =>
  request<DatasetStatusRecord>(`/api/datasets/${id}/status`);

export const applyPreprocessing = (id: string) =>
  request<DatasetRecord>(`/api/datasets/${id}/apply-preprocessing`, {
    method: "POST",
  });

// ============================================================
// Agents
// ============================================================

export interface DataAgentResult {
  profile: Record<string, unknown>;
  code: string;
  steps: AgentStep[];
  validation: { passed: boolean; error: string | null };
}

export interface AgentStep {
  type: string;
  columns: string[];
  strategy?: string;
  method?: string;
}

export const runDataAgent = (datasetId: string, targetCol?: string) =>
  request<DataAgentResult>("/api/agents/data", {
    method: "POST",
    body: JSON.stringify({ dataset_id: datasetId, target_col: targetCol }),
  });

export interface ArchitectResult {
  layers: unknown[];
  description: string;
  keras_code: string;
  nodes: unknown[];
  edges: unknown[];
  suggested_nodes?: string[];
}

export const runArchitectAgent = (
  datasetId: string,
  taskType = "classification",
) =>
  request<ArchitectResult>("/api/agents/architect", {
    method: "POST",
    body: JSON.stringify({ dataset_id: datasetId, task_type: taskType }),
  });

export interface ResourceResult {
  total_parameters: number;
  trainable_parameters: number;
  memory_estimate_mb: number;
  estimated_training_seconds: number;
  hardware_recommendation: string;
  warnings: string[];
  model_size_kb: number;
  layer_stats: {
    id: string;
    type: string;
    params: number;
    output_size: number;
  }[];
}

export const runResourceAgent = (
  nodes: unknown[],
  edges: unknown[],
  batchSize = 32,
  epochs = 10,
) =>
  request<ResourceResult>("/api/agents/resource", {
    method: "POST",
    body: JSON.stringify({ nodes, edges, batch_size: batchSize, epochs }),
  });

export interface DebugResult {
  overall: "ok" | "warning" | "error";
  diagnoses: {
    type: string;
    severity: string;
    message: string;
    suggestions: string[];
    affected_nodes?: string[];
  }[];
  node_highlights: string[];
  summary: string;
}

export const runDebuggerAgent = (
  history: Record<string, number[]>,
  gradientNorms: Record<string, number> = {},
) =>
  request<DebugResult>("/api/agents/debug", {
    method: "POST",
    body: JSON.stringify({ history, gradient_norms: gradientNorms }),
  });

export interface OptimizerResult {
  suggestions: {
    param: string;
    current: unknown;
    recommended: unknown;
    reason: string;
  }[];
  recommended: Record<string, unknown>;
  summary: string;
}

export const runOptimizerAgent = (
  history: Record<string, number[]>,
  currentLr = 0.001,
  currentBatchSize = 32,
) =>
  request<OptimizerResult>("/api/agents/optimize", {
    method: "POST",
    body: JSON.stringify({
      history,
      current_lr: currentLr,
      current_batch_size: currentBatchSize,
    }),
  });

export interface DeploymentResult {
  files: Record<string, string>;
  summary: string;
}

export const runDeploymentAgent = (
  framework: string,
  outputUnits = 1,
  taskType = "classification",
  modelPath?: string,
  inputShape?: number[],
) =>
  request<DeploymentResult>("/api/agents/deploy", {
    method: "POST",
    body: JSON.stringify({
      framework,
      output_units: outputUnits,
      task_type: taskType,
      model_path: modelPath,
      input_shape: inputShape,
    }),
  });

export const downloadDeploymentZip = async (params: {
  framework: string;
  outputUnits: number;
  taskType: string;
  modelPath?: string;
  inputShape?: number[];
}): Promise<Blob> => {
  const res = await fetch(`${BASE_URL}/api/agents/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      framework: params.framework,
      output_units: params.outputUnits,
      task_type: params.taskType,
      model_path: params.modelPath,
      input_shape: params.inputShape,
      return_zip: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text);
  }

  return res.blob();
};

// ============================================================
// Code generation
// ============================================================

export const generateCode = (
  nodes: unknown[],
  edges: unknown[],
  framework = "tensorflow",
) =>
  request<{ code: string; framework: string }>("/api/generate/code", {
    method: "POST",
    body: JSON.stringify({ nodes, edges, framework }),
  });

// ============================================================
// Training
// ============================================================

export interface TrainJob {
  job_id: string;
  status: "queued" | "running" | "paused" | "stopped" | "completed" | "error";
}

export const startTraining = (params: {
  nodes: unknown[];
  edges: unknown[];
  datasetId: string;
  framework?: string;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
}) =>
  request<TrainJob>("/api/train/start", {
    method: "POST",
    body: JSON.stringify({
      nodes: params.nodes,
      edges: params.edges,
      dataset_id: params.datasetId,
      framework: params.framework || "tensorflow",
      epochs: params.epochs || 10,
      batch_size: params.batchSize || 32,
      learning_rate: params.learningRate || 0.001,
    }),
  });

export const getJobStatus = (jobId: string) =>
  request<{
    id: string;
    status: string;
    progress: number;
    epoch: number;
    epochs: number;
    metrics: Record<string, number[]>;
    gradient_norms: Record<string, number>;
    error: string | null;
    result: Record<string, unknown> | null;
    logs: string[];
  }>(`/api/train/${jobId}/status`);

export const updateJobStatus = (jobId: string, status: string) =>
  request<{ status: string }>(`/api/train/${jobId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

export interface PredictionResult {
  model_type: string;
  task_type: string;
  count: number;
  predictions: { prediction: string | number; confidence?: number | null }[];
}

export const predictModel = (
  artifactPath: string,
  rows: Record<string, unknown>[],
) =>
  request<PredictionResult>("/api/models/predict", {
    method: "POST",
    body: JSON.stringify({ artifact_path: artifactPath, rows }),
  });

// ============================================================
// WebSocket URL helper
// ============================================================

export const getTrainingWsUrl = (jobId: string): string => {
  const wsBase = BASE_URL.replace(/^http/, "ws");

  return `${wsBase}/ws/train/${jobId}`;
};
