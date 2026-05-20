import { Node, Edge } from "reactflow";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

export const templateDefinitions: Record<string, TemplateDefinition> = {
  feedforward: {
    id: "feedforward",
    name: "Feedforward Neural Network",
    description: "Basic neural network for classification and regression tasks",
    nodes: [
      {
        id: "input-ff-1",
        type: "inputLayer",
        data: {
          label: "Input Layer (784)",
          icon: "lucide:square-dot-minus",
          details: "Input features",
          count: 784,
          params: { shape: [784] },
          onChange: () => {},
        },
        position: { x: 100, y: 200 },
      },
      {
        id: "dense-ff-1",
        type: "dense",
        data: {
          label: "Dense (128)",
          icon: "lucide:grid",
          details: "Hidden layer with ReLU",
          count: 128,
          params: { units: 128, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 350, y: 200 },
      },
      {
        id: "dense-ff-2",
        type: "dense",
        data: {
          label: "Dense (64)",
          icon: "lucide:grid",
          details: "Hidden layer with ReLU",
          count: 64,
          params: { units: 64, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 600, y: 200 },
      },
      {
        id: "dropout-ff-1",
        type: "dropout",
        data: {
          label: "Dropout (0.3)",
          icon: "lucide:cloud-rain",
          details: "Regularization layer",
          params: { rate: 0.3 },
        },
        position: { x: 850, y: 200 },
      },
      {
        id: "output-ff-1",
        type: "outputLayer",
        data: {
          label: "Output (10)",
          icon: "lucide:arrow-right",
          details: "Softmax output",
          count: 10,
          params: { activation: "softmax", units: 10 },
          onChange: () => {},
        },
        position: { x: 1100, y: 200 },
      },
    ],
    edges: [
      { id: "e1", source: "input-ff-1", target: "dense-ff-1", type: "smooth" },
      { id: "e2", source: "dense-ff-1", target: "dense-ff-2", type: "smooth" },
      {
        id: "e3",
        source: "dense-ff-2",
        target: "dropout-ff-1",
        type: "smooth",
      },
      {
        id: "e4",
        source: "dropout-ff-1",
        target: "output-ff-1",
        type: "smooth",
      },
    ],
  },

  cnn: {
    id: "cnn",
    name: "Convolutional Neural Network",
    description: "CNN for image classification and computer vision tasks",
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
      {
        id: "e7",
        source: "dense-cnn-1",
        target: "dropout-cnn-1",
        type: "smooth",
      },
      {
        id: "e8",
        source: "dropout-cnn-1",
        target: "output-cnn-1",
        type: "smooth",
      },
    ],
  },

  rnn: {
    id: "rnn",
    name: "RNN/LSTM Network",
    description:
      "Recurrent neural network for sequence data and text processing",
    nodes: [
      {
        id: "input-rnn-1",
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
        id: "dropout-rnn-1",
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
        id: "dense-rnn-1",
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
        id: "output-rnn-1",
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
      {
        id: "e1",
        source: "input-rnn-1",
        target: "embedding-1",
        type: "smooth",
      },
      { id: "e2", source: "embedding-1", target: "lstm-1", type: "smooth" },
      { id: "e3", source: "lstm-1", target: "dropout-rnn-1", type: "smooth" },
      { id: "e4", source: "dropout-rnn-1", target: "lstm-2", type: "smooth" },
      { id: "e5", source: "lstm-2", target: "dense-rnn-1", type: "smooth" },
      {
        id: "e6",
        source: "dense-rnn-1",
        target: "output-rnn-1",
        type: "smooth",
      },
    ],
  },

  autoencoder: {
    id: "autoencoder",
    name: "Autoencoder",
    description:
      "Encoder-decoder architecture for dimensionality reduction and feature learning",
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

  transformer: {
    id: "transformer",
    name: "Transformer",
    description:
      "Attention-based model for modern NLP and sequence-to-sequence tasks",
    nodes: [
      {
        id: "input-trans-1",
        type: "inputLayer",
        data: {
          label: "Input (512)",
          icon: "lucide:square-dot-minus",
          details: "Token sequence input",
          count: 512,
          params: { shape: [512] },
          onChange: () => {},
        },
        position: { x: 100, y: 150 },
      },
      {
        id: "embedding-trans-1",
        type: "embedding",
        data: {
          label: "Embedding (512)",
          icon: "lucide:layers",
          details: "Token + positional embeddings",
          count: 512,
          params: { input_dim: 50000, output_dim: 512 },
          onChange: () => {},
        },
        position: { x: 300, y: 150 },
      },
      {
        id: "attention-1",
        type: "attention",
        data: {
          label: "Multi-Head Attention",
          icon: "lucide:focus",
          details: "8 attention heads",
          params: { num_heads: 8, key_dim: 64 },
        },
        position: { x: 500, y: 150 },
      },
      {
        id: "norm-1",
        type: "normalization",
        data: {
          label: "Layer Norm",
          icon: "lucide:activity",
          details: "Layer normalization",
          params: { epsilon: 1e-6 },
        },
        position: { x: 700, y: 150 },
      },
      {
        id: "ffn-1",
        type: "dense",
        data: {
          label: "Feed Forward (2048)",
          icon: "lucide:grid",
          details: "Position-wise FFN",
          count: 2048,
          params: { units: 2048, activation: "relu" },
          onChange: () => {},
        },
        position: { x: 900, y: 150 },
      },
      {
        id: "norm-2",
        type: "normalization",
        data: {
          label: "Layer Norm",
          icon: "lucide:activity",
          details: "Layer normalization",
          params: { epsilon: 1e-6 },
        },
        position: { x: 1100, y: 150 },
      },
      {
        id: "pooling-trans-1",
        type: "pooling",
        data: {
          label: "Global Avg Pool",
          icon: "lucide:minimize",
          details: "Sequence pooling",
          params: { pool_mode: "avg" },
        },
        position: { x: 1300, y: 150 },
      },
      {
        id: "output-trans-1",
        type: "outputLayer",
        data: {
          label: "Output (1000)",
          icon: "lucide:arrow-right",
          details: "Classification output",
          count: 1000,
          params: { activation: "softmax", units: 1000 },
          onChange: () => {},
        },
        position: { x: 1500, y: 150 },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "input-trans-1",
        target: "embedding-trans-1",
        type: "smooth",
      },
      {
        id: "e2",
        source: "embedding-trans-1",
        target: "attention-1",
        type: "smooth",
      },
      { id: "e3", source: "attention-1", target: "norm-1", type: "smooth" },
      { id: "e4", source: "norm-1", target: "ffn-1", type: "smooth" },
      { id: "e5", source: "ffn-1", target: "norm-2", type: "smooth" },
      { id: "e6", source: "norm-2", target: "pooling-trans-1", type: "smooth" },
      {
        id: "e7",
        source: "pooling-trans-1",
        target: "output-trans-1",
        type: "smooth",
      },
    ],
  },
};

export function getTemplateByType(
  templateType: string,
): TemplateDefinition | null {
  return templateDefinitions[templateType] || null;
}
