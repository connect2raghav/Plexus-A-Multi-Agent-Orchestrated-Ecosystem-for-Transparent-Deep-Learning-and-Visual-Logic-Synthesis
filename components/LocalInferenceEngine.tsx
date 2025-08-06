import React, { useState, useEffect, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { Card, CardBody, CardHeader, Button, Chip, Progress } from "@heroui/react";
import { Activity, Brain, Zap, Target, TrendingUp, Eye, Shuffle, Code } from 'lucide-react';

interface LocalInferenceStats {
  prediction: number;
  confidence: number;
  processingTime: number;
  activations: { [layerId: string]: number[] };
  layerOutputs: { [layerId: string]: number };
  accuracy: number;
  loss: number;
  trainingProgress?: number;
}

interface LocalInferenceEngineProps {
  nodes: Node[];
  edges: Edge[];
  inputValue: string;
  isRunning: boolean;
  onStatsUpdate: (stats: LocalInferenceStats) => void;
}

// Real TensorFlow.js Gender Classification Model
class RealGenderClassificationModel {
  private model: any = null;
  private charToIdx: { [key: string]: number } = {};
  private isTraining: boolean = false;
  private trainingHistory: any = null;

  constructor() {
    this.initializeVocabulary();
  }

  private initializeVocabulary() {
    // Create character vocabulary from common names
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    this.charToIdx = { '<PAD>': 0 };
    
    for (let i = 0; i < chars.length; i++) {
      this.charToIdx[chars[i]] = i + 1;
    }
  }

  private nameToSequence(name: string): number[] {
    const maxLength = 15;
    const sequence: number[] = [];
    
    const normalizedName = name.toLowerCase().trim();
    for (let i = 0; i < Math.min(normalizedName.length, maxLength); i++) {
      sequence.push(this.charToIdx[normalizedName[i]] || 0);
    }
    
    // Pad to maxLength
    while (sequence.length < maxLength) {
      sequence.push(0);
    }
    
    return sequence;
  }

  async createModel(): Promise<any> {
    // Dynamic import of TensorFlow.js
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();

    // Build a real neural network architecture
    const model = tf.sequential({
      layers: [
        // Embedding layer
        tf.layers.embedding({
          inputDim: 27, // vocab size
          outputDim: 32,
          inputLength: 15,
          name: 'embedding'
        }),
        
        // LSTM layer
        tf.layers.lstm({
          units: 64,
          returnSequences: false,
          name: 'lstm'
        }),
        
        // Dense layers
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          name: 'dense1'
        }),
        
        tf.layers.dropout({
          rate: 0.3,
          name: 'dropout'
        }),
        
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          name: 'dense2'
        }),
        
        // Output layer
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid',
          name: 'output'
        })
      ]
    });

    // Compile model
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  async trainModel(onProgress?: (progress: number) => void): Promise<void> {
    if (this.isTraining || this.model) return;
    
    this.isTraining = true;
    const tf = await import('@tensorflow/tfjs');
    
    try {
      // Create sample training data
      const trainingData = [
        // Female names (label: 1)
        'Sarah', 'Emma', 'Jessica', 'Ashley', 'Amanda', 'Michelle',
        'Lisa', 'Emily', 'Kimberly', 'Jennifer', 'Nicole', 'Elizabeth',
        'Rebecca', 'Maria', 'Stephanie', 'Rachel', 'Catherine', 'Angela',
        'Samantha', 'Katherine', 'Christina', 'Linda', 'Barbara', 'Susan',
        'Karen', 'Nancy', 'Donna', 'Carol', 'Ruth', 'Sharon',
        
        // Male names (label: 0)
        'Michael', 'David', 'Robert', 'William', 'Christopher', 'Matthew',
        'Joshua', 'Andrew', 'Daniel', 'James', 'John', 'Ryan',
        'Nicholas', 'Alexander', 'Jonathan', 'Tyler', 'Brandon', 'Anthony',
        'Steven', 'Thomas', 'Kevin', 'Paul', 'Mark', 'Donald',
        'Kenneth', 'Richard', 'Charles', 'Joseph', 'Edward', 'George'
      ];

      const labels = [
        ...Array(30).fill(1), // Female = 1
        ...Array(30).fill(0)  // Male = 0
      ];

      // Convert to tensors
      const sequences = trainingData.map(name => this.nameToSequence(name));
      const xs = tf.tensor2d(sequences);
      const ys = tf.tensor2d(labels.map(l => [l]));

      // Create model
      this.model = await this.createModel();
      
      // Train model with progress updates
      const history = await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: 8,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch: number, logs: any) => {
            const progress = ((epoch + 1) / 50) * 100;
            if (onProgress) onProgress(progress);
          }
        }
      });

      this.trainingHistory = history;

      // Clean up tensors
      xs.dispose();
      ys.dispose();

    } catch (error) {
      console.error('Training failed:', error);
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  async predict(name: string): Promise<LocalInferenceStats> {
    if (!this.model) {
      throw new Error('Model not trained yet');
    }

    const tf = await import('@tensorflow/tfjs');
    const startTime = performance.now();
    
    try {
      // Prepare input
      const sequence = this.nameToSequence(name);
      const input = tf.tensor2d([sequence]);
      
      // Make prediction
      const prediction = this.model.predict(input) as any;
      const predValue = await prediction.data();
      const probability = predValue[0];
      
      // Get layer activations
      const layerOutputs = await this.getLayerActivations(input);
      
      const processingTime = performance.now() - startTime;
      const confidence = Math.abs(probability - 0.5) * 2;
      
      // Clean up
      input.dispose();
      prediction.dispose();
      
      // Get training metrics
      const finalEpoch = this.trainingHistory ? this.trainingHistory.history.acc.length - 1 : 0;
      const accuracy = this.trainingHistory ? this.trainingHistory.history.acc[finalEpoch] : 0.85;
      const loss = this.trainingHistory ? this.trainingHistory.history.loss[finalEpoch] : 0.3;
      
      return {
        prediction: probability,
        confidence,
        processingTime,
        activations: {},
        layerOutputs,
        accuracy,
        loss
      };
      
    } catch (error) {
      console.error('Prediction failed:', error);
      throw error;
    }
  }

  private async getLayerActivations(input: any): Promise<{ [layerId: string]: number }> {
    if (!this.model) return {};
    
    const tf = await import('@tensorflow/tfjs');
    const layerOutputs: { [layerId: string]: number } = {};
    
    try {
      // Get intermediate layer outputs
      for (let i = 0; i < this.model.layers.length; i++) {
        const layer = this.model.layers[i];
        const layerModel = tf.model({
          inputs: this.model.input,
          outputs: layer.output
        });
        
        const output = layerModel.predict(input) as any;
        const outputData = await output.data();
        
        // Calculate activation intensity
        const mean = outputData.reduce((sum: number, val: number) => sum + Math.abs(val), 0) / outputData.length;
        layerOutputs[layer.name] = Math.min(mean, 1); // Normalize to 0-1
        
        output.dispose();
        layerModel.dispose();
      }
    } catch (error) {
      console.error('Error getting layer activations:', error);
    }
    
    return layerOutputs;
  }

  isReady(): boolean {
    return this.model !== null && !this.isTraining;
  }

  isCurrentlyTraining(): boolean {
    return this.isTraining;
  }
}

