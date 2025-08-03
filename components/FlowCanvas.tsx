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
import "reactflow/dist/style.css";
import "@/styles/nodes.css";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody, CardFooter, Divider, Link, Image, RadioGroup, Radio } from "@heroui/react";

// Auto layout utility
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const nodeWidth = 200;
  const nodeHeight = 100;
  const levelSpacing = direction === 'LR' ? 250 : 150;
  const nodeSpacing = direction === 'LR' ? 150 : 250;

  // Build adjacency list
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  // Initialize
  nodes.forEach(node => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });
  
  // Build edges
  edges.forEach(edge => {
    const sourceEdges = graph.get(edge.source);
    if (sourceEdges) {
      sourceEdges.push(edge.target);
    }
    const currentInDegree = inDegree.get(edge.target) || 0;
    inDegree.set(edge.target, currentInDegree + 1);
  });
  
  // Topological sort to find levels
  const levels: string[][] = [];
  const queue: string[] = [];
  const visited = new Set<string>();
  
  // Find root nodes (nodes with no incoming edges)
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  });
  
  // If no root nodes, start with input nodes or first node
  if (queue.length === 0) {
    const inputNode = nodes.find(node => node.type === 'input');
    if (inputNode) {
      queue.push(inputNode.id);
    } else if (nodes.length > 0) {
      queue.push(nodes[0].id);
    }
  }
  
  // BFS to assign levels
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: string[] = [];
    
    for (let i = 0; i < levelSize; i++) {
      const nodeId = queue.shift();
      if (!nodeId || visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      currentLevel.push(nodeId);
      
      // Add children to next level
      const children = graph.get(nodeId) || [];
      children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      });
    }
    
    if (currentLevel.length > 0) {
      levels.push(currentLevel);
    }
  }
  
  // Add any remaining unvisited nodes
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      if (levels.length === 0) {
        levels.push([]);
      }
      levels[levels.length - 1].push(node.id);
    }
  });
  
  // Position nodes
  const layoutedNodes = nodes.map(node => {
    let levelIndex = 0;
    let nodeIndex = 0;
    
    // Find which level this node is in
    for (let i = 0; i < levels.length; i++) {
      const nodeIndexInLevel = levels[i].indexOf(node.id);
      if (nodeIndexInLevel !== -1) {
        levelIndex = i;
        nodeIndex = nodeIndexInLevel;
        break;
      }
    }
    
    const levelNodeCount = levels[levelIndex]?.length || 1;
    const levelHeight = (levelNodeCount - 1) * nodeSpacing;
    const startY = -levelHeight / 2;
    
    let x, y;
    if (direction === 'TB') {
      x = startY + nodeIndex * nodeSpacing;
      y = levelIndex * levelSpacing;
    } else {
      x = levelIndex * levelSpacing;
      y = startY + nodeIndex * nodeSpacing;
    }
    
    return {
      ...node,
      position: { x, y },
    };
  });
  
  return { nodes: layoutedNodes, edges };
};

// Code generation utilities
class NetworkCodeGenerator {
  constructor(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
    this.nodeMap = new Map(nodes.map(node => [node.id, node]));
    this.topology = this.buildTopology();
  }

