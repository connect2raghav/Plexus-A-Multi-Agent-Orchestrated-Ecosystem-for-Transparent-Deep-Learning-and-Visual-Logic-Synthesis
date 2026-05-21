import React, { memo, useEffect, useMemo, useState } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Icon } from "@iconify/react";
import {
  Input,
  Select,
  SelectItem,
  Switch,
  Progress,
  Chip,
  Button,
  Slider,
} from "@heroui/react";
import clsx from "clsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { nodeStyles } from "./nodeStyles";

import { usePlexusStore } from "@/store/plexusStore";
import {
  applyPreprocessing,
  downloadDeploymentZip,
  downloadDatasetUrl,
  previewNodeEffect,
  getDatasetStatus,
  predictModel,
  updateJobStatus,
} from "@/lib/api";

const BaseNode = ({ id, data, type, selected, isConnectable }: NodeProps) => {
  const isProcessing = data.isProcessing || false;
  const activationLevel = data.activationLevel || 0;
  const { setNodes } = useReactFlow();

  const [isExpanded, setIsExpanded] = useState(false);
  
  const getDefaults = () => {
    switch(type) {
      case "randomForest": return { n_estimators: 100, max_depth: 10 };
      case "svm": return { kernel: "rbf", C: 1.0 };
      case "knn": return { n_neighbors: 5 };
      default: return {};
    }
  };

  const [params, setParams] = useState(data.params || getDefaults());

  const updateParam = (key: string, value: any) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    if (data.onParamsChange) {
      data.onParamsChange(newParams);
    }
  };

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
  };

  const isMLNode = ["randomForest", "svm", "knn"].includes(type);

  return (
    <div
      className={clsx(
        nodeStyles.base,
        nodeStyles[type as keyof typeof nodeStyles] || nodeStyles.dense,
        selected && nodeStyles.selected,
        isProcessing && "ring-2 ring-blue-400 ring-opacity-50 animate-pulse",
        "relative group min-w-[200px] transition-all duration-200",
        isExpanded ? "min-h-[150px]" : "h-auto"
      )}
    >
      <button
        onClick={onDelete}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md hover:bg-red-600"
      >
        <Icon icon="lucide:x" className="w-3 h-3" />
      </button>

      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />

      <div 
        className={clsx("p-4", isMLNode && "cursor-pointer")} 
        onClick={() => isMLNode && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {data.icon && <Icon className="w-5 h-5" icon={data.icon} />}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm">{data.label}</div>
              {isProcessing && (
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse ml-2" />
              )}
            </div>
            {data.details && (
              <div className="text-xs text-gray-500">{data.details}</div>
            )}
            {isProcessing && activationLevel > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-600 rounded-full h-1">
                  <div
                    className="bg-blue-400 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(activationLevel * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          {isMLNode && (
            <Icon
              className="w-4 h-4 ml-2 opacity-70"
              icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"}
            />
          )}
        </div>
      </div>

      {isExpanded && isMLNode && (
        <div className="px-4 pb-4 space-y-4">
          <div className="text-xs font-semibold opacity-90 mb-2 border-t border-gray-600 pt-2">
            Model Parameters:
          </div>

          {type === "randomForest" && (
            <>
              <div>
                <Slider 
                  label="Estimators"
                  size="sm"
                  step={10} 
                  maxValue={500} 
                  minValue={10}
                  value={params.n_estimators}
                  onChange={(v) => updateParam("n_estimators", v)}
                  className="max-w-md"
                />
              </div>
              <div>
                <Slider 
                  label="Max Depth"
                  size="sm"
                  step={1} 
                  maxValue={100} 
                  minValue={1}
                  value={params.max_depth}
                  onChange={(v) => updateParam("max_depth", v)}
                  className="max-w-md"
                />
              </div>
            </>
          )}

          {type === "svm" && (
            <>
              <div className="space-y-1">
                <label className="text-xs">Kernel</label>
                <Select
                  className="text-gray-800"
                  selectedKeys={[params.kernel]}
                  size="sm"
                  onSelectionChange={(selection) =>
                    updateParam("kernel", Array.from(selection)[0])
                  }
                >
                  <SelectItem key="linear">Linear</SelectItem>
                  <SelectItem key="poly">Polynomial</SelectItem>
                  <SelectItem key="rbf">RBF</SelectItem>
                  <SelectItem key="sigmoid">Sigmoid</SelectItem>
                </Select>
              </div>
              <div>
                <Slider 
                  label="C (Regularization)"
                  size="sm"
                  step={0.1} 
                  maxValue={10.0} 
                  minValue={0.1}
                  value={params.C}
                  onChange={(v) => updateParam("C", v)}
                  className="max-w-md"
                />
              </div>
            </>
          )}

          {type === "knn" && (
            <div>
              <Slider 
                label="Neighbors (K)"
                size="sm"
                step={1} 
                maxValue={50} 
                minValue={1}
                value={params.n_neighbors}
                onChange={(v) => updateParam("n_neighbors", v)}
                className="max-w-md"
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

  React.useEffect(() => {
    setInputValue(data.value || "");
  }, [data.value]);

  const isProcessing = data.isProcessing || false;
  const activationLevel = data.activationLevel || 0;

  return (
    <div
      className={clsx(
        "bg-gray-900 border-2 border-gray-700 rounded-lg shadow-md p-3 min-w-[200px]",
        "transition-all duration-200",
        selected ? "border-blue-500 shadow-lg" : "",
        isProcessing
          ? "ring-2 ring-green-400 ring-opacity-50 animate-pulse"
          : "",
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-200">
            {data.label || "Text Input"}
          </label>
          {isProcessing && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400">Processing</span>
            </div>
          )}
        </div>
        <input
          className={clsx(
            "px-3 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            isProcessing ? "border-green-400 bg-gray-750" : "",
          )}
          placeholder="Enter text..."
          type="text"
          value={inputValue}
          onChange={handleInputChange}
        />
        {isProcessing && activationLevel > 0 && (
          <div className="mt-1">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Activation</span>
              <span>{activationLevel.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="bg-green-400 h-1 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(activationLevel * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
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
      case "adam":
        return { lr: 0.001, beta1: 0.9, beta2: 0.999, eps: 1e-8 };
      case "sgd":
        return { lr: 0.01, momentum: 0.9, dampening: 0, weight_decay: 0 };
      case "rmsprop":
        return { lr: 0.01, alpha: 0.99, eps: 1e-8, weight_decay: 0 };
      case "adagrad":
        return { lr: 0.01, lr_decay: 0, weight_decay: 0, eps: 1e-10 };
      case "adamw":
        return {
          lr: 0.001,
          beta1: 0.9,
          beta2: 0.999,
          eps: 1e-8,
          weight_decay: 0.01,
        };
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
        isExpanded ? "min-h-[300px]" : "h-[80px]",
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
          className="w-4 h-4"
          icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"}
        />
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="text-xs font-semibold opacity-90">
            Hyperparameters:
          </div>

          {type === "adam" || type === "adamw" ? (
            <>
              <div className="space-y-2">
                <label className="text-xs">Learning Rate</label>
                <Input
                  className="text-gray-800"
                  size="sm"
                  step="0.0001"
                  type="number"
                  value={params.lr?.toString()}
                  onChange={(e) =>
                    updateParam("lr", parseFloat(e.target.value))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Beta1</label>
                  <Input
                    className="text-gray-800"
                    size="sm"
                    step="0.01"
                    type="number"
                    value={params.beta1?.toString()}
                    onChange={(e) =>
                      updateParam("beta1", parseFloat(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs">Beta2</label>
                  <Input
                    className="text-gray-800"
                    size="sm"
                    step="0.001"
                    type="number"
                    value={params.beta2?.toString()}
                    onChange={(e) =>
                      updateParam("beta2", parseFloat(e.target.value))
                    }
                  />
                </div>
              </div>
              {type === "adamw" && (
                <div className="space-y-2">
                  <label className="text-xs">Weight Decay</label>
                  <Input
                    className="text-gray-800"
                    size="sm"
                    step="0.001"
                    type="number"
                    value={params.weight_decay?.toString()}
                    onChange={(e) =>
                      updateParam("weight_decay", parseFloat(e.target.value))
                    }
                  />
                </div>
              )}
            </>
          ) : type === "sgd" ? (
            <>
              <div className="space-y-2">
                <label className="text-xs">Learning Rate</label>
                <Input
                  className="text-gray-800"
                  size="sm"
                  step="0.001"
                  type="number"
                  value={params.lr?.toString()}
                  onChange={(e) =>
                    updateParam("lr", parseFloat(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs">Momentum</label>
                <Input
                  className="text-gray-800"
                  size="sm"
                  step="0.1"
                  type="number"
                  value={params.momentum?.toString()}
                  onChange={(e) =>
                    updateParam("momentum", parseFloat(e.target.value))
                  }
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-xs">Learning Rate</label>
              <Input
                className="text-gray-800"
                size="sm"
                step="0.001"
                type="number"
                value={params.lr?.toString()}
                onChange={(e) => updateParam("lr", parseFloat(e.target.value))}
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
      case "cnn":
        return {
          layers: 3,
          filters: [32, 64, 128],
          kernel_size: 3,
          pool_size: 2,
        };
      case "rnn":
        return { hidden_size: 128, num_layers: 2, bidirectional: false };
      case "lstm":
        return {
          hidden_size: 128,
          num_layers: 2,
          dropout: 0.2,
          bidirectional: false,
        };
      case "transformer":
        return {
          d_model: 512,
          nhead: 8,
          num_layers: 6,
          dim_feedforward: 2048,
          dropout: 0.1,
        };
      case "autoencoder":
        return {
          encoding_dim: 128,
          layers: [512, 256, 128],
          activation: "relu",
        };
      case "gan":
        return {
          latent_dim: 100,
          generator_layers: [256, 512, 1024],
          discriminator_layers: [1024, 512, 256],
        };
      case "resnet":
        return { depth: 50, num_classes: 1000, block_type: "bottleneck" };
      case "vae":
        return {
          latent_dim: 64,
          encoder_layers: [512, 256],
          decoder_layers: [256, 512],
        };
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
      case "cnn":
        return "from-blue-500 to-blue-700";
      case "rnn":
      case "lstm":
        return "from-purple-500 to-purple-700";
      case "transformer":
        return "from-green-500 to-green-700";
      case "autoencoder":
      case "vae":
        return "from-indigo-500 to-indigo-700";
      case "gan":
        return "from-red-500 to-red-700";
      case "resnet":
        return "from-teal-500 to-teal-700";
      default:
        return "from-gray-500 to-gray-700";
    }
  };

  return (
    <div
      className={clsx(
        `bg-gradient-to-r ${getNodeColor()} text-white rounded-lg shadow-lg border-2`,
        "min-w-[220px] transition-all duration-200",
        selected ? "border-white ring-2 ring-blue-300" : "border-transparent",
        isExpanded ? "min-h-[350px]" : "h-[80px]",
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
          className="w-4 h-4"
          icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"}
        />
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 max-h-[270px] overflow-y-auto">
          <div className="text-xs font-semibold opacity-90">
            Architecture Parameters:
          </div>

          {type === "cnn" && (
            <>
              <div className="space-y-2">
                <label className="text-xs">Number of Layers</label>
                <Input
                  className="text-gray-800"
                  min="1"
                  size="sm"
                  type="number"
                  value={params.layers?.toString()}
                  onChange={(e) =>
                    updateParam("layers", parseInt(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs">Kernel Size</label>
                <Select
                  className="text-gray-800"
                  selectedKeys={[params.kernel_size?.toString()]}
                  size="sm"
                  onSelectionChange={(selection) =>
                    updateParam(
                      "kernel_size",
                      parseInt(Array.from(selection)[0] as string),
                    )
                  }
                >
                  <SelectItem key="3">3x3</SelectItem>
                  <SelectItem key="5">5x5</SelectItem>
                  <SelectItem key="7">7x7</SelectItem>
                </Select>
              </div>
            </>
          )}

          {(type === "rnn" || type === "lstm") && (
            <>
              <div className="space-y-2">
                <label className="text-xs">Hidden Size</label>
                <Input
                  className="text-gray-800"
                  size="sm"
                  type="number"
                  value={params.hidden_size?.toString()}
                  onChange={(e) =>
                    updateParam("hidden_size", parseInt(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs">Number of Layers</label>
                <Input
                  className="text-gray-800"
                  min="1"
                  size="sm"
                  type="number"
                  value={params.num_layers?.toString()}
                  onChange={(e) =>
                    updateParam("num_layers", parseInt(e.target.value))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  isSelected={params.bidirectional}
                  size="sm"
                  onValueChange={(value) => updateParam("bidirectional", value)}
                />
                <label className="text-xs">Bidirectional</label>
              </div>
            </>
          )}

          {type === "transformer" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs">Model Dim</label>
                  <Input
                    className="text-gray-800"
                    size="sm"
                    type="number"
                    value={params.d_model?.toString()}
                    onChange={(e) =>
                      updateParam("d_model", parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs">Heads</label>
                  <Input
                    className="text-gray-800"
                    size="sm"
                    type="number"
                    value={params.nhead?.toString()}
                    onChange={(e) =>
                      updateParam("nhead", parseInt(e.target.value))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs">Number of Layers</label>
                <Input
                  className="text-gray-800"
                  min="1"
                  size="sm"
                  type="number"
                  value={params.num_layers?.toString()}
                  onChange={(e) =>
                    updateParam("num_layers", parseInt(e.target.value))
                  }
                />
              </div>
            </>
          )}

          {type === "autoencoder" && (
            <>
              <div className="space-y-2">
                <label className="text-xs">Encoding Dimension</label>
                <Input
                  className="text-gray-800"
                  size="sm"
                  type="number"
                  value={params.encoding_dim?.toString()}
                  onChange={(e) =>
                    updateParam("encoding_dim", parseInt(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs">Activation</label>
                <Select
                  className="text-gray-800"
                  selectedKeys={[params.activation]}
                  size="sm"
                  onSelectionChange={(selection) =>
                    updateParam("activation", Array.from(selection)[0])
                  }
                >
                  <SelectItem key="relu">ReLU</SelectItem>
                  <SelectItem key="tanh">Tanh</SelectItem>
                  <SelectItem key="sigmoid">Sigmoid</SelectItem>
                </Select>
              </div>
            </>
          )}

          {type === "gan" && (
            <div className="space-y-2">
              <label className="text-xs">Latent Dimension</label>
              <Input
                className="text-gray-800"
                size="sm"
                type="number"
                value={params.latent_dim?.toString()}
                onChange={(e) =>
                  updateParam("latent_dim", parseInt(e.target.value))
                }
              />
            </div>
          )}

          {type === "resnet" && (
            <>
              <div className="space-y-2">
                <label className="text-xs">Depth</label>
                <Select
                  className="text-gray-800"
                  selectedKeys={[params.depth?.toString()]}
                  size="sm"
                  onSelectionChange={(selection) =>
                    updateParam(
                      "depth",
                      parseInt(Array.from(selection)[0] as string),
                    )
                  }
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
                  className="text-gray-800"
                  size="sm"
                  type="number"
                  value={params.num_classes?.toString()}
                  onChange={(e) =>
                    updateParam("num_classes", parseInt(e.target.value))
                  }
                />
              </div>
            </>
          )}

          {type === "vae" && (
            <div className="space-y-2">
              <label className="text-xs">Latent Dimension</label>
              <Input
                className="text-gray-800"
                size="sm"
                type="number"
                value={params.latent_dim?.toString()}
                onChange={(e) =>
                  updateParam("latent_dim", parseInt(e.target.value))
                }
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
        selected ? "border-white ring-2 ring-red-300" : "border-transparent",
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

      {type === "crossentropy" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              isSelected={params.reduction !== "none"}
              size="sm"
              onValueChange={(value) =>
                updateParam("reduction", value ? "mean" : "none")
              }
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
      case "steplr":
        return { step_size: 30, gamma: 0.1 };
      case "exponentiallr":
        return { gamma: 0.95 };
      case "cosineannealinglr":
        return { T_max: 50, eta_min: 0 };
      case "reducelronplateau":
        return { mode: "min", factor: 0.1, patience: 10, threshold: 1e-4 };
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
        isExpanded ? "min-h-[200px]" : "h-[70px]",
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
          className="w-3 h-3"
          icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"}
        />
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {type === "steplr" && (
            <>
              <div>
                <label className="text-xs">Step Size</label>
                <Input
                  className="text-gray-800"
                  size="sm"
                  type="number"
                  value={params.step_size?.toString()}
                  onChange={(e) =>
                    updateParam("step_size", parseInt(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="text-xs">Gamma</label>
                <Input
                  className="text-gray-800"
                  size="sm"
                  step="0.01"
                  type="number"
                  value={params.gamma?.toString()}
                  onChange={(e) =>
                    updateParam("gamma", parseFloat(e.target.value))
                  }
                />
              </div>
            </>
          )}

          {type === "exponentiallr" && (
            <div>
              <label className="text-xs">Gamma</label>
              <Input
                className="text-gray-800"
                size="sm"
                step="0.01"
                type="number"
                value={params.gamma?.toString()}
                onChange={(e) =>
                  updateParam("gamma", parseFloat(e.target.value))
                }
              />
            </div>
          )}

          {type === "cosineannealinglr" && (
            <div>
              <label className="text-xs">T Max</label>
              <Input
                className="text-gray-800"
                size="sm"
                type="number"
                value={params.T_max?.toString()}
                onChange={(e) => updateParam("T_max", parseInt(e.target.value))}
              />
            </div>
          )}

          {type === "reducelronplateau" && (
            <>
              <div>
                <label className="text-xs">Factor</label>
                <Input
                  className="text-gray-800"
                  size="sm"
                  step="0.01"
                  type="number"
                  value={params.factor?.toString()}
                  onChange={(e) =>
                    updateParam("factor", parseFloat(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="text-xs">Patience</label>
                <Input
                  className="text-gray-800"
                  size="sm"
                  type="number"
                  value={params.patience?.toString()}
                  onChange={(e) =>
                    updateParam("patience", parseInt(e.target.value))
                  }
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

// Training Configuration Node - Acts as a hub for optimizers, loss, and schedulers
const TrainingConfigNode = ({
  data,
  type,
  selected,
  isConnectable,
}: NodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState(
    data.config || {
      epochs: 10,
      batch_size: 32,
      learning_rate: 0.001,
      validation_split: 0.2,
      early_stopping: false,
      save_best: true,
    },
  );

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };

    setConfig(newConfig);
    if (data.onConfigChange) {
      data.onConfigChange(newConfig);
    }
  };

  return (
    <div
      className={clsx(
        "bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg shadow-lg border-2",
        "min-w-[240px] transition-all duration-200",
        selected
          ? "border-white ring-2 ring-emerald-300"
          : "border-transparent",
        isExpanded ? "min-h-[350px]" : "h-[120px]",
      )}
    >
      {/* Multiple input handles for optimizer, loss, scheduler */}
      <Handle
        className="w-3 h-3 bg-orange-400"
        id="optimizer"
        isConnectable={isConnectable}
        position={Position.Left}
        style={{ top: "25%" }}
        type="target"
      />
      <Handle
        className="w-3 h-3 bg-red-500"
        id="loss"
        isConnectable={isConnectable}
        position={Position.Left}
        style={{ top: "50%" }}
        type="target"
      />
      <Handle
        className="w-3 h-3 bg-yellow-500"
        id="scheduler"
        isConnectable={isConnectable}
        position={Position.Left}
        style={{ top: "75%" }}
        type="target"
      />

      {/* Main network input from the last layer */}
      <Handle
        className="w-3 h-3 bg-blue-500"
        id="network"
        isConnectable={isConnectable}
        position={Position.Top}
        type="target"
      />

      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" icon={data.icon || "lucide:settings"} />
            <div>
              <div className="font-bold text-sm">
                {data.label || "Training Config"}
              </div>
              <div className="text-xs opacity-80">
                Epochs: {config.epochs}, Batch: {config.batch_size}
              </div>
            </div>
          </div>
          <Icon
            className="w-4 h-4"
            icon={isExpanded ? "lucide:chevron-up" : "lucide:chevron-down"}
          />
        </div>

        {/* Connection indicators */}
        <div className="flex gap-1 text-xs opacity-90">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-400 rounded-full" />
            <span>Optimizer</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span>Scheduler</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 max-h-[230px] overflow-y-auto">
          <div className="text-xs font-semibold opacity-90">
            Training Parameters:
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs">Epochs</label>
              <Input
                className="text-gray-800"
                min="1"
                size="sm"
                type="number"
                value={config.epochs?.toString()}
                onChange={(e) =>
                  updateConfig("epochs", parseInt(e.target.value))
                }
              />
            </div>
            <div>
              <label className="text-xs">Batch Size</label>
              <Input
                className="text-gray-800"
                min="1"
                size="sm"
                type="number"
                value={config.batch_size?.toString()}
                onChange={(e) =>
                  updateConfig("batch_size", parseInt(e.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs">Learning Rate</label>
            <Input
              className="text-gray-800"
              min="0.0001"
              size="sm"
              step="0.0001"
              type="number"
              value={config.learning_rate?.toString()}
              onChange={(e) =>
                updateConfig("learning_rate", parseFloat(e.target.value))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs">Validation Split</label>
            <Input
              className="text-gray-800"
              max="1"
              min="0"
              size="sm"
              step="0.1"
              type="number"
              value={config.validation_split?.toString()}
              onChange={(e) =>
                updateConfig("validation_split", parseFloat(e.target.value))
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              isSelected={config.early_stopping}
              size="sm"
              onValueChange={(value) => updateConfig("early_stopping", value)}
            />
            <label className="text-xs">Early Stopping</label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              isSelected={config.save_best}
              size="sm"
              onValueChange={(value) => updateConfig("save_best", value)}
            />
            <label className="text-xs">Save Best Model</label>
          </div>
        </div>
      )}

      {/* Output handle for metrics/results */}
      <Handle
        className="w-3 h-3 bg-green-500"
        id="metrics"
        isConnectable={isConnectable}
        position={Position.Right}
        type="source"
      />
    </div>
  );
};

// Metrics Node - Shows training results
const MetricsNode = ({ data, type, selected, isConnectable }: NodeProps) => {
  const [metrics] = useState(
    data.metrics || {
      accuracy: 0.95,
      loss: 0.05,
      val_accuracy: 0.92,
      val_loss: 0.08,
    },
  );

  return (
    <div
      className={clsx(
        "bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg shadow-lg border-2",
        "min-w-[180px] transition-all duration-200 p-4",
        selected ? "border-white ring-2 ring-green-300" : "border-transparent",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />

      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5" icon={data.icon} />
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          <div className="text-xs opacity-80">{data.details}</div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Accuracy:</span>
          <span className="font-mono">
            {(metrics.accuracy * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Loss:</span>
          <span className="font-mono">{metrics.loss.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span>Val Acc:</span>
          <span className="font-mono">
            {(metrics.val_accuracy * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Val Loss:</span>
          <span className="font-mono">{metrics.val_loss.toFixed(3)}</span>
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

// ---------------------------------------------------------------------------
// DatasetNode
// ---------------------------------------------------------------------------
const DatasetNode = ({ id, data, selected, isConnectable }: NodeProps) => {
  const datasetProgress = usePlexusStore((s) => s.datasetProgress);
  const addDataset = usePlexusStore((s) => s.addDataset);
  const setDatasetProgress = usePlexusStore((s) => s.setDatasetProgress);
  const patchDataset = usePlexusStore((s) => s.patchDataset);
  const datasetRecord = usePlexusStore((s) =>
    s.datasets.find((d) => d.id === data.datasetId),
  );
  const progress = data.datasetId ? datasetProgress[data.datasetId] : null;
  const isProfiling = progress && !progress.done && !progress.error;
  const isError = progress?.error;
  const cleaningStatus = progress?.cleaning_status || data.cleaningStatus;
  const isCleaningDone = cleaningStatus?.status === "done";
  const architectStatus = (datasetRecord as { architect_status?: any } | undefined)
    ?.architect_status;

  const [isApplying, setIsApplying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const reactFlowInstance = useReactFlow();

  // Poll backend status
  useEffect(() => {
    if (!data.datasetId) return;
    if (isCleaningDone && !isProfiling && architectStatus?.status === "done") return;

    let active = true;
    const poll = async () => {
      try {
        const status = await getDatasetStatus(data.datasetId);
        if (!active) return;
        const isDone =
          status.done &&
          (!status.cleaning_status ||
            status.cleaning_status.status === "done" ||
            status.cleaning_status.status === "error");
        setDatasetProgress(data.datasetId, {
          progress: status.progress,
          message: status.message,
          done: isDone,
          error: status.error,
          preprocessing_suggestions: status.preprocessing_suggestions,
          cleaning_status: status.cleaning_status,
        });
        patchDataset(data.datasetId, {
          status: status.dataset_status,
          columns: status.columns,
          row_count: status.row_count,
          preprocessing_suggestions: status.preprocessing_suggestions,
          cleaning_status: status.cleaning_status,
          architect_status: status.architect_status,
        });
      } catch { /* ignore transient errors */ }
    };
    poll();
    const interval = setInterval(poll, 1500);
    return () => { active = false; clearInterval(interval); };
  }, [data.datasetId, isCleaningDone, isProfiling, patchDataset, setDatasetProgress]);

  const handleAIPreprocess = async () => {
    if (!data.datasetId || isApplying) return;
    setIsApplying(true);
    try {
      const cleanedDataset = await applyPreprocessing(data.datasetId);
      addDataset(cleanedDataset);
      const currentNode = reactFlowInstance.getNode(id);
      const nodeX = (currentNode?.position.x || 100) + 320;
      const nodeY = currentNode?.position.y || 100;
      const newNodeId = `dataset-cleaned-${cleanedDataset.id}`;
      reactFlowInstance.addNodes({
        id: newNodeId,
        type: "dataset",
        position: { x: nodeX, y: nodeY },
        data: {
          label: cleanedDataset.name,
          datasetId: cleanedDataset.id,
          datasetName: cleanedDataset.name,
          datasetType: cleanedDataset.type,
          rowCount: cleanedDataset.row_count,
          columns: cleanedDataset.columns,
          isCleaned: true,
          cleaningMethod: (cleanedDataset as any).cleaning_method,
        },
      });
      setTimeout(() => {
        reactFlowInstance.addEdges({
          id: `e-${id}-${newNodeId}`,
          source: id,
          target: newNodeId,
          animated: true,
          style: { stroke: "#10b981", strokeWidth: 2 },
        });
      }, 100);
    } catch (err) {
      console.error("Failed to apply preprocessing:", err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDownload = () => {
    if (!data.datasetId) return;
    const url = downloadDatasetUrl(data.datasetId);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.datasetName || "dataset.csv";
    a.click();
  };

  // Preview: first 4 rows from the record
  const previewRows = (datasetRecord?.preview as Record<string, unknown>[] | undefined) || [];
  const previewCols = (datasetRecord?.columns || data.columns || []) as string[];

  return (
    <div
      className={clsx(
        "min-w-[220px] rounded-xl border-2 bg-white dark:bg-default-100 shadow-md p-3 transition-all",
        selected ? "border-primary ring-2 ring-primary/30" : "border-cyan-400 dark:border-cyan-600",
        isError && "border-danger",
        data.isCleaned && "border-green-500 from-green-50 to-emerald-50 bg-gradient-to-br",
      )}
    >
      <Handle className={nodeStyles.handle} isConnectable={isConnectable} position={Position.Right} type="source" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🗄️</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate flex items-center gap-1">
            {data.datasetName || data.label || "Dataset"}
            {data.isCleaned && <Icon className="text-green-500 w-3 h-3" icon="mdi:check-circle" />}
          </div>
          <div className="text-xs text-default-500">{data.datasetType || "csv"}</div>
        </div>
        {isProfiling && <Chip color="warning" size="sm" variant="flat">profiling</Chip>}
        {isError && <Chip color="danger" size="sm" variant="flat">error</Chip>}
        {!isProfiling && !isError && data.datasetId && <Chip color="success" size="sm" variant="flat">ready</Chip>}
      </div>

      {/* Profiling progress */}
      {isProfiling && (
        <div className="space-y-1 mb-2">
          <Progress aria-label="Profiling" color="warning" size="sm" value={progress.progress} />
          <p className="text-xs text-default-500">{progress.message}</p>
        </div>
      )}

      {/* Metadata */}
      {!isProfiling && !isError && (
        <div className="text-xs text-default-500 space-y-0.5 mb-2">
          {data.rowCount > 0 && (
            <div>{data.rowCount.toLocaleString()} rows · {(data.columns || []).length} cols</div>
          )}
          {data.columns && data.columns.length > 0 && (
            <div className="truncate text-default-400">
              {data.columns.slice(0, 4).join(", ")}{data.columns.length > 4 && ` +${data.columns.length - 4} more`}
            </div>
          )}
          {data.isCleaned && data.cleaningMethod && (
            <div className="text-green-600 text-xs">✓ {data.cleaningMethod.replace(/_/g, " ")}</div>
          )}
        </div>
      )}

      {/* Hover preview toggle */}
      {!isProfiling && !isError && previewRows.length > 0 && (
        <button
          className="text-xs text-default-400 hover:text-primary underline mb-1 block"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "Hide preview" : "Peek data (4 rows)"}
        </button>
      )}
      {showPreview && previewRows.length > 0 && (
        <div className="overflow-x-auto mb-2 rounded border border-default-200">
          <table className="text-[9px] border-collapse w-full">
            <thead>
              <tr>
                {previewCols.slice(0, 5).map((c) => (
                  <th key={c} className="border border-default-200 bg-default-50 px-1 py-0.5 text-left font-medium truncate max-w-[60px]">{c}</th>
                ))}
                {previewCols.length > 5 && <th className="border border-default-200 bg-default-50 px-1 py-0.5 text-default-400">…</th>}
              </tr>
            </thead>
            <tbody>
              {previewRows.slice(0, 4).map((row, i) => (
                <tr key={i}>
                  {previewCols.slice(0, 5).map((c) => (
                    <td key={c} className="border border-default-100 px-1 py-0.5 truncate max-w-[60px]">{String(row[c] ?? "")}</td>
                  ))}
                  {previewCols.length > 5 && <td className="border border-default-100 px-1 py-0.5 text-default-400">…</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 flex-wrap">
        {/* AI Preprocess — available for ALL ready CSV datasets */}
        {!isProfiling && !isError && data.datasetId && !data.isCleaned && (
          <Button
            className="flex-1 font-medium"
            color="primary"
            isLoading={isApplying}
            size="sm"
            startContent={!isApplying && <Icon icon="mdi:magic-staff" />}
            variant="flat"
            onPress={handleAIPreprocess}
          >
            AI Preprocess
          </Button>
        )}
        {/* Download */}
        {!isProfiling && !isError && data.datasetId && (
          <Button
            isIconOnly
            size="sm"
            title="Download CSV"
            variant="light"
            onPress={handleDownload}
          >
            <Icon className="w-4 h-4" icon="lucide:download" />
          </Button>
        )}
      </div>

      {isError && <p className="text-xs text-danger mt-1">{isError}</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// PreprocessingNode  (normalize, dropNulls, oneHotEncode, embedEncode, scale)
// ---------------------------------------------------------------------------
const PREPROCESS_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  normalize: {
    label: "Normalize",
    icon: "mdi:chart-bell-curve",
    color: "border-blue-400",
  },
  dropNulls: {
    label: "Drop Nulls",
    icon: "mdi:table-remove",
    color: "border-red-400",
  },
  oneHotEncode: {
    label: "One-Hot Encode",
    icon: "mdi:code-array",
    color: "border-violet-400",
  },
  embedEncode: {
    label: "Embed Encode",
    icon: "mdi:vector-combine",
    color: "border-purple-400",
  },
  scale: {
    label: "Scale",
    icon: "mdi:scale-balance",
    color: "border-green-400",
  },
};

const PreprocessingNode = ({
  id,
  data,
  type,
  selected,
  isConnectable,
}: NodeProps) => {
  const meta = PREPROCESS_META[type] ?? {
    label: type,
    icon: "mdi:filter",
    color: "border-default-400",
  };

  const datasets = usePlexusStore((s) => s.datasets);
  const selectedDatasetId = usePlexusStore((s) => s.selectedDatasetId);
  const { setNodes } = useReactFlow();

  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<{
    before: Record<string, unknown>[];
    after: Record<string, unknown>[];
    changed_columns: string[];
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
  };

  const handleTogglePreview = async () => {
    if (showPreview) { setShowPreview(false); return; }
    if (preview) { setShowPreview(true); return; }
    if (!selectedDatasetId) return;
    setLoadingPreview(true);
    try {
      const result = await previewNodeEffect(
        selectedDatasetId, type, data.columns || [], 4
      );
      setPreview(result);
      setShowPreview(true);
    } catch { /* ignore */ }
    finally { setLoadingPreview(false); }
  };

  return (
    <div
      className={clsx(
        "min-w-[160px] rounded-xl border-2 bg-white dark:bg-default-100 shadow-sm p-3 transition-all relative group",
        selected ? "border-primary ring-2 ring-primary/30" : meta.color,
        data._suggestDelete && "border-red-500 ring-2 ring-red-300",
      )}
    >
      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
      >
        <Icon icon="lucide:x" className="w-3 h-3" />
      </button>

      <Handle className={nodeStyles.handle} isConnectable={isConnectable} position={Position.Left} type="target" />

      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-default-600" icon={meta.icon} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{data.label || meta.label}</div>
          {data.columns && data.columns.length > 0 && (
            <div className="text-xs text-default-500 truncate">
              {(data.columns as string[]).slice(0, 3).join(", ")}
            </div>
          )}
          {data._incompatibleWarning && (
            <div className="text-xs text-red-500 mt-0.5">⚠ {data._incompatibleWarning}</div>
          )}
        </div>
      </div>

      {/* Peek preview button */}
      {selectedDatasetId && (
        <button
          className="mt-1 text-[10px] text-default-400 hover:text-primary underline block"
          onClick={handleTogglePreview}
        >
          {loadingPreview ? "Loading…" : showPreview ? "Hide preview" : "Peek effect (4 rows)"}
        </button>
      )}

      {/* Before/After preview table */}
      {showPreview && preview && (
        <div className="mt-2 space-y-1">
          {["before", "after"].map((phase) => {
            const rows = preview[phase as "before" | "after"];
            const cols = preview.changed_columns.slice(0, 4);
            if (!cols.length || !rows.length) return null;
            return (
              <div key={phase}>
                <div className="text-[9px] font-semibold text-default-500 uppercase mb-0.5">{phase}</div>
                <div className="overflow-x-auto rounded border border-default-200">
                  <table className="text-[9px] border-collapse w-full">
                    <thead>
                      <tr>
                        {cols.map((c) => (
                          <th key={c} className="border border-default-200 bg-default-50 px-1 py-0.5 text-left truncate max-w-[50px]">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 4).map((row, i) => (
                        <tr key={i}>
                          {cols.map((c) => (
                            <td key={c} className="border border-default-100 px-1 py-0.5 truncate max-w-[50px]">{String(row[c] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Handle className={nodeStyles.handle} isConnectable={isConnectable} position={Position.Right} type="source" />
    </div>
  );
};

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// VisualisationNode  (lossCurve, gradientFlow, confMatrix, predTable, modelComparison)
// ---------------------------------------------------------------------------
const VIZ_META: Record<string, { label: string; icon: string }> = {
  lossCurve: { label: "Loss Curve", icon: "mdi:chart-line" },
  gradientFlow: { label: "Gradient Flow", icon: "mdi:water-wave" },
  confMatrix: { label: "Confusion Matrix", icon: "mdi:grid" },
  predTable: { label: "Predictions Table", icon: "mdi:table-eye" },
  modelComparison: { label: "Model Comparison", icon: "mdi:compare-horizontal" },
  activationHeatmap: { label: "Activation Heatmap", icon: "mdi:fire" },
};

const VisualizationNode = ({
  data,
  type,
  selected,
  isConnectable,
}: NodeProps) => {
  const meta = VIZ_META[type] ?? { label: type, icon: "mdi:chart-bar" };
  const activeTraining = usePlexusStore((s) => s.training);
  const trainingJobs = usePlexusStore((s) => s.trainingJobs);
  const nodeJobId = (data as { jobId?: string })?.jobId;
  const training =
    nodeJobId && trainingJobs[nodeJobId]
      ? trainingJobs[nodeJobId]
      : activeTraining;
  const hasData = training.metrics.loss.length > 0;
  const [collapsed, setCollapsed] = useState(false);
  const trainingResult = training.result as Record<string, any> | null;
  const result = (data as { result?: Record<string, any> })?.result || trainingResult;
  const hasResult = Boolean(result);
  const bestModel =
    (result?.best_model as Record<string, any> | undefined) ??
    ((result?.model_results as Record<string, any>[] | undefined)?.[0]);
  const confusionMatrix = bestModel?.confusion_matrix as number[][] | undefined;
  const classNames = (bestModel?.class_names as string[] | undefined) ?? [];
  const predictionRows =
    (bestModel?.predictions as
      | { actual: string | number; predicted: string | number; confidence?: number | null }[]
      | undefined) ?? [];
  const comparisonRows =
    (result?.comparison as
      | {
          rank: number;
          label: string;
          model_type: string;
          val_accuracy?: number;
          val_loss?: number;
          artifact_path?: string;
        }[]
      | undefined) ?? [];

  // Build chart data for loss curve
  const chartData = useMemo(() => {
    const { loss, accuracy, val_loss, val_accuracy } = training.metrics;
    const len = Math.max(
      loss.length,
      accuracy.length,
      val_loss.length,
      val_accuracy.length,
    );

    return Array.from({ length: len }, (_, i) => ({
      epoch: i + 1,
      loss: loss[i] ?? null,
      accuracy:
        accuracy[i] !== undefined ? +(accuracy[i] * 100).toFixed(2) : null,
      val_loss: val_loss[i] ?? null,
      val_accuracy:
        val_accuracy[i] !== undefined
          ? +(val_accuracy[i] * 100).toFixed(2)
          : null,
    }));
  }, [training.metrics]);

  // Gradient entries
  const gradEntries = useMemo(
    () =>
      Object.entries(training.gradientNorms).sort(
        ([, a], [, b]) => (b as number) - (a as number),
      ),
    [training.gradientNorms],
  );

  return (
    <div
      className={clsx(
        "rounded-xl border-2 bg-white dark:bg-default-100 shadow-md transition-all",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-amber-400 dark:border-amber-600",
        collapsed ? "min-w-[180px]" : "min-w-[320px]",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />

      {/* Header — always visible */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <Icon className="w-5 h-5 text-amber-500" icon={meta.icon} />
        <div className="flex-1">
          <div className="font-medium text-sm">{data.label || meta.label}</div>
          {hasData && type === "lossCurve" && collapsed && (
            <div className="text-xs text-default-500">
              loss:{" "}
              {training.metrics.loss[training.metrics.loss.length - 1]?.toFixed(
                4,
              )}
            </div>
          )}
          {!hasData && !hasResult && (
            <div className="text-xs text-default-400">
              waiting for training…
            </div>
          )}
        </div>
        <Icon
          className="w-4 h-4 text-default-400"
          icon={collapsed ? "lucide:chevron-down" : "lucide:chevron-up"}
        />
      </div>

      {/* Expanded content — differs by vis type */}
      {!collapsed && (hasData || hasResult) && (
        <div className="px-3 pb-3">
          {/* ---- Training Controls (For Monitor Node) ---- */}
          {type === "lossCurve" && (
            <div className="flex gap-2 justify-center py-2 border-b border-default-200 dark:border-default-700/50 mb-2">
              <Button
                color={training.status === "running" ? "warning" : "success"}
                size="sm"
                startContent={
                  <Icon
                    icon={
                      training.status === "running"
                        ? "lucide:pause"
                        : "lucide:play"
                    }
                  />
                }
                variant="flat"
                onPress={async () => {
                  const jobId = training.jobId;
                  if (!jobId) return;
                  const nextStatus =
                    training.status === "running" ? "paused" : "running";
                  try {
                    await updateJobStatus(jobId, nextStatus);
                    usePlexusStore.getState().updateJob(jobId, {
                      status: nextStatus as any,
                    });
                  } catch (err) {
                    usePlexusStore.getState().updateJob(jobId, {
                      error: err instanceof Error ? err.message : String(err),
                    });
                  }
                }}
              >
                {training.status === "running" ? "Pause" : "Resume"}
              </Button>
              <Button
                color="danger"
                size="sm"
                startContent={<Icon icon="lucide:square" />}
                variant="flat"
                onPress={async () => {
                  const jobId = training.jobId;
                  if (!jobId) return;
                  try {
                    await updateJobStatus(jobId, "stopped");
                    usePlexusStore.getState().updateJob(jobId, {
                      status: "stopped",
                    });
                  } catch (err) {
                    usePlexusStore.getState().updateJob(jobId, {
                      error: err instanceof Error ? err.message : String(err),
                    });
                  }
                }}
              >
                Stop
              </Button>
            </div>
          )}

          {/* ---- Loss Curve ---- */}
          {type === "lossCurve" && chartData.length > 1 && (
            <div className="space-y-2">
              <ResponsiveContainer height={140} width="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid opacity={0.3} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="epoch"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} />
                  <ReTooltip contentStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line
                    dataKey="loss"
                    dot={false}
                    name="Train"
                    stroke="#006FEE"
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Line
                    dataKey="val_loss"
                    dot={false}
                    name="Val"
                    stroke="#F5A524"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
              {chartData.some((d) => d.accuracy !== null) && (
                <ResponsiveContainer height={100} width="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid opacity={0.3} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="epoch"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      unit="%"
                    />
                    <ReTooltip contentStyle={{ fontSize: 10 }} />
                    <Line
                      dataKey="accuracy"
                      dot={false}
                      name="Acc"
                      stroke="#17C964"
                      strokeWidth={2}
                      type="monotone"
                    />
                    <Line
                      dataKey="val_accuracy"
                      dot={false}
                      name="Val Acc"
                      stroke="#9353D3"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* ---- Gradient Flow ---- */}
          {type === "gradientFlow" && gradEntries.length > 0 && (
            <div className="space-y-1.5">
              {gradEntries.slice(0, 8).map(([layerId, norm]) => {
                const n = norm as number;
                const isDead = n < 1e-5;

                return (
                  <div
                    key={layerId}
                    className="flex items-center gap-1.5 text-[10px]"
                  >
                    <span
                      className={`truncate w-20 ${isDead ? "text-red-500" : "text-default-600"}`}
                    >
                      {layerId}
                    </span>
                    <div className="flex-1 bg-default-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isDead ? "bg-red-500" : "bg-blue-500"}`}
                        style={{ width: `${Math.min(100, n * 100)}%` }}
                      />
                    </div>
                    <span
                      className={`w-12 text-right font-mono ${isDead ? "text-red-500" : "text-default-500"}`}
                    >
                      {isDead ? "DEAD" : n.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {type === "gradientFlow" && gradEntries.length === 0 && (
            <div className="text-xs text-default-400 text-center py-2">
              No gradient data yet
            </div>
          )}

          {/* ---- Confusion Matrix ---- */}
          {type === "confMatrix" && (
            <div className="text-xs">
              {training.status === "completed" && confusionMatrix?.length ? (
                <div className="space-y-1">
                  <div
                    className="grid gap-0.5"
                    style={{
                      gridTemplateColumns: `repeat(${confusionMatrix.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {confusionMatrix.map((row, ri) => (
                      <React.Fragment key={ri}>
                        {row.map((val, ci) => (
                          <div
                            key={ci}
                            className="p-1.5 text-center rounded text-[10px] font-mono"
                            style={{
                              backgroundColor: `rgba(0, 111, 238, ${Math.min(1, val / 100)})`,
                              color: val > 50 ? "white" : "inherit",
                            }}
                          >
                            {val}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-default-400 text-center">
                    {classNames.length > 0
                      ? `Classes: ${classNames.slice(0, 4).join(", ")}${classNames.length > 4 ? "..." : ""}`
                      : "Confusion matrix"}
                  </p>
                </div>
              ) : (
                <p className="text-default-400 text-center py-2">
                  Appears after training
                </p>
              )}
            </div>
          )}

          {/* ---- Predictions Table ---- */}
          {type === "predTable" && (
            <div className="text-xs">
              {training.status === "completed" && predictionRows.length > 0 ? (
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-default-200 bg-default-50 px-1.5 py-1 text-left">
                        Actual
                      </th>
                      <th className="border border-default-200 bg-default-50 px-1.5 py-1 text-left">
                        Predicted
                      </th>
                      <th className="border border-default-200 bg-default-50 px-1.5 py-1 text-left">
                        Conf
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionRows.map((row, i) => (
                      <tr
                        key={i}
                        className={
                          row.actual !== row.predicted
                            ? "bg-red-50 dark:bg-red-900/10"
                            : ""
                        }
                      >
                        <td className="border border-default-100 px-1.5 py-0.5">
                          {row.actual}
                        </td>
                        <td className="border border-default-100 px-1.5 py-0.5">
                          {row.predicted}
                        </td>
                        <td className="border border-default-100 px-1.5 py-0.5 font-mono">
                          {row.confidence !== null && row.confidence !== undefined
                            ? `${Math.round(row.confidence * 100)}%`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-default-400 text-center py-2">
                  Appears after training
                </p>
              )}
            </div>
          )}

          {/* ---- Model Comparison ---- */}
          {type === "modelComparison" && (
            <div className="text-xs">
              {comparisonRows.length > 0 ? (
                <div className="space-y-1">
                  {comparisonRows.map((row) => (
                    <div
                      key={`${row.rank}-${row.model_type}`}
                      className="grid grid-cols-[1.5rem_1fr_3.5rem] gap-2 items-center"
                    >
                      <span className="font-mono text-default-400">#{row.rank}</span>
                      <span className="truncate">{row.label || row.model_type}</span>
                      <span className="font-mono text-right">
                        {row.val_accuracy !== undefined
                          ? `${Math.round(row.val_accuracy * 100)}%`
                          : row.val_loss?.toFixed(3)}
                      </span>
                    </div>
                  ))}
                  <p className="text-default-400 text-center">Model comparison</p>
                </div>
              ) : (
                <p className="text-default-400 text-center py-2">
                  Appears after training
                </p>
              )}
            </div>
          )}

          {/* ---- Activation Heatmap ---- */}
          {type === "activationHeatmap" && (
            <div className="text-xs text-default-400 text-center py-2">
              Activation maps are available only for supported deep-learning
              image models.
            </div>
          )}
        </div>
      )}

      {/* No output handle — visualization is a sink node */}
    </div>
  );
};

// ---------------------------------------------------------------------------
// EvaluationResultsNode — auto-added after training completes
// ---------------------------------------------------------------------------
const EvaluationResultsNode = ({
  data,
  selected,
  isConnectable,
}: NodeProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const training = usePlexusStore((s) => s.training);
  const result = (data.result || training.result) as Record<string, any> | null;

  return (
    <div
      className={clsx(
        "rounded-xl border-2 shadow-md transition-all",
        "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-green-400 dark:border-green-600",
        collapsed ? "min-w-[180px]" : "min-w-[280px]",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />

      <div
        className="flex items-center gap-2 p-3 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <Icon className="w-5 h-5 text-green-500" icon="mdi:trophy" />
        <div className="flex-1">
          <div className="font-semibold text-sm">Evaluation Results</div>
          {result && collapsed && (
            <div className="text-xs text-default-500">
              {(result as any).final_accuracy !== undefined
                ? `Acc: ${((result as any).final_accuracy * 100).toFixed(1)}%`
                : "Complete"}
            </div>
          )}
        </div>
        <Icon
          className="w-4 h-4 text-default-400"
          icon={collapsed ? "lucide:chevron-down" : "lucide:chevron-up"}
        />
      </div>

      {!collapsed && result && (
        <div className="px-3 pb-3 space-y-2">
          {(result as any).mode === "simulated" && (
            <Chip color="warning" size="sm" variant="flat">
              simulated
            </Chip>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(result as any).final_loss !== undefined && (
              <div className="bg-white dark:bg-default-100 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-blue-500">
                  {(result as any).final_loss.toFixed(4)}
                </div>
                <div className="text-default-500">Loss</div>
              </div>
            )}
            {(result as any).final_accuracy !== undefined && (
              <div className="bg-white dark:bg-default-100 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-green-500">
                  {((result as any).final_accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-default-500">Accuracy</div>
              </div>
            )}
            {(result as any).final_val_loss !== undefined && (
              <div className="bg-white dark:bg-default-100 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-amber-500">
                  {(result as any).final_val_loss.toFixed(4)}
                </div>
                <div className="text-default-500">Val Loss</div>
              </div>
            )}
            {(result as any).final_val_accuracy !== undefined && (
              <div className="bg-white dark:bg-default-100 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-purple-500">
                  {((result as any).final_val_accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-default-500">Val Accuracy</div>
              </div>
            )}
          </div>
        </div>
      )}

      {!collapsed && !result && (
        <div className="px-3 pb-3">
          <p className="text-xs text-default-400 text-center">
            No training results yet
          </p>
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

// ---------------------------------------------------------------------------
// TestModelNode
// ---------------------------------------------------------------------------
const TestModelNode = ({ data, selected, isConnectable }: NodeProps) => {
  const training = usePlexusStore((s) => s.training);
  const [inputJson, setInputJson] = useState("[{}]");
  const [result, setResult] = useState<
    { prediction: string | number; confidence?: number | null }[] | null
  >(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const bestModel = (training.result as Record<string, any> | null)
    ?.best_model as Record<string, any> | undefined;
  const artifactPath = (data.artifactPath || bestModel?.artifact_path) as
    | string
    | undefined;

  const runPrediction = async () => {
    if (!artifactPath) {
      setError("Train a model first so Plexus has a saved artifact.");
      return;
    }

    setIsRunning(true);
    setError("");
    setResult(null);
    try {
      const parsed = JSON.parse(inputJson);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const response = await predictModel(artifactPath, rows);

      setResult(response.predictions);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      className={clsx(
        "min-w-[260px] rounded-xl border-2 bg-white dark:bg-default-100 shadow-sm p-3 transition-all",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-green-400 dark:border-green-600",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-green-500" icon="mdi:test-tube" />
        <div className="flex-1">
          <div className="font-medium text-sm">
            {data.label || "Test Model"}
          </div>
          <div className="text-xs text-default-500">
            {artifactPath ? "Saved artifact ready" : "Train a model first"}
          </div>
        </div>
      </div>
      <textarea
        className="mt-3 w-full rounded-lg border border-default-200 bg-default-50 p-2 text-[10px] font-mono outline-none focus:border-green-500"
        rows={4}
        value={inputJson}
        onChange={(event) => setInputJson(event.target.value)}
      />
      <Button
        className="mt-2 w-full"
        color="success"
        isDisabled={!artifactPath}
        isLoading={isRunning}
        size="sm"
        variant="flat"
        onPress={runPrediction}
      >
        Run Prediction
      </Button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {result && (
        <div className="mt-2 space-y-1 text-xs">
          {result.map((row, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded bg-default-50 px-2 py-1"
            >
              <span>{String(row.prediction)}</span>
              <span className="font-mono text-default-500">
                {row.confidence !== null && row.confidence !== undefined
                  ? `${Math.round(row.confidence * 100)}%`
                  : "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ExportCodeNode
// ---------------------------------------------------------------------------
const ExportCodeNode = ({ data, selected, isConnectable }: NodeProps) => {
  return (
    <div
      className={clsx(
        "min-w-[160px] rounded-xl border-2 bg-white dark:bg-default-100 shadow-sm p-3 transition-all",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-indigo-400 dark:border-indigo-600",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-indigo-500" icon="mdi:code-braces" />
        <div className="flex-1">
          <div className="font-medium text-sm">
            {data.label || "Export Code"}
          </div>
          <div className="text-xs text-default-500">
            {data.framework || "tensorflow"} · {data.format || "python"}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ApiDeployNode — downloads a deployment ZIP with FastAPI app + Docker
// ---------------------------------------------------------------------------
const ApiDeployNode = ({ data, selected, isConnectable }: NodeProps) => {
  const training = usePlexusStore((s) => s.training);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const result = training.result as Record<string, any> | null;
  const framework = (result?.framework || result?.mode || "sklearn") as string;
  const taskType = (result?.task_type || "classification") as string;
  const outputUnits = (result?.output_units || 1) as number;
  const artifactDir = result?.artifact_dir as string | undefined;
  const bestModel = result?.best_model as Record<string, any> | undefined;
  const modelPath = (bestModel?.artifact_path || artifactDir || "model.joblib") as string;
  const inputShape = (result?.input_shape || [784]) as number[];
  const isReady = training.status === "completed" && result;

  const handleDownload = async () => {
    setIsDownloading(true);
    setError("");
    setDownloaded(false);
    try {
      const blob = await downloadDeploymentZip({
        framework,
        outputUnits,
        taskType,
        modelPath,
        inputShape,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plexus_deployment.zip";
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className={clsx(
        "min-w-[220px] rounded-xl border-2 bg-white dark:bg-default-100 shadow-md p-3 transition-all",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-pink-400 dark:border-pink-600",
      )}
    >
      <Handle
        className={nodeStyles.handle}
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-pink-500" icon="mdi:api" />
        <div className="flex-1">
          <div className="font-medium text-sm">
            {data.label || "API Deploy"}
          </div>
          <div className="text-xs text-default-500">FastAPI · Docker</div>
        </div>
      </div>
      <Button
        className="mt-3 w-full"
        color={downloaded ? "success" : "secondary"}
        isDisabled={!isReady}
        isLoading={isDownloading}
        size="sm"
        startContent={
          downloaded ? (
            <Icon icon="lucide:check" />
          ) : (
            <Icon icon="lucide:download" />
          )
        }
        variant="flat"
        onPress={handleDownload}
      >
        {downloaded
          ? "Downloaded!"
          : isDownloading
            ? "Generating..."
            : isReady
              ? "Download ZIP"
              : "Train a model first"}
      </Button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
};

const GhostNode = ({ data }: NodeProps) => {
  return (
    <div
      className={clsx(
        "relative rounded-lg p-4 border-2 border-dashed flex items-center gap-2 cursor-pointer transition-all hover:bg-white/5",
        "bg-gray-800/50 border-gray-500 opacity-60 hover:opacity-100"
      )}
      onClick={data.onClick}
    >
      <Icon className="w-5 h-5 text-gray-400" icon={data.icon || "lucide:plus-circle"} />
      <div className="flex-1">
        <div className="font-bold text-sm text-gray-300">{data.label}</div>
        <div className="text-xs text-gray-500">Click to add this suggested layer</div>
      </div>
    </div>
  );
};

// Update the nodeTypes object to use renamed layers and new text nodes
export const nodeTypes = {
  ghost: memo((props: NodeProps) => <GhostNode {...props} />),
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

  // Additional node types for templates
  attention: memo((props: NodeProps) => <BaseNode {...props} />),
  normalization: memo((props: NodeProps) => <BaseNode {...props} />),
  pooling: memo((props: NodeProps) => <BaseNode {...props} />),

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

  // Training and Metrics
  training_config: memo((props: NodeProps) => (
    <TrainingConfigNode {...props} />
  )),
  metrics: memo((props: NodeProps) => <MetricsNode {...props} />),

  // Add other node types as needed
  softmax: memo((props: NodeProps) => <BaseNode {...props} />),
  recurrent: memo((props: NodeProps) => <BaseNode {...props} />),

  // ---- Classic ML Models ----
  randomForest: memo((props: NodeProps) => <BaseNode {...props} />),
  svm:          memo((props: NodeProps) => <BaseNode {...props} />),
  knn:          memo((props: NodeProps) => <BaseNode {...props} />),
  logisticRegression: memo((props: NodeProps) => <BaseNode {...props} />),
  decisionTree: memo((props: NodeProps) => <BaseNode {...props} />),
  gradientBoosting: memo((props: NodeProps) => <BaseNode {...props} />),
  extraTrees: memo((props: NodeProps) => <BaseNode {...props} />),
  naiveBayes: memo((props: NodeProps) => <BaseNode {...props} />),
  adaBoost: memo((props: NodeProps) => <BaseNode {...props} />),
  linearRegression: memo((props: NodeProps) => <BaseNode {...props} />),
  ridgeRegression: memo((props: NodeProps) => <BaseNode {...props} />),
  lassoRegression: memo((props: NodeProps) => <BaseNode {...props} />),
  mlpClassifier: memo((props: NodeProps) => <BaseNode {...props} />),

  // ---- Data Sources ----
  dataset: memo((props: NodeProps) => <DatasetNode {...props} />),

  // ---- Preprocessing ----
  normalize: memo((props: NodeProps) => <PreprocessingNode {...props} />),
  dropNulls: memo((props: NodeProps) => <PreprocessingNode {...props} />),
  oneHotEncode: memo((props: NodeProps) => <PreprocessingNode {...props} />),
  embedEncode: memo((props: NodeProps) => <PreprocessingNode {...props} />),
  scale: memo((props: NodeProps) => <PreprocessingNode {...props} />),

  // ---- Visualisation ----
  lossCurve: memo((props: NodeProps) => <VisualizationNode {...props} />),
  gradientFlow: memo((props: NodeProps) => <VisualizationNode {...props} />),
  confMatrix: memo((props: NodeProps) => <VisualizationNode {...props} />),
  predTable: memo((props: NodeProps) => <VisualizationNode {...props} />),
  modelComparison: memo((props: NodeProps) => (
    <VisualizationNode {...props} />
  )),
  activationHeatmap: memo((props: NodeProps) => (
    <VisualizationNode {...props} />
  )),

  // ---- Output / Test ----
  testModel: memo((props: NodeProps) => <TestModelNode {...props} />),
  exportCode: memo((props: NodeProps) => <ExportCodeNode {...props} />),
  apiDeploy: memo((props: NodeProps) => <ApiDeployNode {...props} />),

  // ---- Evaluation Results (auto-added post-training) ----
  evaluationResults: memo((props: NodeProps) => (
    <EvaluationResultsNode {...props} />
  )),
};
