/**
 * components/TrainingPanel.tsx
 * ----------------------------
 * Multi-pipeline training panel.
 *
 * Each independent pipeline (dataset node → preprocessing → model) gets its
 * own tab with completely isolated metrics, charts, status, and results.
 * Pipelines run in parallel; the panel shows all of them simultaneously.
 */

import React, { useMemo, useState } from "react";
import { Button, Card, CardBody, Chip, Progress, Tab, Tabs } from "@heroui/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { X, Activity, ZapOff, CheckCircle, AlertCircle, GitBranch } from "lucide-react";
import { Icon } from "@iconify/react";

import { usePlexusStore, TrainingJobState } from "@/store/plexusStore";
import { updateJobStatus } from "@/lib/api";

// ── Colour helpers ────────────────────────────────────────────────────────────
const PIPELINE_COLOURS = ["#006FEE","#17C964","#F5A524","#9353D3","#F31260","#00B8D9"];
let _ci = 0;
const _cm = new Map<string, string>();
function jobColour(pipelineId: string) {
  if (!_cm.has(pipelineId)) { _cm.set(pipelineId, PIPELINE_COLOURS[_ci++ % PIPELINE_COLOURS.length]); }
  return _cm.get(pipelineId)!;
}

const statusColour = (s: string) => {
  switch (s) {
    case "completed": return "success";
    case "running": case "queued": return "warning";
    case "paused": return "secondary";
    case "error": return "danger";
    default: return "default";
  }
};

