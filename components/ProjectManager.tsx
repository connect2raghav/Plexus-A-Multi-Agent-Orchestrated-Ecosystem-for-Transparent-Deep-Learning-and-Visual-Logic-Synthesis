import React, { useState, useCallback } from "react";
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
  Input,
  Textarea,
  Chip,
  Divider,
  Select,
  SelectItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { 
  Save, 
  FolderOpen, 
  Download, 
  Upload, 
  Trash2, 
  Copy, 
  Edit, 
  Eye,
  Calendar,
  Clock,
  MoreVertical,
  FileText,
  Share2,
  Archive
} from "lucide-react";

interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  tags: string[];
  framework: "tensorflow" | "pytorch" | "both";
  category: "vision" | "nlp" | "general" | "timeseries" | "other";
  createdAt: Date;
  updatedAt: Date;
  version: string;
  author: string;
  isPublic: boolean;
  nodeCount: number;
  edgeCount: number;
}

interface SavedProject extends ProjectMetadata {
  nodes: Node[];
  edges: Edge[];
  thumbnail?: string; // base64 encoded image
}

interface ProjectManagerProps {
  currentNodes: Node[];
  currentEdges: Edge[];
  onLoadProject: (project: SavedProject) => void;
  onProjectSaved?: (project: SavedProject) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ 
  currentNodes, 
  currentEdges, 
  onLoadProject,
  onProjectSaved 
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isSaveOpen, onOpen: onSaveOpen, onOpenChange: onSaveOpenChange } = useDisclosure();
  
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<SavedProject | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  
  // Save form state
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTags, setProjectTags] = useState("");
  const [projectFramework, setProjectFramework] = useState<"tensorflow" | "pytorch" | "both">("tensorflow");
  const [projectCategory, setProjectCategory] = useState<string>("general");
  const [isPublic, setIsPublic] = useState(false);

  // Load projects from localStorage on component mount
  React.useEffect(() => {
    const savedProjects = localStorage.getItem("neod-projects");
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setProjects(parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        })));
      } catch (error) {
        console.error("Failed to load projects:", error);
      }
    }
  }, []);

  // Save projects to localStorage
  const saveProjectsToStorage = useCallback((projectsToSave: SavedProject[]) => {
    try {
      localStorage.setItem("neod-projects", JSON.stringify(projectsToSave));
    } catch (error) {
      console.error("Failed to save projects:", error);
    }
  }, []);

  const generateThumbnail = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      // Create a simple SVG representation of the network
      const svg = `
        <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#f8f9fa"/>
          <circle cx="30" cy="60" r="8" fill="#3b82f6"/>
          <circle cx="80" cy="40" r="8" fill="#10b981"/>
          <circle cx="80" cy="80" r="8" fill="#10b981"/>
          <circle cx="130" cy="60" r="8" fill="#f59e0b"/>
          <circle cx="170" cy="60" r="8" fill="#ef4444"/>
          <line x1="38" y1="60" x2="72" y2="45" stroke="#6b7280" stroke-width="2"/>
          <line x1="38" y1="60" x2="72" y2="75" stroke="#6b7280" stroke-width="2"/>
          <line x1="88" y1="40" x2="122" y2="55" stroke="#6b7280" stroke-width="2"/>
          <line x1="88" y1="80" x2="122" y2="65" stroke="#6b7280" stroke-width="2"/>
          <line x1="138" y1="60" x2="162" y2="60" stroke="#6b7280" stroke-width="2"/>
          <text x="100" y="15" text-anchor="middle" font-family="system-ui" font-size="12" fill="#6b7280">
            ${currentNodes.length} nodes
          </text>
        </svg>
      `;
      
      const base64 = btoa(svg);
      resolve(`data:image/svg+xml;base64,${base64}`);
    });
  }, [currentNodes.length]);

  const handleSaveProject = async () => {
    if (!projectName.trim()) return;

    const thumbnail = await generateThumbnail();
    
    const newProject: SavedProject = {
      id: Date.now().toString(),
      name: projectName.trim(),
      description: projectDescription.trim(),
      tags: projectTags.split(",").map(tag => tag.trim()).filter(Boolean),
      framework: projectFramework,
      category: projectCategory as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: "1.0.0",
      author: "User", // In a real app, this would come from auth
      isPublic,
      nodeCount: currentNodes.length,
      edgeCount: currentEdges.length,
      nodes: currentNodes,
      edges: currentEdges,
      thumbnail,
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
    
    // Reset form
    setProjectName("");
    setProjectDescription("");
    setProjectTags("");
    setProjectFramework("tensorflow");
    setProjectCategory("general");
    setIsPublic(false);
    
    onSaveOpenChange();
    onProjectSaved?.(newProject);
  };

  const handleLoadProject = (project: SavedProject) => {
    onLoadProject(project);
    onOpenChange();
  };

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
  };

  const handleDuplicateProject = async (project: SavedProject) => {
    const thumbnail = await generateThumbnail();
    
    const duplicatedProject: SavedProject = {
      ...project,
      id: Date.now().toString(),
      name: `${project.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      thumbnail,
    };

    const updatedProjects = [...projects, duplicatedProject];
    setProjects(updatedProjects);
    saveProjectsToStorage(updatedProjects);
  };

  const exportProject = (project: SavedProject) => {
    const dataStr = JSON.stringify(project, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.neod.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.neod.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          
          // Validate project structure
          if (imported.nodes && imported.edges && imported.name) {
            const importedProject: SavedProject = {
              ...imported,
              id: Date.now().toString(),
              createdAt: new Date(imported.createdAt || Date.now()),
              updatedAt: new Date(),
            };
            
            const updatedProjects = [...projects, importedProject];
            setProjects(updatedProjects);
            saveProjectsToStorage(updatedProjects);
          }
        } catch (error) {
          console.error("Failed to import project:", error);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const filteredProjects = React.useMemo(() => {
    let filtered = projects;
    
    if (filterCategory !== "all") {
      filtered = filtered.filter(p => p.category === filterCategory);
    }
    
    // Sort projects
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        case "size":
          return (b.nodeCount + b.edgeCount) - (a.nodeCount + a.edgeCount);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [projects, filterCategory, sortBy]);

  const categories = ["all", "general", "vision", "nlp", "timeseries", "other"];

  return (
    <>
      <div className="flex gap-2">
        <Button
          startContent={<Save className="w-4 h-4" />}
          color="primary"
          variant="flat"
          onPress={onSaveOpen}
          isDisabled={currentNodes.length === 0}
        >
          Save Project
        </Button>
        
        <Button
          startContent={<FolderOpen className="w-4 h-4" />}
          variant="flat"
          onPress={onOpen}
        >
          Load Project
        </Button>

        <Dropdown>
          <DropdownTrigger>
            <Button
              isIconOnly
              variant="flat"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu>
            <DropdownItem
              key="import"
              startContent={<Upload className="w-4 h-4" />}
              onPress={importProject}
            >
              Import Project
            </DropdownItem>
            <DropdownItem
              key="export-current"
              startContent={<Download className="w-4 h-4" />}
              isDisabled={currentNodes.length === 0}
              onPress={() => {
                const currentProject: SavedProject = {
                  id: "current",
                  name: "Current Project",
                  description: "Current workspace export",
                  tags: [],
                  framework: "tensorflow",
                  category: "general",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  version: "1.0.0",
                  author: "User",
                  isPublic: false,
                  nodeCount: currentNodes.length,
                  edgeCount: currentEdges.length,
                  nodes: currentNodes,
                  edges: currentEdges,
                };
                exportProject(currentProject);
              }}
            >
              Export Current
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* Save Project Modal */}
      <Modal isOpen={isSaveOpen} onOpenChange={onSaveOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Project
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Project Name"
                    placeholder="Enter project name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    isRequired
                  />
                  
                  <Textarea
                    label="Description"
                    placeholder="Describe your neural network project"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Framework"
                      selectedKeys={[projectFramework]}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setProjectFramework(selected as any);
                      }}
                    >
                      <SelectItem key="tensorflow">TensorFlow</SelectItem>
                      <SelectItem key="pytorch">PyTorch</SelectItem>
                      <SelectItem key="both">Both</SelectItem>
                    </Select>
                    
                    <Select
                      label="Category"
                      selectedKeys={[projectCategory]}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setProjectCategory(selected);
                      }}
                    >
                      <SelectItem key="general">General</SelectItem>
                      <SelectItem key="vision">Computer Vision</SelectItem>
                      <SelectItem key="nlp">Natural Language Processing</SelectItem>
                      <SelectItem key="timeseries">Time Series</SelectItem>
                      <SelectItem key="other">Other</SelectItem>
                    </Select>
                  </div>
                  
                  <Input
                    label="Tags"
                    placeholder="machine learning, classification, deep learning"
                    value={projectTags}
                    onChange={(e) => setProjectTags(e.target.value)}
                    description="Comma-separated tags"
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Project Info</span>
                    <div className="flex gap-4 text-sm text-default-500">
                      <span>{currentNodes.length} nodes</span>
                      <span>{currentEdges.length} connections</span>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSaveProject}
                  isDisabled={!projectName.trim()}
                >
                  Save Project
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Load Project Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    Project Library ({projects.length})
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      size="sm"
                      placeholder="Category"
                      selectedKeys={[filterCategory]}
                      onSelectionChange={(keys) => setFilterCategory(Array.from(keys)[0] as string)}
                      className="w-32"
                    >
                      {categories.map(cat => (
                        <SelectItem key={cat} className="capitalize">
                          {cat === "all" ? "All" : cat}
                        </SelectItem>
                      ))}
                    </Select>
                    
                    <Select
                      size="sm"
                      placeholder="Sort by"
                      selectedKeys={[sortBy]}
                      onSelectionChange={(keys) => setSortBy(Array.from(keys)[0] as any)}
                      className="w-32"
                    >
                      <SelectItem key="date">Date</SelectItem>
                      <SelectItem key="name">Name</SelectItem>
                      <SelectItem key="size">Size</SelectItem>
                    </Select>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody>
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="w-12 h-12 text-default-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                    <p className="text-default-500 mb-4">
                      {projects.length === 0 
                        ? "Create your first project by saving your current work"
                        : "No projects match your filter criteria"
                      }
                    </p>
                    <Button
                      color="primary"
                      variant="flat"
                      onPress={() => {
                        if (projects.length === 0) {
                          onClose();
                          onSaveOpen();
                        } else {
                          setFilterCategory("all");
                        }
                      }}
                    >
                      {projects.length === 0 ? "Save Current Project" : "Clear Filters"}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => (
                      <Card key={project.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between w-full">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg line-clamp-1">{project.name}</h3>
                              <p className="text-sm text-default-500 line-clamp-2">{project.description}</p>
                            </div>
                            <Dropdown>
                              <DropdownTrigger>
                                <Button isIconOnly size="sm" variant="light">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownTrigger>
                              <DropdownMenu>
                                <DropdownItem
                                  key="load"
                                  startContent={<Eye className="w-4 h-4" />}
                                  onPress={() => handleLoadProject(project)}
                                >
                                  Load
                                </DropdownItem>
                                <DropdownItem
                                  key="duplicate"
                                  startContent={<Copy className="w-4 h-4" />}
                                  onPress={() => handleDuplicateProject(project)}
                                >
                                  Duplicate
                                </DropdownItem>
                                <DropdownItem
                                  key="export"
                                  startContent={<Download className="w-4 h-4" />}
                                  onPress={() => exportProject(project)}
                                >
                                  Export
                                </DropdownItem>
                                <DropdownItem
                                  key="delete"
                                  startContent={<Trash2 className="w-4 h-4" />}
                                  color="danger"
                                  onPress={() => handleDeleteProject(project.id)}
                                >
                                  Delete
                                </DropdownItem>
                              </DropdownMenu>
                            </Dropdown>
                          </div>
                        </CardHeader>
                        <CardBody className="pt-0">
                          <div className="space-y-3">
                            {project.thumbnail && (
                              <div className="w-full h-24 bg-default-100 rounded-lg overflow-hidden">
                                <img 
                                  src={project.thumbnail} 
                                  alt="Project thumbnail"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-1">
                              <Chip size="sm" variant="flat" color="primary">
                                {project.framework}
                              </Chip>
                              <Chip size="sm" variant="flat">
                                {project.category}
                              </Chip>
                              {project.tags.slice(0, 2).map(tag => (
                                <Chip key={tag} size="sm" variant="flat">
                                  {tag}
                                </Chip>
                              ))}
                              {project.tags.length > 2 && (
                                <Chip size="sm" variant="flat">
                                  +{project.tags.length - 2}
                                </Chip>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-default-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {project.updatedAt.toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{project.nodeCount} nodes</span>
                                <span>{project.edgeCount} edges</span>
                              </div>
                            </div>
                            
                            <Button
                              color="primary"
                              variant="flat"
                              size="sm"
                              className="w-full"
                              onPress={() => handleLoadProject(project)}
                            >
                              Load Project
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button
                  startContent={<Upload className="w-4 h-4" />}
                  variant="flat"
                  onPress={importProject}
                >
                  Import Project
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProjectManager;
