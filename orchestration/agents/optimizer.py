"""
agents/optimizer.py
-------------------
Hyperparameter Optimizer Agent – heuristic-based implementation.

Analyses a completed training history and suggests improved hyperparameter
values (learning rate, batch size, epochs) without running actual search.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from .base import AgentResult, BaseAgent


class OptimizerAgent(BaseAgent):
    """Suggests hyperparameter improvements based on training history."""

    def __init__(self) -> None:
        super().__init__(
            name="optimizer_agent",
            description=(
                "Analyses training history to suggest better learning rate, "
                "batch size, and other hyperparameters."
            ),
        )

    async def run(self, inputs: Dict[str, Any]) -> AgentResult:
        """
        Expected inputs
        ---------------
        history         : dict  – {"loss": [...], "val_loss": [...], ...}
        current_lr      : float – current learning rate (default 0.001)
        current_batch_size : int – current batch size (default 32)
        """
        history: Dict[str, List[float]] = inputs.get("history", {})
        if not history or not history.get("loss"):
            return self._fail("'history' with at least 'loss' is required.")

        current_lr: float = float(inputs.get("current_lr", 1e-3))
        current_bs: int = int(inputs.get("current_batch_size", 32))

        loss: List[float] = history.get("loss", [])
        val_loss: List[float] = history.get("val_loss", [])
        accuracy: List[float] = history.get("accuracy", [])

        suggestions: List[Dict[str, Any]] = []
        recommended: Dict[str, Any] = {
            "learning_rate": current_lr,
            "batch_size": current_bs,
        }

        # ---- Learning rate analysis ----
        if len(loss) >= 3:
            # Check if loss is still falling fast at the end → LR may be good or could increase
            last_delta = loss[-3] - loss[-1]
            relative_delta = last_delta / (loss[-3] + 1e-8)

            if relative_delta < 0.01:
                # Barely improving – LR too low OR already converged
                if loss[-1] > 0.5:
                    new_lr = current_lr * 5
                    suggestions.append({
                        "param": "learning_rate",
                        "current": current_lr,
                        "recommended": new_lr,
                        "reason": "Loss improvement stalled. Increasing LR to escape plateau.",
                    })
                    recommended["learning_rate"] = new_lr
                else:
                    # Well-converged; suggest reducing for fine-tuning
                    new_lr = current_lr * 0.3
                    suggestions.append({
                        "param": "learning_rate",
                        "current": current_lr,
                        "recommended": new_lr,
                        "reason": "Loss well-converged. Reducing LR for fine-tuning.",
                    })
                    recommended["learning_rate"] = new_lr
            elif relative_delta > 0.3 and len(loss) >= 5:
                # Very fast improvement – could increase LR to speed up
                pass  # LR is working well, don't change

        # Loss oscillating → LR too high
        if len(loss) >= 6:
            last6 = loss[-6:]
            oscillating = sum(
                1 for i in range(1, len(last6))
                if (last6[i] - last6[i - 1]) * (last6[i - 1] - last6[i - 2] if i >= 2 else -1) < 0
            )
            if oscillating >= 4:
                new_lr = current_lr * 0.1
                suggestions.append({
                    "param": "learning_rate",
                    "current": current_lr,
                    "recommended": new_lr,
                    "reason": "Loss is oscillating. Reducing LR for stability.",
                })
                recommended["learning_rate"] = new_lr

        # ---- Batch size ----
        if val_loss and loss:
            overfit_gap = val_loss[-1] - loss[-1] if val_loss else 0
            if overfit_gap > 0.3:
                new_bs = max(8, current_bs // 2)
                suggestions.append({
                    "param": "batch_size",
                    "current": current_bs,
                    "recommended": new_bs,
                    "reason": (
                        "Overfitting detected. Smaller batch size adds regularisation noise."
                    ),
                })
                recommended["batch_size"] = new_bs
            elif overfit_gap < -0.1:
                # Val loss better than train loss – underfitting, larger batch could help
                new_bs = min(256, current_bs * 2)
                suggestions.append({
                    "param": "batch_size",
                    "current": current_bs,
                    "recommended": new_bs,
                    "reason": "Underfitting detected. Larger batch may help gradient estimates.",
                })
                recommended["batch_size"] = new_bs

        # ---- Epochs suggestion ----
        if accuracy and accuracy[-1] < 0.8 and len(accuracy) < 30:
            suggestions.append({
                "param": "epochs",
                "current": len(loss),
                "recommended": len(loss) * 2,
                "reason": "Accuracy is still low. Training for more epochs may help.",
            })
            recommended["epochs"] = len(loss) * 2

        # ---- LR scheduler suggestion ----
        if len(loss) >= 10 and loss[-1] > 0.1:
            suggestions.append({
                "param": "lr_scheduler",
                "current": "none",
                "recommended": "ReduceLROnPlateau(patience=3, factor=0.5)",
                "reason": "Adding a learning rate scheduler can accelerate convergence.",
            })

        summary = (
            f"{len(suggestions)} hyperparameter suggestion(s) generated."
            if suggestions
            else "Current hyperparameters appear well-tuned."
        )

        return self._ok({
            "suggestions": suggestions,
            "recommended": recommended,
            "summary": summary,
        })
