import React, { useState } from "react";
import { useRouter } from "next/router";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Progress,
} from "@heroui/react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  Share2,
  Star,
  Clock,
  Target,
  Folder,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Users,
  Globe,
} from "lucide-react";

import DefaultLayout from "@/layouts/default";
import { NeoDLogo } from "@/components/NeoDLogo";

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  lastModified: Date;
  nodes: number;
  edges: number;
  framework: "tensorflow" | "pytorch";
  category: "vision" | "nlp" | "audio" | "tabular" | "time-series" | "other";
  status: "draft" | "training" | "completed" | "deployed" | "error";
  accuracy?: number;
  loss?: number;
  epochs?: number;
  isStarred: boolean;
  tags: string[];
  thumbnail?: string;
  size: string;
  collaborators: string[];
  isPublic: boolean;
  lastTrainingTime?: Date;
  deploymentUrl?: string;
}

interface ProjectStats {
  total: number;
  draft: number;
  training: number;
  completed: number;
  deployed: number;
  starred: number;
}

const ProjectsPage: React.FC = () => {
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("lastModified");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFramework, setFilterFramework] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  // Mock data - In real app, this would come from API/localStorage
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "Image Classifier CNN",
      description:
        "Convolutional Neural Network for classifying images into 10 categories using CIFAR-10 dataset",
      createdAt: new Date("2025-08-01"),
      lastModified: new Date("2025-08-06"),
      nodes: 8,
      edges: 7,
      framework: "tensorflow",
      category: "vision",
      status: "completed",
      accuracy: 94.2,
      loss: 0.15,
      epochs: 50,
      isStarred: true,
      tags: ["cnn", "classification", "cifar10"],
      size: "12.5 MB",
      collaborators: ["john@example.com"],
      isPublic: false,
      lastTrainingTime: new Date("2025-08-06"),
    },
    {
      id: "2",
      name: "Sentiment Analysis LSTM",
      description:
        "LSTM network for analyzing sentiment in movie reviews using IMDB dataset",
      createdAt: new Date("2025-07-28"),
      lastModified: new Date("2025-08-05"),
      nodes: 12,
      edges: 11,
      framework: "pytorch",
      category: "nlp",
      status: "training",
      accuracy: 87.5,
      loss: 0.32,
      epochs: 25,
      isStarred: false,
      tags: ["lstm", "sentiment", "nlp"],
      size: "8.2 MB",
      collaborators: [],
      isPublic: true,
      lastTrainingTime: new Date("2025-08-05"),
    },
    {
      id: "3",
      name: "Stock Price Predictor",
      description:
        "Time series prediction model for stock prices using historical data and technical indicators",
      createdAt: new Date("2025-07-25"),
      lastModified: new Date("2025-08-04"),
      nodes: 6,
      edges: 5,
      framework: "tensorflow",
      category: "time-series",
      status: "draft",
      isStarred: false,
      tags: ["prediction", "finance", "time-series"],
      size: "3.1 MB",
      collaborators: ["alice@example.com", "bob@example.com"],
      isPublic: false,
    },
    {
      id: "4",
      name: "Face Recognition System",
      description:
        "Deep learning model for face recognition and verification using VGGFace dataset",
      createdAt: new Date("2025-07-20"),
      lastModified: new Date("2025-08-03"),
      nodes: 15,
      edges: 14,
      framework: "pytorch",
      category: "vision",
      status: "deployed",
      accuracy: 98.7,
      loss: 0.08,
      epochs: 100,
      isStarred: true,
      tags: ["face recognition", "verification", "deep learning"],
      size: "45.8 MB",
      collaborators: [],
      isPublic: true,
      lastTrainingTime: new Date("2025-08-02"),
      deploymentUrl: "https://api.example.com/face-recognition",
    },
    {
      id: "5",
      name: "Music Genre Classifier",
      description:
        "Audio classification model for identifying music genres from audio features",
      createdAt: new Date("2025-07-15"),
      lastModified: new Date("2025-08-01"),
      nodes: 10,
      edges: 9,
      framework: "tensorflow",
      category: "audio",
      status: "error",
      isStarred: false,
      tags: ["audio", "classification", "music"],
      size: "18.3 MB",
      collaborators: ["charlie@example.com"],
      isPublic: false,
    },
    {
      id: "6",
      name: "Customer Churn Prediction",
      description:
        "Binary classification model to predict customer churn using demographic and behavioral data",
      createdAt: new Date("2025-07-10"),
      lastModified: new Date("2025-07-30"),
      nodes: 7,
      edges: 6,
      framework: "pytorch",
      category: "tabular",
      status: "completed",
      accuracy: 91.3,
      loss: 0.22,
      epochs: 30,
      isStarred: false,
      tags: ["churn", "prediction", "binary classification"],
      size: "5.7 MB",
      collaborators: [],
      isPublic: true,
      lastTrainingTime: new Date("2025-07-29"),
    },
  ]);

  const stats: ProjectStats = {
    total: projects.length,
    draft: projects.filter((p) => p.status === "draft").length,
    training: projects.filter((p) => p.status === "training").length,
    completed: projects.filter((p) => p.status === "completed").length,
    deployed: projects.filter((p) => p.status === "deployed").length,
    starred: projects.filter((p) => p.isStarred).length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "training":
        return "warning";
      case "deployed":
        return "primary";
      case "error":
        return "danger";
      default:
        return "default";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "vision":
        return "👁️";
      case "nlp":
        return "💬";
      case "audio":
        return "🎵";
      case "tabular":
        return "📊";
      case "time-series":
        return "📈";
      default:
        return "🧠";
    }
  };

  const filteredAndSortedProjects = projects
    .filter((project) => {
      const matchesSearch =
        searchQuery === "" ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      const matchesStatus =
        filterStatus === "all" || project.status === filterStatus;
      const matchesFramework =
        filterFramework === "all" || project.framework === filterFramework;

      return matchesSearch && matchesStatus && matchesFramework;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case "lastModified":
          comparison = a.lastModified.getTime() - b.lastModified.getTime();
          break;
        case "accuracy":
          comparison = (a.accuracy || 0) - (b.accuracy || 0);
          break;
        case "size":
          comparison = parseFloat(a.size) - parseFloat(b.size);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleStarProject = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, isStarred: !p.isStarred } : p,
      ),
    );
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const handleDuplicateProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);

    if (project) {
      const newProject: Project = {
        ...project,
        id: Date.now().toString(),
        name: `${project.name} (Copy)`,
        createdAt: new Date(),
        lastModified: new Date(),
        status: "draft",
        accuracy: undefined,
        loss: undefined,
        epochs: undefined,
        isStarred: false,
        lastTrainingTime: undefined,
        deploymentUrl: undefined,
      };

      setProjects((prev) => [newProject, ...prev]);
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredAndSortedProjects.map((project) => (
        <Card
          key={project.id}
          isPressable
          className="hover:shadow-lg transition-shadow cursor-pointer group"
          onPress={() => router.push(`/neuralnetwork?project=${project.id}`)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="text-2xl">
                  {getCategoryIcon(project.category)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm line-clamp-1">
                    {project.name}
                  </h4>
                  <p className="text-xs text-default-500">
                    {project.framework}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => handleStarProject(project.id)}
                >
                  <Star
                    className={`w-4 h-4 ${project.isStarred ? "fill-warning text-warning" : "text-default-400"}`}
                  />
                </Button>
                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly size="sm" variant="light">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem
                      key="edit"
                      startContent={<Edit className="w-4 h-4" />}
                    >
                      Edit
                    </DropdownItem>
                    <DropdownItem
                      key="duplicate"
                      startContent={<Copy className="w-4 h-4" />}
                    >
                      Duplicate
                    </DropdownItem>
                    <DropdownItem
                      key="share"
                      startContent={<Share2 className="w-4 h-4" />}
                    >
                      Share
                    </DropdownItem>
                    <DropdownItem
                      key="download"
                      startContent={<Download className="w-4 h-4" />}
                    >
                      Export
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      startContent={<Trash2 className="w-4 h-4" />}
                    >
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          </CardHeader>

          <CardBody className="pt-0">
            <div className="space-y-3">
              <p className="text-xs text-default-600 line-clamp-2">
                {project.description}
              </p>

              <div className="flex items-center justify-between text-xs">
                <Chip
                  color={getStatusColor(project.status)}
                  size="sm"
                  variant="flat"
                >
                  {project.status}
                </Chip>
                <span className="text-default-500">{project.size}</span>
              </div>

              {project.accuracy && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Accuracy</span>
                    <span className="text-success">{project.accuracy}%</span>
                  </div>
                  <Progress
                    className="w-full"
                    color="success"
                    size="sm"
                    value={project.accuracy}
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-default-500">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span>{project.nodes} nodes</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{project.lastModified.toLocaleDateString()}</span>
                </div>
              </div>

              {project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 2).map((tag) => (
                    <Chip
                      key={tag}
                      className="text-xs"
                      size="sm"
                      variant="flat"
                    >
                      {tag}
                    </Chip>
                  ))}
                  {project.tags.length > 2 && (
                    <Chip className="text-xs" size="sm" variant="flat">
                      +{project.tags.length - 2}
                    </Chip>
                  )}
                </div>
              )}

              {project.collaborators.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-default-400" />
                  <span className="text-xs text-default-500">
                    {project.collaborators.length} collaborator
                    {project.collaborators.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {filteredAndSortedProjects.map((project) => (
        <Card
          key={project.id}
          isPressable
          className="hover:shadow-md transition-shadow cursor-pointer"
          onPress={() => router.push(`/neuralnetwork?project=${project.id}`)}
        >
          <CardBody className="p-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl">
                {getCategoryIcon(project.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold truncate">{project.name}</h4>
                  {project.isStarred && (
                    <Star className="w-4 h-4 fill-warning text-warning flex-shrink-0" />
                  )}
                  {project.isPublic && (
                    <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-default-600 line-clamp-1">
                  {project.description}
                </p>
              </div>

              <div className="flex items-center gap-6 text-sm text-default-500">
                <div className="text-center">
                  <div className="font-medium">{project.nodes}</div>
                  <div className="text-xs">Nodes</div>
                </div>

                <div className="text-center">
                  <div className="font-medium">{project.size}</div>
                  <div className="text-xs">Size</div>
                </div>

                {project.accuracy && (
                  <div className="text-center">
                    <div className="font-medium text-success">
                      {project.accuracy}%
                    </div>
                    <div className="text-xs">Accuracy</div>
                  </div>
                )}

                <div className="text-center">
                  <div className="font-medium">
                    {project.lastModified.toLocaleDateString()}
                  </div>
                  <div className="text-xs">Modified</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Chip
                  color={getStatusColor(project.status)}
                  size="sm"
                  variant="flat"
                >
                  {project.status}
                </Chip>

                <Chip size="sm" variant="flat">
                  {project.framework}
                </Chip>

                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly size="sm" variant="light">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem
                      key="edit"
                      startContent={<Edit className="w-4 h-4" />}
                    >
                      Edit
                    </DropdownItem>
                    <DropdownItem
                      key="duplicate"
                      startContent={<Copy className="w-4 h-4" />}
                    >
                      Duplicate
                    </DropdownItem>
                    <DropdownItem
                      key="share"
                      startContent={<Share2 className="w-4 h-4" />}
                    >
                      Share
                    </DropdownItem>
                    <DropdownItem
                      key="download"
                      startContent={<Download className="w-4 h-4" />}
                    >
                      Export
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      startContent={<Trash2 className="w-4 h-4" />}
                    >
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );

  return (
    <DefaultLayout
      description="Manage your neural network projects"
      title="Projects"
    >
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <NeoDLogo showText={false} size="md" />
            <div>
              <h1 className="text-2xl font-bold">NeoD Projects</h1>
              <p className="text-default-500">
                Manage your neural network projects
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              startContent={<Upload className="w-4 h-4" />}
              variant="flat"
            >
              Import
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardBody className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.total}
              </div>
              <div className="text-sm text-default-500">Total</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3 text-center">
              <div className="text-2xl font-bold text-default-500">
                {stats.draft}
              </div>
              <div className="text-sm text-default-500">Draft</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3 text-center">
              <div className="text-2xl font-bold text-warning">
                {stats.training}
              </div>
              <div className="text-sm text-default-500">Training</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3 text-center">
              <div className="text-2xl font-bold text-success">
                {stats.completed}
              </div>
              <div className="text-sm text-default-500">Completed</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.deployed}
              </div>
              <div className="text-sm text-default-500">Deployed</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3 text-center">
              <div className="text-2xl font-bold text-warning">
                {stats.starred}
              </div>
              <div className="text-sm text-default-500">Starred</div>
            </CardBody>
          </Card>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            className="flex-1"
            placeholder="Search projects..."
            startContent={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="flex gap-2">
            <Select
              className="w-32"
              placeholder="Status"
              selectedKeys={[filterStatus]}
              onSelectionChange={(keys) =>
                setFilterStatus(Array.from(keys)[0] as string)
              }
            >
              <SelectItem key="all">All Status</SelectItem>
              <SelectItem key="draft">Draft</SelectItem>
              <SelectItem key="training">Training</SelectItem>
              <SelectItem key="completed">Completed</SelectItem>
              <SelectItem key="deployed">Deployed</SelectItem>
              <SelectItem key="error">Error</SelectItem>
            </Select>

            <Select
              className="w-32"
              placeholder="Framework"
              selectedKeys={[filterFramework]}
              onSelectionChange={(keys) =>
                setFilterFramework(Array.from(keys)[0] as string)
              }
            >
              <SelectItem key="all">All Frameworks</SelectItem>
              <SelectItem key="tensorflow">TensorFlow</SelectItem>
              <SelectItem key="pytorch">PyTorch</SelectItem>
            </Select>

            <Select
              className="w-36"
              placeholder="Sort by"
              selectedKeys={[sortBy]}
              onSelectionChange={(keys) =>
                setSortBy(Array.from(keys)[0] as string)
              }
            >
              <SelectItem key="lastModified">Last Modified</SelectItem>
              <SelectItem key="name">Name</SelectItem>
              <SelectItem key="createdAt">Created Date</SelectItem>
              <SelectItem key="accuracy">Accuracy</SelectItem>
              <SelectItem key="size">Size</SelectItem>
            </Select>

            <Button
              isIconOnly
              variant="flat"
              onPress={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
            >
              {sortOrder === "asc" ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
            </Button>

            <div className="flex rounded-lg border border-default-200">
              <Button
                isIconOnly
                className="rounded-r-none border-r border-default-200"
                size="sm"
                variant={viewMode === "grid" ? "solid" : "light"}
                onPress={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                isIconOnly
                className="rounded-l-none"
                size="sm"
                variant={viewMode === "list" ? "solid" : "light"}
                onPress={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Projects */}
        {filteredAndSortedProjects.length === 0 ? (
          <Card>
            <CardBody className="p-12 text-center">
              <Folder className="w-16 h-16 text-default-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-default-500 mb-6">
                {searchQuery ||
                filterStatus !== "all" ||
                filterFramework !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Create your first neural network project to get started"}
              </p>
              {!searchQuery &&
                filterStatus === "all" &&
                filterFramework === "all" && (
                  <Button
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={() => router.push("/neuralnetwork")}
                  >
                    Create New Project
                  </Button>
                )}
            </CardBody>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-default-500">
                Showing {filteredAndSortedProjects.length} of {projects.length}{" "}
                projects
              </p>
            </div>
            {viewMode === "grid" ? renderGridView() : renderListView()}
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default ProjectsPage;
