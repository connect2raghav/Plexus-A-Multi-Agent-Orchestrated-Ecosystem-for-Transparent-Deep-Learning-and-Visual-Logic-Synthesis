import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Icon } from "@iconify/react";
import clsx from "clsx";

import { nodeStyles } from "./nodeStyles";

const BaseNode = ({ data, type, selected, isConnectable }: NodeProps) => {
  return (
    <div
      className={clsx(
        nodeStyles.base,
        nodeStyles[type as keyof typeof nodeStyles] || nodeStyles.dense,
        selected && nodeStyles.selected,
        "p-4",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />

      <div className="flex items-center gap-2">
        {data.icon && <Icon className="w-5 h-5" icon={data.icon} />}
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          {data.details && (
            <div className="text-xs text-gray-500">{data.details}</div>
          )}
        </div>
      </div>

      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Right}
        type="source"
      />
    </div>
  );
};

const InputLayer = ({ data, type, selected, isConnectable }: NodeProps) => {
  const handleCountChange = (delta: number) => {
    data.onChange?.(data.count + delta);
  };

  return (
    <div
      className={clsx(
        "w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-md group relative",
        "transition-all duration-200",
        selected ? "ring-2 ring-blue-300 shadow-lg" : "",
        type === "input" ? "bg-blue-500" : "bg-blue-400",
      )}
    >
      <span className="text-white text-sm font-medium">Input</span>
      <span className="text-white text-xs">{data.count || 0}</span>
      <div className="absolute opacity-0 group-hover:opacity-100 flex gap-1 -bottom-8 bg-white rounded-md shadow-md p-1">
        <button
          className="text-blue-500 hover:text-blue-700 px-2 py-1"
          onClick={() => handleCountChange(-1)}
        >
          -
        </button>
        <button
          className="text-blue-500 hover:text-blue-700 px-2 py-1"
          onClick={() => handleCountChange(1)}
        >
          +
        </button>
      </div>
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Right}
        type="source"
      />
    </div>
  );
};

const HiddenLayer = ({ data, type, selected, isConnectable }: NodeProps) => {
  const handleCountChange = (delta: number) => {
    data.onChange?.(data.count + delta);
  };

  return (
    <div
      className={clsx(
        "w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-md group relative",
        "transition-all duration-200",
        selected ? "ring-2 ring-purple-300 shadow-lg" : "",
        type === "hidden" ? "bg-purple-500" : "bg-purple-400",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />
      <span className="text-white text-sm font-medium">Hidden</span>
      <span className="text-white text-xs">{data.count || 0}</span>
      <div className="absolute opacity-0 group-hover:opacity-100 flex gap-1 -bottom-8 bg-white rounded-md shadow-md p-1">
        <button
          className="text-purple-500 hover:text-purple-700 px-2 py-1"
          onClick={() => handleCountChange(-1)}
        >
          -
        </button>
        <button
          className="text-purple-500 hover:text-purple-700 px-2 py-1"
          onClick={() => handleCountChange(1)}
        >
          +
        </button>
      </div>
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Right}
        type="source"
      />
    </div>
  );
};

const OutputLayer = ({ data, type, selected, isConnectable }: NodeProps) => {
  const handleCountChange = (delta: number) => {
    data.onChange?.(data.count + delta);
  };

  return (
    <div
      className={clsx(
        "w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-md group relative",
        "transition-all duration-200",
        selected ? "ring-2 ring-green-300 shadow-lg" : "",
        "bg-green-500",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />
      <span className="text-white text-sm font-medium">Output</span>
      <span className="text-white text-xs">{data.count || 0}</span>
      <div className="absolute opacity-0 group-hover:opacity-100 flex gap-1 -bottom-8 bg-white rounded-md shadow-md p-1">
        <button
          className="text-green-500 hover:text-green-700 px-2 py-1"
          onClick={() => handleCountChange(-1)}
        >
          -
        </button>
        <button
          className="text-green-500 hover:text-green-700 px-2 py-1"
          onClick={() => handleCountChange(1)}
        >
          +
        </button>
      </div>
    </div>
  );
};

// Update the nodeTypes object to use both InputLayer and OutputLayer
export const nodeTypes = {
  input: memo((props: NodeProps) => <InputLayer {...props} />),
  output: memo((props: NodeProps) => <OutputLayer {...props} />),
  hidden: memo((props: NodeProps) => <HiddenLayer {...props} />),
  dense: memo((props: NodeProps) => <BaseNode {...props} />),
  conv2d: memo((props: NodeProps) => <BaseNode {...props} />),
  maxpool: memo((props: NodeProps) => <BaseNode {...props} />),
  dropout: memo((props: NodeProps) => <BaseNode {...props} />),
  activation: memo((props: NodeProps) => <BaseNode {...props} />),
  lstm: memo((props: NodeProps) => <BaseNode {...props} />),
  concat: memo((props: NodeProps) => <BaseNode {...props} />),
  flatten: memo((props: NodeProps) => <BaseNode {...props} />),
  reshape: memo((props: NodeProps) => <BaseNode {...props} />),
  batchnorm: memo((props: NodeProps) => <BaseNode {...props} />),
  add: memo((props: NodeProps) => <BaseNode {...props} />),
  subtract: memo((props: NodeProps) => <BaseNode {...props} />),
  multiply: memo((props: NodeProps) => <BaseNode {...props} />),
  average: memo((props: NodeProps) => <BaseNode {...props} />),
  globalavgpool: memo((props: NodeProps) => <BaseNode {...props} />),
  globalmaxpool: memo((props: NodeProps) => <BaseNode {...props} />),
  embedding: memo((props: NodeProps) => <BaseNode {...props} />),
  gru: memo((props: NodeProps) => <BaseNode {...props} />),
  repeatvector: memo((props: NodeProps) => <BaseNode {...props} />),
  bidirectional: memo((props: NodeProps) => <BaseNode {...props} />),
  time_distributed: memo((props: NodeProps) => <BaseNode {...props} />),
  custom: memo((props: NodeProps) => <BaseNode {...props} />),
  // Add other node types as needed
};
