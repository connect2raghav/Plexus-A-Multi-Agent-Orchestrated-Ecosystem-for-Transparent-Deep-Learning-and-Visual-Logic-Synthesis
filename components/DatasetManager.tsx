import React, { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Progress,
  Divider,
  Tabs,
  Tab,
} from "@heroui/react";
import {
  Search,
  Download,
  Upload,
  Database,
  FileText,
  Image,
  Music,
  BarChart3,
  TrendingUp,
  ExternalLink,
  Star,
  Heart,
  Eye,
  Filter,
  SortAsc,
  Plus,
  Globe,
  Lock,
  Calendar,
  Users,
  Tag,
} from "lucide-react";

interface Dataset {
  id: string;
  name: string;
  description: string;
  category: "vision" | "nlp" | "audio" | "tabular" | "time-series";
  type: "public" | "private" | "shared";
  size: string;
  samples: number;
  features?: number;
  format: string;
  license: string;
  tags: string[];
  downloadUrl: string;
  uploadedBy?: string;
  uploadedAt: Date;
  lastAccessed?: Date;
  downloads: number;
  likes: number;
  isLiked: boolean;
  isBookmarked: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
  thumbnail?: string;
  previewAvailable: boolean;
}

interface DatasetManagerProps {
  onDatasetSelect?: (dataset: Dataset) => void;
  compact?: boolean;
}

