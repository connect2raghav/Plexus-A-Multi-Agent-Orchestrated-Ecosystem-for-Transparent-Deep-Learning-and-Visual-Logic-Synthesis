import React from "react";
import { Input, Slider } from "@heroui/react";
import { Node } from "reactflow";

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
        className="max-w-md"
        defaultValue={10}
        label="Neurons"
        maxValue={100}
        minValue={1}
        step={1}
      />
      <Slider
        className="max-w-md"
        defaultValue={0.1}
        label="Learning Rate"
        maxValue={1}
        minValue={0}
        step={0.01}
      />
    </div>
  );
};

export default NodeOptions;
