import React from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Icon } from '@iconify/react';

const nodeTypesByCategory = [
	{
		category: 'Input/Output',
		nodes: [
			{
				type: 'input',
				label: 'Input',
				icon: 'lucide:box',
				details: 'Input Layer',
			},
			{
				type: 'output',
				label: 'Output',
				icon: 'lucide:arrow-right',
				details: 'Output Layer',
			},
		],
	},
	{
		category: 'Core',
		nodes: [
			{
				type: 'dense',
				label: 'Dense',
				icon: 'lucide:grid',
				details: 'Dense Layer',
			},
			{
				type: 'hidden',
				label: 'Hidden',
				icon: 'lucide:layers',
				details: 'Hidden Layer',
			},
			{
				type: 'flatten',
				label: 'Flatten',
				icon: 'lucide:align-horizontal-space-around',
				details: 'Flatten Layer',
			},
			{
				type: 'reshape',
				label: 'Reshape',
				icon: 'lucide:shuffle',
				details: 'Reshape Layer',
			},
			{
				type: 'embedding',
				label: 'Embedding',
				icon: 'lucide:layers',
				details: 'Embedding Layer',
			},
		],
	},
	{
		category: 'Convolutional',
		nodes: [
			{
				type: 'conv2d',
				label: 'Conv2D',
				icon: 'lucide:square',
				details: '2D Convolutional Layer',
			},
			{
				type: 'maxpool',
				label: 'Max Pool',
				icon: 'lucide:square',
				details: 'Max Pooling Layer',
			},
		],
	},
	{
		category: 'Normalization',
		nodes: [
			{
				type: 'batchnorm',
				label: 'BatchNorm',
				icon: 'lucide:equal',
				details: 'Batch Normalization Layer',
			},
		],
	},
	{
		category: 'Regularization',
		nodes: [
			{
				type: 'dropout',
				label: 'Dropout',
				icon: 'lucide:cloud-rain',
				details: 'Dropout Layer',
			},
		],
	},
	{
		category: 'Activation',
		nodes: [
			{
				type: 'activation',
				label: 'Activation',
				icon: 'lucide:zap',
				details: 'Activation Layer',
			},
			{
				type: 'softmax',
				label: 'Softmax',
				icon: 'lucide:divide',
				details: 'Softmax Layer',
			},
		],
	},
	{
		category: 'Recurrent',
		nodes: [
			{
				type: 'recurrent',
				label: 'Recurrent',
				icon: 'lucide:repeat',
				details: 'Recurrent Layer',
			},
			{
				type: 'lstm',
				label: 'LSTM',
				icon: 'lucide:activity',
				details: 'LSTM Layer',
			},
			{
				type: 'gru',
				label: 'GRU',
				icon: 'lucide:git-merge',
				details: 'GRU Layer',
			},
		],
	},
	{
		category: 'Merge',
		nodes: [
			{
				type: 'add',
				label: 'Add',
				icon: 'lucide:plus',
				details: 'Add Layer',
			},
			{
				type: 'concat',
				label: 'Concatenate',
				icon: 'lucide:link',
				details: 'Concatenate Layer',
			},
		],
	},
];

const Sidebar: React.FC = () => {
	const onDragStart = (
		event: React.DragEvent,
		node: typeof nodeTypesByCategory[0]['nodes'][0]
	) => {
		event.dataTransfer.setData('application/reactflow', JSON.stringify(node));
		event.dataTransfer.effectAllowed = 'move';
	};

	return (
		<Card className="w-64 m-4">
			<CardBody>
				<h2 className="text-lg font-semibold mb-4">Node Types</h2>
				<div className="flex flex-col gap-2">
					{nodeTypesByCategory.map((category) => (
						<div key={category.category} className="mb-2">
							<div className="text-xs font-bold text-gray-500 mb-1">
								{category.category}
							</div>
							<div className="flex flex-col gap-1">
								{category.nodes.map((node) => (
									<Button
										key={node.type}
										variant="flat"
										className="justify-start"
										onDragStart={(event) => onDragStart(event, node)}
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