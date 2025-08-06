import React, { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Icon } from "@iconify/react";
import { Input, Select, SelectItem, Slider, Switch } from "@heroui/react";
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
      type === "inputLayer" ? "bg-blue-500" : "bg-blue-400",
      )}
    >
      <Handle
      className={nodeStyles.handle}
      isConnectable={isConnectable}
      position={Position.Left}
      type="target"
      />
      <span className="text-white text-xs font-medium">Input</span>
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
      <span className="text-white text-xs font-medium">Output</span>
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
      <Handle
      className={nodeStyles.handle}
      isConnectable={isConnectable}
      position={Position.Right}
      type="source"
      />
    </div>
  );
};

const TextInput = ({ data, type, selected, isConnectable }: NodeProps) => {
  const [inputValue, setInputValue] = React.useState(data.value || "");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    data.onChange?.(newValue);
  };

  return (
    <div
      className={clsx(
      "bg-gray-900 border-2 border-gray-700 rounded-lg shadow-md p-3 min-w-[200px]",
      "transition-all duration-200",
      selected ? "border-blue-500 shadow-lg" : "",
      )}
    >
      <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-200">
        {data.label || "Text Input"}
      </label>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Enter text..."
        className="px-3 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
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

const TextOutput = ({ data, type, selected, isConnectable }: NodeProps) => {
  return (
    <div
      className={clsx(
        "bg-white border-2 border-gray-300 rounded-lg shadow-md p-3 min-w-[200px]",
        "transition-all duration-200",
        selected ? "border-green-400 shadow-lg" : "",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          {data.label || "Text Output"}
        </label>
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm min-h-[40px]">
          {data.outputText || "Output will appear here..."}
        </div>
      </div>
    </div>
  );
};

// Optimizer Nodes with Hyperparameters
const OptimizerNode = ({ data, type, selected, isConnectable }: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getOptimizerDefaults = () => {
    switch (type) {
      case 'adam':
        return { lr: 0.001, beta1: 0.9, beta2: 0.999, eps: 1e-8 };
      case 'sgd':
        return { lr: 0.01, momentum: 0.9, dampening: 0, weight_decay: 0 };
      case 'rmsprop':
        return { lr: 0.01, alpha: 0.99, eps: 1e-8, weight_decay: 0 };
      case 'adagrad':
        return { lr: 0.01, lr_decay: 0, weight_decay: 0, eps: 1e-10 };
      case 'adamw':
        return { lr: 0.001, beta1: 0.9, beta2: 0.999, eps: 1e-8, weight_decay: 0.01 };
      default:
        return { lr: 0.001 };
    }
  };

  const [params, setParams] = useState(data.params || getOptimizerDefaults());

  const updateParam = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    if (data.onParamsChange) {
      data.onParamsChange(newParams);
    }
  };

  return (
    <div
      className={clsx(
        "bg-gradient-to-r from-orange-400 to-pink-400 text-white rounded-lg shadow-lg border-2",
        "min-w-[200px] transition-all duration-200",
        selected ? "border-white ring-2 ring-orange-300" : "border-transparent",
        isExpanded ? "min-h-[300px]" : "h-[80px]"
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />

      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" icon={data.icon} />
          <div>
            <div className="font-bold text-sm">{data.label}</div>
            <div className="text-xs opacity-80">{data.details}</div>
          </div>
        </div>
        <Icon 
          icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"} 
          className="w-4 h-4"
        />
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="text-xs font-semibold opacity-90">Hyperparameters:</div>
          
          {type === 'adam' || type === 'adamw' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs">Learning Rate</label>
                <Input
                  size="sm"
                  type="number"
                  step="0.0001"
                  value={params.lr?.toString()}
                  onChange={(e) => updateParam('lr', parseFloat(e.target.value))}
                  className="text-gray-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Beta1</label>
                  <Input
                    size="sm"
                    type="number"
                    step="0.01"
                    value={params.beta1?.toString()}
                    onChange={(e) => updateParam('beta1', parseFloat(e.target.value))}
                    className="text-gray-800"
                  />
                </div>
                <div>
                  <label className="text-xs">Beta2</label>
                  <Input
                    size="sm"
                    type="number"
                    step="0.001"
                    value={params.beta2?.toString()}
                    onChange={(e) => updateParam('beta2', parseFloat(e.target.value))}
                    className="text-gray-800"
                  />
                </div>
              </div>
              {type === 'adamw' && (
                <div className="space-y-2">
                  <label className="text-xs">Weight Decay</label>
                  <Input
                    size="sm"
                    type="number"
                    step="0.001"
                    value={params.weight_decay?.toString()}
                    onChange={(e) => updateParam('weight_decay', parseFloat(e.target.value))}
                    className="text-gray-800"
                  />
                </div>
              )}
            </>
          ) : type === 'sgd' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs">Learning Rate</label>
                <Input
                  size="sm"
                  type="number"
                  step="0.001"
                  value={params.lr?.toString()}
                  onChange={(e) => updateParam('lr', parseFloat(e.target.value))}
                  className="text-gray-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs">Momentum</label>
                <Input
                  size="sm"
                  type="number"
                  step="0.1"
                  value={params.momentum?.toString()}
                  onChange={(e) => updateParam('momentum', parseFloat(e.target.value))}
                  className="text-gray-800"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-xs">Learning Rate</label>
              <Input
                size="sm"
                type="number"
                step="0.001"
                value={params.lr?.toString()}
                onChange={(e) => updateParam('lr', parseFloat(e.target.value))}
                className="text-gray-800"
              />
            </div>
          )}
        </div>
      )}

      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Right}
        type="source"
      />
    </div>
  );
};

