import React from 'react';
import { Card, CardBody, Divider } from '@heroui/react';
import Sidebar from '@/components/Sidebar';
import FlowCanvas from '@/components/FlowCanvas';
import NodeOptions from '@/components/NodeOptions';
import FlowCanvasWrapper from '@/components/FlowCanvasWrapper';

const App: React.FC = () => {
  const [selectedNode, setSelectedNode] = React.useState<any | null>(null);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Card className="flex-1 m-4">
          <CardBody>
            <FlowCanvasWrapper onNodeSelect={setSelectedNode} />
          </CardBody>
        </Card>
      </div>
      <Card className="w-80 m-4">
        <CardBody>
          <h2 className="text-lg font-semibold mb-2">Node Options</h2>
          <Divider className="my-2" />
          <NodeOptions selectedNode={selectedNode} />
        </CardBody>
      </Card>
    </div>
  );
};

export default App;