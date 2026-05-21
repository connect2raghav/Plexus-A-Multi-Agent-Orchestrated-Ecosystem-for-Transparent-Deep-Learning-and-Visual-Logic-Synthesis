/**
 * components/ConsolePanel.tsx
 * ---------------------------
 * Collapsible console/logs panel shown at the bottom of the canvas page.
 * Displays training logs, agent messages, and errors from the Zustand store.
 */

import React, { useRef, useEffect, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Trash2, ChevronDown, ChevronUp, Terminal } from "lucide-react";

import { usePlexusStore, LogEntry } from "@/store/plexusStore";

const LEVEL_COLOURS: Record<LogEntry["level"], string> = {
  info: "text-default-600 dark:text-default-400",
  success: "text-success-600",
  warning: "text-warning-600",
  error: "text-danger-600",
  agent: "text-primary-600",
};

const LEVEL_PREFIX: Record<LogEntry["level"], string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
  agent: "🤖",
};

const ConsolePanel: React.FC = () => {
  const logs = usePlexusStore((s) => s.logs);
  const clearLogs = usePlexusStore((s) => s.clearLogs);
  const open = usePlexusStore((s) => s.consolePanelOpen);
  const setOpen = usePlexusStore((s) => s.setConsolePanelOpen);

  const [filter, setFilter] = useState<LogEntry["level"] | "all">("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new logs
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, open]);

  const visible =
    filter === "all" ? logs : logs.filter((l) => l.level === filter);

  const newErrors = logs.filter((l) => l.level === "error").length;
  const newWarnings = logs.filter((l) => l.level === "warning").length;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-default-200
        transition-all duration-200 shadow-lg
        ${open ? "h-52" : "h-10"}
      `}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 h-10 cursor-pointer select-none"
        role="button"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-default-500" />
          <span className="text-sm font-medium">Console</span>
          {newErrors > 0 && (
            <Chip color="danger" size="sm" variant="flat">
              {newErrors} error{newErrors !== 1 ? "s" : ""}
            </Chip>
          )}
          {newWarnings > 0 && (
            <Chip color="warning" size="sm" variant="flat">
              {newWarnings} warning{newWarnings !== 1 ? "s" : ""}
            </Chip>
          )}
          <span className="text-xs text-default-400">
            {logs.length} message{logs.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            title="Clear console"
            variant="light"
            onPress={() => {
              clearLogs();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          {open ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Log pane */}
      {open && (
        <div className="flex flex-col h-[calc(100%-2.5rem)]">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 px-3 py-1 border-b border-default-100">
            {(
              ["all", "info", "success", "warning", "error", "agent"] as const
            ).map((lvl) => (
              <Button
                key={lvl}
                className="text-xs h-6 min-w-0 px-2"
                size="sm"
                variant={filter === lvl ? "solid" : "light"}
                onPress={() => setFilter(lvl)}
              >
                {lvl}
              </Button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto font-mono text-xs px-3 py-1 space-y-0.5">
            {visible.length === 0 ? (
              <p className="text-default-400 py-4 text-center">No messages.</p>
            ) : (
              visible.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-5">
                  <span className="text-default-400 shrink-0">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  {log.source && (
                    <span className="text-primary-500 shrink-0">
                      [{log.source}]
                    </span>
                  )}
                  <span className={LEVEL_COLOURS[log.level]}>
                    {LEVEL_PREFIX[log.level]}
                  </span>
                  <span className={`${LEVEL_COLOURS[log.level]} break-all`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsolePanel;
