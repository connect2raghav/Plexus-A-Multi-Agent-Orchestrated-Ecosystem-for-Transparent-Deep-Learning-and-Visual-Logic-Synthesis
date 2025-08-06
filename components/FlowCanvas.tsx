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