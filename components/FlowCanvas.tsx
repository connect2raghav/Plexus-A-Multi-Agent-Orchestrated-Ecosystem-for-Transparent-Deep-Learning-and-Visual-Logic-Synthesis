import React, { useCallback, useRef, useState } from "react";
import { Code, Copy, Download, Network } from 'lucide-react';
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
import { getLayoutedElements } from "./utils/layoutUtils";
import "reactflow/dist/style.css";
import "@/styles/nodes.css";
import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter, RadioGroup, Radio } from "@heroui/react";




interface FlowCanvasProps {
  onNodeSelect: (node: Node | null) => void;
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({ onNodeSelect }) => {
  // Gender Classification Model Architecture
  const initialEdges: Edge[] = [
    // Input -> First Conv Layer
    {
      id: "e-input-conv1",
      source: "input-1",
      target: "conv1-1",
      animated: true,
      type: "smooth",
    },
    // First Conv -> First MaxPool
    {
      id: "e-conv1-pool1",
      source: "conv1-1",
      target: "pool1-1",
      animated: true,
      type: "smooth",
    },
    // First MaxPool -> Second Conv
    {
      id: "e-pool1-conv2",
      source: "pool1-1",
      target: "conv2-1",
      animated: true,
      type: "smooth",
    },
    // Second Conv -> Second MaxPool
    {
      id: "e-conv2-pool2",
      source: "conv2-1",
      target: "pool2-1",
      animated: true,
      type: "smooth",
    },
    // Second MaxPool -> Flatten
    {
      id: "e-pool2-flatten",
      source: "pool2-1",
      target: "flatten-1",
      animated: true,
      type: "smooth",
    },
    // Flatten -> Dense Layer
    {
      id: "e-flatten-dense",
      source: "flatten-1",
      target: "dense-1",
      animated: true,
      type: "smooth",
    },
    // Dense -> Dropout
    {
      id: "e-dense-dropout",
      source: "dense-1",
      target: "dropout-1",
      animated: true,
      type: "smooth",
    },
    // Dropout -> Output
    {
      id: "e-dropout-output",
      source: "dropout-1",
      target: "output-1",
      animated: true,
      type: "smooth",
    },
  ];

  const initialNodes: Node[] = [
    // Input Layer - 224x224x3 for RGB images
    {
      id: "input-1",
      type: "inputLayer",
      data: {
        label: "Image Input",
        count: 224*224*3, // 150,528 pixels for 224x224 RGB image
        icon: "lucide:image",
        details: "224x224x3 RGB Image Input",
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "input-1"
                ? {
                  ...node,
                  data: { ...node.data, count: Math.max(1, newCount) },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 50, y: 200 },
    },
    // First Convolutional Layer
    {
      id: "conv1-1",
      type: "conv2d",
      data: {
        label: "Conv2D (32 filters)",
        icon: "lucide:square",
        details: "32 filters, 3x3 kernel",
        params: { filters: 32, kernel_size: 3, activation: 'relu' },
      },
      position: { x: 200, y: 150 },
    },
    // First Max Pooling Layer
    {
      id: "pool1-1",
      type: "maxpool",
      data: {
        label: "MaxPool2D",
        icon: "lucide:minimize-2",
        details: "2x2 pool size",
        params: { pool_size: 2 },
      },
      position: { x: 350, y: 150 },
    },
    // Second Convolutional Layer
    {
      id: "conv2-1",
      type: "conv2d",
      data: {
        label: "Conv2D (64 filters)",
        icon: "lucide:square",
        details: "64 filters, 3x3 kernel",
        params: { filters: 64, kernel_size: 3, activation: 'relu' },
      },
      position: { x: 500, y: 150 },
    },
    // Second Max Pooling Layer
    {
      id: "pool2-1",
      type: "maxpool",
      data: {
        label: "MaxPool2D",
        icon: "lucide:minimize-2",
        details: "2x2 pool size",
        params: { pool_size: 2 },
      },
      position: { x: 650, y: 150 },
    },
    // Flatten Layer
    {
      id: "flatten-1",
      type: "flatten",
      data: {
        label: "Flatten",
        icon: "lucide:align-horizontal-space-around",
        details: "Flatten to 1D",
      },
      position: { x: 800, y: 150 },
    },
    // Dense Layer
    {
      id: "dense-1",
      type: "dense",
      data: {
        label: "Dense (128)",
        icon: "lucide:grid",
        details: "128 neurons, ReLU activation",
        count: 128,
        params: { units: 128, activation: 'relu' },
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "dense-1"
                ? {
                  ...node,
                  data: { ...node.data, count: Math.max(1, newCount) },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 950, y: 150 },
    },
    // Dropout Layer
    {
      id: "dropout-1",
      type: "dropout",
      data: {
        label: "Dropout (0.5)",
        icon: "lucide:cloud-rain",
        details: "50% dropout rate",
        params: { rate: 0.5 },
      },
      position: { x: 1100, y: 150 },
    },
    // Output Layer - Binary classification (Male/Female)
    {
      id: "output-1",
      type: "outputLayer",
      data: {
        label: "Gender Output",
        count: 1, // Binary classification - sigmoid output
        icon: "lucide:user",
        details: "Binary: Male/Female",
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
      position: { x: 1250, y: 150 },
    },
    // Add optimizer node
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
      position: { x: 650, y: 300 },
    },
    // Add loss function
    {
      id: "loss-1",
      type: "bce",
      data: {
        label: "Binary Cross Entropy",
        icon: "lucide:target",
        details: "Binary Classification Loss",
        params: { reduction: 'mean' },
        onParamsChange: (newParams: any) => {
          setNodes((nds) =>
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
      position: { x: 950, y: 300 },
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showPanel, setShowPanel] = useState(false);
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
      const hasInputNode = nodes.some((node) => node.type === "input");
      const hasOutputNode = nodes.some((node) => node.type === "output");

      if (nodeData.type === "input" && hasInputNode) {
        alert("Only one input node is allowed");
        return;
      }
      if (nodeData.type === "output" && hasOutputNode) {
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
          ...(["input", "output", "hidden"].includes(nodeData.type)
            ? {
              count:
                nodeData.type === "input"
                  ? 784
                  : nodeData.type === "output"
                    ? 10
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
    </div>
  );
};

export default FlowCanvas;