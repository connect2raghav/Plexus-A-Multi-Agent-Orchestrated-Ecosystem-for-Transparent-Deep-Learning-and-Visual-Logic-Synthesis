"""
agents/debugger.py
------------------
Training Debugger Agent – heuristic-based implementation.

Detects common neural network training problems from a Keras-style
history dict and returns structured diagnoses + fix suggestions.
No LLM required; all rules are deterministic.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from .base import AgentResult, BaseAgent

logger = logging.getLogger(__name__)


class DebuggerAgent(BaseAgent):
    """Diagnoses common neural network training problems."""

    def __init__(self) -> None:
        super().__init__(
            name="debugger_agent",
            description=(
                "Analyses training logs to detect and diagnose common "
                "training problems (overfitting, underfitting, vanishing gradients, etc.)."
            ),
        )

    async def run(self, inputs: Dict[str, Any]) -> AgentResult:
        """
        Analyse training history and return diagnoses.

        Expected inputs
        ---------------
        history : dict
            Keys: "loss", "val_loss", "accuracy", "val_accuracy"
            Each maps to a list of per-epoch float values.
        threshold_overfit : float
            Val-loss / train-loss ratio above which we flag overfitting.
            Default: 1.15 (15 % worse).
        patience : int
            Consecutive epochs of rising val_loss to flag overfitting.
            Default: 3.
        """
        history: Dict[str, List[float]] = inputs.get("history", {})
        if not history:
            return self._fail("'history' dict is required and must be non-empty.")

        threshold_overfit: float = float(inputs.get("threshold_overfit", 1.15))
        patience: int = int(inputs.get("patience", 3))

        loss: List[float] = history.get("loss", [])
        val_loss: List[float] = history.get("val_loss", [])
        accuracy: List[float] = history.get("accuracy", [])
        val_accuracy: List[float] = history.get("val_accuracy", [])

        diagnoses: List[Dict[str, Any]] = []
        node_highlights: List[str] = []  # node IDs to highlight on the canvas

        # ---- 1. Overfitting ----
        if loss and val_loss and len(val_loss) >= patience:
            last_train = loss[-1]
            last_val = val_loss[-1]
            # Check if val_loss has risen for `patience` consecutive epochs
            consecutive_rise = sum(
                1 for i in range(-patience, 0)
                if abs(i) <= len(val_loss) - 1 and val_loss[i] > val_loss[i - 1]
            )
            if last_val > last_train * threshold_overfit or consecutive_rise >= patience:
                diagnoses.append({
                    "type": "overfitting",
                    "severity": "warning",
                    "message": (
                        f"Validation loss ({last_val:.4f}) is significantly higher than "
                        f"training loss ({last_train:.4f}). The model may be overfitting."
                    ),
                    "suggestions": [
                        "Add Dropout layers (rate 0.2–0.5) after Dense layers.",
                        "Add L2 regularization to Dense layers.",
                        "Reduce model complexity (fewer layers or units).",
                        "Use data augmentation if applicable.",
                        "Try early stopping with patience=5.",
                    ],
                })

        # ---- 2. Underfitting / training not converging ----
        if loss and len(loss) >= 3:
            last_loss = loss[-1]
            first_loss = loss[0]
            relative_improvement = (first_loss - last_loss) / (first_loss + 1e-8)
            if relative_improvement < 0.05:
                diagnoses.append({
                    "type": "underfitting",
                    "severity": "warning",
                    "message": (
                        f"Training loss improved by only {relative_improvement * 100:.1f}%. "
                        "The model may not be learning."
                    ),
                    "suggestions": [
                        "Increase learning rate (try 10× current value).",
                        "Add more layers or increase layer width.",
                        "Train for more epochs.",
                        "Check data preprocessing – ensure features are normalised.",
                        "Verify the loss function matches your task type.",
                    ],
                })

        # ---- 3. Loss not decreasing (oscillating / stuck) ----
        if loss and len(loss) >= 5:
            last5 = loss[-5:]
            deviation = max(last5) - min(last5)
            if deviation < 1e-4 and loss[-1] > 0.5:
                diagnoses.append({
                    "type": "stuck_loss",
                    "severity": "error",
                    "message": (
                        "Loss has not changed in the last 5 epochs "
                        f"(range = {deviation:.6f}). Training may be stuck."
                    ),
                    "suggestions": [
                        "Reduce learning rate by 10× – may be overshooting.",
                        "Check for dead neurons (ReLU throughout, no BatchNorm).",
                        "Check that gradients are flowing through all layers.",
                        "Inspect your data loader – ensure data is being shuffled.",
                    ],
                })

        # ---- 4. Vanishing gradients heuristic via gradient norms ----
        gradient_norms: Dict[str, float] = inputs.get("gradient_norms", {})
        dead_nodes: List[str] = []
        if gradient_norms:
            for node_id, norm in gradient_norms.items():
                if norm < 1e-5:
                    dead_nodes.append(node_id)
                    node_highlights.append(node_id)
            if dead_nodes:
                diagnoses.append({
                    "type": "vanishing_gradients",
                    "severity": "warning",
                    "message": (
                        f"Very small gradient norms detected in {len(dead_nodes)} layer(s). "
                        "Earlier layers may not be updating."
                    ),
                    "affected_nodes": dead_nodes,
                    "suggestions": [
                        "Add BatchNormalization after problematic layers.",
                        "Switch from Sigmoid/Tanh activations to ReLU / LeakyReLU.",
                        "Use He (Kaiming) weight initialisation for ReLU networks.",
                        "Consider using residual/skip connections.",
                    ],
                })

        # ---- 5. High accuracy but high val_loss (confidence overfit) ----
        if accuracy and val_loss and val_accuracy:
            if accuracy[-1] > 0.95 and val_accuracy[-1] < 0.75:
                diagnoses.append({
                    "type": "confidence_overfit",
                    "severity": "info",
                    "message": (
                        f"Training accuracy ({accuracy[-1]:.1%}) is much higher than "
                        f"validation accuracy ({val_accuracy[-1]:.1%}). "
                        "Model is memorising training data."
                    ),
                    "suggestions": [
                        "Add Dropout (0.3–0.5) before the final Dense layer.",
                        "Apply label smoothing in the loss function.",
                        "Augment training data.",
                    ],
                })

        # ---- Summary ----
        severities = [d["severity"] for d in diagnoses]
        overall = "error" if "error" in severities else ("warning" if "warning" in severities else "ok")

        return self._ok({
            "overall": overall,
            "diagnoses": diagnoses,
            "node_highlights": node_highlights,
            "summary": (
                f"{len(diagnoses)} issue(s) detected." if diagnoses
                else "No significant training issues detected."
            ),
        })
