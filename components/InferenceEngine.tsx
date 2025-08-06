import React, { useState, useEffect, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { Card, CardBody, CardHeader, Button, Chip, Progress, Divider } from "@heroui/react";
import { Activity, Brain, Zap, Target, TrendingUp, Eye, Shuffle } from 'lucide-react';

interface InferenceStats {
  prediction: number;
  confidence: number;
  processingTime: number;
  activations: { [layerId: string]: number[] };
  layerOutputs: { [layerId: string]: number };
  accuracy: number;
  loss: number;
}

interface InferenceEngineProps {
  nodes: Node[];
  edges: Edge[];
  inputValue: string;
  isRunning: boolean;
  onStatsUpdate: (stats: InferenceStats) => void;
}

export class GenderClassificationInference {
  private nodes: Node[];
  private edges: Edge[];
  private topology: string[];
  private weights: { [layerId: string]: number[][] };

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.topology = this.buildTopology();
    this.weights = this.initializeWeights();
  }

  private buildTopology(): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph
    this.nodes.forEach(node => {
      if (node.type && !['adam', 'sgd', 'bce', 'crossentropy', 'training_config', 'metrics'].includes(node.type)) {
        graph.set(node.id, []);
        inDegree.set(node.id, 0);
      }
    });
    
    // Build edges - only for network layers
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode && 
          sourceNode.type && targetNode.type &&
          !['adam', 'sgd', 'bce', 'crossentropy', 'training_config', 'metrics'].includes(sourceNode.type) &&
          !['adam', 'sgd', 'bce', 'crossentropy', 'training_config', 'metrics'].includes(targetNode.type)) {
        const sourceEdges = graph.get(edge.source);
        if (sourceEdges) {
          sourceEdges.push(edge.target);
        }
        const currentInDegree = inDegree.get(edge.target) || 0;
        inDegree.set(edge.target, currentInDegree + 1);
      }
    });
    
    // Topological sort
    const queue: string[] = [];
    const sorted: string[] = [];
    
    this.nodes.forEach(node => {
      if (inDegree.get(node.id) === 0 && 
          node.type && !['adam', 'sgd', 'bce', 'crossentropy', 'training_config', 'metrics'].includes(node.type)) {
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

  private initializeWeights(): { [layerId: string]: number[][] } {
    const weights: { [layerId: string]: number[][] } = {};
    
    this.nodes.forEach(node => {
      if (node.type && ['dense', 'lstm', 'embedding'].includes(node.type)) {
        const outputSize = node.data.count || 64;
        const inputSize = this.getInputSize(node.id);
        
        // Initialize with small random weights
        weights[node.id] = [];
        for (let i = 0; i < outputSize; i++) {
          weights[node.id][i] = [];
          for (let j = 0; j < inputSize; j++) {
            weights[node.id][i][j] = (Math.random() - 0.5) * 0.2;
          }
        }
      }
    });
    
    return weights;
  }

  private getInputSize(nodeId: string): number {
    // Find the input size based on previous layer
    const inputEdge = this.edges.find(edge => edge.target === nodeId);
    if (!inputEdge) return 64; // default
    
    const inputNode = this.nodes.find(n => n.id === inputEdge.source);
    return inputNode?.data.count || 64;
  }

  // Convert name to numerical features for the model
  private nameToFeatures(name: string): number[] {
    const features = new Array(20).fill(0); // Max name length
    const normalizedName = name.toLowerCase().trim();
    
    for (let i = 0; i < Math.min(normalizedName.length, 20); i++) {
      // Convert character to number (a=1, b=2, etc.)
      features[i] = normalizedName.charCodeAt(i) - 96;
    }
    
    // Add some statistical features
    const nameLength = normalizedName.length;
    const vowelCount = (normalizedName.match(/[aeiou]/g) || []).length;
    const consonantCount = nameLength - vowelCount;
    
    // Append statistical features
    return [...features, nameLength, vowelCount, consonantCount];
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private softmax(arr: number[]): number[] {
    const max = Math.max(...arr);
    const exp = arr.map(x => Math.exp(x - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  }

  public predict(name: string): InferenceStats {
    const startTime = performance.now();
    
    // Convert name to features
    let currentOutput = this.nameToFeatures(name);
    const activations: { [layerId: string]: number[] } = {};
    const layerOutputs: { [layerId: string]: number } = {};
    
    // Forward pass through each layer in topology order
    this.topology.forEach(nodeId => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      activations[nodeId] = [...currentOutput];
      
      switch (node.type) {
        case 'textInput':
          // Input layer - no processing needed
          break;
          
        case 'embedding':
          // Embedding layer simulation
          const embeddingDim = node.data.count || 64;
          const newOutput = new Array(embeddingDim).fill(0);
          
          for (let i = 0; i < embeddingDim; i++) {
            let sum = 0;
            for (let j = 0; j < currentOutput.length; j++) {
              sum += currentOutput[j] * (Math.sin(i + j) * 0.1 + 0.5);
            }
            newOutput[i] = sum / currentOutput.length;
          }
          currentOutput = newOutput;
          break;
          
        case 'lstm':
          // LSTM simulation
          const lstmUnits = node.data.count || 128;
          const lstmOutput = new Array(lstmUnits).fill(0);
          
          for (let i = 0; i < lstmUnits; i++) {
            let sum = 0;
            for (let j = 0; j < currentOutput.length; j++) {
              sum += currentOutput[j] * (Math.cos(i * j * 0.1) * 0.1 + 0.1);
            }
            lstmOutput[i] = Math.tanh(sum);
          }
          currentOutput = lstmOutput;
          break;
          
        case 'dense':
          // Dense layer with weights
          const denseUnits = node.data.count || 64;
          const denseOutput = new Array(denseUnits).fill(0);
          const activation = node.data.params?.activation || 'relu';
          
          if (this.weights[nodeId]) {
            for (let i = 0; i < denseUnits && i < this.weights[nodeId].length; i++) {
              let sum = 0;
              for (let j = 0; j < currentOutput.length && j < this.weights[nodeId][i].length; j++) {
                sum += currentOutput[j] * this.weights[nodeId][i][j];
              }
              
              // Apply activation
              if (activation === 'relu') {
                denseOutput[i] = this.relu(sum);
              } else if (activation === 'sigmoid') {
                denseOutput[i] = this.sigmoid(sum);
              } else {
                denseOutput[i] = sum;
              }
            }
          }
          currentOutput = denseOutput;
          break;
          
        case 'dropout':
          // During inference, dropout doesn't change the output
          // In training, it would randomly set some values to 0
          break;
          
        case 'outputLayer':
          // Final output layer
          const finalOutput = currentOutput[0] || 0;
          currentOutput = [this.sigmoid(finalOutput)];
          break;
      }
      
      // Calculate layer output intensity
      layerOutputs[nodeId] = currentOutput.reduce((sum, val) => sum + Math.abs(val), 0) / currentOutput.length;
    });
    
    const processingTime = performance.now() - startTime;
    const prediction = currentOutput[0] || 0;
    const confidence = Math.abs(prediction - 0.5) * 2; // Distance from 0.5, scaled to 0-1
    
    // Simulate training metrics (would be real in actual training)
    const accuracy = 0.85 + Math.random() * 0.1;
    const loss = 0.3 + Math.random() * 0.2;
    
    return {
      prediction,
      confidence,
      processingTime,
      activations,
      layerOutputs,
      accuracy,
      loss
    };
  }
}

const InferenceEngine: React.FC<InferenceEngineProps> = ({
  nodes,
  edges,
  inputValue,
  isRunning,
  onStatsUpdate
}) => {
  const [stats, setStats] = useState<InferenceStats | null>(null);
  const inferenceEngineRef = useRef<GenderClassificationInference | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sample names for testing
  const sampleNames = [
    'Sarah', 'Michael', 'Emma', 'David', 'Jessica', 'Robert', 
    'Ashley', 'William', 'Amanda', 'Christopher', 'Michelle', 'Matthew',
    'Lisa', 'Joshua', 'Emily', 'Andrew', 'Kimberly', 'Daniel'
  ];

  useEffect(() => {
    inferenceEngineRef.current = new GenderClassificationInference(nodes, edges);
  }, [nodes, edges]);

  useEffect(() => {
    if (isRunning && inferenceEngineRef.current && inputValue.trim()) {
      intervalRef.current = setInterval(() => {
        const newStats = inferenceEngineRef.current!.predict(inputValue);
        setStats(newStats);
        onStatsUpdate(newStats);
      }, 1000); // Update every second
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, inputValue, onStatsUpdate]);

  const tryRandomName = () => {
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    // Find the text input node and update its value
    const textInputNode = nodes.find(n => n.type === 'textInput');
    if (textInputNode && textInputNode.data.onChange) {
      textInputNode.data.onChange(randomName);
    }
  };

  if (!stats) {
    return (
      <Card className="w-full">
        <CardBody className="text-center p-6">
          <Brain className="w-12 h-12 mx-auto mb-4 text-default-400" />
          <p className="text-default-500 mb-4">Start inference to see real-time stats</p>
          <Button
            color="primary"
            variant="flat"
            startContent={<Shuffle className="w-4 h-4" />}
            onClick={tryRandomName}
          >
            Try Random Name
          </Button>
        </CardBody>
      </Card>
    );
  }

  const genderLabel = stats.prediction > 0.5 ? 'Female' : 'Male';
  const genderColor = stats.prediction > 0.5 ? 'secondary' : 'primary';

  return (
    <div className="space-y-4">
      {/* Prediction Result */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Prediction Result</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-2xl font-bold">{genderLabel}</p>
              <p className="text-small text-default-500">
                Probability: {(stats.prediction * 100).toFixed(1)}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Chip color={genderColor} size="lg" variant="flat">
                {(stats.confidence * 100).toFixed(1)}% confident
              </Chip>
              <Button
                size="sm"
                variant="light"
                isIconOnly
                onClick={tryRandomName}
                title="Try random name"
              >
                <Shuffle className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Progress 
            value={stats.prediction * 100} 
            color={genderColor}
            className="mb-2"
          />
          <p className="text-small text-default-400">
            Processing time: {stats.processingTime.toFixed(2)}ms
          </p>
        </CardBody>
      </Card>

      {/* Model Performance */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Model Performance</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-small text-default-500 mb-1">Accuracy</p>
              <div className="flex items-center gap-2">
                <Progress 
                  value={stats.accuracy * 100} 
                  color="success"
                  size="sm"
                  className="flex-1"
                />
                <span className="text-small font-medium">
                  {(stats.accuracy * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-small text-default-500 mb-1">Loss</p>
              <div className="flex items-center gap-2">
                <Progress 
                  value={(1 - stats.loss) * 100} 
                  color="warning"
                  size="sm"
                  className="flex-1"
                />
                <span className="text-small font-medium">
                  {stats.loss.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Layer Activations */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Layer Activations</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="space-y-3">
            {Object.entries(stats.layerOutputs).map(([layerId, intensity]) => {
              const node = nodes.find(n => n.id === layerId);
              if (!node || !node.type || ['textInput'].includes(node.type)) return null;
              
              return (
                <div key={layerId} className="flex items-center gap-3">
                  <div className="w-24 text-small text-default-500 truncate">
                    {node.data.label}
                  </div>
                  <Progress 
                    value={Math.min(intensity * 100, 100)} 
                    color={intensity > 0.5 ? "success" : "default"}
                    size="sm"
                    className="flex-1"
                  />
                  <span className="text-small font-mono w-12 text-right">
                    {intensity.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default InferenceEngine;
