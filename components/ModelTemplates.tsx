import React, { useState } from "react";
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
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { BookOpen, Zap, Image, MessageSquare, Brain, Database } from "lucide-react";

interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  category: "vision" | "nlp" | "general" | "timeseries" | "gan";
  difficulty: "beginner" | "intermediate" | "advanced";
  icon: string;
  nodes: Node[];
  edges: Edge[];
  tags: string[];
  useCase: string;
}

const modelTemplates: ModelTemplate[] = [
  {
    id: "simple-classifier",
    name: "Simple Binary Classifier",
    description: "Basic neural network for binary classification tasks",
    category: "general",
    difficulty: "beginner",
    icon: "lucide:brain",
    useCase: "Perfect for simple yes/no prediction tasks",
    tags: ["classification", "binary", "simple"],
    nodes: [
      {
        id: "input-template-1",
        type: "inputLayer",
        data: {
          label: "Input Layer (10)",
          icon: "lucide:square-dot-minus",
          details: "Input features",
          count: 10,
          params: { shape: [10] },
          onChange: () => {},
        },
        position: { x: 100, y: 200 },
      },
      {
        id: "dense-template-1",
        type: "dense",
        data: {
          label: "Dense (16)",
          icon: "lucide:grid",
          details: "Hidden layer with ReLU",
          count: 16,
          params: { units: 16, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 300, y: 200 },
      },
      {
        id: "dropout-template-1",
        type: "dropout",
        data: {
          label: "Dropout (0.3)",
          icon: "lucide:cloud-rain",
          details: "Regularization layer",
          params: { rate: 0.3 },
        },
        position: { x: 500, y: 200 },
      },
      {
        id: "output-template-1",
        type: "outputLayer",
        data: {
          label: "Output (1)",
          icon: "lucide:arrow-right",
          details: "Sigmoid output",
          count: 1,
          params: { activation: "sigmoid", units: 1 },
          onChange: () => {},
        },
        position: { x: 700, y: 200 },
      },
    ],
    edges: [
      { id: "e1", source: "input-template-1", target: "dense-template-1", type: "smooth" },
      { id: "e2", source: "dense-template-1", target: "dropout-template-1", type: "smooth" },
      { id: "e3", source: "dropout-template-1", target: "output-template-1", type: "smooth" },
    ],
  },
  {
    id: "cnn-image-classifier",
    name: "CNN Image Classifier",
    description: "Convolutional Neural Network for image classification",
    category: "vision",
    difficulty: "intermediate",
    icon: "lucide:image",
    useCase: "Image recognition, object detection, computer vision",
    tags: ["CNN", "computer vision", "image classification"],
    nodes: [
      {
        id: "input-cnn-1",
        type: "inputLayer",
        data: {
          label: "Input (28,28,1)",
          icon: "lucide:square-dot-minus",
          details: "Image input",
          count: 784,
          params: { shape: [28, 28, 1] },
          onChange: () => {},
        },
        position: { x: 50, y: 150 },
      },
      {
        id: "conv2d-1",
        type: "conv2d",
        data: {
          label: "Conv2D (32)",
          icon: "lucide:square",
          details: "32 filters, 3x3 kernel",
          params: { filters: 32, kernel_size: 3, activation: "relu" },
        },
        position: { x: 200, y: 150 },
      },
      {
        id: "maxpool-1",
        type: "maxpool",
        data: {
          label: "MaxPool2D",
          icon: "lucide:square",
          details: "2x2 pooling",
          params: { pool_size: 2 },
        },
        position: { x: 350, y: 150 },
      },
      {
        id: "conv2d-2",
        type: "conv2d",
        data: {
          label: "Conv2D (64)",
          icon: "lucide:square",
          details: "64 filters, 3x3 kernel",
          params: { filters: 64, kernel_size: 3, activation: "relu" },
        },
        position: { x: 500, y: 150 },
      },
      {
        id: "maxpool-2",
        type: "maxpool",
        data: {
          label: "MaxPool2D",
          icon: "lucide:square",
          details: "2x2 pooling",
          params: { pool_size: 2 },
        },
        position: { x: 650, y: 150 },
      },
      {
        id: "flatten-1",
        type: "flatten",
        data: {
          label: "Flatten",
          icon: "lucide:align-horizontal-space-around",
          details: "Flatten for dense layers",
        },
        position: { x: 800, y: 150 },
      },
      {
        id: "dense-cnn-1",
        type: "dense",
        data: {
          label: "Dense (128)",
          icon: "lucide:grid",
          details: "Fully connected layer",
          count: 128,
          params: { units: 128, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 950, y: 150 },
      },
      {
        id: "dropout-cnn-1",
        type: "dropout",
        data: {
          label: "Dropout (0.5)",
          icon: "lucide:cloud-rain",
          details: "Regularization",
          params: { rate: 0.5 },
        },
        position: { x: 1100, y: 150 },
      },
      {
        id: "output-cnn-1",
        type: "outputLayer",
        data: {
          label: "Output (10)",
          icon: "lucide:arrow-right",
          details: "Softmax classification",
          count: 10,
          params: { activation: "softmax", units: 10 },
          onChange: () => {},
        },
        position: { x: 1250, y: 150 },
      },
    ],
    edges: [
      { id: "e1", source: "input-cnn-1", target: "conv2d-1", type: "smooth" },
      { id: "e2", source: "conv2d-1", target: "maxpool-1", type: "smooth" },
      { id: "e3", source: "maxpool-1", target: "conv2d-2", type: "smooth" },
      { id: "e4", source: "conv2d-2", target: "maxpool-2", type: "smooth" },
      { id: "e5", source: "maxpool-2", target: "flatten-1", type: "smooth" },
      { id: "e6", source: "flatten-1", target: "dense-cnn-1", type: "smooth" },
      { id: "e7", source: "dense-cnn-1", target: "dropout-cnn-1", type: "smooth" },
      { id: "e8", source: "dropout-cnn-1", target: "output-cnn-1", type: "smooth" },
    ],
  },
  {
    id: "lstm-text-classifier",
    name: "LSTM Text Classifier",
    description: "Recurrent neural network for text classification",
    category: "nlp",
    difficulty: "intermediate",
    icon: "lucide:message-square",
    useCase: "Sentiment analysis, text classification, sequence modeling",
    tags: ["LSTM", "NLP", "text processing", "sequences"],
    nodes: [
      {
        id: "input-lstm-1",
        type: "inputLayer",
        data: {
          label: "Input (100)",
          icon: "lucide:square-dot-minus",
          details: "Sequence input",
          count: 100,
          params: { shape: [100] },
          onChange: () => {},
        },
        position: { x: 100, y: 200 },
      },
      {
        id: "embedding-1",
        type: "embedding",
        data: {
          label: "Embedding (128)",
          icon: "lucide:layers",
          details: "Word embeddings",
          count: 128,
          params: { input_dim: 10000, output_dim: 128 },
          onChange: () => {},
        },
        position: { x: 300, y: 200 },
      },
      {
        id: "lstm-1",
        type: "lstm",
        data: {
          label: "LSTM (64)",
          icon: "lucide:activity",
          details: "Bidirectional LSTM",
          count: 64,
          params: { units: 64, return_sequences: true },
          onChange: () => {},
        },
        position: { x: 500, y: 200 },
      },
      {
        id: "dropout-lstm-1",
        type: "dropout",
        data: {
          label: "Dropout (0.3)",
          icon: "lucide:cloud-rain",
          details: "Regularization",
          params: { rate: 0.3 },
        },
        position: { x: 700, y: 200 },
      },
      {
        id: "lstm-2",
        type: "lstm",
        data: {
          label: "LSTM (32)",
          icon: "lucide:activity",
          details: "Final LSTM layer",
          count: 32,
          params: { units: 32, return_sequences: false },
          onChange: () => {},
        },
        position: { x: 900, y: 200 },
      },
      {
        id: "dense-lstm-1",
        type: "dense",
        data: {
          label: "Dense (16)",
          icon: "lucide:grid",
          details: "Classification head",
          count: 16,
          params: { units: 16, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 1100, y: 200 },
      },
      {
        id: "output-lstm-1",
        type: "outputLayer",
        data: {
          label: "Output (3)",
          icon: "lucide:arrow-right",
          details: "Multi-class output",
          count: 3,
          params: { activation: "softmax", units: 3 },
          onChange: () => {},
        },
        position: { x: 1300, y: 200 },
      },
    ],
    edges: [
      { id: "e1", source: "input-lstm-1", target: "embedding-1", type: "smooth" },
      { id: "e2", source: "embedding-1", target: "lstm-1", type: "smooth" },
      { id: "e3", source: "lstm-1", target: "dropout-lstm-1", type: "smooth" },
      { id: "e4", source: "dropout-lstm-1", target: "lstm-2", type: "smooth" },
      { id: "e5", source: "lstm-2", target: "dense-lstm-1", type: "smooth" },
      { id: "e6", source: "dense-lstm-1", target: "output-lstm-1", type: "smooth" },
    ],
  },
  {
    id: "autoencoder",
    name: "Autoencoder",
    description: "Encoder-decoder architecture for dimensionality reduction",
    category: "general",
    difficulty: "advanced",
    icon: "lucide:compress",
    useCase: "Dimensionality reduction, feature learning, denoising",
    tags: ["autoencoder", "unsupervised", "compression"],
    nodes: [
      {
        id: "input-ae-1",
        type: "inputLayer",
        data: {
          label: "Input (784)",
          icon: "lucide:square-dot-minus",
          details: "Original data",
          count: 784,
          params: { shape: [784] },
          onChange: () => {},
        },
        position: { x: 100, y: 200 },
      },
      {
        id: "encoder-1",
        type: "dense",
        data: {
          label: "Encoder (256)",
          icon: "lucide:grid",
          details: "First encoding layer",
          count: 256,
          params: { units: 256, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 300, y: 200 },
      },
      {
        id: "encoder-2",
        type: "dense",
        data: {
          label: "Encoder (128)",
          icon: "lucide:grid",
          details: "Second encoding layer",
          count: 128,
          params: { units: 128, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 500, y: 200 },
      },
      {
        id: "bottleneck",
        type: "dense",
        data: {
          label: "Latent (32)",
          icon: "lucide:circle",
          details: "Compressed representation",
          count: 32,
          params: { units: 32, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 700, y: 200 },
      },
      {
        id: "decoder-1",
        type: "dense",
        data: {
          label: "Decoder (128)",
          icon: "lucide:grid",
          details: "First decoding layer",
          count: 128,
          params: { units: 128, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 900, y: 200 },
      },
      {
        id: "decoder-2",
        type: "dense",
        data: {
          label: "Decoder (256)",
          icon: "lucide:grid",
          details: "Second decoding layer",
          count: 256,
          params: { units: 256, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 1100, y: 200 },
      },
      {
        id: "output-ae-1",
        type: "outputLayer",
        data: {
          label: "Output (784)",
          icon: "lucide:arrow-right",
          details: "Reconstructed data",
          count: 784,
          params: { activation: "sigmoid", units: 784 },
          onChange: () => {},
        },
        position: { x: 1300, y: 200 },
      },
    ],
    edges: [
      { id: "e1", source: "input-ae-1", target: "encoder-1", type: "smooth" },
      { id: "e2", source: "encoder-1", target: "encoder-2", type: "smooth" },
      { id: "e3", source: "encoder-2", target: "bottleneck", type: "smooth" },
      { id: "e4", source: "bottleneck", target: "decoder-1", type: "smooth" },
      { id: "e5", source: "decoder-1", target: "decoder-2", type: "smooth" },
      { id: "e6", source: "decoder-2", target: "output-ae-1", type: "smooth" },
    ],
  },
];

interface ModelTemplatesProps {
  onLoadTemplate: (template: ModelTemplate) => void;
}

const ModelTemplates: React.FC<ModelTemplatesProps> = ({ onLoadTemplate }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { key: "all", label: "All Templates", icon: "lucide:grid" },
    { key: "general", label: "General", icon: "lucide:brain" },
    { key: "vision", label: "Computer Vision", icon: "lucide:image" },
    { key: "nlp", label: "Natural Language", icon: "lucide:message-square" },
    { key: "timeseries", label: "Time Series", icon: "lucide:trending-up" },
    { key: "gan", label: "Generative", icon: "lucide:shuffle" },
  ];

  const filteredTemplates = selectedCategory === "all" 
    ? modelTemplates 
    : modelTemplates.filter(template => template.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "success";
      case "intermediate": return "warning";
      case "advanced": return "danger";
      default: return "default";
    }
  };

  const handleLoadTemplate = (template: ModelTemplate) => {
    // Update node IDs to avoid conflicts
    const updatedNodes = template.nodes.map(node => ({
      ...node,
      id: `${node.id}-${Date.now()}`,
    }));

    const updatedEdges = template.edges.map(edge => ({
      ...edge,
      id: `${edge.id}-${Date.now()}`,
      source: `${edge.source}-${Date.now()}`,
      target: `${edge.target}-${Date.now()}`,
    }));

    onLoadTemplate({
      ...template,
      nodes: updatedNodes,
      edges: updatedEdges,
    });
    onOpenChange();
  };

  return (
    <>
      <Button
        startContent={<BookOpen className="w-4 h-4" />}
        variant="flat"
        onPress={onOpen}
      >
        Load Template
      </Button>

      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Model Templates
                </div>
                <p className="text-sm text-default-500 font-normal">
                  Choose from pre-built neural network architectures to get started quickly
                </p>
              </ModalHeader>
              <ModalBody>
                {/* Category Filter */}
                <div className="flex gap-2 mb-6 flex-wrap">
                  {categories.map((category) => (
                    <Button
                      key={category.key}
                      size="sm"
                      variant={selectedCategory === category.key ? "solid" : "flat"}
                      color={selectedCategory === category.key ? "primary" : "default"}
                      startContent={<Icon icon={category.icon} className="w-4 h-4" />}
                      onPress={() => setSelectedCategory(category.key)}
                    >
                      {category.label}
                    </Button>
                  ))}
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-center gap-3">
                            <Icon icon={template.icon} className="w-6 h-6 text-primary" />
                            <div>
                              <h3 className="text-lg font-semibold">{template.name}</h3>
                              <p className="text-sm text-default-500">{template.description}</p>
                            </div>
                          </div>
                          <Chip
                            size="sm"
                            color={getDifficultyColor(template.difficulty)}
                            variant="flat"
                          >
                            {template.difficulty}
                          </Chip>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-default-700 mb-1">Use Case:</p>
                            <p className="text-sm text-default-500">{template.useCase}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-default-700 mb-2">Architecture:</p>
                            <div className="text-xs text-default-500">
                              {template.nodes.length} layers • {template.edges.length} connections
                            </div>
                          </div>

                          <div>
                            <div className="flex flex-wrap gap-1">
                              {template.tags.map((tag) => (
                                <Chip key={tag} size="sm" variant="flat" className="text-xs">
                                  {tag}
                                </Chip>
                              ))}
                            </div>
                          </div>

                          <Divider />

                          <Button
                            color="primary"
                            variant="flat"
                            size="sm"
                            className="w-full"
                            startContent={<Zap className="w-4 h-4" />}
                            onPress={() => handleLoadTemplate(template)}
                          >
                            Load Template
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-default-300 mx-auto mb-4" />
                    <p className="text-default-500">No templates found for this category.</p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default ModelTemplates;