const DatasetManager: React.FC<DatasetManagerProps> = ({ 
  onDatasetSelect, 
  compact = false 
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedTab, setSelectedTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popularity");

  // Mock datasets - in real app this would come from API
  const [datasets, setDatasets] = useState<Dataset[]>([
    {
      id: "mnist",
      name: "MNIST Handwritten Digits",
      description: "Classic dataset of 70,000 handwritten digit images (0-9) for image classification",
      category: "vision",
      type: "public",
      size: "11.5 MB",
      samples: 70000,
      features: 784,
      format: "PNG Images (28x28)",
      license: "Public Domain",
      tags: ["classification", "computer vision", "beginner", "grayscale"],
      downloadUrl: "https://keras.io/api/datasets/mnist/",
      uploadedAt: new Date("2023-01-01"),
      downloads: 125000,
      likes: 1250,
      isLiked: true,
      isBookmarked: false,
      difficulty: "beginner",
      previewAvailable: true,
    },
    {
      id: "cifar10",
      name: "CIFAR-10 Object Recognition",
      description: "60,000 color images in 10 classes: airplanes, cars, birds, cats, deer, dogs, frogs, horses, ships, trucks",
      category: "vision",
      type: "public",
      size: "163 MB",
      samples: 60000,
      features: 3072,
      format: "PNG Images (32x32x3)",
      license: "MIT License",
      tags: ["classification", "computer vision", "color images", "objects"],
      downloadUrl: "https://keras.io/api/datasets/cifar10/",
      uploadedAt: new Date("2023-01-15"),
      downloads: 89000,
      likes: 890,
      isLiked: false,
      isBookmarked: true,
      difficulty: "intermediate",
      previewAvailable: true,
    },
    {
      id: "imdb",
      name: "IMDB Movie Reviews",
      description: "50,000 highly polarized movie reviews for binary sentiment classification",
      category: "nlp",
      type: "public",
      size: "80 MB",
      samples: 50000,
      format: "Text sequences",
      license: "Academic Use",
      tags: ["sentiment analysis", "nlp", "binary classification", "text"],
      downloadUrl: "https://keras.io/api/datasets/imdb/",
      uploadedAt: new Date("2023-02-01"),
      downloads: 65000,
      likes: 620,
      isLiked: false,
      isBookmarked: false,
      difficulty: "intermediate",
      previewAvailable: true,
    },
    {
      id: "housing",
      name: "California Housing Prices",
      description: "Housing prices in California districts with geographic and demographic features",
      category: "tabular",
      type: "public",
      size: "1.2 MB",
      samples: 20640,
      features: 8,
      format: "CSV",
      license: "Open Data",
      tags: ["regression", "real estate", "geographic", "demographics"],
      downloadUrl: "https://scikit-learn.org/stable/datasets/real_world.html#california-housing-dataset",
      uploadedAt: new Date("2023-02-15"),
      downloads: 45000,
      likes: 380,
      isLiked: true,
      isBookmarked: true,
      difficulty: "beginner",
      previewAvailable: true,
    },
    {
      id: "stock-data",
      name: "S&P 500 Stock Data",
      description: "Historical stock prices and trading volumes for S&P 500 companies",
      category: "time-series",
      type: "shared",
      size: "25 MB",
      samples: 500000,
      features: 12,
      format: "CSV Time Series",
      license: "Commercial Use",
      tags: ["finance", "time series", "stocks", "trading"],
      downloadUrl: "https://finance.yahoo.com/",
      uploadedBy: "FinanceAI Team",
      uploadedAt: new Date("2023-03-01"),
      downloads: 32000,
      likes: 290,
      isLiked: false,
      isBookmarked: false,
      difficulty: "advanced",
      previewAvailable: false,
    },
    {
      id: "my-custom-dataset",
      name: "My Custom Image Dataset",
      description: "Custom collected images for plant species classification",
      category: "vision",
      type: "private",
      size: "450 MB",
      samples: 15000,
      features: 150528,
      format: "JPEG Images (224x224x3)",
      license: "Private Use",
      tags: ["plants", "species", "custom", "classification"],
      downloadUrl: "",
      uploadedBy: "You",
      uploadedAt: new Date("2025-07-15"),
      downloads: 0,
      likes: 0,
      isLiked: false,
      isBookmarked: false,
      difficulty: "intermediate",
      previewAvailable: true,
    },
  ]);

  const filteredDatasets = datasets.filter(dataset => {
    const matchesSearch = searchQuery === "" || 
      dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dataset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dataset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || dataset.category === categoryFilter;
    const matchesType = typeFilter === "all" || dataset.type === typeFilter;
    const matchesDifficulty = difficultyFilter === "all" || dataset.difficulty === difficultyFilter;
    
    return matchesSearch && matchesCategory && matchesType && matchesDifficulty;
  }).sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "size":
        return parseFloat(a.size) - parseFloat(b.size);
      case "samples":
        return b.samples - a.samples;
      case "downloads":
        return b.downloads - a.downloads;
      case "recent":
        return b.uploadedAt.getTime() - a.uploadedAt.getTime();
      case "popularity":
      default:
        return b.likes - a.likes;
    }
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "vision": return <Image className="w-4 h-4" />;
      case "nlp": return <FileText className="w-4 h-4" />;
      case "audio": return <Music className="w-4 h-4" />;
      case "tabular": return <BarChart3 className="w-4 h-4" />;
      case "time-series": return <TrendingUp className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "public": return "success";
      case "private": return "warning";
      case "shared": return "primary";
      default: return "default";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "success";
      case "intermediate": return "warning";
      case "advanced": return "danger";
      default: return "default";
    }
  };

  const handleLike = (datasetId: string) => {
    setDatasets(prev => prev.map(d => 
      d.id === datasetId 
        ? { ...d, isLiked: !d.isLiked, likes: d.isLiked ? d.likes - 1 : d.likes + 1 }
        : d
    ));
  };

  const handleBookmark = (datasetId: string) => {
    setDatasets(prev => prev.map(d => 
      d.id === datasetId ? { ...d, isBookmarked: !d.isBookmarked } : d
    ));
  };

  const renderDatasetCard = (dataset: Dataset) => (
    <Card 
      key={dataset.id} 
      className="hover:shadow-lg transition-shadow"
      isPressable={!!onDatasetSelect}
      onPress={() => onDatasetSelect?.(dataset)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-3">
            {getCategoryIcon(dataset.category)}
            <div>
              <h4 className="font-semibold text-sm">{dataset.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Chip 
                  size="sm" 
                  color={getTypeColor(dataset.type)}
                  variant="flat"
                  startContent={dataset.type === "public" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                >
                  {dataset.type}
                </Chip>
                <Chip 
                  size="sm" 
                  color={getDifficultyColor(dataset.difficulty)}
                  variant="flat"
                >
                  {dataset.difficulty}
                </Chip>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => handleLike(dataset.id)}
            >
              <Heart className={`w-4 h-4 ${dataset.isLiked ? 'fill-red-500 text-red-500' : 'text-default-400'}`} />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => handleBookmark(dataset.id)}
            >
              <Star className={`w-4 h-4 ${dataset.isBookmarked ? 'fill-yellow-500 text-yellow-500' : 'text-default-400'}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardBody className="pt-0">
        <p className="text-sm text-default-600 mb-3 line-clamp-2">{dataset.description}</p>
        
        <div className="space-y-2 text-xs text-default-500 mb-3">
          <div className="flex justify-between">
            <span>Samples:</span>
            <span>{dataset.samples.toLocaleString()}</span>
          </div>
          {dataset.features && (
            <div className="flex justify-between">
              <span>Features:</span>
              <span>{dataset.features.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Size:</span>
            <span>{dataset.size}</span>
          </div>
          <div className="flex justify-between">
            <span>Format:</span>
            <span>{dataset.format}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {dataset.tags.slice(0, 3).map((tag) => (
            <Chip key={tag} size="sm" variant="flat" className="text-xs">
              {tag}
            </Chip>
          ))}
          {dataset.tags.length > 3 && (
            <Chip size="sm" variant="flat" className="text-xs">
              +{dataset.tags.length - 3}
            </Chip>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-default-500 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span>{dataset.downloads.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>{dataset.likes}</span>
            </div>
            {dataset.uploadedBy && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{dataset.uploadedBy}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{dataset.uploadedAt.toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {dataset.previewAvailable && (
            <Button
              size="sm"
              variant="flat"
              startContent={<Eye className="w-4 h-4" />}
              className="flex-1"
            >
              Preview
            </Button>
          )}
          <Button
            size="sm"
            color="primary"
            variant={dataset.type === "private" ? "flat" : "solid"}
            startContent={<Download className="w-4 h-4" />}
            className="flex-1"
            isDisabled={dataset.type === "private" && !dataset.downloadUrl}
            onPress={() => {
              if (dataset.downloadUrl) {
                window.open(dataset.downloadUrl, '_blank');
              }
            }}
          >
            {dataset.type === "private" ? "Use" : "Download"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );

  const renderBrowseTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search datasets..."
          startContent={<Search className="w-4 h-4" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Select
            placeholder="Category"
            className="w-32"
            selectedKeys={[categoryFilter]}
            onSelectionChange={(keys) => setCategoryFilter(Array.from(keys)[0] as string)}
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="vision">Vision</SelectItem>
            <SelectItem key="nlp">NLP</SelectItem>
            <SelectItem key="audio">Audio</SelectItem>
            <SelectItem key="tabular">Tabular</SelectItem>
            <SelectItem key="time-series">Time Series</SelectItem>
          </Select>
          <Select
            placeholder="Type"
            className="w-28"
            selectedKeys={[typeFilter]}
            onSelectionChange={(keys) => setTypeFilter(Array.from(keys)[0] as string)}
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="public">Public</SelectItem>
            <SelectItem key="private">Private</SelectItem>
            <SelectItem key="shared">Shared</SelectItem>
          </Select>
          <Select
            placeholder="Sort"
            className="w-32"
            selectedKeys={[sortBy]}
            onSelectionChange={(keys) => setSortBy(Array.from(keys)[0] as string)}
          >
            <SelectItem key="popularity">Popularity</SelectItem>
            <SelectItem key="recent">Recent</SelectItem>
            <SelectItem key="name">Name</SelectItem>
            <SelectItem key="size">Size</SelectItem>
            <SelectItem key="samples">Samples</SelectItem>
            <SelectItem key="downloads">Downloads</SelectItem>
          </Select>
        </div>
      </div>

      <div className={`grid gap-4 ${compact ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {filteredDatasets.map(renderDatasetCard)}
      </div>

      {filteredDatasets.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-16 h-16 text-default-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No datasets found</h3>
          <p className="text-default-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );

  const renderUploadTab = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Upload Dataset</h3>
        <p className="text-default-500">Share your dataset with the community</p>
      </div>
      
      <Card className="border-2 border-dashed border-default-200 hover:border-primary-200 transition-colors">
        <CardBody className="p-8 text-center">
          <Upload className="w-12 h-12 text-default-400 mx-auto mb-4" />
          <h4 className="font-semibold mb-2">Drag & drop your dataset</h4>
          <p className="text-sm text-default-500 mb-4">
            Support for CSV, JSON, Images (ZIP), Audio files
          </p>
          <Button color="primary" variant="flat">
            Choose Files
          </Button>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-3">Dataset Information</h4>
          <div className="space-y-3">
            <Input label="Dataset Name" placeholder="Enter dataset name" />
            <Input label="Description" placeholder="Describe your dataset" />
            <Select label="Category" placeholder="Select category">
              <SelectItem key="vision">Computer Vision</SelectItem>
              <SelectItem key="nlp">Natural Language Processing</SelectItem>
              <SelectItem key="audio">Audio Processing</SelectItem>
              <SelectItem key="tabular">Tabular Data</SelectItem>
              <SelectItem key="time-series">Time Series</SelectItem>
            </Select>
            <Select label="License" placeholder="Select license">
              <SelectItem key="public">Public Domain</SelectItem>
              <SelectItem key="mit">MIT License</SelectItem>
              <SelectItem key="academic">Academic Use Only</SelectItem>
              <SelectItem key="commercial">Commercial Use</SelectItem>
              <SelectItem key="private">Private Use</SelectItem>
            </Select>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-3">Metadata</h4>
          <div className="space-y-3">
            <Input label="Number of Samples" type="number" placeholder="0" />
            <Input label="Number of Features" type="number" placeholder="0" />
            <Input label="Tags" placeholder="comma, separated, tags" />
            <Select label="Difficulty Level" placeholder="Select difficulty">
              <SelectItem key="beginner">Beginner</SelectItem>
              <SelectItem key="intermediate">Intermediate</SelectItem>
              <SelectItem key="advanced">Advanced</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="flat">
          Save as Draft
        </Button>
        <Button color="primary">
          Upload Dataset
        </Button>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Datasets</h3>
          <Button size="sm" variant="flat" onPress={onOpen}>
            View All
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {datasets.slice(0, 4).map(renderDatasetCard)}
        </div>

        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>Dataset Manager</ModalHeader>
                <ModalBody>
                  <Tabs selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key as string)}>
                    <Tab key="browse" title="Browse Datasets">
                      {renderBrowseTab()}
                    </Tab>
                    <Tab key="upload" title="Upload Dataset">
                      {renderUploadTab()}
                    </Tab>
                  </Tabs>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={onClose}>
                    Close
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dataset Manager</h2>
          <p className="text-default-500">Browse, manage, and upload datasets for your projects</p>
        </div>
        <Button 
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={() => setSelectedTab("upload")}
        >
          Upload Dataset
        </Button>
      </div>

      <Tabs selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key as string)}>
        <Tab 
          key="browse" 
          title={
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Browse
            </div>
          }
        >
          {renderBrowseTab()}
        </Tab>
        
        <Tab 
          key="upload" 
          title={
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </div>
          }
        >
          {renderUploadTab()}
        </Tab>
      </Tabs>
    </div>
  );
};

export default DatasetManager;
