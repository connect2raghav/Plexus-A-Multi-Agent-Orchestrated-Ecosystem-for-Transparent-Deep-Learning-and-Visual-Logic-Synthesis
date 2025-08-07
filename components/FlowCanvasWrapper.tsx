import React from "react";
import { ReactFlowProvider } from "reactflow";
import { Node } from "reactflow";

import "reactflow/dist/style.css";
import FlowCanvas from "./FlowCanvas";

interface FlowCanvasWrapperProps {
  onNodeSelect: (node: Node | null) => void;
  templateType?: string | null;
  projectId?: string | null;
}

// Create a wrapper component that includes the Provider
const FlowCanvasWrapper: React.FC<FlowCanvasWrapperProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
};

// Export the wrapper instead of the base component
export default FlowCanvasWrapper;