// Algorithm Nodes with Architecture-specific parameters
const AlgorithmNode = ({ data, type, selected, isConnectable }: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getAlgorithmDefaults = () => {
    switch (type) {
      case 'cnn':
        return { layers: 3, filters: [32, 64, 128], kernel_size: 3, pool_size: 2 };
      case 'rnn':
        return { hidden_size: 128, num_layers: 2, bidirectional: false };
      case 'lstm':
        return { hidden_size: 128, num_layers: 2, dropout: 0.2, bidirectional: false };
      case 'transformer':
        return { d_model: 512, nhead: 8, num_layers: 6, dim_feedforward: 2048, dropout: 0.1 };
      case 'autoencoder':
        return { encoding_dim: 128, layers: [512, 256, 128], activation: 'relu' };
      case 'gan':
        return { latent_dim: 100, generator_layers: [256, 512, 1024], discriminator_layers: [1024, 512, 256] };
      case 'resnet':
        return { depth: 50, num_classes: 1000, block_type: 'bottleneck' };
      case 'vae':
        return { latent_dim: 64, encoder_layers: [512, 256], decoder_layers: [256, 512] };
      default:
        return {};
    }
  };

  const [params, setParams] = useState(data.params || getAlgorithmDefaults());

  const updateParam = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    if (data.onParamsChange) {
      data.onParamsChange(newParams);
    }
  };

  const getNodeColor = () => {
    switch (type) {
      case 'cnn': return 'from-blue-500 to-blue-700';
      case 'rnn': case 'lstm': return 'from-purple-500 to-purple-700';
      case 'transformer': return 'from-green-500 to-green-700';
      case 'autoencoder': case 'vae': return 'from-indigo-500 to-indigo-700';
      case 'gan': return 'from-red-500 to-red-700';
      case 'resnet': return 'from-teal-500 to-teal-700';
      default: return 'from-gray-500 to-gray-700';
    }
  };

  return (
    <div
      className={clsx(
        `bg-gradient-to-r ${getNodeColor()} text-white rounded-lg shadow-lg border-2`,
        "min-w-[220px] transition-all duration-200",
        selected ? "border-white ring-2 ring-blue-300" : "border-transparent",
        isExpanded ? "min-h-[350px]" : "h-[80px]"
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />

      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" icon={data.icon} />
          <div>
            <div className="font-bold text-sm">{data.label}</div>
            <div className="text-xs opacity-80">{data.details}</div>
          </div>
        </div>
        <Icon 
          icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"} 
          className="w-4 h-4"
        />
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 max-h-[270px] overflow-y-auto">
          <div className="text-xs font-semibold opacity-90">Architecture Parameters:</div>
          
          {type === 'cnn' && (
            <>
              <div className="space-y-2">
                <label className="text-xs">Number of Layers</label>
                <Input
                  size="sm"
                  type="number"
                  min="1"
                  value={params.layers?.toString()}
                  onChange={(e) => updateParam('layers', parseInt(e.target.value))}
                  className="text-gray-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs">Kernel Size</label>
                <Select
                  size="sm"
                  selectedKeys={[params.kernel_size?.toString()]}
                  onSelectionChange={(selection) => updateParam('kernel_size', parseInt(Array.from(selection)[0] as string))}
                  className="text-gray-800"
                >
                  <SelectItem key="3">3x3</SelectItem>
                  <SelectItem key="5">5x5</SelectItem>
                  <SelectItem key="7">7x7</SelectItem>
                </Select>
              </div>
            </>
          )}

          {(type === 'rnn' || type === 'lstm') && (
            <>
              <div className="space-y-2">
                <label className="text-xs">Hidden Size</label>
                <Input
                  size="sm"
                  type="number"
                  value={params.hidden_size?.toString()}
                  onChange={(e) => updateParam('hidden_size', parseInt(e.target.value))}
                  className="text-gray-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs">Number of Layers</label>
                <Input
                  size="sm"
                  type="number"
                  min="1"
                  value={params.num_layers?.toString()}
                  onChange={(e) => updateParam('num_layers', parseInt(e.target.value))}
                  className="text-gray-800"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  size="sm"
                  isSelected={params.bidirectional}
                  onValueChange={(value) => updateParam('bidirectional', value)}
                />
                <label className="text-xs">Bidirectional</label>
              </div>
            </>
          )}

          {type === 'transformer' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Model Dim</label>
                  <Input
                    size="sm"
                    type="number"
                    value={params.d_model?.toString()}
                    onChange={(e) => updateParam('d_model', parseInt(e.target.value))}
                    className="text-gray-800"
                  />
                </div>
                <div>
                  <label className="text-xs">Heads</label>
                  <Input
                    size="sm"
                    type="number"
                    value={params.nhead?.toString()}
                    onChange={(e) => updateParam('nhead', parseInt(e.target.value))}
                    className="text-gray-800"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs">Number of Layers</label>
                <Input
                  size="sm"
                  type="number"
                  min="1"
                  value={params.num_layers?.toString()}
                  onChange={(e) => updateParam('num_layers', parseInt(e.target.value))}
                  className="text-gray-800"
                />
              </div>
            </>
          )}

          {type === 'autoencoder' && (
            <>
              <div className="space-y-2">
                <label className="text-xs">Encoding Dimension</label>
                <Input
                  size="sm"
                  type="number"
                  value={params.encoding_dim?.toString()}
                  onChange={(e) => updateParam('encoding_dim', parseInt(e.target.value))}
                  className="text-gray-800"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs">Activation</label>
                <Select
                  size="sm"
                  selectedKeys={[params.activation]}
                  onSelectionChange={(selection) => updateParam('activation', Array.from(selection)[0])}
                  className="text-gray-800"
                >
                  <SelectItem key="relu">ReLU</SelectItem>
                  <SelectItem key="tanh">Tanh</SelectItem>
                  <SelectItem key="sigmoid">Sigmoid</SelectItem>
                </Select>
              </div>
            </>
          )}

          {type === 'gan' && (
            <div className="space-y-2">
              <label className="text-xs">Latent Dimension</label>
              <Input
                size="sm"
                type="number"
                value={params.latent_dim?.toString()}
                onChange={(e) => updateParam('latent_dim', parseInt(e.target.value))}
                className="text-gray-800"
              />
            </div>
          )}

          {type === 'resnet' && (
            <>
              <div className="space-y-2">
                <label className="text-xs">Depth</label>
                <Select
                  size="sm"
                  selectedKeys={[params.depth?.toString()]}
                  onSelectionChange={(selection) => updateParam('depth', parseInt(Array.from(selection)[0] as string))}
                  className="text-gray-800"
                >
                  <SelectItem key="18">ResNet-18</SelectItem>
                  <SelectItem key="34">ResNet-34</SelectItem>
                  <SelectItem key="50">ResNet-50</SelectItem>
                  <SelectItem key="101">ResNet-101</SelectItem>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs">Number of Classes</label>
                <Input
                  size="sm"
                  type="number"
                  value={params.num_classes?.toString()}
                  onChange={(e) => updateParam('num_classes', parseInt(e.target.value))}
                  className="text-gray-800"
                />
              </div>
            </>
          )}

          {type === 'vae' && (
            <div className="space-y-2">
              <label className="text-xs">Latent Dimension</label>
              <Input
                size="sm"
                type="number"
                value={params.latent_dim?.toString()}
                onChange={(e) => updateParam('latent_dim', parseInt(e.target.value))}
                className="text-gray-800"
              />
            </div>
          )}
        </div>
      )}

      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Right}
        type="source"
      />
    </div>
  );
};

