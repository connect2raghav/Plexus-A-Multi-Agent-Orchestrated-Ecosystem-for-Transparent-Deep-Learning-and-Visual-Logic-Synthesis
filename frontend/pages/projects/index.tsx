import React, { useState, useEffect, useCallback } from "react";
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
  Clock,
  Target,
  Folder,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
} from "lucide-react";

import DefaultLayout from "@/layouts/default";
import { PlexusLogo } from "@/components/PlexusLogo";
import ProjectStorage, { SavedProject } from "@/utils/projectStorage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    case "transformer":
      return "🤖";
    default:
      return "🧠";
  }
};

const getStatusColor = (
  status: string,
): "success" | "warning" | "primary" | "danger" | "default" => {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProjectsPage: React.FC = () => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("lastModified");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFramework, setFilterFramework] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<SavedProject[]>([]);

  // ---- Load real projects from localStorage on mount ----
  useEffect(() => {
    setProjects(ProjectStorage.getAllProjects());
  }, []);

  const refresh = useCallback(() => {
    setProjects(ProjectStorage.getAllProjects());
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      ProjectStorage.deleteProject(id);
      refresh();
    },
    [refresh],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const src = ProjectStorage.getProject(id);

      if (!src) return;
      ProjectStorage.saveProject({
        name: `${src.name} (Copy)`,
        description: src.description,
        framework: src.framework,
        nodes: src.nodes,
        edges: src.edges,
        category: src.category,
        nodeCount: src.nodeCount,
        status: "draft",
      });
      refresh();
    },
    [refresh],
  );

  const handleExport = useCallback((id: string) => {
    const project = ProjectStorage.getProject(id);

    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "_")}.plexus`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".plexus,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];

      if (!file) return;
      const reader = new FileReader();

      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as SavedProject;

          ProjectStorage.saveProject({
            name: data.name,
            description: data.description,
            framework: data.framework,
            nodes: data.nodes || [],
            edges: data.edges || [],
            category: data.category || "general",
            nodeCount: data.nodeCount || 0,
            status: "draft",
          });
          refresh();
        } catch {
          alert("Invalid .plexus file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [refresh]);

  // ---- Filter + sort ----
  const filtered = projects
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || p.status === filterStatus;
      const matchFw =
        filterFramework === "all" || p.framework === filterFramework;

      return matchSearch && matchStatus && matchFw;
    })
    .sort((a, b) => {
      let cmp = 0;

      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "createdAt")
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else
        cmp =
          new Date(a.lastModified).getTime() -
          new Date(b.lastModified).getTime();

      return sortOrder === "asc" ? cmp : -cmp;
    });

  const stats = {
    total: projects.length,
    draft: projects.filter((p) => p.status === "draft").length,
    training: projects.filter((p) => p.status === "training").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  // ---- Card renderer ----
  const renderCard = (project: SavedProject) => (
    <Card
      key={project.id}
      isPressable
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onPress={() => router.push(`/neuralnetwork?project=${project.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {getCategoryIcon(project.category)}
            </span>
            <div>
              <h4 className="font-semibold text-sm line-clamp-1">
                {project.name}
              </h4>
              <p className="text-xs text-default-500">{project.framework}</p>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly size="sm" variant="light">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                onAction={(key) => {
                  if (key === "delete") handleDelete(project.id);
                  else if (key === "duplicate") handleDuplicate(project.id);
                  else if (key === "export") handleExport(project.id);
                  else if (key === "open")
                    router.push(`/neuralnetwork?project=${project.id}`);
                }}
              >
                <DropdownItem
                  key="open"
                  startContent={<Edit className="w-4 h-4" />}
                >
                  Open
                </DropdownItem>
                <DropdownItem
                  key="duplicate"
                  startContent={<Copy className="w-4 h-4" />}
                >
                  Duplicate
                </DropdownItem>
                <DropdownItem
                  key="export"
                  startContent={<Download className="w-4 h-4" />}
                >
                  Export .plexus
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
        <div className="space-y-2">
          {project.description && (
            <p className="text-xs text-default-600 line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs">
            <Chip
              color={getStatusColor(project.status)}
              size="sm"
              variant="flat"
            >
              {project.status}
            </Chip>
            <span className="text-default-500">
              {project.nodeCount} node{project.nodeCount !== 1 ? "s" : ""}
            </span>
          </div>
          {project.accuracy !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Accuracy</span>
                <span className="text-success">
                  {(project.accuracy * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                className="w-full"
                color="success"
                size="sm"
                value={project.accuracy * 100}
              />
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-default-500">
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>{project.category}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(project.lastModified).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  const renderRow = (project: SavedProject) => (
    <Card
      key={project.id}
      isPressable
      className="hover:shadow-md transition-shadow"
      onPress={() => router.push(`/neuralnetwork?project=${project.id}`)}
    >
      <CardBody className="p-4">
        <div className="flex items-center gap-4">
          <span className="text-2xl">{getCategoryIcon(project.category)}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{project.name}</h4>
            {project.description && (
              <p className="text-sm text-default-600 line-clamp-1">
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-6 text-sm text-default-500">
            <div className="text-center">
              <div className="font-medium">{project.nodeCount}</div>
              <div className="text-xs">Nodes</div>
            </div>
            {project.accuracy !== undefined && (
              <div className="text-center">
                <div className="font-medium text-success">
                  {(project.accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-xs">Accuracy</div>
              </div>
            )}
            <div className="text-center">
              <div className="font-medium">
                {new Date(project.lastModified).toLocaleDateString()}
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
          </div>
        </div>
      </CardBody>
    </Card>
  );

  return (
    <DefaultLayout description="Manage your Plexus projects" title="Projects">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <PlexusLogo showText={false} size="md" />
            <div>
              <h1 className="text-2xl font-bold">Plexus Projects</h1>
              <p className="text-default-500">
                {stats.total} project{stats.total !== 1 ? "s" : ""} in your
                workspace
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              startContent={<Upload className="w-4 h-4" />}
              variant="flat"
              onPress={handleImport}
            >
              Import .plexus
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(
            [
              ["Total", stats.total, "text-primary"],
              ["Draft", stats.draft, "text-default-500"],
              ["Training", stats.training, "text-warning"],
              ["Completed", stats.completed, "text-success"],
            ] as const
          ).map(([label, count, colour]) => (
            <Card key={label}>
              <CardBody className="p-3 text-center">
                <div className={`text-2xl font-bold ${colour}`}>{count}</div>
                <div className="text-sm text-default-500">{label}</div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            className="flex-1"
            placeholder="Search projects…"
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
            </Select>
            <Select
              className="w-32"
              placeholder="Framework"
              selectedKeys={[filterFramework]}
              onSelectionChange={(keys) =>
                setFilterFramework(Array.from(keys)[0] as string)
              }
            >
              <SelectItem key="all">All</SelectItem>
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
              <SelectItem key="createdAt">Created</SelectItem>
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

        {/* Projects grid/list */}
        {filtered.length === 0 ? (
          <Card>
            <CardBody className="p-12 text-center">
              <Folder className="w-16 h-16 text-default-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-default-500 mb-6">
                {projects.length === 0
                  ? "Create your first neural network project to get started."
                  : "Try adjusting your filters or search terms."}
              </p>
              {projects.length === 0 && (
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
            <p className="text-sm text-default-500 mb-4">
              Showing {filtered.length} of {projects.length} project
              {projects.length !== 1 ? "s" : ""}
            </p>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map(renderCard)}
              </div>
            ) : (
              <div className="space-y-2">{filtered.map(renderRow)}</div>
            )}
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default ProjectsPage;
