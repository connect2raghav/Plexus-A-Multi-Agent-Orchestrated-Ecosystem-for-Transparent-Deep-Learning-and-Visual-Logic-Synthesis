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

import { useMemo } from "react";
import type { Node, Edge } from "reactflow";
import { usePlexusStore } from "@/store/plexusStore";

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
const SOURCE_TYPES = new Set([
  "inputLayer",
  "textInput",
  "dataset",
]);

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
]);

const INPUT_TYPES = new Set(["inputLayer", "textInput"]);

function makeIssue(
  nodeId: string,
  severity: "error" | "warning",
  message: string
): ValidationIssue {
  return { nodeId, severity, message };
}

// ---- Hook ----
export function useGraphValidation(
  nodes: Node[],
  edges: Edge[]
): GraphValidationResult {
  const datasetProgress = usePlexusStore((s) => s.datasetProgress);

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
        .filter((n) => n.type && !SINK_TYPES.has(n.type) && !SOURCE_TYPES.has(n.type))
        .forEach((n) =>
          issues.push(makeIssue(n.id, "error", "No input layer in graph — add an Input Layer or Dataset node"))
        );
    } else if (inputNodes.length > 1) {
      inputNodes.slice(1).forEach((n) =>
        issues.push(makeIssue(n.id, "error", "Only one input layer is allowed"))
      );
    }

    // Rule 2: Output node check
    const outputNodes = nodes.filter(
      (n) => n.type === "outputLayer" || n.type === "textOutput"
    );
    if (outputNodes.length === 0) {
      // Warn on non-sink, non-source nodes
      nodes
        .filter(
          (n) =>
            n.type &&
            !SINK_TYPES.has(n.type) &&
            !SOURCE_TYPES.has(n.type)
        )
        .forEach((n) =>
          issues.push(
            makeIssue(n.id, "warning", "No output layer in graph — add an Output Layer or visualisation node")
          )
        );
    }

    // Rule 4: Island nodes
    nodes.forEach((n) => {
      if ((inDegree[n.id] || 0) === 0 && (outDegree[n.id] || 0) === 0) {
        issues.push(makeIssue(n.id, "warning", "Node is not connected to anything"));
      }
    });

    // Rule 5: Non-source nodes missing incoming edge
    nodes
      .filter(
        (n) =>
          n.type &&
          !SOURCE_TYPES.has(n.type) &&
          (inDegree[n.id] || 0) === 0 &&
          !((outDegree[n.id] || 0) === 0) // avoid double-reporting islands
      )
      .forEach((n) =>
        issues.push(makeIssue(n.id, "warning", "No incoming connection — connect a preceding layer"))
      );

    // Rule 6: Non-sink nodes missing outgoing edge
    nodes
      .filter(
        (n) =>
          n.type &&
          !SINK_TYPES.has(n.type) &&
          (outDegree[n.id] || 0) === 0 &&
          !((inDegree[n.id] || 0) === 0)  // avoid double-reporting islands
      )
      .forEach((n) =>
        issues.push(makeIssue(n.id, "warning", "No outgoing connection — connect to the next layer"))
      );

    // Rule 7: Dataset node still profiling
    nodes
      .filter((n) => n.type === "dataset" && n.data?.datasetId)
      .forEach((n) => {
        const prog = datasetProgress[n.data.datasetId as string];
        if (prog && !prog.done && !prog.error) {
          issues.push(
            makeIssue(
              n.id,
              "warning",
              `Dataset is still profiling (${prog.progress}%)…`
            )
          );
        }
        if (prog?.error) {
          issues.push(
            makeIssue(n.id, "error", `Dataset profiling failed: ${prog.error}`)
          );
        }
      });

    // Build output maps
    const errorNodeIds = new Set(
      issues.filter((i) => i.severity === "error").map((i) => i.nodeId)
    );
    const warningNodeIds = new Set(
      issues.filter((i) => i.severity === "warning").map((i) => i.nodeId)
    );
    const nodeMessages: Record<string, string[]> = {};
    issues.forEach(({ nodeId, message, severity }) => {
      if (!nodeMessages[nodeId]) nodeMessages[nodeId] = [];
      nodeMessages[nodeId].push(severity === "error" ? `✕ ${message}` : `⚠ ${message}`);
    });

    return {
      issues,
      errorNodeIds,
      warningNodeIds,
      nodeMessages,
      isValid: errorNodeIds.size === 0,
    };
  }, [nodes, edges, datasetProgress]);
}