// ── Single-job panel ──────────────────────────────────────────────────────────
const JobPanel: React.FC<{ job: TrainingJobState }> = ({ job }) => {
  const colour = jobColour(job.pipelineId);

  const chartData = useMemo(() => {
    const { loss, accuracy, val_loss, val_accuracy } = job.metrics;
    const len = Math.max(loss.length, accuracy.length, val_loss.length, val_accuracy.length);
    return Array.from({ length: len }, (_, i) => ({
      epoch: i + 1,
      loss: loss[i] ?? null,
      accuracy: accuracy[i] !== undefined ? +(accuracy[i] * 100).toFixed(2) : null,
      val_loss: val_loss[i] ?? null,
      val_accuracy: val_accuracy[i] !== undefined ? +(val_accuracy[i] * 100).toFixed(2) : null,
    }));
  }, [job.metrics]);

  const gradEntries = useMemo(
    () => Object.entries(job.gradientNorms).sort(([, a], [, b]) => (b as number) - (a as number)),
    [job.gradientNorms],
  );

  const latest = chartData.at(-1);
  const result = job.result as Record<string, any> | null;

  const handlePauseResume = async () => {
    if (!job.jobId) return;
    const next = job.status === "running" ? "paused" : "running";
    try {
      await updateJobStatus(job.jobId, next);
      usePlexusStore.getState().updateJob(job.jobId, { status: next as any });
    } catch { /* ignore */ }
  };

  const handleStop = async () => {
    if (!job.jobId) return;
    try {
      await updateJobStatus(job.jobId, "stopped");
      usePlexusStore.getState().updateJob(job.jobId, { status: "stopped" });
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Pipeline summary badge */}
      <div className="flex flex-wrap gap-1 items-center">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colour }} />
        <span className="text-xs text-default-500 font-mono truncate">{job.label}</span>
      </div>

      {/* Preprocessing steps */}
      {job.preprocessingSteps.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.preprocessingSteps.map((s) => (
            <Chip key={s} size="sm" variant="flat" color="primary">{s}</Chip>
          ))}
          <span className="text-xs text-default-400 self-center">→</span>
          {job.modelTypes.map((m) => (
            <Chip key={m} size="sm" variant="flat" color="secondary">{m}</Chip>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {job.status !== "idle" && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-default-600">Epoch {job.epoch} / {job.epochs}</span>
            <span className="text-default-500">{job.progress}%</span>
          </div>
          <Progress
            color={job.status === "error" ? "danger" : job.status === "completed" ? "success" : "primary"}
            size="sm"
            value={job.progress}
            style={{ "--progress-fill": colour } as any}
          />
        </div>
      )}

      {/* Controls */}
      {(job.status === "running" || job.status === "paused") && (
        <div className="flex gap-2">
          <Button size="sm" variant="flat"
            color={job.status === "running" ? "warning" : "success"}
            startContent={<Icon icon={job.status === "running" ? "lucide:pause" : "lucide:play"} />}
            onPress={handlePauseResume}
          >
            {job.status === "running" ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" variant="flat" color="danger"
            startContent={<Icon icon="lucide:square" />}
            onPress={handleStop}
          >
            Stop
          </Button>
        </div>
      )}

      {/* Completed result summary */}
      {job.status === "completed" && result && (
        <Card className="border" style={{ borderColor: colour + "66" }}>
          <CardBody className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="font-medium text-sm">Training complete</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Loss", result.final_loss?.toFixed(4)],
                ["Accuracy", result.final_accuracy !== undefined ? (result.final_accuracy * 100).toFixed(2) + "%" : null],
                ["Val Loss", result.final_val_loss?.toFixed(4)],
                ["Val Acc", result.final_val_accuracy !== undefined ? (result.final_val_accuracy * 100).toFixed(2) + "%" : null],
              ].filter(([, v]) => v != null).map(([label, value]) => (
                <div key={label as string} className="flex flex-col">
                  <span className="text-default-500">{label}</span>
                  <span className="font-semibold" style={{ color: colour }}>{value}</span>
                </div>
              ))}
            </div>
            {result.model_results?.length > 1 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs font-semibold text-default-500 uppercase">Model Ranking</div>
                {(result.comparison ?? result.model_results).slice(0, 5).map((row: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-default-400 w-5">#{row.rank ?? i + 1}</span>
                    <span className="flex-1 truncate">{row.label || row.model_type}</span>
                    <span className="font-mono" style={{ color: colour }}>
                      {row.val_accuracy !== undefined ? `${(row.val_accuracy * 100).toFixed(1)}%` : row.val_loss?.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Error */}
      {job.status === "error" && job.error && (
        <Card className="border border-danger-200 bg-danger-50 dark:bg-danger-900/20">
          <CardBody className="p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
              <p className="text-sm text-danger break-all">{job.error}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Live metric cards */}
      {latest && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {latest.loss !== null && (
            <Card><CardBody className="p-2 text-center">
              <div className="text-lg font-bold" style={{ color: colour }}>{latest.loss.toFixed(4)}</div>
              <div className="text-default-500">Loss</div>
            </CardBody></Card>
          )}
          {latest.accuracy !== null && (
            <Card><CardBody className="p-2 text-center">
              <div className="text-lg font-bold text-success">{latest.accuracy.toFixed(2)}%</div>
              <div className="text-default-500">Accuracy</div>
            </CardBody></Card>
          )}
          {latest.val_loss !== null && (
            <Card><CardBody className="p-2 text-center">
              <div className="text-lg font-bold text-warning">{latest.val_loss.toFixed(4)}</div>
              <div className="text-default-500">Val Loss</div>
            </CardBody></Card>
          )}
          {latest.val_accuracy !== null && (
            <Card><CardBody className="p-2 text-center">
              <div className="text-lg font-bold text-secondary">{latest.val_accuracy.toFixed(2)}%</div>
              <div className="text-default-500">Val Acc</div>
            </CardBody></Card>
          )}
        </div>
      )}

      {/* Loss chart */}
      {chartData.length > 1 && (
        <div>
          <div className="text-xs font-semibold text-default-600 mb-1 uppercase tracking-wide">Loss Curve</div>
          <ResponsiveContainer height={130} width="100%">
            <LineChart data={chartData}>
              <CartesianGrid opacity={0.3} strokeDasharray="3 3" />
              <XAxis dataKey="epoch" tick={{ fontSize: 9 }} tickLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 10 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line dataKey="loss" dot={false} name="Train" stroke={colour} strokeWidth={2} type="monotone" />
              <Line dataKey="val_loss" dot={false} name="Val" stroke={colour + "88"} strokeWidth={2} strokeDasharray="4 2" type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Accuracy chart */}
      {chartData.length > 1 && chartData.some((d) => d.accuracy !== null) && (
        <div>
          <div className="text-xs font-semibold text-default-600 mb-1 uppercase tracking-wide">Accuracy</div>
          <ResponsiveContainer height={110} width="100%">
            <LineChart data={chartData}>
              <CartesianGrid opacity={0.3} strokeDasharray="3 3" />
              <XAxis dataKey="epoch" tick={{ fontSize: 9 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => `${v.toFixed(2)}%`} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line dataKey="accuracy" dot={false} name="Train" stroke="#17C964" strokeWidth={2} type="monotone" />
              <Line dataKey="val_accuracy" dot={false} name="Val" stroke="#9353D3" strokeWidth={2} strokeDasharray="4 2" type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gradient norms */}
      {gradEntries.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-default-600 mb-1 uppercase tracking-wide flex items-center gap-1">
            <ZapOff className="w-3 h-3" /> Gradient Norms
          </div>
          <div className="space-y-1">
            {gradEntries.slice(0, 6).map(([id, norm]) => {
              const n = norm as number;
              const dead = n < 1e-5;
              return (
                <div key={id} className="flex items-center gap-2 text-xs">
                  <span className={`truncate w-28 ${dead ? "text-danger" : "text-default-600"}`}>{id}</span>
                  <div className="flex-1 bg-default-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, n * 100)}%`, backgroundColor: dead ? "#F31260" : colour }} />
                  </div>
                  <span className={`w-12 text-right font-mono ${dead ? "text-danger" : "text-default-500"}`}>
                    {dead ? "DEAD" : n.toFixed(4)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────
const TrainingPanel: React.FC = () => {
  const open = usePlexusStore((s) => s.trainingPanelOpen);
  const setOpen = usePlexusStore((s) => s.setTrainingPanelOpen);
  const trainingJobs = usePlexusStore((s) => s.trainingJobs);
  const activeJobId = usePlexusStore((s) => s.activeJobId);
  const setActiveJobId = usePlexusStore((s) => s.setActiveJobId);
  const clearAllJobs = usePlexusStore((s) => s.clearAllJobs);

  const jobs = Object.values(trainingJobs);
  const runningCount = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[420px] z-50 bg-background/95 backdrop-blur border-l border-default-200 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-default-200 shrink-0">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <div>
            <span className="font-semibold">Training Pipelines</span>
            <p className="text-[10px] text-default-400 leading-tight">
              {jobs.length === 0 ? "No active jobs" : `${runningCount} running · ${completedCount} done · ${jobs.length} total`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {jobs.length > 0 && (
            <Button size="sm" variant="light" color="danger" onPress={clearAllJobs}>
              Clear all
            </Button>
          )}
          <Button isIconOnly size="sm" variant="light" onPress={() => setOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {jobs.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-default-400 px-6 text-center">
          <Activity className="w-10 h-10 opacity-30" />
          <p className="text-sm">No training jobs yet.</p>
          <p className="text-xs">Add dataset nodes to the canvas, connect models, and click Train.</p>
        </div>
      )}

      {/* Multi-pipeline comparison header */}
      {jobs.length > 1 && (
        <div className="px-4 py-2 border-b border-default-100 bg-default-50 dark:bg-default-900/30 shrink-0">
          <div className="text-xs font-semibold text-default-600 mb-1.5 uppercase tracking-wide">
            Pipeline Comparison
          </div>
          <div className="space-y-1">
            {jobs.map((job) => {
              const colour = jobColour(job.pipelineId);
              const acc = (job.result as any)?.final_val_accuracy;
              return (
                <div key={job.jobId} className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-80"
                  onClick={() => setActiveJobId(job.jobId)}>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour }} />
                  <span className="flex-1 truncate text-default-600">{job.label}</span>
                  <Chip size="sm" variant="flat" color={statusColour(job.status) as any}>{job.status}</Chip>
                  {acc !== undefined && (
                    <span className="font-mono font-semibold" style={{ color: colour }}>
                      {(acc * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Job tabs */}
      {jobs.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs
            selectedKey={activeJobId ?? jobs[0]?.jobId}
            onSelectionChange={(k) => setActiveJobId(k as string)}
            classNames={{ tabList: "px-2 pt-2 shrink-0", panel: "flex-1 overflow-y-auto px-4 pb-4" }}
            size="sm"
          >
            {jobs.map((job) => {
              const colour = jobColour(job.pipelineId);
              return (
                <Tab
                  key={job.jobId}
                  title={
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colour }} />
                      <span className="max-w-[80px] truncate text-xs">{job.datasetName}</span>
                      <Chip size="sm" variant="dot" color={statusColour(job.status) as any}
                        style={{ "--chip-dot-bg": colour } as any}>
                        {job.preprocessingSteps.length > 0 ? `+${job.preprocessingSteps.length}` : "raw"}
                      </Chip>
                    </div>
                  }
                >
                  <JobPanel job={job} />
                </Tab>
              );
            })}
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default TrainingPanel;
