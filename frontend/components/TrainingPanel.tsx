/**
 * components/TrainingPanel.tsx
 * ----------------------------
 * Slide-over panel that shows real-time training metrics and X-Ray
 * gradient flow data. Uses Recharts for the charts.
 *
 * Opened automatically when training starts (controlled by Zustand store).
 */

import React, { useMemo } from "react";
import { Button, Card, CardBody, Chip, Progress } from "@heroui/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { X, Activity, ZapOff, CheckCircle, AlertCircle } from "lucide-react";

import { usePlexusStore } from "@/store/plexusStore";

const statusColour = (s: string) => {
  switch (s) {
    case "completed":
      return "success";
    case "running":
    case "queued":
      return "warning";
    case "error":
      return "danger";
    default:
      return "default";
  }
};

const TrainingPanel: React.FC = () => {
  const open = usePlexusStore((s) => s.trainingPanelOpen);
  const setOpen = usePlexusStore((s) => s.setTrainingPanelOpen);
  const training = usePlexusStore((s) => s.training);
  const resetTraining = usePlexusStore((s) => s.resetTraining);

  // Build data array for Recharts
  const chartData = useMemo(() => {
    const { loss, accuracy, val_loss, val_accuracy } = training.metrics;
    const len = Math.max(
      loss.length,
      accuracy.length,
      val_loss.length,
      val_accuracy.length
    );
    return Array.from({ length: len }, (_, i) => ({
      epoch: i + 1,
      loss: loss[i] ?? null,
      accuracy: accuracy[i] !== undefined ? +(accuracy[i] * 100).toFixed(2) : null,
      val_loss: val_loss[i] ?? null,
      val_accuracy: val_accuracy[i] !== undefined ? +(val_accuracy[i] * 100).toFixed(2) : null,
    }));
  }, [training.metrics]);

  // Gradient norms for X-Ray bar
  const gradEntries = useMemo(
    () =>
      Object.entries(training.gradientNorms).sort(
        ([, a], [, b]) => (b as number) - (a as number)
      ),
    [training.gradientNorms]
  );

  if (!open) return null;

  const latest = chartData.at(-1);

  return (
    <div className="fixed right-0 top-0 bottom-10 w-96 z-50 bg-background/95 backdrop-blur border-l border-default-200 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-default-200">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <div>
            <span className="font-semibold">Training</span>
            <p className="text-[10px] text-default-400 leading-tight">Primary results on canvas</p>
          </div>
          <Chip
            color={statusColour(training.status) as any}
            size="sm"
            variant="flat"
          >
            {training.status}
          </Chip>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={() => setOpen(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Progress */}
        {training.status !== "idle" && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-default-600">
                Epoch {training.epoch} / {training.epochs}
              </span>
              <span className="text-default-500">{training.progress}%</span>
            </div>
            <Progress
              color={
                training.status === "error"
                  ? "danger"
                  : training.status === "completed"
                    ? "success"
                    : "primary"
              }
              size="sm"
              value={training.progress}
            />
          </div>
        )}

        {/* Final result */}
        {training.status === "completed" && training.result && (
          <Card className="border border-success-200 bg-success-50 dark:bg-success-900/20">
            <CardBody className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="font-medium text-sm">Training complete</span>
                {(training.result as any).mode === "simulated" && (
                  <Chip color="warning" size="sm" variant="flat">
                    simulated
                  </Chip>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Final Loss", (training.result as any).final_loss?.toFixed(4)],
                  [
                    "Final Accuracy",
                    training.result
                      ? ((training.result as any).final_accuracy * 100).toFixed(2) + "%"
                      : null,
                  ],
                  [
                    "Val Loss",
                    (training.result as any).final_val_loss?.toFixed(4),
                  ],
                  [
                    "Val Accuracy",
                    training.result
                      ? ((training.result as any).final_val_accuracy * 100).toFixed(
                          2
                        ) + "%"
                      : null,
                  ],
                ]
                  .filter(([, v]) => v !== undefined && v !== null)
                  .map(([label, value]) => (
                    <div key={label as string} className="flex flex-col">
                      <span className="text-default-500">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Error */}
        {training.status === "error" && training.error && (
          <Card className="border border-danger-200 bg-danger-50 dark:bg-danger-900/20">
            <CardBody className="p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                <p className="text-sm text-danger break-all">{training.error}</p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Live metrics */}
        {latest && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {latest.loss !== null && (
              <Card>
                <CardBody className="p-2 text-center">
                  <div className="text-lg font-bold text-primary">
                    {latest.loss.toFixed(4)}
                  </div>
                  <div className="text-default-500">Loss</div>
                </CardBody>
              </Card>
            )}
            {latest.accuracy !== null && (
              <Card>
                <CardBody className="p-2 text-center">
                  <div className="text-lg font-bold text-success">
                    {latest.accuracy.toFixed(2)}%
                  </div>
                  <div className="text-default-500">Accuracy</div>
                </CardBody>
              </Card>
            )}
            {latest.val_loss !== null && (
              <Card>
                <CardBody className="p-2 text-center">
                  <div className="text-lg font-bold text-warning">
                    {latest.val_loss.toFixed(4)}
                  </div>
                  <div className="text-default-500">Val Loss</div>
                </CardBody>
              </Card>
            )}
            {latest.val_accuracy !== null && (
              <Card>
                <CardBody className="p-2 text-center">
                  <div className="text-lg font-bold text-secondary">
                    {latest.val_accuracy.toFixed(2)}%
                  </div>
                  <div className="text-default-500">Val Acc</div>
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {/* Loss chart */}
        {chartData.length > 1 && (
          <div>
            <h4 className="text-xs font-semibold text-default-600 mb-2 uppercase tracking-wide">
              Loss Curve
            </h4>
            <ResponsiveContainer height={140} width="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="epoch"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  dataKey="loss"
                  dot={false}
                  name="Train Loss"
                  stroke="#006FEE"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="val_loss"
                  dot={false}
                  name="Val Loss"
                  stroke="#F5A524"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Accuracy chart */}
        {chartData.length > 1 && chartData.some((d) => d.accuracy !== null) && (
          <div>
            <h4 className="text-xs font-semibold text-default-600 mb-2 uppercase tracking-wide">
              Accuracy Curve
            </h4>
            <ResponsiveContainer height={120} width="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="epoch"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => `${v.toFixed(2)}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  dataKey="accuracy"
                  dot={false}
                  name="Train Acc"
                  stroke="#17C964"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="val_accuracy"
                  dot={false}
                  name="Val Acc"
                  stroke="#9353D3"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* X-Ray: gradient norms */}
        {gradEntries.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-default-600 mb-2 uppercase tracking-wide flex items-center gap-1">
              <ZapOff className="w-3.5 h-3.5" />
              X-Ray: Gradient Norms
            </h4>
            <div className="space-y-1">
              {gradEntries.slice(0, 8).map(([id, norm]) => {
                const n = norm as number;
                const isDead = n < 1e-5;
                return (
                  <div key={id} className="flex items-center gap-2 text-xs">
                    <span
                      className={`truncate w-32 ${isDead ? "text-danger" : "text-default-600"}`}
                    >
                      {id}
                    </span>
                    <div className="flex-1 bg-default-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isDead ? "bg-danger" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, n * 100)}%` }}
                      />
                    </div>
                    <span
                      className={`w-14 text-right ${isDead ? "text-danger" : "text-default-500"}`}
                    >
                      {isDead ? "DEAD" : n.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-default-200 px-4 py-2 flex justify-between">
        <Button size="sm" variant="flat" onPress={resetTraining}>
          Reset
        </Button>
        <Button color="primary" size="sm" variant="flat" onPress={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default TrainingPanel;
