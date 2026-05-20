/* eslint-disable no-console */
import React, { useState, useEffect, useRef } from "react";
import { Node, Edge } from "reactflow";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Progress,
  Input,
  Alert,
} from "@heroui/react";
import {
  Activity,
  Brain,
  TrendingUp,
  Eye,
  Shuffle,
  Link,
  Server,
} from "lucide-react";

interface ColabInferenceStats {
  prediction: number;
  gender: string;
  confidence: number;
  layer_activations: { [layerName: string]: number };
  training_metrics?: {
    accuracy: number;
    loss: number;
    val_accuracy: number;
    val_loss: number;
  };
}

interface ColabInferenceEngineProps {
  nodes: Node[];
  edges: Edge[];
  inputValue: string;
  isRunning: boolean;
  onStatsUpdate: (stats: any) => void;
}

export class ColabAPIClient {
  private baseUrl: string;
  private isConnected: boolean = false;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, ""); // Remove trailing slash
  }

  async testConnection(
    maxRetries: number = 3,
  ): Promise<{ success: boolean; error?: string; details?: string }> {
    if (!this.baseUrl) {
      return { success: false, error: "No URL provided" };
    }

    // Validate URL format
    try {
      new URL(this.baseUrl);
    } catch {
      return { success: false, error: "Invalid URL format" };
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Connection attempt ${attempt}/${maxRetries} to ${this.baseUrl}`,
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(`${this.baseUrl}/health`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(
          `Response status: ${response.status}, content-type: ${response.headers.get("content-type")}`,
        );

        if (!response.ok) {
          const text = await response.text();

          // Special handling for ngrok errors
          if (
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504
          ) {
            if (attempt < maxRetries) {
              console.log("Ngrok tunnel may be initializing, retrying...");
              await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
              continue;
            }

            return {
              success: false,
              error: `Ngrok tunnel error (${response.status}). Flask server may be restarting.`,
              details:
                "Try waiting a moment and reconnecting, or restart the Colab cell.",
            };
          }

          return {
            success: false,
            error: `Server returned ${response.status}: ${response.statusText}`,
            details: text.substring(0, 200) + (text.length > 200 ? "..." : ""),
          };
        }

        const contentType = response.headers.get("content-type") || "";
        const responseText = await response.text();

        // Check if we're getting HTML (common ngrok issue)
        if (
          responseText.trim().startsWith("<!DOCTYPE") ||
          responseText.trim().startsWith("<html")
        ) {
          // Check if this is ngrok's "Visit Site" page
          if (
            responseText.includes("ngrok") &&
            (responseText.includes("Visit Site") ||
              responseText.includes("only for legitimate traffic"))
          ) {
            return {
              success: false,
              error: 'Ngrok "Visit Site" page detected',
              details:
                'You need to visit the ngrok URL in your browser first and click "Visit Site" to authorize access. This is ngrok\'s security feature.',
            };
          }

          if (attempt < maxRetries) {
            console.log(
              "Received HTML instead of JSON, Flask server may be starting up, retrying...",
            );
            await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds
            continue;
          }

          return {
            success: false,
            error: "Server returning HTML instead of JSON",
            details:
              "Flask server is not running properly. Check Colab notebook and restart the Flask server cell.",
          };
        }

        if (!contentType.includes("application/json")) {
          return {
            success: false,
            error: `Unexpected content type: ${contentType}`,
            details: responseText.substring(0, 200),
          };
        }

        let data;

        try {
          data = JSON.parse(responseText);
        } catch {
          return {
            success: false,
            error: "Invalid JSON response",
            details: responseText.substring(0, 200),
          };
        }

        console.log("Health check response:", data);

        this.isConnected = data.status === "healthy" && data.model_loaded;

        if (!this.isConnected) {
          return {
            success: false,
            error: `Model not ready: status=${data.status}, model_loaded=${data.model_loaded}`,
            details:
              "The Flask server is running but the neural network model is not loaded properly.",
          };
        }

        return { success: true };
      } catch (error) {
        console.error(`Connection attempt ${attempt} failed:`, error);

        if (error instanceof Error && error.name === "AbortError") {
          if (attempt < maxRetries) {
            console.log("Request timed out, retrying...");
            continue;
          }

          return {
            success: false,
            error: "Connection timeout - server not responding",
            details:
              "The server is taking too long to respond. Check if the Colab notebook is still running.",
          };
        }

        if (error instanceof TypeError && error.message.includes("fetch")) {
          if (attempt < maxRetries) {
            console.log("Network error, retrying...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          return {
            success: false,
            error: "Network error - cannot reach server",
            details:
              "Check if the ngrok URL is correct and the Colab notebook is running.",
          };
        }

        if (attempt === maxRetries) {
          this.isConnected = false;

          return {
            success: false,
            error: `Connection failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
            details: "Try restarting the Flask server in your Colab notebook.",
          };
        }
      }
    }

    return { success: false, error: "All connection attempts failed" };
  }

  async predict(
    name: string,
    retryCount: number = 2,
  ): Promise<ColabInferenceStats | null> {
    if (!this.baseUrl || !this.isConnected) {
      console.log("Not connected or no URL set");

      return null;
    }

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        console.log(
          `Prediction attempt ${attempt}/${retryCount} for name: ${name}`,
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${this.baseUrl}/predict`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ name }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";

          if (!contentType.includes("application/json")) {
            console.warn("Prediction response not JSON:", contentType);
            if (attempt < retryCount) continue;

            return null;
          }

          const data = await response.json();

          console.log("Prediction successful:", data);

          return data;
        } else {
          console.warn(`Prediction failed with status ${response.status}`);
          if (
            attempt < retryCount &&
            (response.status >= 500 || response.status === 502)
          ) {
            // Server errors - retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }

          return null;
        }
      } catch (error) {
        console.error(`Prediction attempt ${attempt} failed:`, error);

        if (error instanceof Error && error.name === "AbortError") {
          console.warn("Prediction request timed out");
          if (attempt < retryCount) {
            continue;
          }
        }

        if (attempt === retryCount) {
          console.error("All prediction attempts failed");

          return null;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return null;
  }

  async getModelInfo(): Promise<any> {
    if (!this.baseUrl || !this.isConnected) return null;

    try {
      const response = await fetch(`${this.baseUrl}/model_info`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error("Failed to get model info:", error);

      return null;
    }
  }

  isReady(): boolean {
    return this.isConnected && !!this.baseUrl;
  }
}

const ColabInferenceEngine: React.FC<ColabInferenceEngineProps> = ({
  nodes,
  edges, // eslint-disable-line @typescript-eslint/no-unused-vars
  inputValue,
  isRunning,
  onStatsUpdate,
}) => {
  const [stats, setStats] = useState<ColabInferenceStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [colabUrl, setColabUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");
  const [processingTime, setProcessingTime] = useState(0);
  const [connectionHealth, setConnectionHealth] = useState<
    "healthy" | "degraded" | "failed"
  >("healthy");
  const [lastSuccessfulCall, setLastSuccessfulCall] = useState<number>(0);

  const colabClientRef = useRef<ColabAPIClient>(new ColabAPIClient());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sample names for testing
  const sampleNames = [
    "Sarah",
    "Michael",
    "Emma",
    "David",
    "Jessica",
    "Robert",
    "Ashley",
    "William",
    "Amanda",
    "Christopher",
    "Michelle",
    "Matthew",
    "Lisa",
    "Joshua",
    "Emily",
    "Andrew",
    "Kimberly",
    "Daniel",
  ];

  const connectToColab = async () => {
    if (!colabUrl.trim()) {
      setError("Please enter a valid Colab URL");

      return;
    }

    // Validate URL format
    try {
      new URL(colabUrl);
    } catch {
      setError("Please enter a valid URL (must start with https://)");

      return;
    }

    setIsConnecting(true);
    setError("");

    try {
      console.log("Attempting to connect to:", colabUrl);
      colabClientRef.current.setBaseUrl(colabUrl);

      // Show progress updates
      setError(
        "🔄 Connecting to Colab server...\nTesting connection and validating Flask server...",
      );

      const result = await colabClientRef.current.testConnection(3); // 3 retry attempts

      if (result.success) {
        console.log("Connection successful!");
        setIsConnected(true);
        setError("");

        // Test a quick prediction to make sure everything works
        setError("✅ Connected! Testing neural network...");
        const testResult = await colabClientRef.current.predict("Test");

        if (testResult) {
          setError("");
          console.log("Test prediction successful:", testResult);
        } else {
          setError(
            "⚠️ Connected but prediction test failed. The server may be overloaded.",
          );
        }
      } else {
        console.error("Connection failed:", result.error);
        let errorMessage = `❌ ${result.error}`;

        if (result.details) {
          errorMessage += `\n\nServer response: ${result.details}`;
        }

        // Add helpful suggestions based on error type
        if (result.error?.includes('Ngrok "Visit Site"')) {
          errorMessage +=
            '\n\n🔐 NGROK SECURITY PAGE DETECTED:\n• Open the ngrok URL in your browser\n• Click "Visit Site" to authorize access\n• Then try connecting again\n• This is ngrok\'s normal security feature';
        } else if (
          result.error?.includes("HTML") ||
          result.error?.includes("JSON")
        ) {
          errorMessage += `\n\n💡 Flask server issue detected:\n• Make sure all Colab cells have finished running\n• Check that the Flask server cell shows "Flask server started successfully"\n• Try restarting the Flask server cell in Colab`;
        } else if (
          result.error?.includes("502") ||
          result.error?.includes("503") ||
          result.error?.includes("504")
        ) {
          errorMessage += `\n\n💡 Ngrok tunnel issue:\n• The tunnel may be restarting - wait 30 seconds and try again\n• Make sure you copied the complete ngrok URL\n• Check if the Colab notebook is still running`;
        } else if (
          result.error?.includes("timeout") ||
          result.error?.includes("Network error")
        ) {
          errorMessage += `\n\n💡 Connection issue:\n• Check your internet connection\n• Verify the ngrok URL is correct\n• Make sure the Colab notebook is still running`;
        } else if (result.error?.includes("Model not ready")) {
          errorMessage += `\n\n💡 Model loading issue:\n• The Flask server is running but the neural network model failed to load\n• Try running the model training cell again in Colab\n• Check the Colab notebook for any error messages`;
        }

        setError(errorMessage);
      }
    } catch (err) {
      console.error("Unexpected connection error:", err);
      setError(
        `💥 Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}\n\n🔧 Try:\n• Refreshing this page\n• Restarting the Colab notebook\n• Checking your internet connection`,
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setStats(null);
    setError("");
    setConnectionHealth("healthy");
    setLastSuccessfulCall(0);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (isRunning && isConnected && inputValue.trim()) {
      intervalRef.current = setInterval(async () => {
        const startTime = performance.now();
        const result = await colabClientRef.current.predict(inputValue);
        const endTime = performance.now();

        if (result) {
          setProcessingTime(endTime - startTime);
          setStats(result);
          setConnectionHealth("healthy");
          setLastSuccessfulCall(Date.now());

          // Convert to format expected by FlowCanvas
          const convertedStats = {
            prediction: result.prediction,
            confidence: result.confidence,
            processingTime: endTime - startTime,
            activations: {},
            layerOutputs: result.layer_activations || {},
            accuracy: result.training_metrics?.accuracy || 0.85,
            loss: result.training_metrics?.loss || 0.3,
          };

          onStatsUpdate(convertedStats);
        } else {
          // Prediction failed
          const timeSinceLastSuccess = Date.now() - lastSuccessfulCall;

          if (timeSinceLastSuccess > 10000) {
            // 10 seconds
            setConnectionHealth("degraded");
          }
          if (timeSinceLastSuccess > 30000) {
            // 30 seconds
            setConnectionHealth("failed");
          }
        }
      }, 2000); // Update every 2 seconds for real API calls
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isConnected, inputValue, onStatsUpdate, lastSuccessfulCall]);

  // Health monitoring effect
  useEffect(() => {
    if (isConnected) {
      setLastSuccessfulCall(Date.now());

      // Start health monitoring
      healthCheckIntervalRef.current = setInterval(async () => {
        try {
          const result = await colabClientRef.current.testConnection(1); // Single attempt

          if (!result.success) {
            const timeSinceLastSuccess = Date.now() - lastSuccessfulCall;

            if (timeSinceLastSuccess > 60000) {
              // 1 minute
              setConnectionHealth("failed");
              setError(
                `Connection lost: ${result.error}\n\n💡 The Colab server may have stopped or the ngrok tunnel expired.`,
              );
            } else {
              setConnectionHealth("degraded");
            }
          } else {
            if (connectionHealth !== "healthy") {
              setConnectionHealth("healthy");
              setError(""); // Clear error if connection recovered
            }
          }
        } catch (err) {
          console.error("Health check failed:", err);
        }
      }, 30000); // Check every 30 seconds
    } else {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    }

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [isConnected, connectionHealth, lastSuccessfulCall]);
  const tryRandomName = () => {
    const randomName =
      sampleNames[Math.floor(Math.random() * sampleNames.length)];
    // Find the text input node and update its value
    const textInputNode = nodes.find((n) => n.type === "textInput");

    if (textInputNode && textInputNode.data.onChange) {
      textInputNode.data.onChange(randomName);
    }
  };

  // Connection Setup UI
  if (!isConnected) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Connect to Google Colab</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="space-y-4">
            <Alert
              color="primary"
              description={
                <div className="space-y-2 text-sm">
                  <p>
                    1. Open Google Colab and run the gender classification
                    notebook
                  </p>
                  <p>2. Copy the ngrok public URL from the Colab output</p>
                  <p>3. Paste the URL below and click Connect</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Example: https://abcd1234.ngrok.io
                  </p>
                </div>
              }
              title="Setup Instructions"
            />

            <Alert
              color="warning"
              description={
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Before connecting:</strong>
                  </p>
                  <p>1. Open the ngrok URL in your browser first</p>
                  <p>
                    2. Click &quot;Visit Site&quot; on the ngrok security page
                  </p>
                  <p>
                    3. This authorizes the connection - then return here and
                    connect
                  </p>
                  <p className="text-xs mt-2 italic">
                    This prevents the &quot;HTML instead of JSON&quot; error
                  </p>
                </div>
              }
              title="⚠️ Ngrok Security Notice"
            />

            <div className="space-y-3">
              <Input
                label="Colab Server URL"
                placeholder="https://your-ngrok-url.ngrok.io"
                startContent={<Link className="w-4 h-4 text-default-400" />}
                value={colabUrl}
                onChange={(e) => setColabUrl(e.target.value)}
              />

              {error && (
                <Alert
                  color="danger"
                  description={
                    <div className="whitespace-pre-wrap text-sm">{error}</div>
                  }
                  title="Connection Error"
                />
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  color="primary"
                  isLoading={isConnecting}
                  onClick={connectToColab}
                >
                  {isConnecting ? "Connecting..." : "Connect to Colab"}
                </Button>

                <Button
                  color="secondary"
                  variant="flat"
                  onClick={async () => {
                    if (!colabUrl.trim()) {
                      setError("Please enter a URL first");

                      return;
                    }

                    // Test just accessing the URL
                    try {
                      const response = await fetch(colabUrl, { method: "GET" });
                      const text = await response.text();

                      setError(
                        `Debug - Server responded with:\nStatus: ${response.status}\nContent-Type: ${response.headers.get("content-type")}\nFirst 300 chars: ${text.substring(0, 300)}...`,
                      );
                    } catch (err) {
                      setError(
                        `Debug - Failed to reach server: ${err instanceof Error ? err.message : "Unknown error"}`,
                      );
                    }
                  }}
                >
                  Debug
                </Button>

                <Button
                  startContent={<Shuffle className="w-4 h-4" />}
                  variant="flat"
                  onClick={tryRandomName}
                >
                  Try Random
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Loading state
  if (!stats && isRunning) {
    return (
      <Card className="w-full">
        <CardBody className="text-center p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Server className="w-6 h-6 text-success animate-pulse" />
            <span className="text-success font-medium">Connected to Colab</span>
          </div>
          <Brain className="w-12 h-12 mx-auto mb-4 text-default-400 animate-pulse" />
          <p className="text-default-500 mb-4">
            Getting predictions from real neural network...
          </p>
          <Button color="danger" size="sm" variant="light" onClick={disconnect}>
            Disconnect
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="w-full">
        <CardBody className="text-center p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Server className="w-6 h-6 text-success" />
            <span className="text-success font-medium">Connected to Colab</span>
          </div>
          <Brain className="w-12 h-12 mx-auto mb-4 text-default-400" />
          <p className="text-default-500 mb-4">
            Start inference to see real neural network predictions
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              color="primary"
              startContent={<Shuffle className="w-4 h-4" />}
              variant="flat"
              onClick={tryRandomName}
            >
              Try Random Name
            </Button>
            <Button
              color="danger"
              size="sm"
              variant="light"
              onClick={disconnect}
            >
              Disconnect
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const genderColor = stats.gender === "Female" ? "secondary" : "primary";

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardBody className="py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server
                className={`w-4 h-4 ${
                  connectionHealth === "healthy"
                    ? "text-success"
                    : connectionHealth === "degraded"
                      ? "text-warning"
                      : "text-danger"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  connectionHealth === "healthy"
                    ? "text-success"
                    : connectionHealth === "degraded"
                      ? "text-warning"
                      : "text-danger"
                }`}
              >
                Real Neural Network (Colab)
                {connectionHealth === "degraded" && " - Connection Issues"}
                {connectionHealth === "failed" && " - Connection Lost"}
              </span>
              {connectionHealth !== "healthy" && (
                <Chip
                  color={connectionHealth === "degraded" ? "warning" : "danger"}
                  size="sm"
                  variant="flat"
                >
                  {connectionHealth === "degraded" ? "Unstable" : "Offline"}
                </Chip>
              )}
            </div>
            <div className="flex items-center gap-2">
              {connectionHealth === "failed" && (
                <Button
                  color="warning"
                  size="sm"
                  variant="flat"
                  onClick={connectToColab}
                >
                  Reconnect
                </Button>
              )}
              <Button
                color="danger"
                size="sm"
                variant="light"
                onClick={disconnect}
              >
                Disconnect
              </Button>
            </div>
          </div>
          {connectionHealth !== "healthy" && error && (
            <div className="mt-2 text-xs text-default-500">
              {error.split("\n")[0]} {/* Show just the first line */}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Prediction Result */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Real AI Prediction</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-2xl font-bold">{stats.gender}</p>
              <p className="text-small text-default-500">
                Probability: {(stats.prediction * 100).toFixed(1)}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Chip color={genderColor} size="lg" variant="flat">
                {(stats.confidence * 100).toFixed(1)}% confident
              </Chip>
              <Button
                isIconOnly
                size="sm"
                title="Try random name"
                variant="light"
                onClick={tryRandomName}
              >
                <Shuffle className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Progress
            className="mb-2"
            color={genderColor}
            value={stats.prediction * 100}
          />
          <p className="text-small text-default-400">
            Processing time: {processingTime.toFixed(0)}ms (real network + API)
          </p>
        </CardBody>
      </Card>

      {/* Model Performance */}
      {stats.training_metrics && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Real Training Metrics</h3>
            </div>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-small text-default-500 mb-1">
                  Training Accuracy
                </p>
                <div className="flex items-center gap-2">
                  <Progress
                    className="flex-1"
                    color="success"
                    size="sm"
                    value={stats.training_metrics.accuracy * 100}
                  />
                  <span className="text-small font-medium">
                    {(stats.training_metrics.accuracy * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-small text-default-500 mb-1">
                  Validation Accuracy
                </p>
                <div className="flex items-center gap-2">
                  <Progress
                    className="flex-1"
                    color="primary"
                    size="sm"
                    value={stats.training_metrics.val_accuracy * 100}
                  />
                  <span className="text-small font-medium">
                    {(stats.training_metrics.val_accuracy * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-small text-default-500 mb-1">
                  Training Loss
                </p>
                <div className="flex items-center gap-2">
                  <Progress
                    className="flex-1"
                    color="warning"
                    size="sm"
                    value={(1 - stats.training_metrics.loss) * 100}
                  />
                  <span className="text-small font-medium">
                    {stats.training_metrics.loss.toFixed(3)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-small text-default-500 mb-1">
                  Validation Loss
                </p>
                <div className="flex items-center gap-2">
                  <Progress
                    className="flex-1"
                    color="danger"
                    size="sm"
                    value={(1 - stats.training_metrics.val_loss) * 100}
                  />
                  <span className="text-small font-medium">
                    {stats.training_metrics.val_loss.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Real Layer Activations */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Real Layer Activations</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <div className="space-y-3">
            {Object.entries(stats.layer_activations).map(
              ([layerName, intensity]) => (
                <div key={layerName} className="flex items-center gap-3">
                  <div className="w-20 text-small text-default-500 truncate capitalize">
                    {layerName}
                  </div>
                  <Progress
                    className="flex-1"
                    color={intensity > 0.5 ? "success" : "default"}
                    size="sm"
                    value={Math.min(intensity * 100, 100)}
                  />
                  <span className="text-small font-mono w-12 text-right">
                    {intensity.toFixed(3)}
                  </span>
                </div>
              ),
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ColabInferenceEngine;
