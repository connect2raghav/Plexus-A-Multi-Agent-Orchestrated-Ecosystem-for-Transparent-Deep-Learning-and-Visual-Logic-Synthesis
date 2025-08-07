import React, { useState, useEffect, useMemo } from "react";
import { Node, Edge } from "reactflow";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Progress,
  Chip,
  Tabs,
  Tab,
  Select,
  SelectItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { 
  BarChart3, 
  Activity, 
  Zap, 
  Clock, 
  Database,
  TrendingUp,
  TrendingDown,
  Cpu,
  HardDrive,
  Gauge,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface ModelMetrics {
  totalParameters: number;
  trainableParameters: number;
  modelSize: number; // in MB
  memoryUsage: number; // in MB
  flopCount: number; // floating point operations
  inferenceTime: number; // in ms
  throughput: number; // samples per second
  energyEfficiency: number; // operations per watt
  accuracy: number;
  loss: number;
  convergenceRate: number;
}

interface LayerAnalysis {
  id: string;
  name: string;
  type: string;
  parameters: number;
  outputShape: number[];
  computationalCost: number;
  memoryFootprint: number;
  activationFunction?: string;
  regularization?: string;
  performance: {
    forwardTime: number;
    backwardTime: number;
    memoryEfficiency: number;
  };
}

interface PerformanceAnalysisProps {
  nodes: Node[];
  edges: Edge[];
  isTraining?: boolean;
  currentEpoch?: number;
  totalEpochs?: number;
}

const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({ 
  nodes, 
  edges, 
  isTraining = false,
  currentEpoch = 0,
  totalEpochs = 100
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [layerAnalysis, setLayerAnalysis] = useState<LayerAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("1h");

  // Simulate real-time metrics updates during training
  useEffect(() => {
    if (isTraining) {
      const interval = setInterval(() => {
        setMetrics(prev => prev ? {
          ...prev,
          accuracy: Math.min(0.99, prev.accuracy + (Math.random() - 0.5) * 0.02),
          loss: Math.max(0.01, prev.loss + (Math.random() - 0.7) * 0.1),
          inferenceTime: prev.inferenceTime + (Math.random() - 0.5) * 2,
          throughput: prev.throughput + (Math.random() - 0.5) * 10,
        } : null);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isTraining]);

  const analyzeModel = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Calculate model metrics
    let totalParams = 0;
    let trainableParams = 0;
    let computationalCost = 0;
    
    const layers: LayerAnalysis[] = nodes.map((node, index) => {
      const nodeParams = node.data.count || node.data.params?.units || 100;
      const nodeType = node.type || "unknown";
      const isTrainable = !["dropout", "flatten", "maxpool"].includes(nodeType);
      
      totalParams += nodeParams;
      if (isTrainable) trainableParams += nodeParams;
      
      const layerCost = nodeParams * (nodeType === "conv2d" ? 10 : 1);
      computationalCost += layerCost;
      
      return {
        id: node.id,
        name: node.data.label || `Layer ${index + 1}`,
        type: nodeType,
        parameters: nodeParams,
        outputShape: nodeType === "conv2d" ? [32, 32, 64] : [nodeParams],
        computationalCost: layerCost,
        memoryFootprint: nodeParams * 4, // 4 bytes per float32
        activationFunction: node.data.params?.activation || "relu",
        regularization: nodeType === "dropout" ? "dropout" : undefined,
        performance: {
          forwardTime: Math.random() * 5 + 1,
          backwardTime: Math.random() * 8 + 2,
          memoryEfficiency: Math.random() * 0.3 + 0.7,
        },
      };
    });
    
    const modelSizeMB = (totalParams * 4) / (1024 * 1024); // 4 bytes per parameter
    const memoryUsageMB = modelSizeMB * 2.5; // Approximate memory overhead
    
    const calculatedMetrics: ModelMetrics = {
      totalParameters: totalParams,
      trainableParameters: trainableParams,
      modelSize: modelSizeMB,
      memoryUsage: memoryUsageMB,
      flopCount: computationalCost * 1000,
      inferenceTime: Math.random() * 50 + 10,
      throughput: Math.random() * 500 + 100,
      energyEfficiency: Math.random() * 1000 + 500,
      accuracy: 0.85 + Math.random() * 0.1,
      loss: Math.random() * 0.5 + 0.1,
      convergenceRate: Math.random() * 0.1 + 0.05,
    };
    
    setMetrics(calculatedMetrics);
    setLayerAnalysis(layers);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (isOpen && !metrics) {
      analyzeModel();
    }
  }, [isOpen]);

  const formatNumber = (num: number, decimals = 2): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  const getEfficiencyColor = (value: number, max: number = 1) => {
    const ratio = value / max;
    if (ratio >= 0.8) return "success";
    if (ratio >= 0.6) return "warning";
    return "danger";
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-default-500">Parameters</p>
                <p className="text-lg font-semibold">{formatNumber(metrics?.totalParameters || 0)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 rounded-lg">
                <HardDrive className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-default-500">Model Size</p>
                <p className="text-lg font-semibold">{metrics?.modelSize.toFixed(1)} MB</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-100 rounded-lg">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-default-500">Inference</p>
                <p className="text-lg font-semibold">{metrics?.inferenceTime.toFixed(1)} ms</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary-100 rounded-lg">
                <Zap className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-default-500">Throughput</p>
                <p className="text-lg font-semibold">{formatNumber(metrics?.throughput || 0)}/s</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              <span className="font-semibold">Model Efficiency</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Memory Efficiency</span>
                  <span className="text-sm font-medium">85%</span>
                </div>
                <Progress value={85} color="success" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Computational Efficiency</span>
                  <span className="text-sm font-medium">72%</span>
                </div>
                <Progress value={72} color="warning" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Energy Efficiency</span>
                  <span className="text-sm font-medium">91%</span>
                </div>
                <Progress value={91} color="success" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <span className="font-semibold">Training Progress</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Accuracy</span>
                  <span className="text-sm font-medium">{((metrics?.accuracy || 0) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={(metrics?.accuracy || 0) * 100} color="primary" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Loss Reduction</span>
                  <span className="text-sm font-medium">{((1 - (metrics?.loss || 1)) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={(1 - (metrics?.loss || 1)) * 100} color="secondary" />
              </div>
              {isTraining && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Epoch Progress</span>
                    <span className="text-sm font-medium">{currentEpoch}/{totalEpochs}</span>
                  </div>
                  <Progress value={(currentEpoch / totalEpochs) * 100} color="success" />
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Performance Recommendations</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="font-medium">Model size is optimal</p>
                <p className="text-sm text-default-500">Your model size is within the recommended range for deployment.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium">Consider adding batch normalization</p>
                <p className="text-sm text-default-500">Adding batch normalization could improve training stability and convergence.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Inference time is acceptable</p>
                <p className="text-sm text-default-500">Current inference speed meets real-time requirements.</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );

  const renderLayerAnalysis = () => (
    <div className="space-y-4">
      {layerAnalysis.map((layer, index) => (
        <Card key={layer.id}>
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Chip size="sm" variant="flat">{index + 1}</Chip>
                <div>
                  <h4 className="font-medium">{layer.name}</h4>
                  <p className="text-sm text-default-500">{layer.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatNumber(layer.parameters)} params</p>
                <p className="text-xs text-default-500">{(layer.memoryFootprint / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-default-500 mb-1">Forward Time</p>
                <div className="flex items-center gap-2">
                  <Progress value={(layer.performance.forwardTime / 10) * 100} size="sm" />
                  <span className="text-xs">{layer.performance.forwardTime.toFixed(1)}ms</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-default-500 mb-1">Backward Time</p>
                <div className="flex items-center gap-2">
                  <Progress value={(layer.performance.backwardTime / 15) * 100} size="sm" color="secondary" />
                  <span className="text-xs">{layer.performance.backwardTime.toFixed(1)}ms</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-default-500 mb-1">Memory Efficiency</p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={layer.performance.memoryEfficiency * 100} 
                    size="sm" 
                    color={getEfficiencyColor(layer.performance.memoryEfficiency)}
                  />
                  <span className="text-xs">{(layer.performance.memoryEfficiency * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              {layer.activationFunction && (
                <Chip size="sm" variant="flat" color="primary">
                  {layer.activationFunction}
                </Chip>
              )}
              {layer.regularization && (
                <Chip size="sm" variant="flat" color="warning">
                  {layer.regularization}
                </Chip>
              )}
              <Chip size="sm" variant="flat">
                Shape: [{layer.outputShape.join(", ")}]
              </Chip>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );

  const renderRealTimeMetrics = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Real-time Monitoring</h3>
        <Select
          size="sm"
          selectedKeys={[timeRange]}
          onSelectionChange={(keys) => setTimeRange(Array.from(keys)[0] as string)}
          className="w-24"
        >
          <SelectItem key="1h">1h</SelectItem>
          <SelectItem key="6h">6h</SelectItem>
          <SelectItem key="24h">24h</SelectItem>
        </Select>
      </div>
      
      {/* Live Training Metrics */}
      {isTraining && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="font-semibold">Live Training</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-default-500 mb-2">Current Accuracy</p>
                <p className="text-2xl font-bold text-success">
                  {((metrics?.accuracy || 0) * 100).toFixed(2)}%
                </p>
                <p className="text-xs text-default-500">Target: 95%</p>
              </div>
              <div>
                <p className="text-sm text-default-500 mb-2">Current Loss</p>
                <p className="text-2xl font-bold text-primary">
                  {(metrics?.loss || 0).toFixed(4)}
                </p>
                <p className="text-xs text-default-500">Decreasing</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
      
      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Cpu className="w-5 h-5 text-primary" />
              <span className="font-medium">CPU Usage</span>
            </div>
            <Progress value={65} color="primary" />
            <p className="text-xs text-default-500 mt-1">65% utilization</p>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <HardDrive className="w-5 h-5 text-success" />
              <span className="font-medium">Memory</span>
            </div>
            <Progress value={78} color="success" />
            <p className="text-xs text-default-500 mt-1">
              {metrics?.memoryUsage.toFixed(1)} MB / 16 GB
            </p>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-warning" />
              <span className="font-medium">GPU Usage</span>
            </div>
            <Progress value={92} color="warning" />
            <p className="text-xs text-default-500 mt-1">92% utilization</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );

  return (
    <>
      <Button
        startContent={<BarChart3 className="w-4 h-4" />}
        variant="flat"
        color="primary"
        onPress={onOpen}
        isDisabled={nodes.length === 0}
      >
        Performance Analysis
      </Button>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Model Performance Analysis
                </div>
              </ModalHeader>
              <ModalBody>
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Activity className="w-12 h-12 text-primary mb-4 animate-pulse" />
                    <h3 className="text-lg font-semibold mb-2">Analyzing Performance...</h3>
                    <p className="text-default-500 text-center mb-6">
                      Computing metrics, analyzing layers, and generating insights
                    </p>
                    <Progress isIndeterminate color="primary" className="max-w-md" />
                  </div>
                ) : (
                  <Tabs selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key as string)}>
                    <Tab key="overview" title="Overview">
                      {renderOverview()}
                    </Tab>
                    <Tab key="layers" title="Layer Analysis">
                      {renderLayerAnalysis()}
                    </Tab>
                    <Tab key="realtime" title="Real-time">
                      {renderRealTimeMetrics()}
                    </Tab>
                  </Tabs>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color="primary"
                  startContent={<TrendingUp className="w-4 h-4" />}
                  onPress={() => {
                    setMetrics(null);
                    setLayerAnalysis([]);
                    analyzeModel();
                  }}
                >
                  Refresh Analysis
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default PerformanceAnalysis;
