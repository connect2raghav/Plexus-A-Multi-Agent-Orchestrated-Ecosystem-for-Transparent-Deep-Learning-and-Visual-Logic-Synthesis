import React, { useState } from 'react';
import { Node, Edge } from 'reactflow';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button, 
  RadioGroup, 
  Radio,
  Divider,
  Chip,
  Code,
  Snippet,
  Alert
} from "@heroui/react";

// Code generation utilities
class NetworkCodeGenerator {
  private nodes: Node[];
  private edges: Edge[];
  private nodeMap: Map<string, Node>;
  private topology: string[];

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.nodeMap = new Map(nodes.map(node => [node.id, node]));
    this.topology = this.buildTopology();
  }

  buildTopology(): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph
    this.nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });
    
    // Build edges
    this.edges.forEach(edge => {
      const sourceEdges = graph.get(edge.source);
      if (sourceEdges) {
        sourceEdges.push(edge.target);
      }
      const currentInDegree = inDegree.get(edge.target) || 0;
      inDegree.set(edge.target, currentInDegree + 1);
    });
    
    // Topological sort
    const queue: string[] = [];
    const sorted: string[] = [];
    
    this.nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });
    
    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId) continue;
      
      sorted.push(nodeId);
      
      const neighbors = graph.get(nodeId);
      if (neighbors) {
        neighbors.forEach((neighbor: string) => {
          const currentInDegree = inDegree.get(neighbor) || 0;
          inDegree.set(neighbor, currentInDegree - 1);
          if (inDegree.get(neighbor) === 0) {
            queue.push(neighbor);
          }
        });
      }
    }
    
    return sorted;
  }

  generateTensorFlowCode(): string {
    const imports = [
      "import tensorflow as tf",
      "from tensorflow.keras import layers, Model",
      "import numpy as np",
      ""
    ];

    const layerDefinitions: string[] = [];
    const modelBody = ["def create_model():"];
    const connections = ["    # Layer connections"];

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
      if (!node || node.type === 'input') return;

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
          // Handle concatenation - would need multiple inputs
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

  generatePyTorchCode(): string {
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

    // Process nodes in topological order
    this.topology.forEach(nodeId => {
      const node = this.nodeMap.get(nodeId);
      if (!node || node.type === 'input') return;

      const layerName = `layer${layerCounter}`;
      let initCode = "";
      let forwardCode = "";

      switch (node.type) {
        case 'conv2d':
          const filters = node.data.params?.filters || 32;
          const kernelSize = node.data.params?.kernel || 3;
          const inChannels = layerCounter === 1 ? 1 : 32; // Simplified
          initCode = `        self.${layerName} = nn.Conv2d(${inChannels}, ${filters}, ${kernelSize})`;
          forwardCode = `        ${previousTensor} = F.relu(self.${layerName}(${previousTensor}))`;
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
          const prevUnits = layerCounter === 1 ? 784 : 128; // Simplified
          initCode = `        self.${layerName} = nn.Linear(${prevUnits}, ${units})`;
          forwardCode = `        ${previousTensor} = F.relu(self.${layerName}(${previousTensor}))`;
          break;
          
        case 'lstm':
          const lstmUnits = node.data.params?.units || node.data.count || 64;
          initCode = `        self.${layerName} = nn.LSTM(input_size=784, hidden_size=${lstmUnits}, batch_first=True)`;
          forwardCode = `        ${previousTensor}, _ = self.${layerName}(${previousTensor})`;
          break;
          
        case 'output':
          const outputUnits = node.data.count || 10;
          const inputUnits = 128; // Simplified
          initCode = `        self.${layerName} = nn.Linear(${inputUnits}, ${outputUnits})`;
          forwardCode = `        ${previousTensor} = self.${layerName}(${previousTensor})`;
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

// React component for code generation
interface CodeGeneratorPanelProps {
  nodes: Node[];
  edges: Edge[];
}

const CodeGeneratorPanel: React.FC<CodeGeneratorPanelProps> = ({ nodes, edges }) => {
  const [framework, setFramework] = useState<string>('tensorflow');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [error, setError] = useState<string>('');

  const generateCode = () => {
    try {
      setError('');
      const generator = new NetworkCodeGenerator(nodes, edges);
      
      let code: string;
      if (framework === 'tensorflow') {
        code = generator.generateTensorFlowCode();
      } else {
        code = generator.generatePyTorchCode();
      }
      
      setGeneratedCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setGeneratedCode('');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
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
    <div className="h-full overflow-auto bg-background">
      <Card className="m-4 shadow-lg">
        <CardHeader className="flex flex-col items-start">
          <h2 className="text-2xl font-bold text-foreground">Neural Network Code Generator</h2>
          <p className="text-small text-default-500 mt-1">
            Generate production-ready code from your neural network design
          </p>
        </CardHeader>
        
        <Divider />
        
        <CardBody className="space-y-6">
          {/* Framework Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Select Framework</h3>
            <RadioGroup
              value={framework}
              onValueChange={setFramework}
              orientation="horizontal"
              className="gap-4"
            >
              <Radio value="tensorflow" description="Google's machine learning framework">
                <div className="flex items-center gap-2">
                  <Chip color="warning" variant="flat" size="sm">TF</Chip>
                  TensorFlow/Keras
                </div>
              </Radio>
              <Radio value="pytorch" description="Facebook's deep learning framework">
                <div className="flex items-center gap-2">
                  <Chip color="danger" variant="flat" size="sm">PT</Chip>
                  PyTorch
                </div>
              </Radio>
            </RadioGroup>
          </div>

          <Divider />

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              color="primary"
              size="lg"
              onPress={generateCode}
              className="font-semibold"
              startContent={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              }
            >
              Generate Code
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert
              color="danger"
              variant="faded"
              title="Code Generation Error"
              description={error}
            />
          )}

          {/* Code Display */}
          {generatedCode && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Generated Code</h3>
                <div className="flex gap-2">
                  <Button
                    color="default"
                    variant="flat"
                    size="sm"
                    onPress={copyToClipboard}
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    }
                  >
                    Copy
                  </Button>
                  <Button
                    color="success"
                    variant="flat"
                    size="sm"
                    onPress={downloadCode}
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    }
                  >
                    Download
                  </Button>
                </div>
              </div>
              
              <Snippet 
                hideCopyButton 
                hideSymbol
                className="w-full"
                classNames={{
                  base: "bg-content2",
                  pre: "text-xs font-mono max-h-96 overflow-auto",
                }}
              >
                {generatedCode}
              </Snippet>
            </div>
          )}

          <Divider />

          {/* Instructions */}
          <Card className="bg-content2">
            <CardBody>
              <h4 className="font-semibold mb-3 text-foreground flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Instructions
              </h4>
              <div className="space-y-2 text-sm text-default-600">
                <div className="flex items-start gap-2">
                  <Chip color="primary" size="sm" variant="dot">1</Chip>
                  <span>Make sure your flow has an Input node to define the network entry point</span>
                </div>
                <div className="flex items-start gap-2">
                  <Chip color="primary" size="sm" variant="dot">2</Chip>
                  <span>Connect nodes in the desired order to create the network architecture</span>
                </div>
                <div className="flex items-start gap-2">
                  <Chip color="primary" size="sm" variant="dot">3</Chip>
                  <span>Configure node parameters using the node options panel</span>
                </div>
                <div className="flex items-start gap-2">
                  <Chip color="primary" size="sm" variant="dot">4</Chip>
                  <span>The generator follows the connection flow to create sequential models</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </CardBody>
      </Card>
    </div>
  );
};

export { NetworkCodeGenerator, CodeGeneratorPanel };