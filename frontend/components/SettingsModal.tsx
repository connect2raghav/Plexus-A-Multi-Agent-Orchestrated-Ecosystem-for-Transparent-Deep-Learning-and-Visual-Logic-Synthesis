import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  CardHeader,
  Switch,
  Select,
  SelectItem,
  Slider,
  Tabs,
  Tab,
} from "@heroui/react";
import {
  Settings,
  Brain,
  Save,
  RotateCcw,
  Monitor,
  Moon,
  Sun,
  Zap,
  Bell,
} from "lucide-react";
import { useTheme } from "next-themes";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AppSettings {
  general: {
    theme: "light" | "dark" | "system";
    autoSave: boolean;
    autoSaveInterval: number;
    defaultFramework: "tensorflow" | "pytorch";
    showWelcomeScreen: boolean;
    confirmBeforeDelete: boolean;
  };
  editor: {
    autoLayout: boolean;
    snapToGrid: boolean;
    gridSize: number;
    animateConnections: boolean;
    showNodeLabels: boolean;
    highlightValidation: boolean;
  };
  performance: {
    enableHardwareAcceleration: boolean;
    maxUndoHistory: number;
    enableDebugMode: boolean;
    cacheTemplates: boolean;
  };
  notifications: {
    enableNotifications: boolean;
    showSaveNotifications: boolean;
    showValidationAlerts: boolean;
    notificationDuration: number;
  };
}

