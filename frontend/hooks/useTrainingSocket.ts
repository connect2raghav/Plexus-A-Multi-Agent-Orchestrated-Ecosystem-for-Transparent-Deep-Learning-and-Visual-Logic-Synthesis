/**
 * hooks/useTrainingSocket.ts
 * --------------------------
 * Connects a WebSocket for every active training job and routes updates
 * to the correct TrainingJobState slot in the Zustand store.
 *
 * Accepts an array of jobIds so multiple parallel pipelines are all
 * streamed simultaneously.
 */

import { useEffect, useRef } from "react";

import { getJobStatus, getTrainingWsUrl } from "@/lib/api";
import { usePlexusStore } from "@/store/plexusStore";

const TERMINAL_STATUSES = new Set(["completed", "error", "stopped"]);

export function useTrainingSocket(jobIds: string | string[] | null): void {
  const socketMap = useRef<Map<string, WebSocket>>(new Map());
  const updateJob = usePlexusStore((s) => s.updateJob);
  const addLog = usePlexusStore((s) => s.addLog);

  const applyJobState = (jobId: string, msg: Record<string, any>) => {
    updateJob(jobId, {
      status: msg.status,
      epoch: msg.epoch ?? 0,
      epochs: msg.epochs,
      progress: msg.progress ?? 0,
      metrics: msg.metrics ?? {
        loss: [],
        accuracy: [],
        val_loss: [],
        val_accuracy: [],
      },
      gradientNorms: msg.gradient_norms ?? msg.gradientNorms ?? {},
      result: msg.result ?? null,
      error: msg.error ?? null,
    });
  };

  const ids: string[] = jobIds
    ? Array.isArray(jobIds)
      ? jobIds
      : [jobIds]
    : [];

  useEffect(() => {
    // Open sockets for new job IDs
    ids.forEach((jobId) => {
      if (socketMap.current.has(jobId)) return;

      const url = getTrainingWsUrl(jobId);
      const socket = new WebSocket(url);
      socketMap.current.set(jobId, socket);

      socket.onopen = () => {
        addLog("info", `Connected to training stream: job ${jobId}.`, "WebSocket");
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.type === "current_state" || msg.type === "epoch_end") {
            applyJobState(jobId, msg);

            if (msg.type === "epoch_end") {
              const loss = msg.metrics?.loss?.at(-1);
              const acc = msg.metrics?.accuracy?.at(-1);
              if (loss !== undefined && acc !== undefined) {
                addLog(
                  "info",
                  `[${jobId}] Epoch ${msg.epoch}: loss=${loss.toFixed(4)}, acc=${(acc * 100).toFixed(2)}%`,
                  "Training",
                );
              }
            }
          } else if (msg.type === "training_complete") {
            updateJob(jobId, {
              status: "completed",
              progress: 100,
              result: msg.result ?? null,
            });
            addLog("success", `[${jobId}] Training completed.`, "Training");
          } else if (msg.type === "training_paused") {
            updateJob(jobId, { status: "paused", result: msg.result ?? null });
            addLog("info", `[${jobId}] Training paused.`, "Training");
          } else if (msg.type === "training_stopped") {
            updateJob(jobId, { status: "stopped", result: msg.result ?? null });
            addLog("info", `[${jobId}] Training stopped.`, "Training");
          } else if (msg.type === "error") {
            updateJob(jobId, {
              status: "error",
              error: msg.error ?? "Unknown error",
            });
            addLog("error", `[${jobId}] Training error: ${msg.error}`, "Training");
          }
        } catch (err) {
          addLog("error", `Failed to parse WS message: ${err}`, "WebSocket");
        }
      };

      socket.onerror = () => {
        addLog("warning", `WebSocket error for job ${jobId}.`, "WebSocket");
      };

      socket.onclose = () => {
        addLog("info", `Training stream closed: job ${jobId}.`, "WebSocket");
        socketMap.current.delete(jobId);
      };
    });

    // Close sockets for jobs no longer in the list
    socketMap.current.forEach((socket, jobId) => {
      if (!ids.includes(jobId)) {
        socket.close();
        socketMap.current.delete(jobId);
      }
    });
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling fallback: WebSockets can miss the final message during rapid
  // multi-job launches or reconnects. The status endpoint is the source of truth.
  useEffect(() => {
    if (ids.length === 0) return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      const state = usePlexusStore.getState();
      const activeIds = ids.filter((jobId) => {
        const job = state.trainingJobs[jobId];

        return job && !TERMINAL_STATUSES.has(job.status);
      });

      await Promise.all(
        activeIds.map(async (jobId) => {
          try {
            const status = await getJobStatus(jobId);
            if (cancelled) return;

            applyJobState(jobId, status);
            if (status.status === "completed") {
              addLog("success", `[${jobId}] Training completed.`, "Training");
            } else if (status.status === "error") {
              addLog(
                "error",
                `[${jobId}] Training error: ${status.error ?? "Unknown error"}`,
                "Training",
              );
            }
          } catch (err) {
            addLog("warning", `Failed to poll job ${jobId}: ${err}`, "Training");
          }
        }),
      );
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      socketMap.current.forEach((socket) => socket.close());
      socketMap.current.clear();
    };
  }, []);
}
