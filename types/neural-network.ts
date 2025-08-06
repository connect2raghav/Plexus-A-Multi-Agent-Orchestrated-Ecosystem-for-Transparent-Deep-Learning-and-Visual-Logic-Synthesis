import { Node as ReactFlowNode, Edge as ReactFlowEdge } from "reactflow";

// Extended node data interface for neural network nodes
export interface NodeData {
  label?: string;
  icon?: string;
  details?: string;
  count?: number;
  params?: Record<string, any>;
  onChange?: (newCount: number) => void;
}

// Type-safe node interface extending ReactFlow's Node
export interface NeuralNetworkNode extends ReactFlowNode {
  data: NodeData;
}

// Re-export ReactFlow types for consistency
export type { ReactFlowEdge as Edge };
export type { ReactFlowNode };

// Framework types for code generation
export type Framework = "tensorflow" | "pytorch";

// Node types supported by the neural network editor
export type NodeType =
  | "input"
  | "inputLayer"
  | "hidden"
  | "output"
  | "outputLayer"
  | "conv2d"
  | "maxpool"
  | "dropout"
  | "activation"
  | "lstm"
  | "concat";

// Code generation result interface
export interface CodeGenerationResult {
  code: string;
  framework: Framework;
  timestamp: Date;
}
