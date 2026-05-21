/**
 * hooks/useGraphValidation.ts
 * ----------------------------
 * Client-side static validation engine for the Plexus graph.
 *
 * Rules (deterministic, no LLM):
 *  1. No input-type node present → error on every non-trivial node.
 *  2. No output-type node present → warning.
 *  3. Multiple input layers → error on each extra input.
 *  4. Island nodes (zero connections) → warning.
 *  5. Non-source nodes with no incoming edge → warning.
 *  6. Non-sink nodes with no outgoing edge → warning.
 *  7. Dataset node still profiling → warning.
 *
 * Source nodes   (only outgoing allowed): inputLayer, textInput, dataset
 * Sink nodes     (only incoming allowed): outputLayer, textOutput,
 *                                         lossCurve, gradientFlow, confMatrix,
 *                                         predTable, activationHeatmap,
 *                                         testModel, exportCode, apiDeploy
 */

import type { Node, Edge } from "reactflow";

import { useMemo } from "react";

// ---- Types ----
export interface ValidationIssue {
  nodeId: string;
  severity: "error" | "warning";
  message: string;
}

export interface GraphValidationResult {
  issues: ValidationIssue[];
  errorNodeIds: Set<string>;
  warningNodeIds: Set<string>;
  /** Map of nodeId → messages (sorted severity-first) */
  nodeMessages: Record<string, string[]>;
  isValid: boolean;
}

// ---- Constants ----
const SOURCE_TYPES = new Set(["inputLayer", "textInput", "dataset"]);

const SINK_TYPES = new Set([
  "outputLayer",
  "textOutput",
  "lossCurve",
  "gradientFlow",
  "confMatrix",
  "predTable",
  "activationHeatmap",
  "testModel",
  "exportCode",
  "apiDeploy",
  "evaluationResults",
]);

const INPUT_TYPES = new Set(["inputLayer", "textInput"]);

function makeIssue(
  nodeId: string,
  severity: "error" | "warning",
  message: string,
): ValidationIssue {
  return { nodeId, severity, message };
}