const LocalInferenceEngine: React.FC<LocalInferenceEngineProps> = ({
  nodes,
  edges,
  inputValue,
  isRunning,
  onStatsUpdate
}) => {
  const [stats, setStats] = useState<LocalInferenceStats | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [error, setError] = useState('');
  
  const modelRef = useRef<RealGenderClassificationModel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sample names for testing
  const sampleNames = [
    'Sarah', 'Michael', 'Emma', 'David', 'Jessica', 'Robert', 
    'Ashley', 'William', 'Amanda', 'Christopher', 'Michelle', 'Matthew',
    'Lisa', 'Joshua', 'Emily', 'Andrew', 'Kimberly', 'Daniel'
  ];

  useEffect(() => {
    // Initialize model on component mount
    modelRef.current = new RealGenderClassificationModel();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startTraining = async () => {
    if (!modelRef.current || isTraining) return;
    
    setIsTraining(true);
    setError('');
    setTrainingProgress(0);
    
    try {
      await modelRef.current.trainModel((progress) => {
        setTrainingProgress(progress);
      });
      
      setIsModelReady(true);
      setTrainingProgress(100);
      
      // Auto-start inference if input is available
      if (inputValue.trim()) {
        startInference();
      }
      
    } catch (err) {
      setError(`Training failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTraining(false);
    }
  };

  const startInference = () => {
    if (!modelRef.current || !modelRef.current.isReady() || !inputValue.trim()) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start real-time predictions
    intervalRef.current = setInterval(async () => {
      try {
        const result = await modelRef.current!.predict(inputValue);
        setStats(result);
        onStatsUpdate(result);
      } catch (err) {
        console.error('Prediction error:', err);
        setError(`Prediction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }, 1000); // Update every second
  };

  useEffect(() => {
    if (isRunning && isModelReady && inputValue.trim()) {
      startInference();
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
  }, [isRunning, isModelReady, inputValue, onStatsUpdate]);

  const tryRandomName = () => {
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const textInputNode = nodes.find(n => n.type === 'textInput');
    if (textInputNode && textInputNode.data.onChange) {
      textInputNode.data.onChange(randomName);
    }
  };

  // Training UI
  if (!isModelReady && !isTraining) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Real Neural Network (Local)</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="space-y-4">
            <div className="text-center">
              <Brain className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h4 className="text-lg font-semibold mb-2">Ready to Train Neural Network</h4>
              <p className="text-default-500 mb-4">
                Train a real TensorFlow.js model with LSTM layers for gender classification
              </p>
              
              {error && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 mb-4">
                  <p className="text-danger-600 text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button
                  color="primary"
                  size="lg"
                  onClick={startTraining}
                  startContent={<Zap className="w-5 h-5" />}
                >
                  Train Neural Network
                </Button>
                <p className="text-xs text-default-400">
                  Training takes ~30 seconds • Runs locally in your browser
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Training progress UI
  if (isTraining) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse text-primary" />
            <h3 className="text-lg font-semibold">Training Neural Network</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="space-y-4">
            <div className="text-center">
              <div className="relative">
                <Brain className="w-20 h-20 mx-auto mb-4 text-primary animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {Math.round(trainingProgress)}%
                  </span>
                </div>
              </div>
              
              <h4 className="text-lg font-semibold mb-2">Training in Progress</h4>
              <p className="text-default-500 mb-4">
                Building real neural network with LSTM and Dense layers...
              </p>
              
              <Progress 
                value={trainingProgress} 
                color="primary"
                className="mb-4"
                size="lg"
              />
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">Architecture</div>
                  <div className="text-default-500">LSTM + Dense</div>
                </div>
                <div>
                  <div className="font-medium">Epochs</div>
                  <div className="text-default-500">50 total</div>
                </div>
                <div>
                  <div className="font-medium">Progress</div>
                  <div className="text-default-500">{Math.round(trainingProgress)}%</div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Ready but no input
  if (!stats) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-success" />
            <h3 className="text-lg font-semibold">Real Neural Network (Ready)</h3>
          </div>
        </CardHeader>
        <CardBody className="text-center p-6">
          <Target className="w-12 h-12 mx-auto mb-4 text-success" />
          <p className="text-default-500 mb-4">Neural network trained and ready for predictions!</p>
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
      {/* Model Status */}
      <Card>
        <CardBody className="py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">
                Real TensorFlow.js Neural Network
              </span>
              <Chip color="success" size="sm" variant="flat">Local</Chip>
            </div>
            <Button
              size="sm"
              variant="flat"
              onClick={tryRandomName}
              startContent={<Shuffle className="w-3 h-3" />}
            >
              Random
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Prediction Result */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Real AI Prediction</h3>
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
            <div className="text-right">
              <Chip color={genderColor} size="lg" variant="flat">
                {(stats.confidence * 100).toFixed(1)}% confident
              </Chip>
              <p className="text-xs text-default-400 mt-1">
                {stats.processingTime.toFixed(1)}ms
              </p>
            </div>
          </div>
          <Progress 
            value={stats.prediction * 100} 
            color={genderColor}
            className="mb-2"
          />
        </CardBody>
      </Card>

      {/* Model Performance */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Training Metrics</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-small text-default-500 mb-1">Final Accuracy</p>
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
              <p className="text-small text-default-500 mb-1">Final Loss</p>
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
            <h3 className="text-lg font-semibold">Neural Network Layers</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="space-y-3">
            {Object.entries(stats.layerOutputs).map(([layerName, intensity]) => {
              const displayName = layerName.charAt(0).toUpperCase() + layerName.slice(1);
              
              return (
                <div key={layerName} className="flex items-center gap-3">
                  <div className="w-20 text-small text-default-500 truncate">
                    {displayName}
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

export default LocalInferenceEngine;
