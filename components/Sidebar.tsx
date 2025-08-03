import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Icon } from '@iconify/react';

const nodeTypesByCategory = [
  {
    category: 'Input/Output',
    nodes: [
      { type: 'input', label: 'Input', icon: 'lucide:box' },
      { type: 'output', label: 'Output', icon: 'lucide:arrow-right' },
    ],
  },
  {
    category: 'Core',
    nodes: [
      { type: 'dense', label: 'Dense', icon: 'lucide:grid' },
      { type: 'hidden', label: 'Hidden', icon: 'lucide:layers' },
      { type: 'flatten', label: 'Flatten', icon: 'lucide:align-horizontal-space-around' },
      { type: 'reshape', label: 'Reshape', icon: 'lucide:shuffle' },
      { type: 'embedding', label: 'Embedding', icon: 'lucide:layers' },
    ],
  },
  {
    category: 'Convolutional',
    nodes: [
      { type: 'conv2d', label: 'Conv2D', icon: 'lucide:square' },
      { type: 'maxpool', label: 'Max Pool', icon: 'lucide:water' },
    ],
  },
  {
    category: 'Normalization',
    nodes: [
      { type: 'batchnorm', label: 'BatchNorm', icon: 'lucide:equal' },
    ],
  },
  {
    category: 'Regularization',
    nodes: [
      { type: 'dropout', label: 'Dropout', icon: 'lucide:cloud-rain' },
    ],
  },
  {
    category: 'Activation',
    nodes: [
      { type: 'activation', label: 'Activation', icon: 'lucide:zap' },
      { type: 'softmax', label: 'Softmax', icon: 'lucide:divide' },
    ],
  },
  {
    category: 'Recurrent',
    nodes: [
      { type: 'recurrent', label: 'Recurrent', icon: 'lucide:repeat' },
      { type: 'lstm', label: 'LSTM', icon: 'lucide:activity' },
      { type: 'gru', label: 'GRU', icon: 'lucide:git-merge' },
    ],
  },
  {
    category: 'Merge',
    nodes: [
      { type: 'add', label: 'Add', icon: 'lucide:plus' },
      { type: 'concat', label: 'Concatenate', icon: 'lucide:link' },
    ],
  },
];

const Sidebar: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card className="w-64 m-4">
      <CardBody>
        <h2 className="text-lg font-semibold mb-4">Node Types</h2>
        <div className="flex flex-col gap-2">
          {nodeTypesByCategory.map((category) => (
            <div key={category.category} className="mb-2">
              <div className="text-xs font-bold text-gray-500 mb-1">{category.category}</div>
              <div className="flex flex-col gap-1">
                {category.nodes.map((node) => (
                  <Button
                    key={node.type}
                    variant="flat"
                    className="justify-start"
                    onDragStart={(event) => onDragStart(event, node.type)}
                    draggable
                  >
                    <Icon icon={node.icon} className="mr-2" />
                    {node.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default Sidebar;