// ---- Hook ----
export function useGraphValidation(
  nodes: Node[],
  edges: Edge[],
): GraphValidationResult {
  return useMemo(() => {
    const issues: ValidationIssue[] = [];

    if (nodes.length === 0) {
      return {
        issues: [],
        errorNodeIds: new Set(),
        warningNodeIds: new Set(),
        nodeMessages: {},
        isValid: true,
      };
    }

    // Build adjacency helpers
    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};

    nodes.forEach((n) => {
      inDegree[n.id] = 0;
      outDegree[n.id] = 0;
    });
    edges.forEach((e) => {
      outDegree[e.source] = (outDegree[e.source] || 0) + 1;
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    });

    // Rule 1 & 3: Input node checks
    const inputNodes = nodes.filter((n) => n.type && INPUT_TYPES.has(n.type));

    if (inputNodes.length === 0) {
      // No input node – warn non-sink, non-source nodes about missing data source
      nodes
        .filter(
          (n) => n.type && !SINK_TYPES.has(n.type) && !SOURCE_TYPES.has(n.type),
        )
        .forEach((n) =>
          issues.push(
            makeIssue(
              n.id,
              "error",
              "No input layer in graph — add an Input Layer or Dataset node",
            ),
          ),
        );
    } else if (inputNodes.length > 1) {
      inputNodes
        .slice(1)
        .forEach((n) =>
          issues.push(
            makeIssue(n.id, "error", "Only one input layer is allowed"),
          ),
        );
    }

    // Rule 2: Output node check
    const outputNodes = nodes.filter(
      (n) => n.type === "outputLayer" || n.type === "textOutput",
    );

    if (outputNodes.length === 0) {
      // Warn on non-sink, non-source nodes
      nodes
        .filter(
          (n) => n.type && !SINK_TYPES.has(n.type) && !SOURCE_TYPES.has(n.type),
        )
        .forEach((n) =>
          issues.push(
            makeIssue(
              n.id,
              "warning",
              "No output layer in graph — add an Output Layer or visualisation node",
            ),
          ),
        );
    }

    // Rule 4: Island nodes
    nodes.forEach((n) => {
      if ((inDegree[n.id] || 0) === 0 && (outDegree[n.id] || 0) === 0) {
        issues.push(
          makeIssue(n.id, "warning", "Node is not connected to anything"),
        );
      }
    });

    // Rule 5: Non-source nodes missing incoming edge
    nodes
      .filter(
        (n) =>
          n.type &&
          !SOURCE_TYPES.has(n.type) &&
          (inDegree[n.id] || 0) === 0 &&
          !((outDegree[n.id] || 0) === 0), // avoid double-reporting islands
      )
      .forEach((n) =>
        issues.push(
          makeIssue(
            n.id,
            "warning",
            "No incoming connection — connect a preceding layer",
          ),
        ),
      );

    // Rule 6: Non-sink nodes missing outgoing edge
    nodes
      .filter(
        (n) =>
          n.type &&
          !SINK_TYPES.has(n.type) &&
          (outDegree[n.id] || 0) === 0 &&
          !((inDegree[n.id] || 0) === 0), // avoid double-reporting islands
      )
      .forEach((n) =>
        issues.push(
          makeIssue(
            n.id,
            "warning",
            "No outgoing connection — connect to the next layer",
          ),
        ),
      );

    // Rule 7: Conv2D / MaxPool must be followed by Flatten before Dense/Output
    const CONV_TYPES = new Set(["conv2d", "maxpool"]);
    const DENSE_TYPES = new Set(["dense", "outputLayer", "hidden"]);

    // Build adjacency map
    const successors: Record<string, string[]> = {};

    edges.forEach((e) => {
      if (!successors[e.source]) successors[e.source] = [];
      successors[e.source].push(e.target);
    });

    // For each Dense-type node, walk predecessors to see if a conv node
    // is reachable without passing through a flatten node.
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const predecessors: Record<string, string[]> = {};

    edges.forEach((e) => {
      if (!predecessors[e.target]) predecessors[e.target] = [];
      predecessors[e.target].push(e.source);
    });

    const convReachesDenseWithoutFlatten = (startId: string): boolean => {
      const visited = new Set<string>();
      const stack = [startId];

      while (stack.length > 0) {
        const cur = stack.pop()!;

        if (visited.has(cur)) continue;
        visited.add(cur);
        const curNode = nodeMap.get(cur);

        if (!curNode) continue;
        if (curNode.type === "flatten") continue; // flatten blocks the path
        if (curNode.type && CONV_TYPES.has(curNode.type)) return true;
        (predecessors[cur] || []).forEach((p) => stack.push(p));
      }

      return false;
    };

    nodes
      .filter((n) => n.type && DENSE_TYPES.has(n.type))
      .forEach((n) => {
        if (convReachesDenseWithoutFlatten(n.id)) {
          issues.push(
            makeIssue(
              n.id,
              "error",
              "Conv2D / MaxPool output must pass through a Flatten layer before reaching a Dense layer",
            ),
          );
        }
      });

    // Rule 8: Dataset column count vs Input shape mismatch
    const datasetNodes = nodes.filter(
      (n) => n.type === "dataset" && n.data?.columns?.length > 0,
    );
    const inputNodesForShape = nodes.filter(
      (n) => n.type === "inputLayer" && n.data?.params?.shape,
    );

    if (datasetNodes.length > 0 && inputNodesForShape.length > 0) {
      const dsColCount = (datasetNodes[0].data.columns as string[]).length;
      const inputShape = inputNodesForShape[0].data.params.shape;

      if (
        Array.isArray(inputShape) &&
        inputShape.length === 1 &&
        inputShape[0] !== dsColCount
      ) {
        issues.push(
          makeIssue(
            inputNodesForShape[0].id,
            "warning",
            `Input shape [${inputShape[0]}] does not match dataset column count (${dsColCount})`,
          ),
        );
      }
    }

    // Build output maps
    const errorNodeIds = new Set(
      issues.filter((i) => i.severity === "error").map((i) => i.nodeId),
    );
    const warningNodeIds = new Set(
      issues.filter((i) => i.severity === "warning").map((i) => i.nodeId),
    );
    const nodeMessages: Record<string, string[]> = {};

    issues.forEach(({ nodeId, message, severity }) => {
      if (!nodeMessages[nodeId]) nodeMessages[nodeId] = [];
      nodeMessages[nodeId].push(
        severity === "error" ? `✕ ${message}` : `⚠ ${message}`,
      );
    });

    return {
      issues,
      errorNodeIds,
      warningNodeIds,
      nodeMessages,
      isValid: errorNodeIds.size === 0,
    };
  }, [nodes, edges]);
}
