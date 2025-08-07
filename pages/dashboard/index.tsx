import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Progress,
  Avatar,
  Divider,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tabs,
  Tab,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Clock,
  Brain,
  Database,
  BookOpen,
  Github,
  ExternalLink,
  Play,
  Download,
  Star,
  Users,
  BarChart3,
  Zap,
  Globe,
  FileText,
  Video,
  Bookmark,
  Settings,
  Award,
  Target,
  Activity,
  Calendar,
  Eye,
  Heart,
  Share2,
  Code,
} from "lucide-react";

import DefaultLayout from "@/layouts/default";

interface ProjectStats {
  totalProjects: number;
  recentActivity: number;
  totalNodes: number;
  modelsDeployed: number;
  favoriteTemplates: number;
  completedTutorials: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "primary" | "secondary" | "success" | "warning" | "danger";
  action: () => void;
  badge?: string;
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  size: string;
  format: string;
  category: "vision" | "nlp" | "audio" | "tabular" | "time-series";
  difficulty: "beginner" | "intermediate" | "advanced";
  downloadUrl: string;
  tags: string[];
  samples: number;
  features?: number;
  license: string;
  popularity: number;
}



const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  
  // Mock data - In real app, this would come from API/localStorage
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 12,
    recentActivity: 8,
    totalNodes: 156,
    modelsDeployed: 3,
    favoriteTemplates: 5,
    completedTutorials: 7,
  });

  const [recentProjects, setRecentProjects] = useState([
    {
      id: "1",
      name: "Image Classifier CNN",
      lastModified: new Date("2025-08-06"),
      nodes: 8,
      framework: "tensorflow",
      category: "vision",
      status: "completed",
      accuracy: 94.2,
    },
    {
      id: "2", 
      name: "Sentiment Analysis LSTM",
      lastModified: new Date("2025-08-05"),
      nodes: 12,
      framework: "pytorch",
      category: "nlp",
      status: "training",
      accuracy: 87.5,
    },
    {
      id: "3",
      name: "Stock Price Predictor",
      lastModified: new Date("2025-08-04"),
      nodes: 6,
      framework: "tensorflow",
      category: "time-series",
      status: "draft",
      accuracy: null,
    },
  ]);

  const quickActions: QuickAction[] = [
    {
      id: "blank",
      title: "Blank Canvas",
      description: "Start from scratch with a custom architecture",
      icon: "lucide:plus",
      color: "primary",
      action: () => router.push("/neuralnetwork"),
    },
    {
      id: "feedforward",
      title: "Feedforward NN", 
      description: "Basic neural network for classification and regression",
      icon: "lucide:layers",
      color: "secondary",
      action: () => router.push("/neuralnetwork?template=feedforward"),
    },
    {
      id: "cnn",
      title: "CNN",
      description: "Convolutional Neural Network for image recognition",
      icon: "lucide:image",
      color: "success",
      action: () => router.push("/neuralnetwork?template=cnn"),
    },
    {
      id: "rnn",
      title: "RNN/LSTM",
      description: "Recurrent Neural Network for sequences and text",
      icon: "lucide:message-square",
      color: "warning",
      action: () => router.push("/neuralnetwork?template=rnn"),
    },
    {
      id: "autoencoder",
      title: "Autoencoder",
      description: "Compression and reconstruction networks",
      icon: "lucide:compress",
      color: "danger",
      action: () => router.push("/neuralnetwork?template=autoencoder"),
    },
    {
      id: "transformer",
      title: "Transformer",
      description: "Attention-based models for modern NLP",
      icon: "lucide:cpu",
      color: "secondary",
      action: () => router.push("/neuralnetwork?template=transformer"),
    },
  ];

  const datasets: Dataset[] = [
    {
      id: "mnist",
      name: "MNIST Handwritten Digits",
      description: "70,000 handwritten digit images for classification",
      size: "11.5 MB",
      format: "Images (28x28)",
      category: "vision",
      difficulty: "beginner",
      downloadUrl: "https://keras.io/api/datasets/mnist/",
      tags: ["classification", "computer vision", "beginner"],
      samples: 70000,
      features: 784,
      license: "Public Domain",
      popularity: 95,
    },
    {
      id: "cifar10",
      name: "CIFAR-10",
      description: "60,000 color images in 10 classes",
      size: "163 MB", 
      format: "Images (32x32x3)",
      category: "vision",
      difficulty: "intermediate",
      downloadUrl: "https://keras.io/api/datasets/cifar10/",
      tags: ["classification", "computer vision", "rgb"],
      samples: 60000,
      features: 3072,
      license: "MIT",
      popularity: 88,
    },
    {
      id: "imdb",
      name: "IMDB Movie Reviews",
      description: "50,000 movie reviews for sentiment analysis",
      size: "80 MB",
      format: "Text sequences",
      category: "nlp",
      difficulty: "intermediate", 
      downloadUrl: "https://keras.io/api/datasets/imdb/",
      tags: ["sentiment", "nlp", "text classification"],
      samples: 50000,
      license: "Academic Use",
      popularity: 82,
    },
    {
      id: "titanic",
      name: "Titanic Passenger Data",
      description: "Passenger data for survival prediction",
      size: "59 KB",
      format: "CSV",
      category: "tabular",
      difficulty: "beginner",
      downloadUrl: "https://www.kaggle.com/c/titanic/data",
      tags: ["classification", "structured data", "binary"],
      samples: 891,
      features: 12,
      license: "Open Data",
      popularity: 78,
    },
    {
      id: "bitcoin",
      name: "Bitcoin Price History",
      description: "Historical Bitcoin prices for time series prediction",
      size: "2.3 MB",
      format: "CSV time series",
      category: "time-series",
      difficulty: "advanced",
      downloadUrl: "https://www.coindesk.com/coindesk-api",
      tags: ["regression", "time series", "cryptocurrency"],
      samples: 365000,
      features: 7,
      license: "Commercial Use",
      popularity: 71,
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "success";
      case "intermediate": return "warning"; 
      case "advanced": return "danger";
      default: return "default";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "vision": return "lucide:eye";
      case "nlp": return "lucide:message-square";
      case "audio": return "lucide:headphones";
      case "tabular": return "lucide:table";
      case "time-series": return "lucide:trending-up";
      default: return "lucide:database";
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Neural Network Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Start Building</h3>
          <p className="text-default-500">Choose a neural network type to get started</p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Card 
                key={action.id}
                isPressable
                className="hover:shadow-lg transition-shadow"
                onPress={action.action}
              >
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-3 bg-${action.color}-100 rounded-lg`}>
                      <Icon icon={action.icon} className={`w-6 h-6 text-${action.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{action.title}</h4>
                        {action.badge && (
                          <Chip size="sm" color={action.color} variant="flat">
                            {action.badge}
                          </Chip>
                        )}
                      </div>
                      <p className="text-sm text-default-500 mt-1">{action.description}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Projects</h3>
            <Button 
              size="sm" 
              variant="flat" 
              onPress={() => router.push("/projects")}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center gap-4 p-3 bg-default-50 rounded-lg hover:bg-default-100 transition-colors cursor-pointer">
                <Avatar
                  icon={<Brain className="w-5 h-5" />}
                  className="bg-primary-100 text-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{project.name}</h4>
                    <Chip size="sm" variant="flat" color="primary">
                      {project.framework}
                    </Chip>
                    <Chip 
                      size="sm" 
                      variant="flat"
                      color={project.status === "completed" ? "success" : 
                             project.status === "training" ? "warning" : "default"}
                    >
                      {project.status}
                    </Chip>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-default-500">
                    <span>{project.nodes} nodes</span>
                    <span>{project.lastModified.toLocaleDateString()}</span>
                    {project.accuracy && (
                      <span className="text-success">{project.accuracy}% accuracy</span>
                    )}
                  </div>
                </div>
                <Button isIconOnly size="sm" variant="light">
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );

  const renderDatasets = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Datasets</h3>
          <p className="text-default-500">Curated datasets for training your models</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search datasets..."
            startContent={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select
            placeholder="Category"
            className="w-32"
            selectedKeys={[filterCategory]}
            onSelectionChange={(keys) => setFilterCategory(Array.from(keys)[0] as string)}
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="vision">Vision</SelectItem>
            <SelectItem key="nlp">NLP</SelectItem>
            <SelectItem key="tabular">Tabular</SelectItem>
            <SelectItem key="time-series">Time Series</SelectItem>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {datasets
          .filter(dataset => 
            (filterCategory === "all" || dataset.category === filterCategory) &&
            (searchQuery === "" || 
             dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             dataset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
          )
          .map((dataset) => (
            <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Icon icon={getCategoryIcon(dataset.category)} className="w-6 h-6 text-primary" />
                    <div>
                      <h4 className="font-semibold">{dataset.name}</h4>
                      <p className="text-sm text-default-500">{dataset.size}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Chip 
                      size="sm" 
                      color={getDifficultyColor(dataset.difficulty)}
                      variant="flat"
                    >
                      {dataset.difficulty}
                    </Chip>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-default-600 mb-3">{dataset.description}</p>
                
                <div className="space-y-2 text-xs text-default-500">
                  <div className="flex justify-between">
                    <span>Samples:</span>
                    <span>{dataset.samples.toLocaleString()}</span>
                  </div>
                  {dataset.features && (
                    <div className="flex justify-between">
                      <span>Features:</span>
                      <span>{dataset.features}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span>{dataset.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>License:</span>
                    <span>{dataset.license}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {dataset.tags.map((tag) => (
                    <Chip key={tag} size="sm" variant="flat">
                      {tag}
                    </Chip>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    startContent={<Download className="w-4 h-4" />}
                    className="flex-1"
                    onPress={() => window.open(dataset.downloadUrl, '_blank')}
                  >
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<ExternalLink className="w-4 h-4" />}
                    onPress={() => window.open(dataset.downloadUrl, '_blank')}
                  >
                    Info
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
      </div>
    </div>
  );

  return (
    <DefaultLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-default-500 mt-1">
              Welcome back! Manage your neural networks and explore new possibilities.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="flat"
              startContent={<Settings className="w-4 h-4" />}
            >
              Settings
            </Button>
            <Button
              color="primary"
              startContent={<Plus className="w-4 h-4" />}
              onPress={() => router.push("/neuralnetwork")}
            >
              New Project
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs 
          selectedKey={selectedTab} 
          onSelectionChange={(key) => setSelectedTab(key as string)}
          classNames={{
            tabList: "w-full",
          }}
        >
          <Tab 
            key="overview" 
            title={
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </div>
            }
          >
            {renderOverview()}
          </Tab>
          
          <Tab 
            key="datasets" 
            title={
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Datasets
              </div>
            }
          >
            {renderDatasets()}
          </Tab>
        </Tabs>
      </div>
    </DefaultLayout>
  );
};

export default DashboardPage;
