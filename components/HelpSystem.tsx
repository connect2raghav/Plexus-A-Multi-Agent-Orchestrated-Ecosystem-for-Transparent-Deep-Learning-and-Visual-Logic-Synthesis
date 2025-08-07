import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Button,
  Tabs,
  Tab,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Kbd,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  HelpCircle,
  Keyboard,
  MousePointer,
  Book,
  ExternalLink,
  Lightbulb,
  Target,
} from "lucide-react";

interface HelpSystemProps {
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

const HelpSystem: React.FC<HelpSystemProps> = ({
  currentStep,
  onStepChange,
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedTab, setSelectedTab] = useState("quickstart");

  // Listen for F1 key to open help
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        onOpen();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpen]);

  const quickStartSteps = [
    {
      title: "Welcome to NEOD",
      description:
        "Start by dragging neural network layers from the sidebar to the canvas.",
      icon: "lucide:brain",
      action: "Drag an Input Layer to begin",
    },
    {
      title: "Connect Layers",
      description:
        "Click and drag from output ports to input ports to connect layers.",
      icon: "lucide:link",
      action: "Connect your Input Layer to a Dense Layer",
    },
    {
      title: "Configure Layers",
      description: "Click on any layer to modify its parameters and settings.",
      icon: "lucide:settings",
      action: "Adjust layer parameters as needed",
    },
    {
      title: "Add Output Layer",
      description:
        "Every network needs an output layer to produce predictions.",
      icon: "lucide:arrow-right",
      action: "Add an Output Layer and connect it",
    },
    {
      title: "Generate Code",
      description:
        "Click the code button to generate TensorFlow or PyTorch code.",
      icon: "lucide:code",
      action: "Generate and download your neural network code",
    },
  ];

  const keyboardShortcuts = [
    {
      key: ["Ctrl", "S"],
      description: "Save current project",
      category: "Project",
    },
    { key: ["Ctrl", "O"], description: "Open project", category: "Project" },
    { key: ["Ctrl", "N"], description: "New project", category: "Project" },
    { key: ["Ctrl", "Z"], description: "Undo last action", category: "Edit" },
    { key: ["Ctrl", "Y"], description: "Redo last action", category: "Edit" },
    { key: ["Del"], description: "Delete selected nodes", category: "Edit" },
    { key: ["Ctrl", "A"], description: "Select all nodes", category: "Edit" },
    {
      key: ["Ctrl", "C"],
      description: "Copy selected nodes",
      category: "Edit",
    },
    { key: ["Ctrl", "V"], description: "Paste nodes", category: "Edit" },
    {
      key: ["Space"],
      description: "Pan canvas (hold and drag)",
      category: "Navigation",
    },
    { key: ["Ctrl", "+"], description: "Zoom in", category: "Navigation" },
    { key: ["Ctrl", "-"], description: "Zoom out", category: "Navigation" },
    { key: ["Ctrl", "0"], description: "Reset zoom", category: "Navigation" },
    { key: ["F1"], description: "Show help", category: "General" },
    {
      key: ["Escape"],
      description: "Cancel current operation",
      category: "General",
    },
    {
      key: ["Ctrl", "L"],
      description: "Auto-layout network",
      category: "Layout",
    },
    { key: ["Ctrl", "G"], description: "Generate code", category: "Code" },
    { key: ["Ctrl", "E"], description: "Export project", category: "Export" },
  ];

  const mouseControls = [
    {
      action: "Left Click",
      description: "Select node or edge",
      icon: "lucide:mouse-pointer",
    },
    {
      action: "Right Click",
      description: "Context menu (planned)",
      icon: "lucide:menu",
    },
    {
      action: "Drag Node",
      description: "Move node around canvas",
      icon: "lucide:move",
    },
    {
      action: "Drag from Port",
      description: "Create connection between layers",
      icon: "lucide:link",
    },
    {
      action: "Scroll Wheel",
      description: "Zoom in/out of canvas",
      icon: "lucide:zoom-in",
    },
    {
      action: "Middle Click + Drag",
      description: "Pan around canvas",
      icon: "lucide:hand",
    },
    {
      action: "Double Click",
      description: "Fit view to all nodes",
      icon: "lucide:maximize",
    },
  ];

  const tips = [
    {
      title: "Start Simple",
      description:
        "Begin with basic architectures like Input → Dense → Output before building complex networks.",
      icon: "lucide:lightbulb",
      type: "beginner",
    },
    {
      title: "Use Templates",
      description:
        "Load pre-built templates for common architectures like CNNs, LSTMs, and Autoencoders.",
      icon: "lucide:template",
      type: "efficiency",
    },
    {
      title: "Validate Your Model",
      description:
        "Use the Model Validator to check for common architecture issues and best practices.",
      icon: "lucide:check-circle",
      type: "quality",
    },
    {
      title: "Monitor Performance",
      description:
        "Check the Performance Analysis to understand your model's computational requirements.",
      icon: "lucide:bar-chart",
      type: "optimization",
    },
    {
      title: "Save Your Work",
      description:
        "Use the Project Manager to save, organize, and share your neural network designs.",
      icon: "lucide:save",
      type: "workflow",
    },
    {
      title: "Experiment with Layers",
      description:
        "Try different layer types and configurations to see how they affect your network.",
      icon: "lucide:experiment",
      type: "learning",
    },
    {
      title: "Use Auto-Layout",
      description:
        "Click the layout button to automatically organize your network for better visualization.",
      icon: "lucide:layout",
      type: "organization",
    },
    {
      title: "Export to Colab",
      description:
        "Generate Jupyter notebooks that run directly in Google Colab for easy training.",
      icon: "lucide:notebook",
      type: "deployment",
    },
  ];

  const resources = [
    {
      title: "Neural Network Fundamentals",
      description: "Learn the basics of neural networks and deep learning",
      url: "https://neuralnetworksanddeeplearning.com/",
      type: "tutorial",
      difficulty: "beginner",
    },
    {
      title: "TensorFlow Documentation",
      description: "Official TensorFlow guides and API reference",
      url: "https://tensorflow.org/learn",
      type: "documentation",
      difficulty: "intermediate",
    },
    {
      title: "PyTorch Tutorials",
      description: "Official PyTorch tutorials and examples",
      url: "https://pytorch.org/tutorials/",
      type: "tutorial",
      difficulty: "intermediate",
    },
    {
      title: "Deep Learning Course",
      description: "Comprehensive deep learning course by Andrew Ng",
      url: "https://coursera.org/learn/deep-learning",
      type: "course",
      difficulty: "intermediate",
    },
    {
      title: "Model Architectures Guide",
      description: "Common neural network architectures explained",
      url: "https://paperswithcode.com/methods/category/neural-networks",
      type: "reference",
      difficulty: "advanced",
    },
  ];

  const renderQuickStart = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Get Started in 5 Steps</h3>
        <p className="text-default-500">
          Follow these steps to create your first neural network
        </p>
      </div>

      <div className="space-y-4">
        {quickStartSteps.map((step, index) => (
          <Card
            key={index}
            className={
              (currentStep ?? -1) === index
                ? "border-primary bg-primary-50"
                : ""
            }
          >
            <CardBody className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      (currentStep ?? -1) === index
                        ? "bg-primary text-white"
                        : (currentStep ?? -1) > index
                          ? "bg-success text-white"
                          : "bg-default-200"
                    }`}
                  >
                    {(currentStep ?? -1) > index ? (
                      <Icon className="w-5 h-5" icon="lucide:check" />
                    ) : (
                      <span className="font-bold">{index + 1}</span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 text-primary" icon={step.icon} />
                    <h4 className="font-semibold">{step.title}</h4>
                  </div>
                  <p className="text-sm text-default-600 mb-3">
                    {step.description}
                  </p>
                  <Chip color="primary" size="sm" variant="flat">
                    {step.action}
                  </Chip>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderShortcuts = () => (
    <div className="space-y-6">
      {[
        "Project",
        "Edit",
        "Navigation",
        "General",
        "Layout",
        "Code",
        "Export",
      ].map((category) => {
        const categoryShortcuts = keyboardShortcuts.filter(
          (s) => s.category === category,
        );

        return (
          <div key={category}>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              {category}
            </h4>
            <div className="space-y-2">
              {categoryShortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-default-50 rounded-lg"
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <div className="flex gap-1">
                    {shortcut.key.map((key, keyIndex) => (
                      <Kbd key={keyIndex} className="text-xs">
                        {key}
                      </Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMouseControls = () => (
    <div className="space-y-4">
      {mouseControls.map((control, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-3 bg-default-50 rounded-lg"
        >
          <Icon className="w-6 h-6 text-primary" icon={control.icon} />
          <div className="flex-1">
            <span className="font-medium text-sm">{control.action}</span>
            <p className="text-xs text-default-500">{control.description}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTips = () => (
    <div className="space-y-4">
      {tips.map((tip, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-primary" icon={tip.icon} />
              <div className="flex-1">
                <h4 className="font-semibold">{tip.title}</h4>
                <Chip className="capitalize" size="sm" variant="flat">
                  {tip.type}
                </Chip>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <p className="text-sm text-default-600">{tip.description}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );

  const renderResources = () => (
    <div className="space-y-4">
      {resources.map((resource, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">{resource.title}</h4>
                  <ExternalLink className="w-4 h-4 text-default-400" />
                </div>
                <p className="text-sm text-default-600 mb-3">
                  {resource.description}
                </p>
                <div className="flex gap-2">
                  <Chip className="capitalize" size="sm" variant="flat">
                    {resource.type}
                  </Chip>
                  <Chip
                    color={
                      resource.difficulty === "beginner"
                        ? "success"
                        : resource.difficulty === "intermediate"
                          ? "warning"
                          : "danger"
                    }
                    size="sm"
                    variant="flat"
                  >
                    {resource.difficulty}
                  </Chip>
                </div>
              </div>
            </div>
            <Button
              className="mt-3"
              color="primary"
              size="sm"
              variant="flat"
              onClick={() => window.open(resource.url, "_blank")}
            >
              Visit Resource
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <Button
        isIconOnly
        className="fixed bottom-4 right-4 z-50 shadow-lg"
        title="Help (F1)"
        variant="flat"
        onPress={onOpen}
      >
        <HelpCircle className="w-5 h-5" />
      </Button>

      <Modal
        isOpen={isOpen}
        scrollBehavior="inside"
        size="4xl"
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  NEOD Help Center
                </div>
              </ModalHeader>
              <ModalBody>
                <Tabs
                  classNames={{
                    tabList: "w-full",
                  }}
                  selectedKey={selectedTab}
                  onSelectionChange={(key) => setSelectedTab(key as string)}
                >
                  <Tab
                    key="quickstart"
                    title={
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Quick Start
                      </div>
                    }
                  >
                    {renderQuickStart()}
                  </Tab>

                  <Tab
                    key="shortcuts"
                    title={
                      <div className="flex items-center gap-2">
                        <Keyboard className="w-4 h-4" />
                        Shortcuts
                      </div>
                    }
                  >
                    {renderShortcuts()}
                  </Tab>

                  <Tab
                    key="mouse"
                    title={
                      <div className="flex items-center gap-2">
                        <MousePointer className="w-4 h-4" />
                        Mouse Controls
                      </div>
                    }
                  >
                    {renderMouseControls()}
                  </Tab>

                  <Tab
                    key="tips"
                    title={
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Tips & Tricks
                      </div>
                    }
                  >
                    {renderTips()}
                  </Tab>

                  <Tab
                    key="resources"
                    title={
                      <div className="flex items-center gap-2">
                        <Book className="w-4 h-4" />
                        Resources
                      </div>
                    }
                  >
                    {renderResources()}
                  </Tab>
                </Tabs>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color="primary"
                  startContent={<ExternalLink className="w-4 h-4" />}
                  onPress={() =>
                    window.open("https://github.com/mahendra189/neod", "_blank")
                  }
                >
                  GitHub Repository
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default HelpSystem;
