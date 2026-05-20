/**
 * hooks/useTrainingSocket.ts
 * --------------------------
 * WebSocket hook that connects to /ws/train/{jobId} on the Plexus backend
 * and streams real-time training updates into the Zustand store.
 */

import { useEffect, useRef } from "react";
import { getTrainingWsUrl } from "@/lib/api";
import { usePlexusStore } from "@/store/plexusStore";

export function useTrainingSocket(jobId: string | null): void {
  const ws = useRef<WebSocket | null>(null);
  const updateTraining = usePlexusStore((s) => s.updateTraining);
  const addLog = usePlexusStore((s) => s.addLog);

  useEffect(() => {
    if (!jobId) return;

    const url = getTrainingWsUrl(jobId);
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      addLog("info", `Connected to training stream for job ${jobId}.`, "WebSocket");
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "current_state" || msg.type === "epoch_end") {
          updateTraining({
            status: msg.status,
            epoch: msg.epoch ?? 0,
            progress: msg.progress ?? 0,
            metrics: msg.metrics ?? {
              loss: [],
              accuracy: [],
              val_loss: [],
              val_accuracy: [],
            },
            gradientNorms: msg.gradient_norms ?? {},
          });

          if (msg.type === "epoch_end") {
            const ep = msg.epoch;
            const loss = msg.metrics?.loss?.at(-1);
            const acc = msg.metrics?.accuracy?.at(-1);
            if (loss !== undefined && acc !== undefined) {
              addLog(
                "info",
                `Epoch ${ep}: loss=${loss.toFixed(4)}, accuracy=${(acc * 100).toFixed(2)}%`,
                "Training"
              );
            }
          }
        } else if (msg.type === "training_complete") {
          updateTraining({
            status: "completed",
            progress: 100,
            result: msg.result ?? null,
          });
          addLog("success", "Training completed.", "Training");
        } else if (msg.type === "error") {
          updateTraining({ status: "error", error: msg.error ?? "Unknown error" });
          addLog("error", `Training error: ${msg.error}`, "Training");
        } else if (msg.type === "log") {
          addLog("info", msg.message ?? JSON.stringify(msg), "Training");
        }
      } catch (err) {
        addLog("error", `Failed to parse WebSocket message: ${err}`, "WebSocket");
      }
    };

    socket.onerror = () => {
      addLog("warning", `WebSocket error for job ${jobId}. Will retry.`, "WebSocket");
    };

    socket.onclose = () => {
      addLog("info", `Training stream closed for job ${jobId}.`, "WebSocket");
    };

    return () => {
      socket.close();
      ws.current = null;
    };
  }, [jobId, updateTraining, addLog]);
}