const defaultSettings: AppSettings = {
  general: {
    theme: "system",
    autoSave: true,
    autoSaveInterval: 30,
    defaultFramework: "tensorflow",
    showWelcomeScreen: true,
    confirmBeforeDelete: true,
  },
  editor: {
    autoLayout: true,
    snapToGrid: false,
    gridSize: 20,
    animateConnections: true,
    showNodeLabels: true,
    highlightValidation: true,
  },
  performance: {
    enableHardwareAcceleration: true,
    maxUndoHistory: 50,
    enableDebugMode: false,
    cacheTemplates: true,
  },
  notifications: {
    enableNotifications: true,
    showSaveNotifications: true,
    showValidationAlerts: true,
    notificationDuration: 4000,
  },
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState("general");

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("plexus-settings");

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);

        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error("Failed to parse saved settings:", error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem("plexus-settings", JSON.stringify(settings));
    onClose();
  };

  // Reset to defaults
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem("plexus-settings");
  };

  // Update nested settings
  const updateSetting = (
    category: keyof AppSettings,
    key: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updateSetting("general", "theme", newTheme);
  };

  return (
    <Modal
      classNames={{
        base: "max-h-[90vh]",
        body: "py-4 px-6",
      }}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="4xl"
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex gap-2 items-center">
          <Settings className="w-5 h-5" />
          Application Settings
        </ModalHeader>
        <ModalBody>
          <Tabs
            aria-label="Settings categories"
            classNames={{
              tabList:
                "gap-6 w-full relative rounded-none p-0 border-b border-divider",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-4 h-12",
              tabContent: "group-data-[selected=true]:text-primary font-medium",
              panel: "pt-6",
            }}
            selectedKey={activeTab}
            variant="underlined"
            onSelectionChange={(key) => setActiveTab(key as string)}
          >
            {/* General Settings */}
            <Tab
              key="general"
              title={
                <div className="flex items-center space-x-2 px-1">
                  <Monitor className="w-4 h-4" />
                  <span>General</span>
                </div>
              }
            >
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Appearance</h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Theme</h4>
                        <p className="text-sm text-default-500">
                          Choose your preferred color scheme
                        </p>
                      </div>
                      <Select
                        className="w-40"
                        selectedKeys={[settings.general.theme]}
                        size="sm"
                        onSelectionChange={(keys) =>
                          handleThemeChange(Array.from(keys)[0] as string)
                        }
                      >
                        <SelectItem
                          key="light"
                          startContent={<Sun className="w-4 h-4" />}
                        >
                          Light
                        </SelectItem>
                        <SelectItem
                          key="dark"
                          startContent={<Moon className="w-4 h-4" />}
                        >
                          Dark
                        </SelectItem>
                        <SelectItem
                          key="system"
                          startContent={<Monitor className="w-4 h-4" />}
                        >
                          System
                        </SelectItem>
                      </Select>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Project Settings</h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="flex justify-between items-center opacity-60">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          Auto Save
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                            Coming Soon
                          </span>
                        </h4>
                        <p className="text-sm text-default-500">
                          Automatically save projects while editing
                        </p>
                      </div>
                      <Switch isDisabled={true} isSelected={false} />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Default Framework</h4>
                        <p className="text-sm text-default-500">
                          Preferred framework for code generation
                        </p>
                      </div>
                      <Select
                        className="w-40"
                        selectedKeys={[settings.general.defaultFramework]}
                        size="sm"
                        onSelectionChange={(keys) =>
                          updateSetting(
                            "general",
                            "defaultFramework",
                            Array.from(keys)[0],
                          )
                        }
                      >
                        <SelectItem key="tensorflow">TensorFlow</SelectItem>
                        <SelectItem key="pytorch">PyTorch</SelectItem>
                      </Select>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Show Welcome Screen</h4>
                        <p className="text-sm text-default-500">
                          Display welcome screen on app startup
                        </p>
                      </div>
                      <Switch
                        isSelected={settings.general.showWelcomeScreen}
                        onValueChange={(value) =>
                          updateSetting("general", "showWelcomeScreen", value)
                        }
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Confirm Before Delete</h4>
                        <p className="text-sm text-default-500">
                          Ask for confirmation before deleting projects
                        </p>
                      </div>
                      <Switch
                        isSelected={settings.general.confirmBeforeDelete}
                        onValueChange={(value) =>
                          updateSetting("general", "confirmBeforeDelete", value)
                        }
                      />
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>

            {/* Editor Settings */}
            <Tab
              key="editor"
              title={
                <div className="flex items-center space-x-2 px-1">
                  <Brain className="w-4 h-4" />
                  <span>Editor</span>
                </div>
              }
            >
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Layout & Grid</h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Auto Layout</h4>
                        <p className="text-sm text-default-500">
                          Automatically arrange nodes when loading templates
                        </p>
                      </div>
                      <Switch
                        isSelected={settings.editor.autoLayout}
                        onValueChange={(value) =>
                          updateSetting("editor", "autoLayout", value)
                        }
                      />
                    </div>

                    <div className="flex justify-between items-center opacity-60">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          Snap to Grid
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                            Coming Soon
                          </span>
                        </h4>
                        <p className="text-sm text-default-500">
                          Align nodes to grid when moving
                        </p>
                      </div>
                      <Switch isDisabled={true} isSelected={false} />
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Visual Options</h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Animate Connections</h4>
                        <p className="text-sm text-default-500">
                          Show animated data flow between nodes
                        </p>
                      </div>
                      <Switch
                        isSelected={settings.editor.animateConnections}
                        onValueChange={(value) =>
                          updateSetting("editor", "animateConnections", value)
                        }
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Show Node Labels</h4>
                        <p className="text-sm text-default-500">
                          Display labels on all nodes
                        </p>
                      </div>
                      <Switch
                        isSelected={settings.editor.showNodeLabels}
                        onValueChange={(value) =>
                          updateSetting("editor", "showNodeLabels", value)
                        }
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">
                          Highlight Validation Issues
                        </h4>
                        <p className="text-sm text-default-500">
                          Visually highlight nodes with validation errors
                        </p>
                      </div>
                      <Switch
                        isSelected={settings.editor.highlightValidation}
                        onValueChange={(value) =>
                          updateSetting("editor", "highlightValidation", value)
                        }
                      />
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>

            {/* Performance Settings */}
            <Tab
              key="performance"
              title={
                <div className="flex items-center space-x-2 px-1">
                  <Zap className="w-4 h-4" />
                  <span>Performance</span>
                </div>
              }
            >
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Optimization</h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="flex justify-between items-center opacity-60">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          Hardware Acceleration
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                            Coming Soon
                          </span>
                        </h4>
                        <p className="text-sm text-default-500">
                          Use GPU acceleration when available
                        </p>
                      </div>
                      <Switch isDisabled={true} isSelected={false} />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Cache Templates</h4>
                        <p className="text-sm text-default-500">
                          Cache neural network templates for faster loading
                        </p>
                      </div>
                      <Switch
                        isSelected={settings.performance.cacheTemplates}
                        onValueChange={(value) =>
                          updateSetting("performance", "cacheTemplates", value)
                        }
                      />
                    </div>

                    <div className="opacity-60">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium flex items-center gap-2">
                          Max Undo History
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                            Coming Soon
                          </span>
                        </span>
                        <span className="text-sm text-default-500">
                          50 steps
                        </span>
                      </div>
                      <Slider
                        className="max-w-md"
                        isDisabled={true}
                        maxValue={200}
                        minValue={10}
                        size="sm"
                        step={10}
                        value={50}
                      />
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Development</h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="flex justify-between items-center opacity-60">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          Debug Mode
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                            Coming Soon
                          </span>
                        </h4>
                        <p className="text-sm text-default-500">
                          Enable detailed logging and debug information
                        </p>
                      </div>
                      <Switch isDisabled={true} isSelected={false} />
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>

            {/* Notifications Settings */}
            <Tab
              key="notifications"
              title={
                <div className="flex items-center space-x-2 px-1">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </div>
              }
            >
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">
                      Notification Preferences
                    </h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Enable Notifications</h4>
                        <p className="text-sm text-default-500">
                          Show system notifications
                        </p>
                      </div>
                      <Switch
                        isSelected={settings.notifications.enableNotifications}
                        onValueChange={(value) =>
                          updateSetting(
                            "notifications",
                            "enableNotifications",
                            value,
                          )
                        }
                      />
                    </div>

                    {settings.notifications.enableNotifications && (
                      <>
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">Save Notifications</h4>
                            <p className="text-sm text-default-500">
                              Show notifications when projects are saved
                            </p>
                          </div>
                          <Switch
                            isSelected={
                              settings.notifications.showSaveNotifications
                            }
                            onValueChange={(value) =>
                              updateSetting(
                                "notifications",
                                "showSaveNotifications",
                                value,
                              )
                            }
                          />
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">Validation Alerts</h4>
                            <p className="text-sm text-default-500">
                              Show notifications for validation issues
                            </p>
                          </div>
                          <Switch
                            isSelected={
                              settings.notifications.showValidationAlerts
                            }
                            onValueChange={(value) =>
                              updateSetting(
                                "notifications",
                                "showValidationAlerts",
                                value,
                              )
                            }
                          />
                        </div>

                        <div className="opacity-60">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium flex items-center gap-2">
                              Notification Duration
                              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                                Coming Soon
                              </span>
                            </span>
                            <span className="text-sm text-default-500">4s</span>
                          </div>
                          <Slider
                            className="max-w-md"
                            isDisabled={true}
                            maxValue={10000}
                            minValue={2000}
                            size="sm"
                            step={1000}
                            value={4000}
                          />
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <div className="flex justify-between w-full">
            <Button
              startContent={<RotateCcw className="w-4 h-4" />}
              variant="light"
              onPress={resetSettings}
            >
              Reset to Defaults
            </Button>
            <div className="flex gap-2">
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                startContent={<Save className="w-4 h-4" />}
                onPress={saveSettings}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SettingsModal;
