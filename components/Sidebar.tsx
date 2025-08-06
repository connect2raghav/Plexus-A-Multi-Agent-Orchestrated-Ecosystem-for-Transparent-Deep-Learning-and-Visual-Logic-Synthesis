import React from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

const nodeTypesByCategory = [
  {
    category: "Input/Output",
    nodes: [
      {
        type: "inputLayer",
        label: "Input Layer",
        icon: "lucide:box",
        details: "Neural Network Input Layer",
      },
      {
        type: "outputLayer",
        label: "Output Layer",
        icon: "lucide:arrow-right",
        details: "Neural Network Output Layer",
      },
      {
        type: "textInput",
        label: "Text Input",
        icon: "lucide:type",
        details: "Text Input Node",
      },
      {
        type: "textOutput",
        label: "Text Output",
        icon: "lucide:file-text",
        details: "Text Output Node",
      },
    ],
  },
  {
    category: "Core",
    nodes: [
      {
        type: "dense",
        label: "Dense",
        icon: "lucide:grid",
        details: "Dense Layer",
      },
      {
        type: "hidden",
        label: "Hidden",
        icon: "lucide:layers",
        details: "Hidden Layer",
      },
      {
        type: "flatten",
        label: "Flatten",
        icon: "lucide:align-horizontal-space-around",
        details: "Flatten Layer",
      },
      {
        type: "reshape",
        label: "Reshape",
        icon: "lucide:shuffle",
        details: "Reshape Layer",
      },
      {
        type: "embedding",
        label: "Embedding",
        icon: "lucide:layers",
        details: "Embedding Layer",
      },
    ],
  },
  {
    category: "Convolutional",
    nodes: [
      {
        type: "conv2d",
        label: "Conv2D",
        icon: "lucide:square",
        details: "2D Convolutional Layer",
      },
      {
        type: "maxpool",
        label: "Max Pool",
        icon: "lucide:square",
        details: "Max Pooling Layer",
      },
    ],
  },
  {
    category: "Normalization",
    nodes: [
      {
        type: "batchnorm",
        label: "BatchNorm",
        icon: "lucide:equal",
        details: "Batch Normalization Layer",
      },
    ],
  },
  {
    category: "Regularization",
    nodes: [
      {
        type: "dropout",
        label: "Dropout",
        icon: "lucide:cloud-rain",
        details: "Dropout Layer",
      },
    ],
  },
  {
    category: "Activation",
    nodes: [
      {
        type: "activation",
        label: "Activation",
        icon: "lucide:zap",
        details: "Activation Layer",
      },
      {
        type: "softmax",
        label: "Softmax",
        icon: "lucide:divide",
        details: "Softmax Layer",
      },
    ],
  },
  {
    category: "Recurrent",
    nodes: [
      {
        type: "recurrent",
        label: "Recurrent",
        icon: "lucide:repeat",
        details: "Recurrent Layer",
      },
      {
        type: "lstm",
        label: "LSTM",
        icon: "lucide:activity",
        details: "LSTM Layer",
      },
      {
        type: "gru",
        label: "GRU",
        icon: "lucide:git-merge",
        details: "GRU Layer",
      },
    ],
  },
  {
    category: "Merge",
    nodes: [
      {
        type: "add",
        label: "Add",
        icon: "lucide:plus",
        details: "Add Layer",
      },
      {
        type: "concat",
        label: "Concatenate",
        icon: "lucide:link",
        details: "Concatenate Layer",
      },
    ],
  },
  {
    category: "Optimizers",
    nodes: [
      {
        type: "adam",
        label: "Adam",
        icon: "lucide:zap",
        details: "Adam Optimizer",
      },
      {
        type: "sgd",
        label: "SGD",
        icon: "lucide:trending-up",
        details: "Stochastic Gradient Descent",
      },
      {
        type: "rmsprop",
        label: "RMSprop",
        icon: "lucide:activity",
        details: "RMSprop Optimizer",
      },
      {
        type: "adagrad",
        label: "AdaGrad",
        icon: "lucide:target",
        details: "Adaptive Gradient Algorithm",
      },
      {
        type: "adamw",
        label: "AdamW",
        icon: "lucide:zap",
        details: "Adam with Weight Decay",
      },
    ],
  },
  {
    category: "Algorithms",
    nodes: [
      {
        type: "cnn",
        label: "CNN",
        icon: "lucide:image",
        details: "Convolutional Neural Network",
      },
      {
        type: "rnn",
        label: "RNN",
        icon: "lucide:repeat",
        details: "Recurrent Neural Network",
      },
      {
        type: "autoencoder",
        label: "AutoEncoder",
        icon: "lucide:compress",
        details: "Autoencoder Network",
      },
      {
        type: "gan",
        label: "GAN",
        icon: "lucide:shuffle",
        details: "Generative Adversarial Network",
      },
      {
        type: "transformer",
        label: "Transformer",
        icon: "lucide:cpu",
        details: "Transformer Architecture",
      },
      {
        type: "resnet",
        label: "ResNet",
        icon: "lucide:layers-2",
        details: "Residual Network",
      },
      {
        type: "vae",
        label: "VAE",
        icon: "lucide:shuffle",
        details: "Variational Autoencoder",
      },
    ],
  },
  {
    category: "Loss Functions",
    nodes: [
      {
        type: "crossentropy",
        label: "CrossEntropy",
        icon: "lucide:target",
        details: "Cross Entropy Loss",
      },
      {
        type: "mse",
        label: "MSE",
        icon: "lucide:square",
        details: "Mean Squared Error",
      },
      {
        type: "mae",
        label: "MAE",
        icon: "lucide:triangle",
        details: "Mean Absolute Error",
      },
      {
        type: "bce",
        label: "BCE",
        icon: "lucide:binary",
        details: "Binary Cross Entropy",
      },
    ],
  },
  {
    category: "Learning Rate Schedulers",
    nodes: [
      {
        type: "steplr",
        label: "StepLR",
        icon: "lucide:stairs",
        details: "Step Learning Rate Scheduler",
      },
      {
        type: "exponentiallr",
        label: "ExponentialLR",
        icon: "lucide:trending-down",
        details: "Exponential LR Decay",
      },
      {
        type: "cosineannealinglr",
        label: "CosineAnnealingLR",
        icon: "lucide:waves",
        details: "Cosine Annealing LR",
      },
      {
        type: "reducelronplateau",
        label: "ReduceLROnPlateau",
        icon: "lucide:trending-down",
        details: "Reduce LR on Plateau",
      },
    ],
  },
];

const Sidebar: React.FC = () => {
  const onDragStart = (
    event: React.DragEvent,
    node: (typeof nodeTypesByCategory)[0]["nodes"][0],
  ) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(node));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card className="w-64 m-4">
      <CardBody>
        <h2 className="text-lg font-semibold mb-4">Node Types</h2>
        <div className="flex flex-col gap-2">
          {nodeTypesByCategory.map((category) => (
            <div key={category.category} className="mb-2">
              <div className="text-xs font-bold text-gray-500 mb-1">
                {category.category}
              </div>
              <div className="flex flex-col gap-1">
                {category.nodes.map((node) => (
                  <Button
                    key={node.type}
                    draggable
                    className="justify-start"
                    variant="flat"
                    onDragStart={(event) => onDragStart(event, node)}
                  >
                    <Icon className="mr-2" icon={node.icon} />
                    {node.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default Sidebar;
