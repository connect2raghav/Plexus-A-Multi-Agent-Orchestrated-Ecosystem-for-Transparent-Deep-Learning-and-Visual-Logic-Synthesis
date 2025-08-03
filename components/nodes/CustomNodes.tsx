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

export const nodeTypes = {
  input: memo((props: NodeProps) => <BaseNode {...props} />),
  output: memo((props: NodeProps) => <BaseNode {...props} />),
  dense: memo((props: NodeProps) => <BaseNode {...props} />),
  conv2d: memo((props: NodeProps) => <BaseNode {...props} />),
  maxpool: memo((props: NodeProps) => <BaseNode {...props} />),
  dropout: memo((props: NodeProps) => <BaseNode {...props} />),
  activation: memo((props: NodeProps) => <BaseNode {...props} />),
  lstm: memo((props: NodeProps) => <BaseNode {...props} />),
  concat: memo((props: NodeProps) => <BaseNode {...props} />),
  // Add other node types as needed
};