import React, { useState, useEffect } from "react";
import { Card, CardBody } from "@heroui/react";
import { Node } from "reactflow";
import { useRouter } from "next/router";

import EnhancedSidebar from "@/components/EnhancedSidebar";
import FlowCanvasWrapper from "@/components/FlowCanvasWrapper";

export default function NeuralNetworkPage() {
  const [_selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [templateType, setTemplateType] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if there's a template query parameter
    if (router.query.template) {
      setTemplateType(router.query.template as string);
    }
  }, [router.query]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <EnhancedSidebar />
      <div className="flex flex-col flex-1">
        <Card className="flex-1 m-4">
          <CardBody>
            <FlowCanvasWrapper 
              onNodeSelect={setSelectedNode} 
              templateType={templateType}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
