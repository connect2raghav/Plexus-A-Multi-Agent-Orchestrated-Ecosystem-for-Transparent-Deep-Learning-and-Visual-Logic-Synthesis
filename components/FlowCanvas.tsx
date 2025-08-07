import React, { useCallback, useRef, useState, useEffect } from "react";
import { Code, Copy, Download, Network, X, BookOpen, CheckCircle, BarChart3, Save, FolderOpen } from "lucide-react";
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
import { Card, CardBody, CardFooter, RadioGroup, Radio } from "@heroui/react";
import { Button } from "@heroui/button";

import { nodeTypes } from "./nodes/CustomNodes";
import { NetworkCodeGenerator } from "./CodeGenerator";
import { getLayoutedElements } from "./utils/layoutUtils";
import { getTemplateByType } from "./templates/templateDefinitions";
import ModelTemplates from "./ModelTemplates";
import ModelValidator from "./ModelValidator";
import PerformanceAnalysis from "./PerformanceAnalysis";
import ProjectManager from "./ProjectManager";
import HelpSystem from "./HelpSystem";
import FloatingToolbar from "./FloatingToolbar";
import "reactflow/dist/style.css";
import "@/styles/nodes.css";

interface FlowCanvasProps {
  onNodeSelect: (node: Node | null) => void;
  templateType?: string | null;
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({ onNodeSelect, templateType }) => {
  // Default simple text processing network
  const getDefaultNodes = (): Node[] => [
    {
      id: "input-1",
      type: "textInput",
      data: {
        label: "Text Input",
        icon: "lucide:type",
        details: "Enter text here",
        value: "Hello World",
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
    {
      id: "inputlayer-1",
      type: "inputLayer",
      data: {
        label: "Input Layer (100)",
        icon: "lucide:square-dot-minus",
        details: "Network input layer - text vectorization",
        count: 1,
        params: { shape: [100] },
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "inputlayer-1"
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      count: Math.max(1, newCount),
                      params: { shape: [newCount] },
                    },
                  }
                : node,
            ),
          );
        },
      },
      position: { x: 300, y: 200 },
    },
    {
      id: "dense-1",
      type: "dense",
      data: {
        label: "Dense (32)",
        icon: "lucide:grid",
        details: "32 neurons, ReLU activation",
        count: 32,
        params: { units: 32, activation: "relu" },
        onChange: (newCount: number) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === "dense-1"
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      count: Math.max(1, newCount),
                      params: { ...node.data.params, units: newCount },
                    },
                  }
                : node,
            ),
          );
        },
      },
      position: { x: 550, y: 200 },
    },
    {
      id: "output-1",
      type: "outputLayer",
      data: {
        label: "Text Output",
        count: 1,
        icon: "lucide:arrow-right",
        details: "Final output",
        params: { activation: "sigmoid", units: 1 },
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
      position: { x: 800, y: 200 },
    },
  ];

  const getDefaultEdges = (): Edge[] => [
    {
      id: "e-textinput-inputlayer",
      source: "input-1",
      target: "inputlayer-1",
      animated: true,
      type: "smooth",
    },
    {
      id: "e-inputlayer-dense",
      source: "inputlayer-1",
      target: "dense-1",
      animated: true,
      type: "smooth",
    },
    {
      id: "e-dense-output",
      source: "dense-1",
      target: "output-1",
      animated: true,
      type: "smooth",
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(getDefaultNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(getDefaultEdges());
  
  // Update nodes and edges when template type changes
  useEffect(() => {
    if (templateType) {
      const template = getTemplateByType(templateType);
      if (template) {
        setNodes(template.nodes);
        setEdges(template.edges);
      }
    }
  }, [templateType, setNodes, setEdges]);
  const [showPanel, setShowPanel] = useState(false);
  const [framework, setFramework] = useState<"tensorflow" | "pytorch">(
    "tensorflow",
  );
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { project, fitView } = useReactFlow();

  // Helper function to close panel and reset state
  const closePanel = useCallback(() => {
    setShowPanel(false);
    setGeneratedCode("");
    setError("");
  }, []);

  // Handle clicking outside the panel to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showPanel &&
        panelRef.current &&
        !panelRef.current.contains(event.target as HTMLElement) &&
        !(event.target as Element).closest('[aria-label="Show code panel"]')
      ) {
        closePanel();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showPanel) {
        closePanel();
      }
    };

    if (showPanel) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showPanel, closePanel]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Auto layout function
  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      "LR",
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

      // Check if trying to add input/output node when one already exists
      const hasInputNode = nodes.some(
        (node) => node.type === "textInput" || node.type === "inputLayer",
      );
      const hasOutputNode = nodes.some((node) => node.type === "outputLayer");

      if (
        (nodeData.type === "textInput" || nodeData.type === "inputLayer") &&
        hasInputNode
      ) {
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
          ...([
            "inputLayer",
            "outputLayer",
            "hidden",
            "dense",
            "embedding",
            "lstm",
          ].includes(nodeData.type)
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
          ...([
            "cnn",
            "rnn",
            "lstm",
            "transformer",
            "autoencoder",
            "gan",
            "resnet",
            "vae",
            "adam",
            "sgd",
            "rmsprop",
            "adagrad",
            "adamw",
            "crossentropy",
            "mse",
            "mae",
            "bce",
            "steplr",
            "exponentiallr",
            "cosineannealinglr",
            "reducelronplateau",
          ].includes(nodeData.type)
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
                  save_best: true,
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
                  val_loss: 0.0,
                },
              }
            : {}),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, project, nodes],
  );

  // Handle loading a template
  const handleLoadTemplate = useCallback((template: any) => {
    setNodes(template.nodes);
    setEdges(template.edges);
    
    // Auto-layout the loaded template
    setTimeout(() => {
      onLayout();
    }, 100);
  }, [setNodes, setEdges]);

  // Handle loading a project  
  const handleLoadProject = useCallback((project: any) => {
    setNodes(project.nodes);
    setEdges(project.edges);
    
    // Auto-layout the loaded project
    setTimeout(() => {
      onLayout();
    }, 100);
  }, [setNodes, setEdges]);

  // Handle highlighting a node (from validator)
  const handleIssueSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setSelectedNodeId(null);
    }, 3000);
  }, []);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError("");

      const generator = new NetworkCodeGenerator(nodes, edges);

      let code;

      if (framework === "tensorflow") {
        code = generator.generateTensorFlowCode();
      } else {
        code = generator.generatePyTorchCode();
      }

      setGeneratedCode(code);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      setGeneratedCode("");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const downloadCode = () => {
    const extension = framework === "tensorflow" ? "tf.py" : "torch.py";
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `neural_network_${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadNotebook = () => {
    try {
      const generator = new NetworkCodeGenerator(nodes, edges);
      let notebook;
      let filename;

      if (framework === "tensorflow") {
        notebook = generator.generateTensorFlowNotebook();
        filename = "tensorflow_training_notebook.ipynb";
      } else {
        notebook = generator.generatePyTorchNotebook();
        filename = "pytorch_training_notebook.ipynb";
      }

      const blob = new Blob([JSON.stringify(notebook, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate notebook",
      );
    }
  };

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
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
        nodes={nodes.map(node => ({
          ...node,
          style: {
            ...node.style,
            ...(selectedNodeId === node.id ? {
              boxShadow: '0 0 0 3px #3b82f6',
              border: '2px solid #3b82f6',
            } : {})
          }
        }))}
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

      {/* Collapsible Toolbar - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <FloatingToolbar
          nodes={nodes}
          edges={edges}
          onLoadTemplate={handleLoadTemplate}
          onLoadProject={handleLoadProject}
          onIssueSelect={handleIssueSelect}
          onLayout={onLayout}
          onToggleCodePanel={() => setShowPanel((prev) => !prev)}
          showCodePanel={showPanel}
        />
      </div>

      {/* Help System - Positioned below toolbar */}
      <div className="absolute top-16 right-4 z-10">
        <HelpSystem />
      </div>

      {showPanel && (
        <Card
          ref={panelRef}
          className="shadow-lg border animate-in slide-in-from-right-4 fade-in-0 duration-200"
          style={{
            position: "absolute",
            top: 60,
            right: 20,
            width: generatedCode ? 600 : 360,
            maxHeight: "calc(100vh - 100px)",
            zIndex: 30, // Higher than toolbar
            maxWidth: "calc(100vw - 40px)",
          }}
        >
          <CardBody className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Generate Neural Network Code
              </h2>
              <Button
                isIconOnly
                aria-label="Close panel"
                className="text-foreground-400 hover:text-foreground-600 hover:bg-default-100"
                size="sm"
                variant="light"
                onClick={closePanel}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!generatedCode && (
              <>
                <p className="text-foreground-500 mb-4">
                  Select your preferred framework to generate code for your
                  neural network.
                </p>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Icon
                      className="text-blue-600 text-xl mt-0.5"
                      icon="simple-icons:jupyter"
                    />
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                        Ready for Google Colab!
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Get a complete Jupyter notebook with data loading,
                        training, and evaluation code. Perfect for uploading
                        directly to Google Colab to start training your model.
                      </p>
                    </div>
                  </div>
                </div>

                <RadioGroup
                  classNames={{
                    base: "gap-6",
                    label: "text-foreground-600 font-medium mb-3",
                  }}
                  label="Select Framework"
                  orientation="horizontal"
                  value={framework}
                  onValueChange={(value) =>
                    setFramework(value as "tensorflow" | "pytorch")
                  }
                >
                  <Radio value="tensorflow">
                    <div className="flex items-center gap-2">
                      <Icon className="text-xl" icon="logos:tensorflow" />
                      TensorFlow
                    </div>
                  </Radio>
                  <Radio value="pytorch">
                    <div className="flex items-center gap-2">
                      <Icon className="text-xl" icon="logos:pytorch-icon" />
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
                  <h3 className="text-lg font-semibold">
                    Generated{" "}
                    {framework === "tensorflow" ? "TensorFlow" : "PyTorch"}{" "}
                    Code:
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      startContent={<Copy size={16} />}
                      variant="ghost"
                      onClick={copyToClipboard}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      startContent={<Download size={16} />}
                      variant="ghost"
                      onClick={downloadCode}
                    >
                      Download .py
                    </Button>
                    <Button
                      color="primary"
                      size="sm"
                      startContent={<Icon icon="simple-icons:jupyter" />}
                      variant="ghost"
                      onClick={downloadNotebook}
                    >
                      Download .ipynb
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
              <div className="flex gap-2 w-full">
                <Button
                  className="flex-1"
                  color="primary"
                  isLoading={isGenerating}
                  startContent={!isGenerating && <Icon icon="lucide:code" />}
                  variant="solid"
                  onPress={handleGenerate}
                >
                  {isGenerating ? "Generating..." : "Generate Code"}
                </Button>
                <Button
                  className="flex-1"
                  color="secondary"
                  isLoading={isGenerating}
                  startContent={
                    !isGenerating && <Icon icon="simple-icons:jupyter" />
                  }
                  variant="solid"
                  onPress={downloadNotebook}
                >
                  {isGenerating ? "Generating..." : "Get Colab Notebook"}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
};

export default FlowCanvas;
