import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  RadioGroup,
  Radio,
} from "@heroui/react";
import { Save, Folder } from "lucide-react";
import { Node, Edge } from "reactflow";

import ProjectStorage, { SavedProject } from "@/utils/projectStorage";

interface SaveProjectModalProps {
  nodes: Node[];
  edges: Edge[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: SavedProject) => void;
  templateType?: string;
}

const SaveProjectModal: React.FC<SaveProjectModalProps> = ({
  nodes,
  edges,
  isOpen,
  onClose,
  onSave,
  templateType,
}) => {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [framework, setFramework] = useState<"tensorflow" | "pytorch">(
    "tensorflow",
  );
  const [status, setStatus] = useState<"draft" | "training" | "completed">(
    "draft",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!projectName.trim()) {
      setError("Project name is required");

      return;
    }

    if (nodes.length === 0) {
      setError("Cannot save empty project");

      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const category = ProjectStorage.categorizeProject(nodes);

      const savedProject = ProjectStorage.saveProject({
        name: projectName.trim(),
        description: description.trim() || undefined,
        framework,
        nodes,
        edges,
        category,
        templateType,
        nodeCount: nodes.length,
        status,
      });

      onSave(savedProject);

      // Reset form
      setProjectName("");
      setDescription("");
      setFramework("tensorflow");
      setStatus("draft");

      onClose();
    } catch (err) {
      setError("Failed to save project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  const suggestedName = templateType
    ? `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Network`
    : "My Neural Network";

  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      placement="center"
      onClose={handleClose}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Save className="w-5 h-5 text-success" />
            Save Neural Network Project
          </div>
          <p className="text-sm text-default-500 font-normal">
            Save your neural network architecture for later use
          </p>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            {error && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              isRequired
              label="Project Name"
              placeholder={suggestedName}
              value={projectName}
              variant="bordered"
              onChange={(e) => setProjectName(e.target.value)}
            />

            <Textarea
              label="Description (Optional)"
              maxRows={4}
              minRows={2}
              placeholder="Describe your neural network's purpose and architecture..."
              value={description}
              variant="bordered"
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="text-sm font-medium text-default-700 mb-2 block"
                  htmlFor="framework-radio"
                >
                  Framework
                </label>
                <RadioGroup
                  id="framework-radio"
                  orientation="vertical"
                  size="sm"
                  value={framework}
                  onValueChange={(value) =>
                    setFramework(value as "tensorflow" | "pytorch")
                  }
                >
                  <Radio value="tensorflow">TensorFlow</Radio>
                  <Radio value="pytorch">PyTorch</Radio>
                </RadioGroup>
              </div>

              <div>
                <label
                  className="text-sm font-medium text-default-700 mb-2 block"
                  htmlFor="status-radio"
                >
                  Status
                </label>
                <RadioGroup
                  id="status-radio"
                  orientation="vertical"
                  size="sm"
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as "draft" | "training" | "completed")
                  }
                >
                  <Radio value="draft">Draft</Radio>
                  <Radio value="training">Training</Radio>
                  <Radio value="completed">Completed</Radio>
                </RadioGroup>
              </div>
            </div>

            <div className="bg-default-50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Folder className="w-4 h-4 text-default-600" />
                <span className="font-medium text-default-700">
                  Project Details
                </span>
              </div>
              <div className="space-y-1 text-default-600">
                <div>
                  • {nodes.length} nodes, {edges.length} connections
                </div>
                <div>• Category: {ProjectStorage.categorizeProject(nodes)}</div>
                {templateType && <div>• Based on: {templateType} template</div>}
              </div>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button isDisabled={isSaving} variant="light" onPress={handleClose}>
            Cancel
          </Button>
          <Button
            color="success"
            isLoading={isSaving}
            startContent={!isSaving ? <Save className="w-4 h-4" /> : undefined}
            onPress={handleSave}
          >
            {isSaving ? "Saving..." : "Save Project"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SaveProjectModal;
