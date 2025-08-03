import React from "react";
import { ReactFlowProvider } from "reactflow";

import "reactflow/dist/style.css";
import FlowCanvas from "./FlowCanvas";

// ...existing code...

// Create a wrapper component that includes the Provider
const FlowCanvasWrapper: React.FC<any> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
};

// Export the wrapper instead of the base component
export default FlowCanvasWrapper;
