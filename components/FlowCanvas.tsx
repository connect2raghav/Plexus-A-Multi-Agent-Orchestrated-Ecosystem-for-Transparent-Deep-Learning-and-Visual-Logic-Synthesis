import React, { useCallback, useRef, useState } from "react";
import { Code, Copy, Download, Network, Play, Pause, BarChart3 } from 'lucide-react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ConnectionMode,
} from "reactflow";
import { Icon } from "@iconify/react";
import { nodeTypes } from "./nodes/CustomNodes";
import { NetworkCodeGenerator } from "./CodeGenerator";
import InferenceEngine from "./InferenceEngine";
import { getLayoutedElements } from "./utils/layoutUtils";
import "reactflow/dist/style.css";
import "@/styles/nodes.css";
import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter, RadioGroup, Radio } from "@heroui/react";




interface FlowCanvasProps {
  onNodeSelect: (node: Node | null) => void;
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({ onNodeSelect }) => {
  // Name-based Gender Classification Model Architecture
  const initialEdges: Edge[] = [
    // Text Input -> Embedding Layer
    {
      id: "e-input-embedding",
      source: "input-1",
      target: "embedding-1",
      animated: true,
      type: "smooth",
    },
    // Embedding -> LSTM Layer
    {
      id: "e-embedding-lstm",
      source: "embedding-1",
      target: "lstm-1",
      animated: true,
      type: "smooth",
    },
    // LSTM -> Dense Layer 1
    {
      id: "e-lstm-dense1",
      source: "lstm-1",
      target: "dense1-1",
      animated: true,
      type: "smooth",
    },
    // Dense 1 -> Dropout
    {
      id: "e-dense1-dropout",
      source: "dense1-1",
      target: "dropout-1",
      animated: true,
      type: "smooth",
    },
    // Dropout -> Dense Layer 2
    {
      id: "e-dropout-dense2",
      source: "dropout-1",
      target: "dense2-1",
      animated: true,
      type: "smooth",
    },
    // Dense 2 -> Output
    {
      id: "e-dense2-output",
      source: "dense2-1",
      target: "output-1",
      animated: true,
      type: "smooth",
    },
    // Output -> Training Config (network connection)
    {
      id: "e-output-training",
      source: "output-1",
      target: "training-1",
      sourceHandle: null,
      targetHandle: "network",
      animated: true,
      type: "smooth",
    },
    // Optimizer -> Training Config
    {
      id: "e-optimizer-training",
      source: "optimizer-1",
      target: "training-1",
      sourceHandle: null,
      targetHandle: "optimizer",
      animated: true,
      type: "smooth",
      style: { stroke: '#fb923c' },
    },
    // Loss -> Training Config
    {
      id: "e-loss-training",
      source: "loss-1",
      target: "training-1",
      sourceHandle: null,
      targetHandle: "loss",
      animated: true,
      type: "smooth",
      style: { stroke: '#ef4444' },
    },
    // Training Config -> Metrics
    {
      id: "e-training-metrics",
      source: "training-1",
      target: "metrics-1",
      sourceHandle: "metrics",
      targetHandle: null,
      animated: true,
      type: "smooth",
      style: { stroke: '#10b981' },
    },
  ];

  const initialNodes: Node[] = [
    // Text Input Layer - For name input
    {
      id: "input-1",
      type: "textInput",
      data: {
        label: "Name Input",
        icon: "lucide:type",
        details: "Enter person's name",
        value: "Sarah",
        isProcessing: false, // Will be updated during inference
        onChange: (newValue: string) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "input-1"
                ? {
                  ...node,
                  data: { ...node.data, value: newValue },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 50, y: 200 },
    },
    // Embedding Layer - Convert text to numerical representation
    {
      id: "embedding-1",
      type: "embedding",
      data: {
        label: "Name Embedding",
        icon: "lucide:hash",
        details: "Text to Vector Embedding",
        params: { 
          vocab_size: 10000, 
          embedding_dim: 64,
          input_length: 20 // Max name length
        },
        count: 64,
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "embedding-1"
                ? {
                  ...node,
                  data: { 
                    ...node.data, 
                    count: Math.max(1, newCount),
                    params: { ...node.data.params, embedding_dim: newCount }
                  },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 300, y: 200 },
    },
    // LSTM Layer - Process sequence of characters/sounds
    {
      id: "lstm-1",
      type: "lstm",
      data: {
        label: "LSTM (128)",
        icon: "lucide:activity",
        details: "Sequence Processing",
        params: { 
          units: 128, 
          return_sequences: false,
          dropout: 0.2,
          recurrent_dropout: 0.2
        },
        count: 128,
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "lstm-1"
                ? {
                  ...node,
                  data: { 
                    ...node.data, 
                    count: Math.max(1, newCount),
                    params: { ...node.data.params, units: newCount }
                  },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 550, y: 200 },
    },
    // First Dense Layer
    {
      id: "dense1-1",
      type: "dense",
      data: {
        label: "Dense (64)",
        icon: "lucide:grid",
        details: "64 neurons, ReLU activation",
        count: 64,
        params: { units: 64, activation: 'relu' },
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "dense1-1"
                ? {
                  ...node,
                  data: { 
                    ...node.data, 
                    count: Math.max(1, newCount),
                    params: { ...node.data.params, units: newCount }
                  },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 800, y: 200 },
    },
    // Dropout Layer
    {
      id: "dropout-1",
      type: "dropout",
      data: {
        label: "Dropout (0.3)",
        icon: "lucide:cloud-rain",
        details: "30% dropout rate",
        params: { rate: 0.3 },
      },
      position: { x: 1000, y: 200 },
    },
    // Second Dense Layer
    {
      id: "dense2-1",
      type: "dense",
      data: {
        label: "Dense (32)",
        icon: "lucide:grid",
        details: "32 neurons, ReLU activation",
        count: 32,
        params: { units: 32, activation: 'relu' },
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "dense2-1"
                ? {
                  ...node,
                  data: { 
                    ...node.data, 
                    count: Math.max(1, newCount),
                    params: { ...node.data.params, units: newCount }
                  },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 1200, y: 200 },
    },
    // Output Layer - Binary classification (Male/Female)
    {
      id: "output-1",
      type: "outputLayer",
      data: {
        label: "Gender Output",
        count: 1, // Binary classification - sigmoid output
        icon: "lucide:user-check",
        details: "Binary: Male(0)/Female(1)",
        params: { activation: 'sigmoid', units: 1 },
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "output-1"
                ? {
                  ...node,
                  data: { ...node.data, count: Math.max(1, newCount) },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 1400, y: 200 },
    },
    // Adam Optimizer - Good for text processing
    {
      id: "optimizer-1",
      type: "adam",
      data: {
        label: "Adam Optimizer",
        icon: "lucide:zap",
        details: "Learning Rate: 0.001",
        params: { lr: 0.001, beta1: 0.9, beta2: 0.999 },
        onParamsChange: (newParams: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "optimizer-1"
                ? {
                  ...node,
                  data: { ...node.data, params: newParams },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 800, y: 350 },
    },
    // Binary Cross Entropy Loss
    {
      id: "loss-1",
      type: "bce",
      data: {
        label: "Binary Cross Entropy",
        icon: "lucide:target",
        details: "Binary Classification Loss",
        params: { reduction: 'mean' },
        onParamsChange: (newParams: any) => {
          setNodes ((nds) =>
            nds.map((node) =>
              node.id === "loss-1"
                ? {
                  ...node,
                  data: { ...node.data, params: newParams },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 1000, y: 350 },
    },
    // Training Configuration Hub
    {
      id: "training-1",
      type: "training_config",
      data: {
        label: "Training Config",
        icon: "lucide:settings",
        details: "Training Configuration Hub",
        config: {
          epochs: 100,
          batch_size: 64,
          validation_split: 0.2,
          early_stopping: true,
          save_best: true
        },
        onConfigChange: (newConfig: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "training-1"
                ? {
                  ...node,
                  data: { ...node.data, config: newConfig },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 1600, y: 200 },
    },
    // Metrics Node - Shows results for name-based gender classification
    {
      id: "metrics-1",
      type: "metrics",
      data: {
        label: "Gender Prediction Metrics",
        icon: "lucide:bar-chart-3",
        details: "Name-based Gender Classification",
        metrics: {
          accuracy: 0.87,
          loss: 0.35,
          val_accuracy: 0.84,
          val_loss: 0.42
        },
      },
      position: { x: 1850, y: 200 },
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showPanel, setShowPanel] = useState(false);
  const [showInferencePanel, setShowInferencePanel] = useState(false);
  const [isInferenceRunning, setIsInferenceRunning] = useState(false);
  const [framework, setFramework] = useState<"tensorflow" | "pytorch">("tensorflow");
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const { project, fitView } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Auto layout function
  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'LR'
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

    window.requestAnimationFrame(() => {
      fitView();
    });
  }, [nodes, edges, setNodes, setEdges, fitView]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
      const nodeData = JSON.parse(
        event.dataTransfer.getData("application/reactflow"),
      );

      if (!nodeData) return;

      console.log("Adding node of type:", nodeData.type);

      // Check if trying to add input/output node when one already exists
      const hasInputNode = nodes.some((node) => node.type === "textInput" || node.type === "inputLayer");
      const hasOutputNode = nodes.some((node) => node.type === "outputLayer");

      if ((nodeData.type === "textInput" || nodeData.type === "inputLayer") && hasInputNode) {
        alert("Only one input node is allowed");
        return;
      }
      if (nodeData.type === "outputLayer" && hasOutputNode) {
        alert("Only one output node is allowed");
        return;
      }

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: Date.now().toString(),
        type: nodeData.type,
        position,
        data: {
          label: nodeData.label,
          icon: nodeData.icon,
          details: nodeData.details,
          ...(["inputLayer", "outputLayer", "hidden", "dense", "embedding", "lstm"].includes(nodeData.type)
            ? {
              count:
                nodeData.type === "inputLayer"
                  ? 784
                  : nodeData.type === "outputLayer"
                    ? 1
                  : nodeData.type === "embedding"
                    ? 64
                  : nodeData.type === "lstm" 
                    ? 128
                    : 128,
              onChange: (newCount: number) => {
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === newNode.id
                      ? {
                        ...node,
                        data: {
                          ...node.data,
                          count: Math.max(1, newCount),
                        },
                      }
                      : node,
                  ),
                );
              },
            }
            : {}),
          // Add text value handling for text input nodes
          ...(nodeData.type === "textInput"
            ? {
              value: "Enter name...",
              onChange: (newValue: string) => {
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === newNode.id
                      ? {
                        ...node,
                        data: {
                          ...node.data,
                          value: newValue,
                        },
                      }
                      : node,
                  ),
                );
              },
            }
            : {}),
          // Add parameter handling for algorithm, optimizer, loss, and scheduler nodes
          ...(["cnn", "rnn", "lstm", "transformer", "autoencoder", "gan", "resnet", "vae",
               "adam", "sgd", "rmsprop", "adagrad", "adamw", 
               "crossentropy", "mse", "mae", "bce",
               "steplr", "exponentiallr", "cosineannealinglr", "reducelronplateau"].includes(nodeData.type)
            ? {
              params: {},
              onParamsChange: (newParams: any) => {
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === newNode.id
                      ? {
                        ...node,
                        data: {
                          ...node.data,
                          params: newParams,
                        },
                      }
                      : node,
                  ),
                );
              },
            }
            : {}),
          // Add configuration handling for training config nodes
          ...(nodeData.type === "training_config"
            ? {
              config: {
                epochs: 10,
                batch_size: 32,
                validation_split: 0.2,
                early_stopping: false,
                save_best: true
              },
              onConfigChange: (newConfig: any) => {
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === newNode.id
                      ? {
                        ...node,
                        data: {
                          ...node.data,
                          config: newConfig,
                        },
                      }
                      : node,
                  ),
                );
              },
            }
            : {}),
          // Add metrics handling for metrics nodes
          ...(nodeData.type === "metrics"
            ? {
              metrics: {
                accuracy: 0.0,
                loss: 0.0,
                val_accuracy: 0.0,
                val_loss: 0.0
              },
            }
            : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, project, nodes],
  );

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError("");
      
      const generator = new NetworkCodeGenerator(nodes, edges);
      
      let code;
      if (framework === 'tensorflow') {
        code = generator.generateTensorFlowCode();
      } else {
        code = generator.generatePyTorchCode();
      }
      
      setGeneratedCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setGeneratedCode("");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const downloadCode = () => {
    const extension = framework === 'tensorflow' ? 'tf.py' : 'torch.py';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neural_network_${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get current input value for inference
  const getCurrentInputValue = (): string => {
    const inputNode = nodes.find(n => n.type === 'textInput');
    return inputNode?.data?.value || 'Sarah';
  };

  // Handle inference stats updates
  const handleInferenceStatsUpdate = (stats: any) => {
    // Update metrics node with real stats
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'metrics') {
          return {
            ...node,
            data: {
              ...node.data,
              metrics: {
                accuracy: stats.accuracy,
                loss: stats.loss,
                val_accuracy: stats.accuracy - 0.02,
                val_loss: stats.loss + 0.05
              }
            },
          };
        }
        
        // Update node processing states based on layer outputs
        if (node.id in stats.layerOutputs) {
          return {
            ...node,
            data: {
              ...node.data,
              isProcessing: isInferenceRunning,
              activationLevel: stats.layerOutputs[node.id] || 0,
            },
          };
        }
        
        return node;
      }),
    );
  };

  return (
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        fitView
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: "smooth",
          animated: true,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        edges={edges}
        fitViewOptions={{ padding: 0.2 }}
        nodeTypes={nodeTypes}
        nodes={nodes}
        selectNodesOnDrag={false}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeSelect(node)}
        onNodesChange={onNodesChange}
      >
        <Controls />
        <Background color="#aaa" gap={20} />
      </ReactFlow>

      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button
          isIconOnly
          aria-label="Auto layout"
          color="default"
          variant="faded"
          onClick={onLayout}
          className="shadow-md"
        >
          <Network className="w-5 h-5" />
        </Button>
        
        <Button
          isIconOnly
          aria-label="Show inference panel"
          color={isInferenceRunning ? "success" : "default"}
          variant={showInferencePanel ? "solid" : "faded"}
          onClick={() => setShowInferencePanel((prev) => !prev)}
          className="shadow-md"
        >
          <BarChart3 className="w-5 h-5" />
        </Button>

        <Button
          isIconOnly
          aria-label={isInferenceRunning ? "Stop inference" : "Start inference"}
          color={isInferenceRunning ? "danger" : "success"}
          variant="faded"
          onClick={() => setIsInferenceRunning((prev) => !prev)}
          className="shadow-md"
        >
          {isInferenceRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        
        <Button
          isIconOnly
          aria-label="Show code panel"
          color="default"
          variant="faded"
          onClick={() => setShowPanel((prev) => !prev)}
          className="shadow-md"
        >
          <Code className="w-5 h-5" />
        </Button>
      </div>

      {showPanel && (
        <Card
          className="shadow-lg border"
          style={{
            position: "absolute",
            top: 100,
            right: 24,
            width: generatedCode ? 600 : 360,
            maxHeight: "80vh",
            zIndex: 20,
            maxWidth: "90vw",
          }}
        >
          <CardBody className="p-6">
            <h2 className="text-xl font-semibold mb-4">Generate Neural Network Code</h2>
            
            {!generatedCode && (
              <>
                <p className="text-foreground-500 mb-6">
                  Select your preferred framework to generate code for your neural network.
                </p>
                <RadioGroup
                  label="Select Framework"
                  value={framework}
                  onValueChange={(value) => setFramework(value as "tensorflow" | "pytorch")}
                  orientation="horizontal"
                  classNames={{
                    base: "gap-6",
                    label: "text-foreground-600 font-medium mb-3"
                  }}
                >
                  <Radio value="tensorflow">
                    <div className="flex items-center gap-2">
                      <Icon icon="logos:tensorflow" className="text-xl" />
                      TensorFlow
                    </div>
                  </Radio>
                  <Radio value="pytorch">
                    <div className="flex items-center gap-2">
                      <Icon icon="logos:pytorch-icon" className="text-xl" />
                      PyTorch
                    </div>
                  </Radio>
                </RadioGroup>
              </>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {generatedCode && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Generated {framework === 'tensorflow' ? 'TensorFlow' : 'PyTorch'} Code:</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={copyToClipboard}
                      startContent={<Copy size={16} />}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={downloadCode}
                      startContent={<Download size={16} />}
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setGeneratedCode("");
                        setError("");
                      }}
                    >
                      Back
                    </Button>
                  </div>
                </div>
                <pre className=" p-4 rounded overflow-auto text-sm max-h-96 font-mono">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            )}
          </CardBody>
          
          {!generatedCode && (
            <CardFooter className="px-6 pb-6 pt-0">
              <Button
                color="primary"
                variant="solid"
                fullWidth
                onPress={handleGenerate}
                isLoading={isGenerating}
                startContent={!isGenerating && <Icon icon="lucide:code" />}
              >
                {isGenerating ? "Generating..." : "Generate Code"}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Real-time Inference Panel */}
      {showInferencePanel && (
        <div
          className="absolute top-100 left-24 z-20"
          style={{
            width: 400,
            maxHeight: "80vh",
            maxWidth: "90vw",
          }}
        >
          <InferenceEngine
            nodes={nodes}
            edges={edges}
            inputValue={getCurrentInputValue()}
            isRunning={isInferenceRunning}
            onStatsUpdate={handleInferenceStatsUpdate}
          />
        </div>
      )}
    </div>
  );
};

export default FlowCanvas;