import React, { useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { Node } from "reactflow";

import EnhancedSidebar from "@/components/EnhancedSidebar";
import FlowCanvasWrapper from "@/components/FlowCanvasWrapper";

export default function NeuralNetworkPage() {
  const [_selectedNode, setSelectedNode] = useState<Node | null>(null);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <EnhancedSidebar />
      <div className="flex flex-col flex-1">
        <Card className="flex-1 m-4">
          <CardBody>
            <FlowCanvasWrapper onNodeSelect={setSelectedNode} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
