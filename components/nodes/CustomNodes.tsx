import React, { memo, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Icon } from "@iconify/react";
import { Input, Select, SelectItem, Switch } from "@heroui/react";
import clsx from "clsx";

import { nodeStyles } from "./nodeStyles";

const BaseNode = ({ data, type, selected, isConnectable }: NodeProps) => {
  const isProcessing = data.isProcessing || false;
  const activationLevel = data.activationLevel || 0;

  return (
    <div
      className={clsx(
        nodeStyles.base,
        nodeStyles[type as keyof typeof nodeStyles] || nodeStyles.dense,
        selected && nodeStyles.selected,
        isProcessing && "ring-2 ring-blue-400 ring-opacity-50 animate-pulse",
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
};