// Loss Function Node
const LossNode = ({ data, type, selected, isConnectable }: NodeProps) => {
  const [params, setParams] = useState(data.params || {});

  const updateParam = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    if (data.onParamsChange) {
      data.onParamsChange(newParams);
    }
  };

  return (
    <div
      className={clsx(
        "bg-gradient-to-r from-red-500 to-red-700 text-white rounded-lg shadow-lg border-2",
        "min-w-[160px] transition-all duration-200 p-3",
        selected ? "border-white ring-2 ring-red-300" : "border-transparent"
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />

      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" icon={data.icon} />
        <div>
          <div className="font-bold text-xs">{data.label}</div>
          <div className="text-xs opacity-80">{data.details}</div>
        </div>
      </div>

      {type === 'crossentropy' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              size="sm"
              isSelected={params.reduction !== 'none'}
              onValueChange={(value) => updateParam('reduction', value ? 'mean' : 'none')}
            />
            <label className="text-xs">Reduction</label>
          </div>
        </div>
      )}

      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Right}
        type="source"
      />
    </div>
  );
};

// Learning Rate Scheduler Node
const SchedulerNode = ({ data, type, selected, isConnectable }: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getSchedulerDefaults = () => {
    switch (type) {
      case 'steplr':
        return { step_size: 30, gamma: 0.1 };
      case 'exponentiallr':
        return { gamma: 0.95 };
      case 'cosineannealinglr':
        return { T_max: 50, eta_min: 0 };
      case 'reducelronplateau':
        return { mode: 'min', factor: 0.1, patience: 10, threshold: 1e-4 };
      default:
        return {};
    }
  };

  const [params, setParams] = useState(data.params || getSchedulerDefaults());

  const updateParam = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    if (data.onParamsChange) {
      data.onParamsChange(newParams);
    }
  };

  return (
    <div
      className={clsx(
        "bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg shadow-lg border-2",
        "min-w-[180px] transition-all duration-200",
        selected ? "border-white ring-2 ring-yellow-300" : "border-transparent",
        isExpanded ? "min-h-[200px]" : "h-[70px]"
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />

      <div 
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" icon={data.icon} />
          <div>
            <div className="font-bold text-xs">{data.label}</div>
            <div className="text-xs opacity-80">{data.details}</div>
          </div>
        </div>
        <Icon 
          icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"} 
          className="w-3 h-3"
        />
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {type === 'steplr' && (
            <>
              <div>
                <label className="text-xs">Step Size</label>
                <Input
                  size="sm"
                  type="number"
                  value={params.step_size?.toString()}
                  onChange={(e) => updateParam('step_size', parseInt(e.target.value))}
                  className="text-gray-800"
                />
              </div>
              <div>
                <label className="text-xs">Gamma</label>
                <Input
                  size="sm"
                  type="number"
                  step="0.01"
                  value={params.gamma?.toString()}
                  onChange={(e) => updateParam('gamma', parseFloat(e.target.value))}
                  className="text-gray-800"
                />
              </div>
            </>
          )}

          {type === 'exponentiallr' && (
            <div>
              <label className="text-xs">Gamma</label>
              <Input
                size="sm"
                type="number"
                step="0.01"
                value={params.gamma?.toString()}
                onChange={(e) => updateParam('gamma', parseFloat(e.target.value))}
                className="text-gray-800"
              />
            </div>
          )}

          {type === 'cosineannealinglr' && (
            <div>
              <label className="text-xs">T Max</label>
              <Input
                size="sm"
                type="number"
                value={params.T_max?.toString()}
                onChange={(e) => updateParam('T_max', parseInt(e.target.value))}
                className="text-gray-800"
              />
            </div>
          )}

          {type === 'reducelronplateau' && (
            <>
              <div>
                <label className="text-xs">Factor</label>
                <Input
                  size="sm"
                  type="number"
                  step="0.01"
                  value={params.factor?.toString()}
                  onChange={(e) => updateParam('factor', parseFloat(e.target.value))}
                  className="text-gray-800"
                />
              </div>
              <div>
                <label className="text-xs">Patience</label>
                <Input
                  size="sm"
                  type="number"
                  value={params.patience?.toString()}
                  onChange={(e) => updateParam('patience', parseInt(e.target.value))}
                  className="text-gray-800"
                />
              </div>
            </>
          )}
        </div>
      )}

      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Right}
        type="source"
      />
    </div>
  );
};

