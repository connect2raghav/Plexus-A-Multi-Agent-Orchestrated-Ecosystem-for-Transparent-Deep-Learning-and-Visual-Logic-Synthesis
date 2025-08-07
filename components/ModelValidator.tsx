import React, { useState, useEffect } from "react";
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
  Chip,
  Progress,
  Divider,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Zap, 
  Brain,
  Calculator,
  Activity,
  Target
} from "lucide-react";

interface ValidationIssue {
  id: string;
  type: "error" | "warning" | "info";
  category: "architecture" | "performance" | "best-practice" | "compatibility";
  title: string;
  description: string;
  suggestion?: string;
  nodeId?: string;
  severity: number; // 1-10, higher is more severe
}

interface ModelAnalysis {
  totalParameters: number;
  modelSize: string;
  computationalComplexity: string;
  memoryRequirement: string;
  trainingComplexity: "low" | "medium" | "high" | "very-high";
  inferenceSpeed: "fast" | "medium" | "slow";
  issues: ValidationIssue[];
  recommendations: string[];
  score: number; // 0-100
}

interface ModelValidatorProps {
  nodes: Node[];
  edges: Edge[];
  onIssueSelect?: (nodeId: string) => void;
}

const ModelValidator: React.FC<ModelValidatorProps> = ({ 
  nodes, 
  edges, 
  onIssueSelect 
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [analysis, setAnalysis] = useState<ModelAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeModel = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    let totalParameters = 0;
    
    // Check for common architecture issues
    const inputNodes = nodes.filter(n => n.type === "inputLayer" || n.type === "textInput");
    const outputNodes = nodes.filter(n => n.type === "outputLayer");
    const denseNodes = nodes.filter(n => n.type === "dense");
    const dropoutNodes = nodes.filter(n => n.type === "dropout");
    const convNodes = nodes.filter(n => n.type === "conv2d");
    
    // Validation checks
    if (inputNodes.length === 0) {
      issues.push({
        id: "no-input",
        type: "error",
        category: "architecture",
        title: "No Input Layer",
        description: "Your model needs at least one input layer to receive data.",
        suggestion: "Add an Input Layer from the Input/Output section in the sidebar.",
        severity: 10,
      });
    }
    
    if (inputNodes.length > 1) {
      issues.push({
        id: "multiple-inputs",
        type: "warning",
        category: "architecture",
        title: "Multiple Input Layers",
        description: "Multiple input layers detected. This creates a multi-input model architecture.",
        suggestion: "Consider if you really need multiple inputs or merge them using concatenation.",
        severity: 4,
      });
    }
    
    if (outputNodes.length === 0) {
      issues.push({
        id: "no-output",
        type: "error",
        category: "architecture",
        title: "No Output Layer",
        description: "Your model needs an output layer to produce predictions.",
        suggestion: "Add an Output Layer from the Input/Output section in the sidebar.",
        severity: 10,
      });
    }
    
    if (outputNodes.length > 1) {
      issues.push({
        id: "multiple-outputs",
        type: "warning",
        category: "architecture",
        title: "Multiple Output Layers",
        description: "Multiple output layers detected. This creates a multi-output model.",
        suggestion: "Ensure this is intentional for your use case.",
        severity: 3,
      });
    }
    
    // Check for disconnected nodes
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const disconnectedNodes = nodes.filter(node => 
      !connectedNodeIds.has(node.id) && node.type !== "textInput"
    );
    
    if (disconnectedNodes.length > 0) {
      issues.push({
        id: "disconnected-nodes",
        type: "warning",
        category: "architecture",
        title: `${disconnectedNodes.length} Disconnected Nodes`,
        description: "Some nodes are not connected to the main network flow.",
        suggestion: "Connect all nodes or remove unnecessary ones.",
        severity: 6,
      });
    }
    
    // Check for very deep networks
    if (denseNodes.length > 10) {
      issues.push({
        id: "very-deep",
        type: "warning",
        category: "performance",
        title: "Very Deep Network",
        description: "Networks with many dense layers can suffer from vanishing gradients.",
        suggestion: "Consider using residual connections, batch normalization, or reducing depth.",
        severity: 5,
      });
    }
    
    // Check for missing regularization
    if (denseNodes.length > 2 && dropoutNodes.length === 0) {
      issues.push({
        id: "no-regularization",
        type: "warning",
        category: "best-practice",
        title: "No Regularization",
        description: "Deep networks without regularization are prone to overfitting.",
        suggestion: "Add Dropout layers or Batch Normalization between dense layers.",
        severity: 7,
      });
    }
    
    // Check for appropriate activation functions
    const outputNode = outputNodes[0];
    if (outputNode && outputNode.data.params) {
      const activation = outputNode.data.params.activation;
      const units = outputNode.data.params.units || outputNode.data.count;
      
      if (units === 1 && activation !== "sigmoid") {
        issues.push({
          id: "binary-activation",
          type: "warning",
          category: "best-practice",
          title: "Binary Classification Activation",
          description: "For binary classification (1 output unit), sigmoid activation is recommended.",
          suggestion: "Change output activation to 'sigmoid' for binary classification.",
          nodeId: outputNode.id,
          severity: 6,
        });
      }
      
      if (units > 2 && activation !== "softmax") {
        issues.push({
          id: "multiclass-activation",
          type: "warning",
          category: "best-practice",
          title: "Multi-class Classification Activation",
          description: "For multi-class classification, softmax activation is recommended.",
          suggestion: "Change output activation to 'softmax' for multi-class classification.",
          nodeId: outputNode.id,
          severity: 6,
        });
      }
    }
    
    // Check CNN architecture
    if (convNodes.length > 0) {
      const flattenNodes = nodes.filter(n => n.type === "flatten");
      const hasPooling = nodes.some(n => n.type === "maxpool");
      
      if (flattenNodes.length === 0) {
        issues.push({
          id: "cnn-no-flatten",
          type: "error",
          category: "architecture",
          title: "CNN Missing Flatten Layer",
          description: "Convolutional layers need a Flatten layer before dense layers.",
          suggestion: "Add a Flatten layer between convolutional and dense layers.",
          severity: 9,
        });
      }
      
      if (!hasPooling && convNodes.length > 1) {
        issues.push({
          id: "cnn-no-pooling",
          type: "warning",
          category: "best-practice",
          title: "CNN Without Pooling",
          description: "CNNs typically benefit from pooling layers to reduce spatial dimensions.",
          suggestion: "Consider adding MaxPooling or AveragePooling layers.",
          severity: 4,
        });
      }
    }
    
    // Calculate model complexity
    nodes.forEach(node => {
      if (node.data.count) {
        totalParameters += node.data.count;
      }
      if (node.data.params?.units) {
        totalParameters += node.data.params.units;
      }
    });
    
    // Add parameter complexity warnings
    if (totalParameters > 1000000) {
      issues.push({
        id: "large-model",
        type: "warning",
        category: "performance",
        title: "Large Model Size",
        description: "Your model has a very large number of parameters.",
        suggestion: "Consider reducing layer sizes or using techniques like pruning.",
        severity: 5,
      });
    }
    
    // Generate recommendations
    if (issues.filter(i => i.type === "error").length === 0) {
      recommendations.push("✅ Your model architecture looks valid!");
    }
    
    if (dropoutNodes.length > 0) {
      recommendations.push("👍 Good use of regularization with dropout layers.");
    }
    
    if (nodes.some(n => n.type === "batchnorm")) {
      recommendations.push("👍 Batch normalization will help with training stability.");
    }
    
    if (convNodes.length > 0 && nodes.some(n => n.type === "maxpool")) {
      recommendations.push("👍 Well-structured CNN with pooling layers.");
    }
    
    if (issues.length === 0) {
      recommendations.push("🎉 No issues found! Your architecture follows best practices.");
    }
    
    // Calculate score
    const errorPenalty = issues.filter(i => i.type === "error").length * 20;
    const warningPenalty = issues.filter(i => i.type === "warning").length * 5;
    const score = Math.max(0, 100 - errorPenalty - warningPenalty);
    
    const modelSize = totalParameters > 1000000 ? "Large (>1M)" : 
                     totalParameters > 100000 ? "Medium (100K-1M)" : "Small (<100K)";
    
    const trainingComplexity = totalParameters > 1000000 ? "very-high" :
                              totalParameters > 100000 ? "high" :
                              totalParameters > 10000 ? "medium" : "low";
    
    setAnalysis({
      totalParameters,
      modelSize,
      computationalComplexity: convNodes.length > 0 ? "High (CNN)" : "Medium",
      memoryRequirement: modelSize,
      trainingComplexity,
      inferenceSpeed: totalParameters > 1000000 ? "slow" : 
                     totalParameters > 100000 ? "medium" : "fast",
      issues,
      recommendations,
      score,
    });
    
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (isOpen && !analysis) {
      analyzeModel();
    }
  }, [isOpen]);

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "error": return <XCircle className="w-4 h-4 text-danger" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "info": return <Info className="w-4 h-4 text-primary" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "danger";
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "low": return "success";
      case "medium": return "primary";
      case "high": return "warning";
      case "very-high": return "danger";
      default: return "default";
    }
  };

  return (
    <>
      <Button
        startContent={<CheckCircle className="w-4 h-4" />}
        variant="flat"
        color="primary"
        onPress={() => {
          setAnalysis(null);
          onOpen();
        }}
      >
        Validate Model
      </Button>

      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Model Validation & Analysis
                </div>
                <p className="text-sm text-default-500 font-normal">
                  Comprehensive analysis of your neural network architecture
                </p>
              </ModalHeader>
              <ModalBody>
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Activity className="w-12 h-12 text-primary mb-4 animate-pulse" />
                    <h3 className="text-lg font-semibold mb-2">Analyzing Your Model...</h3>
                    <p className="text-default-500 text-center mb-6">
                      Checking architecture, performance, and best practices
                    </p>
                    <Progress 
                      isIndeterminate 
                      aria-label="Analyzing..."
                      className="max-w-md"
                      color="primary"
                    />
                  </div>
                ) : analysis ? (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Target className="w-5 h-5" />
                            <span className="text-lg font-semibold">Overall Score</span>
                          </div>
                          <Chip 
                            size="lg" 
                            color={getScoreColor(analysis.score)}
                            variant="flat"
                          >
                            {analysis.score}/100
                          </Chip>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-0">
                        <Progress 
                          value={analysis.score} 
                          color={getScoreColor(analysis.score)}
                          className="mb-2"
                        />
                        <p className="text-sm text-default-500">
                          {analysis.score >= 80 ? "Excellent architecture!" :
                           analysis.score >= 60 ? "Good architecture with room for improvement." :
                           "Architecture needs attention."}
                        </p>
                      </CardBody>
                    </Card>

                    {/* Model Statistics */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Calculator className="w-5 h-5" />
                          <span className="text-lg font-semibold">Model Statistics</span>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-0">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-default-700">Parameters</p>
                            <p className="text-lg">{analysis.totalParameters.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-default-700">Model Size</p>
                            <p className="text-lg">{analysis.modelSize}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-default-700">Training Complexity</p>
                            <Chip 
                              size="sm" 
                              color={getComplexityColor(analysis.trainingComplexity)}
                              variant="flat"
                            >
                              {analysis.trainingComplexity}
                            </Chip>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-default-700">Inference Speed</p>
                            <Chip 
                              size="sm" 
                              color={analysis.inferenceSpeed === "fast" ? "success" : 
                                     analysis.inferenceSpeed === "medium" ? "warning" : "danger"}
                              variant="flat"
                            >
                              {analysis.inferenceSpeed}
                            </Chip>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Issues and Recommendations */}
                    <Accordion variant="splitted">
                      {analysis.issues.length > 0 ? (
                        <AccordionItem
                          key="issues"
                          aria-label="Issues"
                          title={
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Issues ({analysis.issues.length})
                            </div>
                          }
                        >
                          <div className="space-y-3">
                            {analysis.issues.map((issue) => (
                              <Card key={issue.id} className="border-l-4 border-l-warning">
                                <CardBody>
                                  <div className="flex items-start gap-3">
                                    {getIssueIcon(issue.type)}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold">{issue.title}</h4>
                                        <Chip size="sm" variant="flat" color={
                                          issue.type === "error" ? "danger" : 
                                          issue.type === "warning" ? "warning" : "primary"
                                        }>
                                          {issue.type}
                                        </Chip>
                                        <Chip size="sm" variant="flat">
                                          {issue.category}
                                        </Chip>
                                      </div>
                                      <p className="text-sm text-default-600 mb-2">
                                        {issue.description}
                                      </p>
                                      {issue.suggestion && (
                                        <p className="text-sm text-default-500 italic">
                                          💡 {issue.suggestion}
                                        </p>
                                      )}
                                      {issue.nodeId && onIssueSelect && (
                                        <Button
                                          size="sm"
                                          variant="flat"
                                          className="mt-2"
                                          onPress={() => onIssueSelect(issue.nodeId!)}
                                        >
                                          Highlight Node
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </CardBody>
                              </Card>
                            ))}
                          </div>
                        </AccordionItem>
                      ) : null}

                      <AccordionItem
                        key="recommendations"
                        aria-label="Recommendations"
                        title={
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Recommendations
                          </div>
                        }
                      >
                        <div className="space-y-2">
                          {analysis.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <span className="text-sm">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
                {analysis && (
                  <Button
                    color="primary"
                    startContent={<Zap className="w-4 h-4" />}
                    onPress={() => {
                      setAnalysis(null);
                      analyzeModel();
                    }}
                  >
                    Re-analyze
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default ModelValidator;
