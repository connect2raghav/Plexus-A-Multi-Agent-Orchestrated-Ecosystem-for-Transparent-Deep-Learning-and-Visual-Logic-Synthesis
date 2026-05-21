import type { Edge, Node } from "reactflow";

export const PREPROCESSING_TYPES = new Set([
  "normalize",
  "scale",
  "dropNulls",
  "oneHotEncode",
  "embedEncode",
]);

export const MODEL_TYPES = new Set([
  "randomForest",
  "svm",
  "knn",
  "logisticRegression",
  "decisionTree",
  "gradientBoosting",
  "extraTrees",
  "naiveBayes",
  "adaBoost",
  "linearRegression",
  "ridgeRegression",
  "lassoRegression",
  "mlpClassifier",
  "dense",
  "dropout",
  "batchnorm",
  "lstm",
  "gru",
  "conv2d",
  "inputLayer",
  "outputLayer",
  "hidden",
  "activation",
  "flatten",
  "reshape",
]);

const NON_TRAINING_TYPES = new Set([
  "training_config",
  "metrics",
  "exportCode",
  "apiDeploy",
  "lossCurve",
  "gradientFlow",
  "confMatrix",
  "predTable",
  "modelComparison",
  "evaluationResults",
  "activationHeatmap",
  "testModel",
  "ghost",
]);

export interface Pipeline {
  pipelineId: string;
  datasetNodeId: string;
  datasetId: string;
  datasetName: string;
  targetModelNode: Node;
  preprocessingNodes: Node[];
  modelNodes: Node[];
  allNodes: Node[];
  allEdges: Edge[];
}

const isTrainingNode = (node?: Node) =>
  Boolean(node && !NON_TRAINING_TYPES.has(node.type ?? ""));

const nodeLabel = (node: Node) =>
  String(node.data?.label ?? node.data?.modelName ?? node.type ?? node.id);

const isDatasetNode = (node?: Node) => node?.type === "dataset";

function collectForwardReachable(
  startId: string,
  nodeMap: Map<string, Node>,
  adjacency: Map<string, string[]>,
) {
  const visited = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;

    const node = nodeMap.get(id);
    if (!isTrainingNode(node)) continue;

    visited.add(id);
    for (const nextId of adjacency.get(id) ?? []) {
      const nextNode = nodeMap.get(nextId);

      // Do not let an upstream/raw dataset claim a downstream cleaned dataset
      // as part of the same training source. Each dataset node is its own root.
      if (nextId !== startId && isDatasetNode(nextNode)) continue;
      if (!visited.has(nextId)) queue.push(nextId);
    }
  }

  return visited;
}

function findShortestPathIds(
  startId: string,
  targetId: string,
  nodeMap: Map<string, Node>,
  adjacency: Map<string, string[]>,
) {
  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const queue = [startId];

  parent.set(startId, null);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;

    const node = nodeMap.get(id);
    if (!isTrainingNode(node)) continue;

    visited.add(id);
    if (id === targetId) break;

    for (const nextId of adjacency.get(id) ?? []) {
      const nextNode = nodeMap.get(nextId);

      // Prevent shortest-path search from passing through intermediate dataset
      // nodes, otherwise raw -> cleaned -> model becomes two training sources.
      if (nextId !== startId && isDatasetNode(nextNode)) continue;
      if (!visited.has(nextId) && !parent.has(nextId)) {
        parent.set(nextId, id);
        queue.push(nextId);
      }
    }
  }

  if (!parent.has(targetId)) return null;

  const path = new Set<string>();
  let current: string | null | undefined = targetId;

  while (current) {
    path.add(current);
    current = parent.get(current);
  }

  return path;
}

export function detectModelPipelines(nodes: Node[], edges: Edge[]): Pipeline[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
    adjacency.set(edge.target, [...(adjacency.get(edge.target) ?? []), edge.source]);
  }

  const datasetNodes = nodes.filter(
    (node) => node.type === "dataset" && node.data?.datasetId,
  );
  const pipelines: Pipeline[] = [];

  for (const datasetNode of datasetNodes) {
    const reachable = collectForwardReachable(datasetNode.id, nodeMap, adjacency);
    const reachableModels = nodes.filter(
      (node) => reachable.has(node.id) && MODEL_TYPES.has(node.type ?? ""),
    );

    for (const modelNode of reachableModels) {
      const pathIds = findShortestPathIds(
        datasetNode.id,
        modelNode.id,
        nodeMap,
        adjacency,
      );

      if (!pathIds) continue;

      if (!pathIds.has(datasetNode.id) || !pathIds.has(modelNode.id)) continue;

      const pathNodes = nodes.filter((node) => pathIds.has(node.id));
      const pathEdges = edges.filter(
        (edge) => pathIds.has(edge.source) && pathIds.has(edge.target),
      );

      pipelines.push({
        pipelineId: `${datasetNode.id}::${modelNode.id}`,
        datasetNodeId: datasetNode.id,
        datasetId: String(datasetNode.data?.datasetId ?? ""),
        datasetName: String(
          datasetNode.data?.datasetName ?? datasetNode.data?.label ?? "Dataset",
        ),
        targetModelNode: modelNode,
        preprocessingNodes: pathNodes.filter((node) =>
          PREPROCESSING_TYPES.has(node.type ?? ""),
        ),
        modelNodes: pathNodes.filter((node) => MODEL_TYPES.has(node.type ?? "")),
        allNodes: pathNodes,
        allEdges: pathEdges,
      });
    }
  }

  return pipelines.sort((a, b) =>
    `${a.datasetName}-${nodeLabel(a.targetModelNode)}`.localeCompare(
      `${b.datasetName}-${nodeLabel(b.targetModelNode)}`,
    ),
  );
}

export function pipelineModelLabel(pipeline: Pipeline) {
  return nodeLabel(pipeline.targetModelNode);
}