// Update the nodeTypes object to use renamed layers and new text nodes
export const nodeTypes = {
  inputLayer: memo((props: NodeProps) => <InputLayer {...props} />),
  outputLayer: memo((props: NodeProps) => <OutputLayer {...props} />),
  textInput: memo((props: NodeProps) => <TextInput {...props} />),
  textOutput: memo((props: NodeProps) => <TextOutput {...props} />),
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
  
  // Optimizers
  adam: memo((props: NodeProps) => <OptimizerNode {...props} />),
  sgd: memo((props: NodeProps) => <OptimizerNode {...props} />),
  rmsprop: memo((props: NodeProps) => <OptimizerNode {...props} />),
  adagrad: memo((props: NodeProps) => <OptimizerNode {...props} />),
  adamw: memo((props: NodeProps) => <OptimizerNode {...props} />),
  
  // Algorithms
  cnn: memo((props: NodeProps) => <AlgorithmNode {...props} />),
  rnn: memo((props: NodeProps) => <AlgorithmNode {...props} />),
  autoencoder: memo((props: NodeProps) => <AlgorithmNode {...props} />),
  gan: memo((props: NodeProps) => <AlgorithmNode {...props} />),
  transformer: memo((props: NodeProps) => <AlgorithmNode {...props} />),
  resnet: memo((props: NodeProps) => <AlgorithmNode {...props} />),
  vae: memo((props: NodeProps) => <AlgorithmNode {...props} />),
  
  // Loss Functions
  crossentropy: memo((props: NodeProps) => <LossNode {...props} />),
  mse: memo((props: NodeProps) => <LossNode {...props} />),
  mae: memo((props: NodeProps) => <LossNode {...props} />),
  bce: memo((props: NodeProps) => <LossNode {...props} />),
  
  // Learning Rate Schedulers
  steplr: memo((props: NodeProps) => <SchedulerNode {...props} />),
  exponentiallr: memo((props: NodeProps) => <SchedulerNode {...props} />),
  cosineannealinglr: memo((props: NodeProps) => <SchedulerNode {...props} />),
  reducelronplateau: memo((props: NodeProps) => <SchedulerNode {...props} />),
  
  // Add other node types as needed
};
