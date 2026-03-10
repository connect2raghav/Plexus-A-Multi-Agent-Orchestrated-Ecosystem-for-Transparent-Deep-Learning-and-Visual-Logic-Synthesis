"""
core/graph_utils.py
-------------------
Helpers to convert between the flat layer-list format returned by the
Architect Agent and:
  - A React-Flow-compatible node/edge graph (for the NEOD frontend)
  - A Keras/TensorFlow Sequential model code snippet

Layer dict format (internal standard):
    {
        "id":         str,           # e.g. "layer_0"
        "type":       str,           # "Dense", "Conv2D", "LSTM", "Dropout", etc.
        "params":     dict,          # layer-specific keyword args
        "activation": str | None,    # applied after the layer (or inside it)
    }
"""

from __future__ import annotations

import textwrap
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------

LayerSpec = Dict[str, Any]
NodeDef = Dict[str, Any]   # React-Flow node
EdgeDef = Dict[str, Any]   # React-Flow edge


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

def layers_to_graph(
    layers: List[LayerSpec],
    x_spacing: int = 200,
    y_base: int = 100,
) -> Tuple[List[NodeDef], List[EdgeDef]]:
    """
    Convert a sequential list of layer specs into React-Flow nodes and edges.

    Parameters
    ----------
    layers : list of LayerSpec
        Ordered list of layer dictionaries.
    x_spacing : int
        Horizontal pixel gap between nodes.
    y_base : int
        Fixed y-coordinate for all nodes (single row layout).

    Returns
    -------
    (nodes, edges) : tuple of lists
        Ready to be serialised as JSON and sent to the NEOD frontend.
    """
    nodes: List[NodeDef] = []
    edges: List[EdgeDef] = []

    for idx, layer in enumerate(layers):
        layer_id = layer.get("id", f"layer_{idx}")
        label = _layer_label(layer)

        node: NodeDef = {
            "id": layer_id,
            "type": "default",
            "data": {
                "label": label,
                "layerType": layer.get("type", "Unknown"),
                "params": layer.get("params", {}),
                "activation": layer.get("activation"),
            },
            "position": {"x": idx * x_spacing, "y": y_base},
        }
        nodes.append(node)

        if idx > 0:
            prev_id = layers[idx - 1].get("id", f"layer_{idx - 1}")
            edge: EdgeDef = {
                "id": f"edge_{prev_id}_{layer_id}",
                "source": prev_id,
                "target": layer_id,
                "type": "smoothstep",
            }
            edges.append(edge)

    return nodes, edges


def _layer_label(layer: LayerSpec) -> str:
    """Build a short human-readable label for a layer node."""
    layer_type = layer.get("type", "Layer")
    params = layer.get("params", {})
    activation = layer.get("activation")

    parts = [layer_type]
    # Add the most relevant parameter (units, filters, rate…)
    for key in ("units", "filters", "rate", "size"):
        if key in params:
            parts.append(f"{key}={params[key]}")
            break
    if activation:
        parts.append(activation)
    return " | ".join(parts)


# ---------------------------------------------------------------------------
# Keras code generation
# ---------------------------------------------------------------------------

def graph_to_keras_code(
    layers: List[LayerSpec],
    model_var: str = "model",
) -> str:
    """
    Generate a Keras Sequential model from a list of layer specs.

    Parameters
    ----------
    layers : list of LayerSpec
    model_var : str
        Variable name used in the output code.

    Returns
    -------
    str
        A self-contained Python code snippet (no leading indentation).
    """
    imports = textwrap.dedent(
        """\
        import tensorflow as tf
        from tensorflow import keras
        from tensorflow.keras import layers as kl
        """
    )

    layer_lines: List[str] = []
    for layer in layers:
        line = _layer_to_keras_call(layer)
        if line:
            layer_lines.append(f"    {line},")

    layers_block = "\n".join(layer_lines)

    code = (
        f"{imports}\n"
        f"{model_var} = keras.Sequential([\n"
        f"{layers_block}\n"
        f"])\n"
    )
    return code


def _layer_to_keras_call(layer: LayerSpec) -> Optional[str]:
    """Convert a single layer spec dict to a Keras layer constructor call."""
    layer_type = layer.get("type", "").strip()
    params = dict(layer.get("params", {}))
    activation = layer.get("activation")

    # Inject activation into params for layers that support it inline
    if activation and layer_type in ("Dense", "Conv2D", "Conv1D", "LSTM", "GRU"):
        params["activation"] = activation

    if not layer_type:
        return None

    # Map common generic names → Keras class paths
    keras_map: Dict[str, str] = {
        "Dense": "kl.Dense",
        "Conv2D": "kl.Conv2D",
        "Conv1D": "kl.Conv1D",
        "MaxPooling2D": "kl.MaxPooling2D",
        "Flatten": "kl.Flatten",
        "Dropout": "kl.Dropout",
        "BatchNormalization": "kl.BatchNormalization",
        "LSTM": "kl.LSTM",
        "GRU": "kl.GRU",
        "Embedding": "kl.Embedding",
        "GlobalAveragePooling2D": "kl.GlobalAveragePooling2D",
        "Input": "kl.InputLayer",
    }

    keras_class = keras_map.get(layer_type, f"kl.{layer_type}")

    # Serialise params as keyword arguments
    kw_parts = []
    for k, v in params.items():
        if isinstance(v, str):
            kw_parts.append(f'{k}="{v}"')
        else:
            kw_parts.append(f"{k}={v}")

    kw_str = ", ".join(kw_parts)
    return f"{keras_class}({kw_str})"
