import React from 'react';
import { Input, Slider } from '@heroui/react';
import { Node } from 'reactflow';

interface NodeOptionsProps {
  selectedNode: Node | null;
}

const NodeOptions: React.FC<NodeOptionsProps> = ({ selectedNode }) => {
  if (!selectedNode) {
    return <p>Select a node to view options</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Node Label"
        placeholder="Enter node label"
        value={selectedNode.data.label}
        onChange={() => {}} // Add onChange handler to update node label
      />
      <Slider
        label="Neurons"
        step={1}
        maxValue={100}
        minValue={1}
        defaultValue={10}
        className="max-w-md"
      />
      <Slider
        label="Learning Rate"
        step={0.01}
        maxValue={1}
        minValue={0}
        defaultValue={0.1}
        className="max-w-md"
      />
    </div>
  );
};

export default NodeOptions;