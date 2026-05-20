"""
agents/resource.py
------------------
Resource Estimator Agent – deterministic implementation.

Computes parameter counts, memory estimates, and training time projections
from the ReactFlow graph (nodes + edges) without running any model.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

from .base import AgentResult, BaseAgent


# ---------------------------------------------------------------------------
# Parameter counters per layer type
# ---------------------------------------------------------------------------

def _dense_params(units: int, input_units: int, bias: bool = True) -> int:
    return units * input_units + (units if bias else 0)


def _conv2d_params(filters: int, kernel: Tuple[int, int], in_channels: int, bias: bool = True) -> int:
    return filters * kernel[0] * kernel[1] * in_channels + (filters if bias else 0)


def _lstm_params(units: int, input_size: int) -> int:
    # 4 gates, each has W_h, W_x, b
    return 4 * (units * units + units * input_size + units)


def _gru_params(units: int, input_size: int) -> int:
    # 3 gates
    return 3 * (units * units + units * input_size + units)


def _embedding_params(vocab_size: int, embed_dim: int) -> int:
    return vocab_size * embed_dim


def _batch_norm_params(features: int) -> int:
    return 4 * features  # gamma, beta, running_mean, running_var


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class ResourceAgent(BaseAgent):
    """Estimates compute resources from a ReactFlow graph."""

    def __init__(self) -> None:
        super().__init__(
            name="resource_agent",
            description=(
                "Estimates parameter count, memory footprint, and approximate "
                "training time for a given architecture and dataset size."
            ),
        )

    async def run(self, inputs: Dict[str, Any]) -> AgentResult:
        """
        Expected inputs
        ---------------
        nodes      : list[dict]  – ReactFlow node objects
        edges      : list[dict]  – ReactFlow edge objects
        batch_size : int         – planned batch size (default 32)
        epochs     : int         – planned epochs (default 10)
        n_rows     : int         – dataset rows (optional, for time estimate)
        """
        nodes: List[Dict[str, Any]] = inputs.get("nodes", [])
        edges: List[Dict[str, Any]] = inputs.get("edges", [])
        batch_size: int = int(inputs.get("batch_size", 32))
        epochs: int = int(inputs.get("epochs", 10))
        n_rows: int = int(inputs.get("n_rows", 10_000))

        if not nodes:
            return self._fail("'nodes' list is required and must be non-empty.")

        # ---- Count parameters ----
        total_params, trainable_params, layer_stats = self._count_params(nodes, edges)

        # ---- Memory estimate ----
        # Parameter memory: float32 = 4 bytes per param
        param_mem_mb = total_params * 4 / (1024 ** 2)
        # Activation memory rough estimate: assume avg 1000 activations per layer
        activation_mem_mb = len(nodes) * 1000 * 4 * batch_size / (1024 ** 2)
        # Gradient memory ≈ param memory (for Adam: 2× for m+v)
        gradient_mem_mb = param_mem_mb * 3
        total_mem_mb = param_mem_mb + activation_mem_mb + gradient_mem_mb

        # ---- Time estimate ----
        # Very rough: ~0.1 ms per 1000 params per batch step on CPU
        steps_per_epoch = math.ceil(n_rows / batch_size)
        ms_per_step = max(1, total_params / 1_000_000 * 200)   # heuristic
        seconds_per_epoch = steps_per_epoch * ms_per_step / 1000
        total_seconds = seconds_per_epoch * epochs

        # ---- Hardware recommendation ----
        if total_params < 100_000:
            hardware = "CPU is sufficient for this small model."
        elif total_params < 5_000_000:
            hardware = "A single GPU (4 GB VRAM) is recommended."
        elif total_params < 50_000_000:
            hardware = "A mid-range GPU (8–16 GB VRAM) is recommended."
        else:
            hardware = "A high-end GPU (24+ GB VRAM) or multi-GPU setup is recommended."

        # ---- Warnings ----
        warnings: List[str] = []
        if total_mem_mb > 8 * 1024:
            warnings.append(
                f"Estimated GPU memory ({total_mem_mb / 1024:.1f} GB) may exceed typical GPU limits. "
                "Consider reducing batch size or model size."
            )
        if total_params > 100_000_000:
            warnings.append("Very large model (>100M params). Training will be slow without a powerful GPU.")

        return self._ok({
            "total_parameters": total_params,
            "trainable_parameters": trainable_params,
            "layer_stats": layer_stats,
            "memory_estimate_mb": round(total_mem_mb, 2),
            "param_memory_mb": round(param_mem_mb, 2),
            "estimated_training_seconds": round(total_seconds, 1),
            "estimated_training_minutes": round(total_seconds / 60, 2),
            "hardware_recommendation": hardware,
            "warnings": warnings,
            "model_size_kb": round(param_mem_mb * 1024, 1),
        })

    @staticmethod
    def _count_params(
        nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
    ) -> Tuple[int, int, List[Dict[str, Any]]]:
        """Estimate parameter counts for each node."""
        total = 0
        trainable = 0
        layer_stats: List[Dict[str, Any]] = []

        # Build adjacency to infer input shapes (simplified: assume linear)
        edge_map: Dict[str, str] = {e["target"]: e["source"] for e in edges}

        # Track output size per node id
        output_sizes: Dict[str, int] = {}

        for node in nodes:
            ntype: str = (node.get("type") or "").lower()
            data: Dict[str, Any] = node.get("data", {})
            props: Dict[str, Any] = data.get("properties", {}) or {}
            node_id: str = node.get("id", "")

            # Determine input size from predecessor
            prev_id = edge_map.get(node_id)
            input_size = output_sizes.get(prev_id, 128) if prev_id else 128

            params = 0
            out_size = input_size

            if ntype in ("dense",):
                units = int(props.get("units", 64))
                params = _dense_params(units, input_size)
                out_size = units

            elif ntype in ("conv2d",):
                filters = int(props.get("filters", 32))
                k = int(props.get("kernelSize", 3))
                params = _conv2d_params(filters, (k, k), max(1, input_size))
                out_size = filters

            elif ntype in ("lstm",):
                units = int(props.get("units", 64))
                params = _lstm_params(units, input_size)
                out_size = units

            elif ntype in ("gru",):
                units = int(props.get("units", 64))
                params = _gru_params(units, input_size)
                out_size = units

            elif ntype in ("embedding",):
                vocab = int(props.get("vocabSize", 10000))
                dim = int(props.get("embeddingDim", 64))
                params = _embedding_params(vocab, dim)
                out_size = dim

            elif ntype in ("batchnorm", "batchnormalization"):
                params = _batch_norm_params(input_size)
                out_size = input_size

            elif ntype in ("dropout", "flatten", "maxpool", "maxpool2d", "softmax", "activation"):
                params = 0
                out_size = input_size

            elif ntype in ("inputlayer", "input"):
                shape_str = props.get("shape", "784")
                try:
                    parts = [int(x) for x in str(shape_str).replace("(", "").replace(")", "").split(",") if x.strip()]
                    out_size = int(parts[-1]) if parts else 784
                except Exception:
                    out_size = 784
                params = 0

            output_sizes[node_id] = out_size
            total += params
            trainable += params  # all params trainable in this estimate

            if ntype not in ("inputlayer", "input"):
                layer_stats.append({
                    "id": node_id,
                    "type": ntype,
                    "params": params,
                    "output_size": out_size,
                })

        return total, trainable, layer_stats
