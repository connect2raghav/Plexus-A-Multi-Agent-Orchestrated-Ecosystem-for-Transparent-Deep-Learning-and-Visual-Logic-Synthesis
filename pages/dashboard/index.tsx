import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Avatar,
  Input,
  Select,
  SelectItem,
  useDisclosure,
  Tabs,
  Tab,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  Plus,
  Search,
  Brain,
  Database,
  ExternalLink,
  Download,
  BarChart3,
  Settings,
  Edit,
  Trash2,
} from "lucide-react";

import DefaultLayout from "@/layouts/default";
import ProjectStorage, { SavedProject } from "@/utils/projectStorage";
import SettingsModal from "@/components/SettingsModal";
import { NeoDLogo } from "@/components/NeoDLogo";

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
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load saved projects on component mount
  useEffect(() => {
    const projects = ProjectStorage.getAllProjects();

    setSavedProjects(projects);
  }, []);

  // Mock data - In real app, this would come from API/localStorage
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    recentActivity: 0,
    totalNodes: 0,
    modelsDeployed: 0,
    favoriteTemplates: 5,
    completedTutorials: 7,
  });

  // Update stats when projects change
  useEffect(() => {
    const totalProjects = savedProjects.length;
    const recentActivity = savedProjects.filter(
      (p) =>
        new Date().getTime() - p.lastModified.getTime() <
        7 * 24 * 60 * 60 * 1000,
    ).length;
    const totalNodes = savedProjects.reduce((sum, p) => sum + p.nodeCount, 0);
    const modelsDeployed = savedProjects.filter(
      (p) => p.status === "completed",
    ).length;

    setStats((prev) => ({
      ...prev,
      totalProjects,
      recentActivity,
      totalNodes,
      modelsDeployed,
    }));
  }, [savedProjects]);

  // Get recent projects from saved projects
  const recentProjects = savedProjects.slice(0, 3).map((project) => ({
    id: project.id,
    name: project.name,
    lastModified: project.lastModified,
    nodes: project.nodeCount,
    framework: project.framework,
    category: project.category,
    status: project.status,
    accuracy: project.accuracy || null,
    templateType: project.templateType,
  }));

  // Handle opening a project
  const handleOpenProject = (projectId: string) => {
    router.push(`/neuralnetwork?project=${projectId}`);
  };

  // Handle deleting a project
  const handleDeleteProject = (projectId: string) => {
    ProjectStorage.deleteProject(projectId);
    const updatedProjects = ProjectStorage.getAllProjects();

    setSavedProjects(updatedProjects);
  };

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
      case "beginner":
        return "success";
      case "intermediate":
        return "warning";
      case "advanced":
        return "danger";
      default:
        return "default";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "vision":
        return "lucide:eye";
      case "nlp":
        return "lucide:message-square";
      case "audio":
        return "lucide:headphones";
      case "tabular":
        return "lucide:table";
      case "time-series":
        return "lucide:trending-up";
      default:
        return "lucide:database";
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Neural Network Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Start Building</h3>
          <p className="text-default-500">
            Choose a neural network type to get started
          </p>
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
                      <Icon
                        className={`w-6 h-6 text-${action.color}`}
                        icon={action.icon}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{action.title}</h4>
                        {action.badge && (
                          <Chip color={action.color} size="sm" variant="flat">
                            {action.badge}
                          </Chip>
                        )}
                      </div>
                      <p className="text-sm text-default-500 mt-1">
                        {action.description}
                      </p>
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
          {recentProjects.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-default-300 mx-auto mb-4" />
              <p className="text-default-500 mb-4">No projects yet</p>
              <Button
                color="primary"
                variant="flat"
                onPress={() => router.push("/neuralnetwork")}
              >
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-4 p-3 bg-default-50 rounded-lg hover:bg-default-100 transition-colors"
                >
                  <Avatar
                    className="bg-primary-100 text-primary"
                    icon={<Brain className="w-5 h-5" />}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{project.name}</h4>
                      <Chip color="primary" size="sm" variant="flat">
                        {project.framework}
                      </Chip>
                      <Chip
                        color={
                          project.status === "completed"
                            ? "success"
                            : project.status === "training"
                              ? "warning"
                              : "default"
                        }
                        size="sm"
                        variant="flat"
                      >
                        {project.status}
                      </Chip>
                      {project.templateType && (
                        <Chip color="secondary" size="sm" variant="flat">
                          {project.templateType}
                        </Chip>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-default-500">
                      <span>{project.nodes} nodes</span>
                      <span>{project.lastModified.toLocaleDateString()}</span>
                      {project.accuracy && (
                        <span className="text-success">
                          {project.accuracy}% accuracy
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      isIconOnly
                      color="primary"
                      size="sm"
                      variant="light"
                      onPress={() => handleOpenProject(project.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      isIconOnly
                      color="danger"
                      size="sm"
                      variant="light"
                      onPress={() => handleDeleteProject(project.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );

  const renderDatasets = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Datasets</h3>
          <p className="text-default-500">
            Curated datasets for training your models
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            className="w-64"
            placeholder="Search datasets..."
            startContent={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            className="w-32"
            placeholder="Category"
            selectedKeys={[filterCategory]}
            onSelectionChange={(keys) =>
              setFilterCategory(Array.from(keys)[0] as string)
            }
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
          .filter(
            (dataset) =>
              (filterCategory === "all" ||
                dataset.category === filterCategory) &&
              (searchQuery === "" ||
                dataset.name
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                dataset.tags.some((tag) =>
                  tag.toLowerCase().includes(searchQuery.toLowerCase()),
                )),
          )
          .map((dataset) => (
            <Card
              key={dataset.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Icon
                      className="w-6 h-6 text-primary"
                      icon={getCategoryIcon(dataset.category)}
                    />
                    <div>
                      <h4 className="font-semibold">{dataset.name}</h4>
                      <p className="text-sm text-default-500">{dataset.size}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Chip
                      color={getDifficultyColor(dataset.difficulty)}
                      size="sm"
                      variant="flat"
                    >
                      {dataset.difficulty}
                    </Chip>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-sm text-default-600 mb-3">
                  {dataset.description}
                </p>

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
                    className="flex-1"
                    color="primary"
                    size="sm"
                    startContent={<Download className="w-4 h-4" />}
                    variant="flat"
                    onPress={() => window.open(dataset.downloadUrl, "_blank")}
                  >
                    Download
                  </Button>
                  <Button
                    size="sm"
                    startContent={<ExternalLink className="w-4 h-4" />}
                    variant="flat"
                    onPress={() => window.open(dataset.downloadUrl, "_blank")}
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
    <DefaultLayout title="Dashboard" description="Manage your neural networks and explore new possibilities">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <NeoDLogo showText={false} size="lg" />
            <div>
              <h1 className="text-3xl font-bold">NeoD Dashboard</h1>
              <p className="text-default-500 mt-1">
                Welcome back! Manage your neural networks and explore new
                possibilities.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              startContent={<Settings className="w-4 h-4" />}
              variant="flat"
              onPress={() => setIsSettingsOpen(true)}
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
          classNames={{
            tabList: "w-full",
          }}
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </DefaultLayout>
  );
};

export default DashboardPage;
