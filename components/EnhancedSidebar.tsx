import React, { useState, useMemo } from "react";
import { Badge, Card, CardBody, Button, Input, Chip, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  AlertCircle,
  Brain,
  ChevronDown,
  ChevronUp,
  Check,
  Database,
  Filter,
  Layers,
  Home,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/router";

import DatasetManager from "@/components/DatasetManager";
import { usePlexusStore } from "@/store/plexusStore";

// ---- Inline dataset panel shown in the sidebar Data tab ----
function DatasetSidebarPanel() {
  const [modalOpen, setModalOpen] = useState(false);
  const datasets = usePlexusStore((s) => s.datasets);
  const selectedDatasetId = usePlexusStore((s) => s.selectedDatasetId);
  const selectDataset = usePlexusStore((s) => s.selectDataset);

  return (
    <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-14rem)]">
      <Button
        className="w-full"
        color="primary"
        size="sm"
        startContent={<Plus className="w-3.5 h-3.5" />}
        variant="flat"
        onPress={() => setModalOpen(true)}
      >
        Manage Datasets
      </Button>

      {datasets.length === 0 ? (
        <div className="text-center py-8">
          <Database className="w-8 h-8 text-default-300 mx-auto mb-2" />
          <p className="text-xs text-default-500">No datasets uploaded yet.</p>
          <p className="text-xs text-default-400 mt-1">
            Click &ldquo;Manage Datasets&rdquo; to upload a CSV or image folder.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {datasets.map((d) => (
            <button
              key={d.id}
              className={`w-full text-left p-2 rounded-lg border text-xs transition-all ${
                d.id === selectedDatasetId
                  ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                  : "border-default-200 hover:border-default-400 hover:bg-default-50"
              }`}
              onClick={() => selectDataset(d.id === selectedDatasetId ? null : d.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate max-w-[12rem]">{d.name}</span>
                {d.id === selectedDatasetId && (
                  <Check className="w-3 h-3 text-primary shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-default-500 mt-0.5">
                <span>{d.type}</span>
                {d.row_count > 0 && <span>{d.row_count.toLocaleString()} rows</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <DatasetManager isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

const nodeTypesByCategory = [
  {
    category: "Input/Output",
    nodes: [
      {
        type: "inputLayer",
        label: "Input Layer",
        icon: "lucide:box",
        details: "Neural Network Input Layer",
        keywords: ["input", "data", "features", "entry"],
        popularity: 95,
      },
      {
        type: "outputLayer",
        label: "Output Layer",
        icon: "lucide:arrow-right",
        details: "Neural Network Output Layer",
        keywords: ["output", "prediction", "result", "final"],
        popularity: 95,
      },
      {
        type: "textInput",
        label: "Text Input",
        icon: "lucide:type",
        details: "Text Input Node",
        keywords: ["text", "string", "input", "words"],
        popularity: 80,
      },
      {
        type: "textOutput",
        label: "Text Output",
        icon: "lucide:file-text",
        details: "Text Output Node",
        keywords: ["text", "output", "result", "words"],
        popularity: 70,
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
        keywords: ["dense", "fully connected", "fc", "linear"],
        popularity: 90,
      },
      {
        type: "hidden",
        label: "Hidden",
        icon: "lucide:layers",
        details: "Hidden Layer",
        keywords: ["hidden", "intermediate", "middle"],
        popularity: 75,
      },
      {
        type: "flatten",
        label: "Flatten",
        icon: "lucide:align-horizontal-space-around",
        details: "Flatten Layer",
        keywords: ["flatten", "reshape", "1d", "vector"],
        popularity: 85,
      },
      {
        type: "reshape",
        label: "Reshape",
        icon: "lucide:shuffle",
        details: "Reshape Layer",
        keywords: ["reshape", "dimensions", "tensor", "shape"],
        popularity: 60,
      },
      {
        type: "embedding",
        label: "Embedding",
        icon: "lucide:layers",
        details: "Embedding Layer",
        keywords: ["embedding", "word", "vector", "nlp"],
        popularity: 80,
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
        keywords: ["convolution", "cnn", "filters", "kernel", "image"],
        popularity: 85,
      },
      {
        type: "maxpool",
        label: "Max Pool",
        icon: "lucide:square",
        details: "Max Pooling Layer",
        keywords: ["pooling", "downsample", "max", "spatial"],
        popularity: 80,
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
        keywords: ["batch", "normalization", "bn", "stable"],
        popularity: 85,
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
        keywords: ["dropout", "regularization", "overfitting", "random"],
        popularity: 90,
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
        keywords: ["activation", "function", "nonlinear", "relu", "sigmoid"],
        popularity: 70,
      },
      {
        type: "softmax",
        label: "Softmax",
        icon: "lucide:divide",
        details: "Softmax Layer",
        keywords: ["softmax", "probability", "classification", "output"],
        popularity: 75,
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
        keywords: ["recurrent", "rnn", "sequence", "temporal"],
        popularity: 60,
      },
      {
        type: "lstm",
        label: "LSTM",
        icon: "lucide:activity",
        details: "LSTM Layer",
        keywords: ["lstm", "memory", "sequence", "long", "short", "term"],
        popularity: 85,
      },
      {
        type: "gru",
        label: "GRU",
        icon: "lucide:git-merge",
        details: "GRU Layer",
        keywords: ["gru", "gate", "recurrent", "unit"],
        popularity: 70,
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
        keywords: ["add", "sum", "merge", "combine"],
        popularity: 60,
      },
      {
        type: "concat",
        label: "Concatenate",
        icon: "lucide:link",
        details: "Concatenate Layer",
        keywords: ["concatenate", "concat", "merge", "join"],
        popularity: 65,
      },
    ],
  },
  {
    category: "Training",
    nodes: [
      {
        type: "training_config",
        label: "Training Config",
        icon: "lucide:settings",
        details: "Training Configuration Hub",
        keywords: ["training", "config", "parameters", "hyperparameters"],
        popularity: 50,
      },
      {
        type: "metrics",
        label: "Metrics",
        icon: "lucide:bar-chart-3",
        details: "Training Metrics",
        keywords: ["metrics", "accuracy", "loss", "evaluation"],
        popularity: 55,
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
        keywords: ["adam", "optimizer", "adaptive", "momentum"],
        popularity: 90,
      },
      {
        type: "sgd",
        label: "SGD",
        icon: "lucide:trending-up",
        details: "Stochastic Gradient Descent",
        keywords: ["sgd", "gradient", "descent", "stochastic"],
        popularity: 80,
      },
      {
        type: "rmsprop",
        label: "RMSprop",
        icon: "lucide:activity",
        details: "RMSprop Optimizer",
        keywords: ["rmsprop", "optimizer", "root", "mean", "square"],
        popularity: 70,
      },
      {
        type: "adagrad",
        label: "AdaGrad",
        icon: "lucide:target",
        details: "Adaptive Gradient Algorithm",
        keywords: ["adagrad", "adaptive", "gradient", "learning", "rate"],
        popularity: 60,
      },
      {
        type: "adamw",
        label: "AdamW",
        icon: "lucide:zap",
        details: "Adam with Weight Decay",
        keywords: ["adamw", "adam", "weight", "decay", "regularization"],
        popularity: 75,
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
        keywords: ["cnn", "convolutional", "vision", "image"],
        popularity: 85,
      },
      {
        type: "rnn",
        label: "RNN",
        icon: "lucide:repeat",
        details: "Recurrent Neural Network",
        keywords: ["rnn", "recurrent", "sequence", "temporal"],
        popularity: 70,
      },
      {
        type: "autoencoder",
        label: "AutoEncoder",
        icon: "lucide:compress",
        details: "Autoencoder Network",
        keywords: ["autoencoder", "encoder", "decoder", "compression"],
        popularity: 65,
      },
      {
        type: "gan",
        label: "GAN",
        icon: "lucide:shuffle",
        details: "Generative Adversarial Network",
        keywords: ["gan", "generative", "adversarial", "generate"],
        popularity: 70,
      },
      {
        type: "transformer",
        label: "Transformer",
        icon: "lucide:cpu",
        details: "Transformer Architecture",
        keywords: ["transformer", "attention", "bert", "gpt", "nlp"],
        popularity: 95,
      },
      {
        type: "resnet",
        label: "ResNet",
        icon: "lucide:layers-2",
        details: "Residual Network",
        keywords: ["resnet", "residual", "skip", "connection", "deep"],
        popularity: 80,
      },
      {
        type: "vae",
        label: "VAE",
        icon: "lucide:shuffle",
        details: "Variational Autoencoder",
        keywords: ["vae", "variational", "autoencoder", "latent"],
        popularity: 60,
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
        keywords: ["crossentropy", "loss", "classification", "entropy"],
        popularity: 90,
      },
      {
        type: "mse",
        label: "MSE",
        icon: "lucide:square",
        details: "Mean Squared Error",
        keywords: ["mse", "mean", "squared", "error", "regression"],
        popularity: 85,
      },
      {
        type: "mae",
        label: "MAE",
        icon: "lucide:triangle",
        details: "Mean Absolute Error",
        keywords: ["mae", "mean", "absolute", "error", "regression"],
        popularity: 70,
      },
      {
        type: "bce",
        label: "BCE",
        icon: "lucide:binary",
        details: "Binary Cross Entropy",
        keywords: ["bce", "binary", "cross", "entropy", "sigmoid"],
        popularity: 80,
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
        keywords: ["steplr", "step", "learning", "rate", "scheduler"],
        popularity: 70,
      },
      {
        type: "exponentiallr",
        label: "ExponentialLR",
        icon: "lucide:trending-down",
        details: "Exponential LR Decay",
        keywords: ["exponential", "decay", "learning", "rate"],
        popularity: 60,
      },
      {
        type: "cosineannealinglr",
        label: "CosineAnnealingLR",
        icon: "lucide:waves",
        details: "Cosine Annealing LR",
        keywords: ["cosine", "annealing", "learning", "rate", "warm"],
        popularity: 75,
      },
      {
        type: "reducelronplateau",
        label: "ReduceLROnPlateau",
        icon: "lucide:trending-down",
        details: "Reduce LR on Plateau",
        keywords: ["reduce", "plateau", "learning", "rate", "adaptive"],
        popularity: 80,
      },
    ],
  },
  {
    category: "Data Sources",
    nodes: [
      {
        type: "dataset",
        label: "Dataset",
        icon: "lucide:database",
        details: "Attach an uploaded dataset to the graph",
        keywords: ["dataset", "data", "csv", "file", "input", "source"],
        popularity: 95,
      },
    ],
  },
  {
    category: "Preprocessing",
    nodes: [
      {
        type: "normalize",
        label: "Normalize",
        icon: "lucide:sliders-horizontal",
        details: "Scale values to 0–1 range",
        keywords: ["normalize", "scale", "min-max", "0-1", "preprocessing"],
        popularity: 90,
      },
      {
        type: "dropNulls",
        label: "Drop Nulls",
        icon: "lucide:eraser",
        details: "Remove rows with missing values",
        keywords: ["drop", "null", "missing", "nan", "clean"],
        popularity: 85,
      },
      {
        type: "oneHotEncode",
        label: "One-Hot Encode",
        icon: "lucide:binary",
        details: "Encode categorical columns as binary vectors",
        keywords: ["one-hot", "encode", "categorical", "dummy"],
        popularity: 85,
      },
      {
        type: "embedEncode",
        label: "Embed Encode",
        icon: "lucide:vector",
        details: "Map high-cardinality column to embedding vector",
        keywords: ["embed", "embedding", "encode", "high-cardinality"],
        popularity: 70,
      },
      {
        type: "scale",
        label: "Standard Scale",
        icon: "lucide:ruler",
        details: "Standardise columns (mean=0, std=1)",
        keywords: ["scale", "standardise", "zscore", "mean", "std"],
        popularity: 80,
      },
    ],
  },
  {
    category: "Visualisation",
    nodes: [
      {
        type: "lossCurve",
        label: "Loss Curve",
        icon: "lucide:line-chart",
        details: "Live train/val loss chart",
        keywords: ["loss", "curve", "chart", "training", "visualise"],
        popularity: 90,
      },
      {
        type: "gradientFlow",
        label: "Gradient Flow",
        icon: "lucide:waves",
        details: "Gradient norm per layer",
        keywords: ["gradient", "flow", "norm", "vanishing", "exploding"],
        popularity: 75,
      },
      {
        type: "confMatrix",
        label: "Confusion Matrix",
        icon: "lucide:grid-3x3",
        details: "Prediction confusion matrix",
        keywords: ["confusion", "matrix", "classification", "accuracy"],
        popularity: 80,
      },
      {
        type: "predTable",
        label: "Predictions Table",
        icon: "lucide:table",
        details: "Sample predictions vs ground truth",
        keywords: ["predictions", "table", "output", "results"],
        popularity: 65,
      },
      {
        type: "activationHeatmap",
        label: "Activation Heatmap",
        icon: "lucide:flame",
        details: "Layer activation heatmap",
        keywords: ["activation", "heatmap", "feature", "intermediate"],
        popularity: 65,
      },
    ],
  },
  {
    category: "Output / Test",
    nodes: [
      {
        type: "testModel",
        label: "Test Model",
        icon: "lucide:flask-conical",
        details: "Evaluate model on test data",
        keywords: ["test", "evaluate", "metrics", "benchmark"],
        popularity: 80,
      },
      {
        type: "exportCode",
        label: "Export Code",
        icon: "lucide:code-2",
        details: "Generate Python training script",
        keywords: ["export", "code", "python", "script", "generate"],
        popularity: 85,
      },
      {
        type: "apiDeploy",
        label: "API Deploy",
        icon: "lucide:cloud-upload",
        details: "Generate FastAPI serving endpoint + Dockerfile",
        keywords: ["api", "deploy", "docker", "serve", "inference"],
        popularity: 70,
      },
    ],
  },
];

interface EnhancedSidebarProps {
  onNodeAdd?: (nodeType: string) => void;
}

const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({ onNodeAdd }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"layers" | "data" | "agents">("layers");

  // Plexus store
  const agentNotifications = usePlexusStore((s) => s.agentNotifications);
  const dismissNotification = usePlexusStore((s) => s.dismissNotification);
  const selectedDatasetId = usePlexusStore((s) => s.selectedDatasetId);
  const activeNotifications = agentNotifications.filter((n) => !n.dismissed);

  // Flatten all nodes for easier searching
  const allNodes = useMemo(() => {
    return nodeTypesByCategory.flatMap((category) =>
      category.nodes.map((node) => ({ ...node, category: category.category })),
    );
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [
      "all",
      ...nodeTypesByCategory.map((cat) => cat.category.toLowerCase()),
    ];

    return cats;
  }, []);

  // Show limited categories by default, all when expanded
  const displayedCategories = useMemo(() => {
    if (showAllCategories) return categories;

    return categories.slice(0, 6); // Show first 6 categories
  }, [categories, showAllCategories]);

  // Filter nodes based on search, category, and favorites
  const filteredNodes = useMemo(() => {
    let filtered = allNodes;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      filtered = filtered.filter(
        (node) =>
          node.label.toLowerCase().includes(query) ||
          node.details.toLowerCase().includes(query) ||
          node.type.toLowerCase().includes(query) ||
          node.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query),
          ),
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (node) => node.category.toLowerCase() === selectedCategory,
      );
    }

    // Sort by popularity and favorites
    return filtered.sort((a, b) => {
      // Favorites first
      const aIsFav = favorites.has(a.type);
      const bIsFav = favorites.has(b.type);

      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;

      // Then by popularity
      return b.popularity - a.popularity;
    });
  }, [searchQuery, selectedCategory, showOnlyFavorites, favorites, allNodes]);

  // Group filtered nodes by category for display
  const groupedFilteredNodes = useMemo(() => {
    const groups: { [key: string]: typeof allNodes } = {};

    filteredNodes.forEach((node) => {
      if (!groups[node.category]) {
        groups[node.category] = [];
      }
      groups[node.category].push(node);
    });

    return groups;
  }, [filteredNodes]);

  const onDragStart = (event: React.DragEvent, node: (typeof allNodes)[0]) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(node));
    event.dataTransfer.effectAllowed = "move";

    // Add to recently used
    setRecentlyUsed((prev) => {
      const updated = [node.type, ...prev.filter((t) => t !== node.type)].slice(
        0,
        5,
      );

      return updated;
    });

    onNodeAdd?.(node.type);
  };

  const toggleFavorite = (nodeType: string) => {
    setFavorites((prev) => {
      const updated = new Set(prev);

      if (updated.has(nodeType)) {
        updated.delete(nodeType);
      } else {
        updated.add(nodeType);
      }

      return updated;
    });
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setShowOnlyFavorites(false);
  };

  return (
    <Card className="w-80 m-4 h-screen max-h-[calc(100vh-2rem)] overflow-hidden">
      <CardBody className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                className="text-default-500 hover:text-primary"
                size="sm"
                variant="light"
                onPress={() => router.push("/dashboard")}
              >
                <Home className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold">Plexus</h2>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip content="Show only favorites">
                {/* <Button
                  isIconOnly
                  size="sm"
                  variant={showOnlyFavorites ? "solid" : "light"}
                  color={showOnlyFavorites ? "warning" : "default"}
                  onPress={() => setShowOnlyFavorites(!showOnlyFavorites)}
                >
                  <Star className="w-4 h-4" />
                </Button> */}
              </Tooltip>
              {sidebarTab === "layers" && (
                <Chip size="sm" variant="flat">
                  {filteredNodes.length}
                </Chip>
              )}
            </div>
          </div>

          {/* Sidebar Tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-default-100">
            {(
              [
                { key: "layers", label: "Layers", icon: <Layers className="w-3.5 h-3.5" /> },
                { key: "data", label: "Data", icon: <Database className="w-3.5 h-3.5" /> },
                {
                  key: "agents",
                  label: "Agents",
                  icon: <Brain className="w-3.5 h-3.5" />,
                  badge: activeNotifications.length,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  sidebarTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-default-500 hover:text-foreground"
                }`}
                onClick={() => setSidebarTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
                {"badge" in tab && tab.badge > 0 && (
                  <span className="w-4 h-4 rounded-full bg-secondary text-secondary-foreground text-[10px] flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ===== LAYERS TAB ===== */}
          {sidebarTab === "layers" && (
            <>
          {/* Search */}
          <div className="relative">
            <Input
              classNames={{
                input: "text-sm",
              }}
              endContent={
                (searchQuery ||
                  selectedCategory !== "all" ||
                  showOnlyFavorites) && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={clearSearch}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )
              }
              placeholder="Search nodes..."
              startContent={<Search className="w-4 h-4 text-default-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {displayedCategories.map((category) => (
                <Chip
                  key={category}
                  className="cursor-pointer capitalize"
                  color={selectedCategory === category ? "primary" : "default"}
                  size="sm"
                  variant={selectedCategory === category ? "solid" : "flat"}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === "all"
                    ? "All"
                    : category.replace(/([A-Z])/g, " $1").trim()}
                </Chip>
              ))}
            </div>

            {categories.length > 6 && (
              <Button
                className="h-6 text-xs"
                size="sm"
                startContent={
                  showAllCategories ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )
                }
                variant="light"
                onPress={() => setShowAllCategories(!showAllCategories)}
              >
                {showAllCategories
                  ? "Show Less"
                  : `Show ${categories.length - 6} More`}
              </Button>
            )}
          </div>

          {/* Recently Used
          {recentlyUsed.length > 0 && !searchQuery && selectedCategory === "all" && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-default-500" />
                <span className="text-sm font-medium text-default-700">Recently Used</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {recentlyUsed.map((nodeType) => {
                  const node = allNodes.find(n => n.type === nodeType);
                  if (!node) return null;
                  
                  return (
                    <Button
                      key={nodeType}
                      size="sm"
                      variant="flat"
                      draggable
                      onDragStart={(event) => onDragStart(event, node)}
                      startContent={<Icon icon={node.icon} className="w-3 h-3" />}
                    >
                      {node.label}
                    </Button>
                  );
                })}
              </div>
              <Divider className="my-3" />
            </div>
          )} */}

          {/* Nodes List */}
          <div className="space-y-4 overflow-y-auto max-h-fit">
            {Object.entries(groupedFilteredNodes).map(([category, nodes]) => (
              <div key={category} className="space-y-2">
                <div className="text-xs font-bold text-default-500 uppercase tracking-wide">
                  {category}
                </div>
                <div className="space-y-1">
                  {nodes.map((node) => (
                    <div key={node.type} className="flex items-center gap-2">
                      <Button
                        draggable
                        className="justify-start flex-1 h-auto py-2"
                        variant="flat"
                        onDragStart={(event) => onDragStart(event, node)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Icon
                            className="w-4 h-4 flex-shrink-0"
                            icon={node.icon}
                          />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium">
                              {node.label}
                            </div>
                            <div className="text-xs text-default-500 truncate">
                              {node.details}
                            </div>
                          </div>
                        </div>
                      </Button>
                      {/* <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => toggleFavorite(node.type)}
                      >
                        {favorites.has(node.type) ? (
                          <Star className="w-4 h-4 text-warning fill-warning" />
                        ) : (
                          <StarOff className="w-4 h-4 text-default-400" />
                        )}
                      </Button> */}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredNodes.length === 0 && (
              <div className="text-center py-8">
                <Filter className="w-8 h-8 text-default-300 mx-auto mb-2" />
                <p className="text-sm text-default-500">
                  No nodes match your criteria.
                </p>
                <Button
                  className="mt-2"
                  size="sm"
                  variant="flat"
                  onPress={clearSearch}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
            </>
          )}

          {/* ===== DATA TAB ===== */}
          {sidebarTab === "data" && (
            <DatasetSidebarPanel />
          )}

          {/* ===== AGENTS TAB ===== */}
          {sidebarTab === "agents" && (
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-14rem)]">
              {activeNotifications.length === 0 ? (
                <div className="text-center py-10">
                  <Sparkles className="w-8 h-8 text-default-300 mx-auto mb-2" />
                  <p className="text-sm text-default-500">
                    No agent suggestions yet.
                  </p>
                  <p className="text-xs text-default-400 mt-1">
                    Upload a dataset and run an agent to see suggestions here.
                  </p>
                </div>
              ) : (
                activeNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      n.type === "error"
                        ? "border-danger-200 bg-danger-50"
                        : n.type === "warning"
                          ? "border-warning-200 bg-warning-50"
                          : "border-secondary-200 bg-secondary-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {n.type === "error" ? (
                          <AlertCircle className="w-3.5 h-3.5 text-danger" />
                        ) : n.type === "warning" ? (
                          <AlertCircle className="w-3.5 h-3.5 text-warning" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-secondary" />
                        )}
                        <span className="font-semibold text-default-700">
                          {n.agentName}
                        </span>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => dismissNotification(n.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-default-600 leading-relaxed">{n.message}</p>
                    <p className="text-default-400">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default EnhancedSidebar;
