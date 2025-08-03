import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Icon } from '@iconify/react';
import { nodeStyles } from './nodeStyles';
import clsx from 'clsx';

const BaseNode = ({ data, type, selected, isConnectable }: NodeProps) => {
  return (
    <div
      className={clsx(
        nodeStyles.base,
        nodeStyles[type as keyof typeof nodeStyles] || nodeStyles.dense,
        selected && nodeStyles.selected,
        'p-4'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={nodeStyles.handle}
        isConnectable={isConnectable}
      />

      <div className="flex items-center gap-2">
        {data.icon && <Icon icon={data.icon} className="w-5 h-5" />}
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          {data.details && (
            <div className="text-xs text-gray-500">{data.details}</div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={nodeStyles.handle}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const InputLayer = ({ data, type, selected, isConnectable }: NodeProps) => {
  const handleCountChange = (delta: number) => {
    data.onChange?.(data.count + delta);
  };

  return (
    <div className={clsx(
      "w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-md group relative",
      "transition-all duration-200",
      selected ? "ring-2 ring-blue-300 shadow-lg" : "",
      type === 'input' ? "bg-blue-500" : "bg-blue-400"
    )}>
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
        type="source"
        position={Position.Right}
        className={nodeStyles.handle}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const HiddenLayer = ({ data, type, selected, isConnectable }: NodeProps) => {
  const handleCountChange = (delta: number) => {
    data.onChange?.(data.count + delta);
  };

  return (
    <div className={clsx(
      "w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-md group relative",
      "transition-all duration-200",
      selected ? "ring-2 ring-purple-300 shadow-lg" : "",
      type === 'hidden' ? "bg-purple-500" : "bg-purple-400"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        className={nodeStyles.handle}
        isConnectable={isConnectable}
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
        type="source"
        position={Position.Right}
        className={nodeStyles.handle}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const OutputLayer = ({ data, type, selected, isConnectable }: NodeProps) => {
  const handleCountChange = (delta: number) => {
    data.onChange?.(data.count + delta);
  };

  return (
    <div className={clsx(
      "w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-md group relative",
      "transition-all duration-200",
      selected ? "ring-2 ring-green-300 shadow-lg" : "",
      "bg-green-500"
    )}>
      <Handle
        type="target"
        position={Position.Left}
        className={nodeStyles.handle}
        isConnectable={isConnectable}
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
  conv2d: memo((props: NodeProps) => <BaseNode {...props} />),
  maxpool: memo((props: NodeProps) => <BaseNode {...props} />),
  dropout: memo((props: NodeProps) => <BaseNode {...props} />),
  activation: memo((props: NodeProps) => <BaseNode {...props} />),
  lstm: memo((props: NodeProps) => <BaseNode {...props} />),
  concat: memo((props: NodeProps) => <BaseNode {...props} />),
  // Add other node types as needed
};