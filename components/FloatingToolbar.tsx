import React, { useState } from "react";
import { Card, CardBody, Button, Tooltip } from "@heroui/react";
import { Network, Code, Settings, X, Save } from "lucide-react";
import { Node, Edge } from "reactflow";

import ModelTemplates from "./ModelTemplates";
import ModelValidator from "./ModelValidator";
import PerformanceAnalysis from "./PerformanceAnalysis";
import ProjectManager from "./ProjectManager";

import { SavedProject } from "@/utils/projectStorage";

interface FloatingToolbarProps {
  nodes: Node[];
  edges: Edge[];
  onLoadTemplate: (template: any) => void;
  onLoadProject: (project: any) => void;
  onIssueSelect: (nodeId: string) => void;
  onLayout: () => void;
  onToggleCodePanel: () => void;
  onSaveProject: () => void;
  showCodePanel: boolean;
  currentProject?: SavedProject | null;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  nodes,
  edges,
  onLoadTemplate,
  onLoadProject,
  onIssueSelect,
  onLayout,
  onToggleCodePanel,
  onSaveProject,
  showCodePanel,
  currentProject,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {/* Always Visible - Key Actions */}
      <div className="flex gap-2">
        <Tooltip content={currentProject ? "Update Project" : "Save Project"}>
          <Button
            isIconOnly
            className="shadow-lg"
            color="success"
            variant="flat"
            onClick={onSaveProject}
          >
            <Save className="w-4 h-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Auto Layout">
          <Button
            isIconOnly
            className="shadow-lg"
            color="default"
            variant="solid"
            onClick={onLayout}
          >
            <Network className="w-4 h-4" />
          </Button>
        </Tooltip>

        <Tooltip content={showCodePanel ? "Hide Code Panel" : "Generate Code"}>
          <Button
            isIconOnly
            className="shadow-lg"
            color="primary"
            variant={showCodePanel ? "solid" : "flat"}
            onClick={onToggleCodePanel}
          >
            <Code className="w-4 h-4" />
          </Button>
        </Tooltip>

        {/* Collapsible Menu Toggle */}
        <Tooltip
          content={isExpanded ? "Hide Tools" : "More Tools"}
          placement="left"
        >
          <Button
            isIconOnly
            className="shadow-lg"
            color="secondary"
            variant={isExpanded ? "solid" : "flat"}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <X className="w-4 h-4" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
          </Button>
        </Tooltip>
      </div>

      {/* Expanded Toolbar - Additional Tools */}
      {isExpanded && (
        <Card className="shadow-lg bg-background/95 backdrop-blur-sm border border-default-200/50 animate-in slide-in-from-top-2 fade-in-0 duration-200 min-w-[280px]">
          <CardBody className="p-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-default-200 pb-2">
                <h3 className="text-sm font-semibold text-default-700">
                  Neural Network Tools
                </h3>
                <div className="text-xs text-default-500">
                  {nodes.length} nodes
                </div>
              </div>

              {/* Project Management Section */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-default-600 uppercase tracking-wide">
                  Project
                </div>
                <div className="flex gap-2">
                  <ProjectManager
                    currentEdges={edges}
                    currentNodes={nodes}
                    onLoadProject={onLoadProject}
                  />
                </div>
              </div>

              {/* Model Tools Section */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-default-600 uppercase tracking-wide">
                  Models & Analysis
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ModelTemplates onLoadTemplate={onLoadTemplate} />
                  <ModelValidator
                    edges={edges}
                    nodes={nodes}
                    onIssueSelect={onIssueSelect}
                  />
                  <PerformanceAnalysis edges={edges} nodes={nodes} />
                  {/* Placeholder for even grid */}
                  <div />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default FloatingToolbar;
