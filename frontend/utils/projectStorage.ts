import { Node, Edge } from "reactflow";

export interface SavedProject {
  id: string;
  name: string;
  description?: string;
  framework: "tensorflow" | "pytorch";
  nodes: Node[];
  edges: Edge[];
  createdAt: Date;
  lastModified: Date;
  category: string;
  templateType?: string;
  nodeCount: number;
  accuracy?: number;
  status: "draft" | "training" | "completed";
}

class ProjectStorage {
  private static readonly STORAGE_KEY = "plexus_saved_projects";

  static saveProject(
    project: Omit<SavedProject, "id" | "createdAt" | "lastModified">,
  ): SavedProject {
    const projects = this.getAllProjects();
    const newProject: SavedProject = {
      ...project,
      id: Date.now().toString(),
      createdAt: new Date(),
      lastModified: new Date(),
    };

    projects.push(newProject);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));

    return newProject;
  }

  static updateProject(
    id: string,
    updates: Partial<SavedProject>,
  ): SavedProject | null {
    const projects = this.getAllProjects();
    const projectIndex = projects.findIndex((p) => p.id === id);

    if (projectIndex === -1) return null;

    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updates,
      lastModified: new Date(),
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));

    return projects[projectIndex];
  }

  static getAllProjects(): SavedProject[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (!stored) return [];

      const projects = JSON.parse(stored);

      return projects.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        lastModified: new Date(p.lastModified),
      }));
    } catch (error) {
      console.error("Error loading projects:", error);

      return [];
    }
  }

  static getProject(id: string): SavedProject | null {
    const projects = this.getAllProjects();

    return projects.find((p) => p.id === id) || null;
  }

  static deleteProject(id: string): boolean {
    const projects = this.getAllProjects();
    const filteredProjects = projects.filter((p) => p.id !== id);

    if (filteredProjects.length === projects.length) return false;

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredProjects));

    return true;
  }

  static getRecentProjects(limit: number = 5): SavedProject[] {
    return this.getAllProjects()
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, limit);
  }

  static getProjectsByCategory(category: string): SavedProject[] {
    return this.getAllProjects().filter((p) => p.category === category);
  }

  static categorizeProject(nodes: Node[]): string {
    // Simple heuristic to categorize projects based on node types
    const nodeTypes = nodes.map((n) => n.type);

    if (nodeTypes.includes("conv2d") || nodeTypes.includes("maxpool")) {
      return "vision";
    } else if (nodeTypes.includes("lstm") || nodeTypes.includes("embedding")) {
      return "nlp";
    } else if (nodeTypes.includes("attention")) {
      return "transformer";
    } else {
      return "general";
    }
  }
}

export default ProjectStorage;
