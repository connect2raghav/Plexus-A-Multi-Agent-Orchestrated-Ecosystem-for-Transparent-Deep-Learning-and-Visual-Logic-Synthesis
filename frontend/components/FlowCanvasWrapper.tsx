import React from "react";
import { ReactFlowProvider } from "reactflow";
import { Edge, Node } from "reactflow";

import FlowCanvas from "./FlowCanvas";

interface FlowCanvasWrapperProps {
  onNodeSelect: (node: Node | null) => void;
  templateType?: string | null;
  projectId?: string | null;
  /** Notify parent whenever the nodes array changes */
  onNodesChange?: (nodes: Node[]) => void;
  /** Notify parent whenever the edges array changes */
  onEdgesChange?: (edges: Edge[]) => void;
}

const FlowCanvasWrapper: React.FC<FlowCanvasWrapperProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
};

export default FlowCanvasWrapper;
