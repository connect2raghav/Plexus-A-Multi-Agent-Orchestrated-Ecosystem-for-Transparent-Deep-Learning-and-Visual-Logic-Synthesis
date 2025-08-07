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

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: "basics" | "cnn" | "rnn" | "transformers" | "deployment";
  thumbnail: string;
  videoUrl?: string;
  articleUrl?: string;
  completed: boolean;
  rating: number;
  views: number;
}

interface CommunityModel {
  id: string;
  name: string;
  author: string;
  description: string;
  category: string;
  framework: "tensorflow" | "pytorch" | "both";
  downloads: number;
  stars: number;
  lastUpdated: Date;
  tags: string[];
  thumbnail?: string;
  verified: boolean;
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
      id: "new-project",
      title: "New Project",
      description: "Start building a neural network from scratch",
      icon: "lucide:plus",
      color: "primary",
      action: () => router.push("/neuralnetwork"),
    },
    {
      id: "browse-templates",
      title: "Browse Templates", 
      description: "Explore pre-built neural network architectures",
      icon: "lucide:book-open",
      color: "secondary",
      action: () => router.push("/neuralnetwork?tab=templates"),
      badge: "50+ templates",
    },
    {
      id: "import-project",
      title: "Import Project",
      description: "Load a project from file or GitHub",
      icon: "lucide:download",
      color: "success",
      action: () => {},
    },
    {
      id: "tutorials",
      title: "Learn & Practice",
      description: "Interactive tutorials and examples",
      icon: "lucide:graduation-cap",
      color: "warning",
      action: () => setSelectedTab("tutorials"),
      badge: "New",
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

  const tutorials: Tutorial[] = [
    {
      id: "neural-basics",
      title: "Neural Network Fundamentals",
      description: "Learn the basics of neurons, layers, and forward propagation",
      duration: "25 min",
      difficulty: "beginner",
      category: "basics",
      thumbnail: "/api/placeholder/300/200",
      videoUrl: "https://youtube.com/watch?v=example1",
      completed: true,
      rating: 4.8,
      views: 25400,
    },
    {
      id: "cnn-intro",
      title: "Convolutional Neural Networks",
      description: "Build your first CNN for image classification",
      duration: "45 min", 
      difficulty: "intermediate",
      category: "cnn",
      thumbnail: "/api/placeholder/300/200",
      videoUrl: "https://youtube.com/watch?v=example2",
      completed: false,
      rating: 4.9,
      views: 18200,
    },
    {
      id: "lstm-text",
      title: "Text Analysis with LSTMs",
      description: "Process sequential data with recurrent networks",
      duration: "38 min",
      difficulty: "intermediate", 
      category: "rnn",
      thumbnail: "/api/placeholder/300/200",
      videoUrl: "https://youtube.com/watch?v=example3",
      completed: false,
      rating: 4.7,
      views: 15600,
    },
    {
      id: "transformer-attention",
      title: "Attention Mechanisms & Transformers",
      description: "Modern NLP with attention and transformer architectures",
      duration: "52 min",
      difficulty: "advanced",
      category: "transformers", 
      thumbnail: "/api/placeholder/300/200",
      videoUrl: "https://youtube.com/watch?v=example4",
      completed: false,
      rating: 4.9,
      views: 22100,
    },
  ];

  const communityModels: CommunityModel[] = [
    {
      id: "resnet50-pretrained",
      name: "ResNet-50 Image Classifier",
      author: "AI Community",
      description: "Pre-trained ResNet-50 for transfer learning on custom image datasets",
      category: "Computer Vision",
      framework: "tensorflow",
      downloads: 12400,
      stars: 89,
      lastUpdated: new Date("2025-08-05"),
      tags: ["transfer learning", "computer vision", "pre-trained"],
      verified: true,
    },
    {
      id: "bert-sentiment",
      name: "BERT Sentiment Analyzer",
      author: "NLP Experts",
      description: "Fine-tuned BERT model for sentiment analysis in multiple languages",
      category: "Natural Language",
      framework: "pytorch",
      downloads: 8750,
      stars: 156,
      lastUpdated: new Date("2025-08-03"),
      tags: ["bert", "sentiment", "multilingual"],
      verified: true,
    },
    {
      id: "stock-lstm",
      name: "Stock Price LSTM",
      author: "FinTech AI",
      description: "LSTM model for stock price prediction with technical indicators",
      category: "Time Series",
      framework: "both",
      downloads: 5230,
      stars: 67,
      lastUpdated: new Date("2025-08-01"),
      tags: ["lstm", "finance", "prediction"],
      verified: false,
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-default-500">Projects</p>
                <p className="text-xl font-bold">{stats.totalProjects}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 rounded-lg">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-default-500">Active</p>
                <p className="text-xl font-bold">{stats.recentActivity}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-100 rounded-lg">
                <Target className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-default-500">Nodes</p>
                <p className="text-xl font-bold">{stats.totalNodes}</p>
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
                <p className="text-sm text-default-500">Deployed</p>
                <p className="text-xl font-bold">{stats.modelsDeployed}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-danger-100 rounded-lg">
                <Heart className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-sm text-default-500">Favorites</p>
                <p className="text-xl font-bold">{stats.favoriteTemplates}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-default-500">Learned</p>
                <p className="text-xl font-bold">{stats.completedTutorials}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Actions</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Card 
                key={action.id}
                isPressable
                className="hover:shadow-lg transition-shadow"
                onPress={action.action}
              >
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 bg-${action.color}-100 rounded-lg`}>
                      <Icon icon={action.icon} className={`w-5 h-5 text-${action.color}`} />
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

  const renderTutorials = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Learning Path</h3>
          <p className="text-default-500">Interactive tutorials and courses</p>
        </div>
        <div className="flex gap-2">
          <Select
            placeholder="Category"
            className="w-32"
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="basics">Basics</SelectItem>
            <SelectItem key="cnn">CNN</SelectItem>
            <SelectItem key="rnn">RNN</SelectItem>
            <SelectItem key="transformers">Transformers</SelectItem>
          </Select>
          <Select
            placeholder="Difficulty"
            className="w-32"
          >
            <SelectItem key="all">All Levels</SelectItem>
            <SelectItem key="beginner">Beginner</SelectItem>
            <SelectItem key="intermediate">Intermediate</SelectItem>
            <SelectItem key="advanced">Advanced</SelectItem>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutorials.map((tutorial) => (
          <Card key={tutorial.id} className="hover:shadow-lg transition-shadow">
            <CardBody className="p-0">
              <div className="relative">
                <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                  <Video className="w-12 h-12 text-primary" />
                </div>
                {tutorial.completed && (
                  <div className="absolute top-2 right-2 bg-success text-white rounded-full p-1">
                    <Icon icon="lucide:check" className="w-4 h-4" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {tutorial.duration}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Chip 
                    size="sm" 
                    color={getDifficultyColor(tutorial.difficulty)}
                    variant="flat"
                  >
                    {tutorial.difficulty}
                  </Chip>
                  <div className="flex items-center gap-1 text-xs text-default-500">
                    <Star className="w-3 h-3 fill-warning text-warning" />
                    <span>{tutorial.rating}</span>
                  </div>
                </div>
                
                <h4 className="font-semibold mb-2">{tutorial.title}</h4>
                <p className="text-sm text-default-600 mb-3">{tutorial.description}</p>
                
                <div className="flex items-center justify-between text-xs text-default-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{tutorial.views.toLocaleString()} views</span>
                  </div>
                  <span className="capitalize">{tutorial.category}</span>
                </div>

                <Button
                  color="primary"
                  variant={tutorial.completed ? "flat" : "solid"}
                  size="sm"
                  className="w-full"
                  startContent={tutorial.completed ? <Icon icon="lucide:check" className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                >
                  {tutorial.completed ? "Review" : "Start Learning"}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCommunity = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Community Models</h3>
          <p className="text-default-500">Pre-trained models shared by the community</p>
        </div>
        <Button 
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
        >
          Share Model
        </Button>
      </div>

      <div className="space-y-4">
        {communityModels.map((model) => (
          <Card key={model.id} className="hover:shadow-lg transition-shadow">
            <CardBody className="p-4">
              <div className="flex items-start gap-4">
                <Avatar
                  name={model.author[0]}
                  className="bg-primary-100 text-primary"
                />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{model.name}</h4>
                        {model.verified && (
                          <Icon icon="lucide:check-circle" className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-default-500">by {model.author}</p>
                    </div>
                    <div className="flex gap-2">
                      <Chip size="sm" variant="flat" color="primary">
                        {model.framework}
                      </Chip>
                      <Chip size="sm" variant="flat">
                        {model.category}
                      </Chip>
                    </div>
                  </div>
                  
                  <p className="text-sm text-default-600 mt-2 mb-3">{model.description}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {model.tags.map((tag) => (
                      <Chip key={tag} size="sm" variant="flat">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-default-500">
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span>{model.downloads.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        <span>{model.stars}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{model.lastUpdated.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="flat">
                        <Star className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="flat">
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        color="primary"
                        startContent={<Download className="w-4 h-4" />}
                      >
                        Use Model
                      </Button>
                    </div>
                  </div>
                </div>
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
          
          <Tab 
            key="tutorials" 
            title={
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Tutorials
              </div>
            }
          >
            {renderTutorials()}
          </Tab>
          
          <Tab 
            key="community" 
            title={
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Community
              </div>
            }
          >
            {renderCommunity()}
          </Tab>
        </Tabs>
      </div>
    </DefaultLayout>
  );
};

export default DashboardPage;