  buildTopology() {
    const graph = new Map();
    const inDegree = new Map();
    
    // Initialize graph
    this.nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });
    
    // Build edges
    this.edges.forEach(edge => {
      graph.get(edge.source).push(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    });
    
    // Topological sort
    const queue = [];
    const sorted = [];
    
    this.nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });
    
    while (queue.length > 0) {
      const nodeId = queue.shift();
      sorted.push(nodeId);
      
      graph.get(nodeId).forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }
    
    return sorted;
  }

  generateTensorFlowCode() {
    const imports = [
      "import tensorflow as tf",
      "from tensorflow.keras import layers, Model",
      "import numpy as np",
      ""
    ];

    const modelBody = ["def create_model():"];

    // Find input node
    const inputNode = this.nodes.find(node => node.type === 'input');
    if (!inputNode) {
      throw new Error("No input layer found");
    }

    const inputShape = inputNode.data.count || 784;
    modelBody.push(`    input_layer = layers.Input(shape=(${inputShape},))`);
    
    let previousLayer = "input_layer";
    let layerCounter = 1;

    // Process nodes in topological order
    this.topology.forEach(nodeId => {
      const node = this.nodeMap.get(nodeId);
      if (node.type === 'input') return;

      const layerName = `layer_${layerCounter}`;
      let layerCode = "";

      switch (node.type) {
        case 'conv2d':
          const filters = node.data.params?.filters || 32;
          const kernelSize = node.data.params?.kernel || 3;
          layerCode = `    ${layerName} = layers.Conv2D(${filters}, (${kernelSize}, ${kernelSize}), activation='relu')(${previousLayer})`;
          break;
          
        case 'maxpool':
          const poolSize = node.data.params?.pool_size || 2;
          layerCode = `    ${layerName} = layers.MaxPooling2D((${poolSize}, ${poolSize}))(${previousLayer})`;
          break;
          
        case 'dropout':
          const dropoutRate = node.data.params?.rate || 0.5;
          layerCode = `    ${layerName} = layers.Dropout(${dropoutRate})(${previousLayer})`;
          break;
          
        case 'activation':
          const activation = node.data.params?.function || 'relu';
          layerCode = `    ${layerName} = layers.Activation('${activation}')(${previousLayer})`;
          break;
          
        case 'hidden':
          const units = node.data.count || 128;
          layerCode = `    ${layerName} = layers.Dense(${units}, activation='relu')(${previousLayer})`;
          break;
          
        case 'lstm':
          const lstmUnits = node.data.params?.units || node.data.count || 64;
          layerCode = `    ${layerName} = layers.LSTM(${lstmUnits})(${previousLayer})`;
          break;
          
        case 'concat':
          layerCode = `    ${layerName} = layers.Concatenate()(${previousLayer})`;
          break;
          
        case 'output':
          const outputUnits = node.data.count || 10;
          layerCode = `    ${layerName} = layers.Dense(${outputUnits}, activation='softmax')(${previousLayer})`;
          break;
          
        default:
          layerCode = `    # ${node.type} layer - implementation needed`;
      }

      if (layerCode) {
        modelBody.push(layerCode);
        previousLayer = layerName;
        layerCounter++;
      }
    });

    modelBody.push("");
    modelBody.push(`    model = Model(inputs=input_layer, outputs=${previousLayer})`);
    modelBody.push("    return model");
    modelBody.push("");
    modelBody.push("# Create and compile the model");
    modelBody.push("model = create_model()");
    modelBody.push("model.compile(");
    modelBody.push("    optimizer='adam',");
    modelBody.push("    loss='categorical_crossentropy',");
    modelBody.push("    metrics=['accuracy']");
    modelBody.push(")");
    modelBody.push("");
    modelBody.push("# Model summary");
    modelBody.push("model.summary()");

    return [...imports, ...modelBody].join('\n');
  }

  generatePyTorchCode() {
    const imports = [
      "import torch",
      "import torch.nn as nn",
      "import torch.nn.functional as F",
      "import numpy as np",
      ""
    ];

    const classDefinition = ["class NeuralNetwork(nn.Module):"];
    const initMethod = ["    def __init__(self):"];
    initMethod.push("        super(NeuralNetwork, self).__init__()");
    
    const forwardMethod = ["    def forward(self, x):"];

    // Find input node
    const inputNode = this.nodes.find(node => node.type === 'input');
    if (!inputNode) {
      throw new Error("No input layer found");
    }

    let layerCounter = 1;
    let previousTensor = "x";
    let needsFlatten = false;

    // Process nodes in topological order
    this.topology.forEach(nodeId => {
      const node = this.nodeMap.get(nodeId);
      if (node.type === 'input') return;

      const layerName = `layer${layerCounter}`;
      let initCode = "";
      let forwardCode = "";

      switch (node.type) {
        case 'conv2d':
          const filters = node.data.params?.filters || 32;
          const kernelSize = node.data.params?.kernel || 3;
          const inChannels = layerCounter === 1 ? 1 : 32;
          initCode = `        self.${layerName} = nn.Conv2d(${inChannels}, ${filters}, ${kernelSize})`;
          forwardCode = `        ${previousTensor} = F.relu(self.${layerName}(${previousTensor}))`;
          needsFlatten = true;
          break;
          
        case 'maxpool':
          const poolSize = node.data.params?.pool_size || 2;
          forwardCode = `        ${previousTensor} = F.max_pool2d(${previousTensor}, ${poolSize})`;
          break;
          
        case 'dropout':
          const dropoutRate = node.data.params?.rate || 0.5;
          initCode = `        self.${layerName} = nn.Dropout(${dropoutRate})`;
          forwardCode = `        ${previousTensor} = self.${layerName}(${previousTensor})`;
          break;
          
        case 'activation':
          const activation = node.data.params?.function || 'relu';
          forwardCode = `        ${previousTensor} = F.${activation}(${previousTensor})`;
          break;
          
        case 'hidden':
          const units = node.data.count || 128;
          if (needsFlatten) {
            forwardCode = `        ${previousTensor} = ${previousTensor}.view(${previousTensor}.size(0), -1)  # Flatten\n`;
            needsFlatten = false;
          }
          const prevUnits = layerCounter === 1 ? inputNode.data.count || 784 : 128;
          initCode = `        self.${layerName} = nn.Linear(${prevUnits}, ${units})`;
          forwardCode += `        ${previousTensor} = F.relu(self.${layerName}(${previousTensor}))`;
          break;
          
        case 'lstm':
          const lstmUnits = node.data.params?.units || node.data.count || 64;
          const inputSize = inputNode.data.count || 784;
          initCode = `        self.${layerName} = nn.LSTM(input_size=${inputSize}, hidden_size=${lstmUnits}, batch_first=True)`;
          forwardCode = `        ${previousTensor}, _ = self.${layerName}(${previousTensor})`;
          break;
          
        case 'output':
          const outputUnits = node.data.count || 10;
          if (needsFlatten) {
            forwardCode = `        ${previousTensor} = ${previousTensor}.view(${previousTensor}.size(0), -1)  # Flatten\n`;
            needsFlatten = false;
          }
          const inputUnits = 128;
          initCode = `        self.${layerName} = nn.Linear(${inputUnits}, ${outputUnits})`;
          forwardCode += `        ${previousTensor} = self.${layerName}(${previousTensor})`;
          break;
          
        default:
          forwardCode = `        # ${node.type} layer - implementation needed`;
      }

      if (initCode) {
        initMethod.push(initCode);
      }
      if (forwardCode) {
        forwardMethod.push(forwardCode);
      }

      layerCounter++;
    });

    forwardMethod.push(`        return ${previousTensor}`);

    const usage = [
      "",
      "# Create model instance",
      "model = NeuralNetwork()",
      "",
      "# Define loss and optimizer",
      "criterion = nn.CrossEntropyLoss()",
      "optimizer = torch.optim.Adam(model.parameters(), lr=0.001)",
      "",
      "# Model summary",
      "print(model)"
    ];

    return [
      ...imports,
      ...classDefinition,
      ...initMethod,
      "",
      ...forwardMethod,
      "",
      ...usage
    ].join('\n');
  }
}

interface FlowCanvasProps {
  onNodeSelect: (node: Node | null) => void;
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({ onNodeSelect }) => {
  const initialEdges: Edge[] = [
    {
      id: "e-input-hidden",
      source: "input-1",
      target: "hidden-1",
      animated: true,
      type: "smooth",
    },
    {
      id: "e-hidden-output",
      source: "hidden-1",
      target: "output-1",
      animated: true,
      type: "smooth",
    },
  ];

  const initialNodes: Node[] = [
    {
      id: "input-1",
      type: "input",
      data: {
        count: 3,
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
      position: { x: 100, y: 100 },
    },
    {
      id: "hidden-1",
      type: "hidden",
      data: {
        count: 10,
        label: "Hidden Layer",
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "hidden-1"
                ? {
                  ...node,
                  data: { ...node.data, count: Math.max(1, newCount) },
                }
                : node,
            ),
          );
        },
      },
      position: { x: 250, y: 100 },
    },
    {
      id: "output-1",
      type: "output",
      data: {
        count: 1,
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
      position: { x: 400, y: 100 },
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