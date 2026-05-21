import React, { useEffect, useState } from "react";
import { Card, CardBody } from "@heroui/react";
import { CheckCircle, X, AlertCircle, Info } from "lucide-react";

export interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Auto-close after duration
    const timer = setTimeout(() => {
      closeToast();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const closeToast = () => {
    if (isClosing) return;
    setIsClosing(true);
    setIsVisible(false);
    // Allow exit animation to complete before removing
    setTimeout(() => onClose(id), 200);
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-danger" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case "info":
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getCardColor = () => {
    switch (type) {
      case "success":
        return "bg-success-50 border-success-200 dark:bg-success-950/30 dark:border-success-800";
      case "error":
        return "bg-danger-50 border-danger-200 dark:bg-danger-950/30 dark:border-danger-800";
      case "warning":
        return "bg-warning-50 border-warning-200 dark:bg-warning-950/30 dark:border-warning-800";
      case "info":
        return "bg-primary-50 border-primary-200 dark:bg-primary-950/30 dark:border-primary-800";
    }
  };

  return (
    <Card
      className={`
        ${getCardColor()}
        shadow-lg border transition-all duration-200 min-w-[300px] max-w-[400px]
        ${
          isVisible
            ? "transform translate-x-0 opacity-100"
            : "transform translate-x-full opacity-0"
        }
      `}
    >
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
            {message && <p className="text-xs text-default-600">{message}</p>}
          </div>
          <button
            aria-label="Close notification"
            className="text-default-400 hover:text-default-600 transition-colors"
            type="button"
            onClick={closeToast}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardBody>
    </Card>
  );
};

export default Toast;
