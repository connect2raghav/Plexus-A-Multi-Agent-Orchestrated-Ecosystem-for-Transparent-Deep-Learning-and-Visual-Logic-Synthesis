"""
core/code_generator.py
-----------------------
Converts a ReactFlow graph (list of node dicts + edge dicts) into
executable Python code for TensorFlow/Keras or PyTorch.

Node format (from frontend)
---------------------------
{
    "id":   str,
    "type": str,   # e.g. "dense", "conv2d", "lstm", "dropout", ...
    "data": {
        "label":      str,
        "properties": {<layer params>}
    }
}

Edge format
-----------
{
    "id":     str,
    "source": str,   # node id
    "target": str    # node id
}
"""

from __future__ import annotations

import textwrap
from typing import Any, Dict, List, Optional, OrderedDict as OrderedDictType, Set, Tuple


class GraphCodeGenerator:
    """
    Converts a ReactFlow graph to Python training code.

    Parameters
    ----------
    nodes : list of dicts (ReactFlow nodes)
    edges : list of dicts (ReactFlow edges)
    """

    def __init__(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> None:
        self._nodes: List[Dict[str, Any]] = nodes
        self._edges: List[Dict[str, Any]] = edges
        # id → node lookup
        self._node_map: Dict[str, Dict[str, Any]] = {n["id"]: n for n in nodes}
        # source → [targets]
        self._adjacency: Dict[str, List[str]] = {}
        # target → [sources]
        self._reverse: Dict[str, List[str]] = {}
        for edge in edges:
            self._adjacency.setdefault(edge["source"], []).append(edge["target"])
            self._reverse.setdefault(edge["target"], []).append(edge["source"])

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    def generate(self, framework: str = "tensorflow") -> str:
        """
        Generate Python code for the given framework.

        Parameters
        ----------
        framework : "tensorflow" | "pytorch"
        """
        ordered = self._topological_sort()
        if framework.lower() in ("pytorch", "torch"):
            return self._gen_pytorch(ordered)
        return self._gen_tensorflow(ordered)

    # ------------------------------------------------------------------
    # Topological sort (Kahn's algorithm)
    # ------------------------------------------------------------------

    def _topological_sort(self) -> List[Dict[str, Any]]:
        in_degree: Dict[str, int] = {n["id"]: 0 for n in self._nodes}
        for edge in self._edges:
            in_degree[edge["target"]] = in_degree.get(edge["target"], 0) + 1

        queue: List[str] = [nid for nid, d in in_degree.items() if d == 0]
        result: List[Dict[str, Any]] = []

        while queue:
            nid = queue.pop(0)
            result.append(self._node_map[nid])
            for target in self._adjacency.get(nid, []):
                in_degree[target] -= 1
                if in_degree[target] == 0:
                    queue.append(target)

        # Fall back to original order if graph has cycles (shouldn't happen)
        if len(result) != len(self._nodes):
            return self._nodes

        return result

    # ------------------------------------------------------------------
    # TensorFlow / Keras
    # ------------------------------------------------------------------

    def _gen_tensorflow(self, ordered: List[Dict[str, Any]]) -> str:
        lines: List[str] = []
        lines.append("# Plexus-generated TensorFlow/Keras model")
        lines.append("import tensorflow as tf")
        lines.append("from tensorflow.keras import layers, models, optimizers")
        lines.append("import numpy as np")
        lines.append("")

        # Determine if sequential or functional (branches: multiple inputs to same node)
        is_functional = any(len(v) > 1 for v in self._reverse.values())

        if is_functional:
            lines += self._gen_tf_functional(ordered)
        else:
            lines += self._gen_tf_sequential(ordered)

        return "\n".join(lines)

    def _gen_tf_sequential(self, ordered: List[Dict[str, Any]]) -> List[str]:
        lines: List[str] = []
        layer_lines: List[str] = []

        for node in ordered:
            ntype = (node.get("type") or "").lower()
            props = (node.get("data") or {}).get("properties") or {}
            call = self._tf_layer_call(ntype, props)
            if call:
                layer_lines.append(f"    {call},")

        lines.append("model = tf.keras.Sequential([")
        lines.extend(layer_lines)
        lines.append("])")
        lines.append("")
        lines.append("model.compile(")
        lines.append('    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),')
        lines.append('    loss="sparse_categorical_crossentropy",')
        lines.append('    metrics=["accuracy"],')
        lines.append(")")
        lines.append("")
        lines.append("model.summary()")
        return lines

    def _gen_tf_functional(self, ordered: List[Dict[str, Any]]) -> List[str]:
        lines: List[str] = []
        var_name: Dict[str, str] = {}

        for i, node in enumerate(ordered):
            nid = node["id"]
            ntype = (node.get("type") or "").lower()
            props = (node.get("data") or {}).get("properties") or {}
            var = f"x{i}"

            sources = self._reverse.get(nid, [])
            if not sources:
                # Input node
                shape = _parse_shape(props.get("shape", "784"))
                lines.append(f"inputs = layers.Input(shape=({shape},))")
                var_name[nid] = "inputs"
                continue

            if len(sources) == 1:
                prev = var_name.get(sources[0], "inputs")
                call = self._tf_layer_call(ntype, props)
                if call:
                    lines.append(f"{var} = {call}({prev})")
                    var_name[nid] = var
                else:
                    var_name[nid] = prev
            else:
                # Merge
                prev_vars = [var_name.get(s, "inputs") for s in sources]
                inputs_str = ", ".join(prev_vars) + ("," if len(prev_vars) == 1 else "")
                if ntype == "add":
                    lines.append(f"{var} = layers.Add()([{', '.join(prev_vars)}])")
                else:
                    lines.append(f"{var} = layers.Concatenate()([{', '.join(prev_vars)}])")
                var_name[nid] = var

        last_var = list(var_name.values())[-1] if var_name else "inputs"
        lines.append("")
        lines.append(f"model = tf.keras.Model(inputs=inputs, outputs={last_var})")
        lines.append("model.compile(")
        lines.append('    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),')
        lines.append('    loss="sparse_categorical_crossentropy",')
        lines.append('    metrics=["accuracy"],')
        lines.append(")")
        lines.append("model.summary()")
        return lines

    @staticmethod
    def _tf_layer_call(ntype: str, props: Dict[str, Any]) -> Optional[str]:
        """Return a Keras layers.Xxx(...) call string for the given node type."""
        p = props

        if ntype in ("inputlayer", "input"):
            shape = _parse_shape(p.get("shape", "784"))
            return f"layers.InputLayer(input_shape=({shape},))"
        if ntype == "dense":
            units = p.get("units", 64)
            act = p.get("activation", "relu")
            return f'layers.Dense({units}, activation="{act}")'
        if ntype == "conv2d":
            filters = p.get("filters", 32)
            k = p.get("kernelSize", 3)
            act = p.get("activation", "relu")
            return f'layers.Conv2D({filters}, ({k}, {k}), activation="{act}", padding="same")'
        if ntype in ("maxpool", "maxpool2d", "maxpooling2d"):
            pool = p.get("poolSize", 2)
            return f"layers.MaxPooling2D(pool_size=({pool}, {pool}))"
        if ntype in ("avgpool", "avgpool2d", "averagepooling2d"):
            pool = p.get("poolSize", 2)
            return f"layers.AveragePooling2D(pool_size=({pool}, {pool}))"
        if ntype == "flatten":
            return "layers.Flatten()"
        if ntype == "dropout":
            rate = p.get("rate", 0.3)
            return f"layers.Dropout({rate})"
        if ntype in ("batchnorm", "batchnormalization"):
            return "layers.BatchNormalization()"
        if ntype == "lstm":
            units = p.get("units", 64)
            ret_seq = p.get("returnSequences", False)
            return f"layers.LSTM({units}, return_sequences={ret_seq})"
        if ntype == "gru":
            units = p.get("units", 64)
            ret_seq = p.get("returnSequences", False)
            return f"layers.GRU({units}, return_sequences={ret_seq})"
        if ntype == "embedding":
            vocab = p.get("vocabSize", 10000)
            dim = p.get("embeddingDim", 64)
            return f"layers.Embedding({vocab}, {dim})"
        if ntype in ("globalavgpool", "globalaveragepooling2d"):
            return "layers.GlobalAveragePooling2D()"
        if ntype == "softmax":
            return 'layers.Activation("softmax")'
        if ntype == "activation":
            act = p.get("activation", "relu")
            return f'layers.Activation("{act}")'
        if ntype in ("outputlayer", "output"):
            units = p.get("units", 10)
            act = p.get("activation", "softmax")
            return f'layers.Dense({units}, activation="{act}")'
        if ntype in ("add",):
            return None  # handled separately in functional API
        if ntype in ("concat", "concatenate"):
            return None
        # Unrecognised node – skip
        return None

    # ------------------------------------------------------------------
    # PyTorch
    # ------------------------------------------------------------------

    def _gen_pytorch(self, ordered: List[Dict[str, Any]]) -> str:
        lines: List[str] = []
        lines.append("# Plexus-generated PyTorch model")
        lines.append("import torch")
        lines.append("import torch.nn as nn")
        lines.append("import torch.optim as optim")
        lines.append("")
        lines.append("")
        lines.append("class PlexusModel(nn.Module):")
        lines.append("    def __init__(self):")
        lines.append("        super().__init__()")

        layer_decls: List[str] = []
        forward_vars: List[str] = []

        non_trivial = [
            n for n in ordered
            if (n.get("type") or "").lower() not in ("inputlayer", "input", "outputlayer")
        ]

        for i, node in enumerate(non_trivial):
            ntype = (node.get("type") or "").lower()
            props = (node.get("data") or {}).get("properties") or {}
            name = f"layer_{i}"
            decl = self._torch_layer_decl(ntype, props)
            if decl:
                layer_decls.append(f"        self.{name} = {decl}")
                forward_vars.append((name, ntype))

        lines.extend(layer_decls)
        lines.append("")
        lines.append("    def forward(self, x):")

        for name, ntype in forward_vars:
            if ntype == "flatten":
                lines.append(f"        x = x.view(x.size(0), -1)")
            elif ntype in ("add", "concat", "concatenate"):
                pass  # skip merge layers in simple sequential
            else:
                lines.append(f"        x = self.{name}(x)")
                if ntype in ("dense", "linear", "conv2d"):
                    lines.append(f"        x = torch.relu(x)")

        lines.append("        return x")
        lines.append("")
        lines.append("")
        lines.append("model = PlexusModel()")
        lines.append("optimizer = optim.Adam(model.parameters(), lr=0.001)")
        lines.append("criterion = nn.CrossEntropyLoss()")
        lines.append("")
        lines.append("print(model)")
        return "\n".join(lines)

    @staticmethod
    def _torch_layer_decl(ntype: str, props: Dict[str, Any]) -> Optional[str]:
        p = props
        if ntype in ("dense", "linear"):
            inp = p.get("inputSize", 128)
            out = p.get("units", 64)
            return f"nn.Linear({inp}, {out})"
        if ntype == "conv2d":
            in_ch = p.get("inChannels", 3)
            filters = p.get("filters", 32)
            k = p.get("kernelSize", 3)
            return f"nn.Conv2d({in_ch}, {filters}, kernel_size={k}, padding=1)"
        if ntype in ("maxpool", "maxpool2d", "maxpooling2d"):
            pool = p.get("poolSize", 2)
            return f"nn.MaxPool2d(kernel_size={pool})"
        if ntype == "flatten":
            return "nn.Flatten()"
        if ntype == "dropout":
            rate = p.get("rate", 0.3)
            return f"nn.Dropout(p={rate})"
        if ntype in ("batchnorm", "batchnormalization"):
            features = p.get("features", 64)
            return f"nn.BatchNorm1d({features})"
        if ntype == "lstm":
            inp = p.get("inputSize", 64)
            units = p.get("units", 64)
            return f"nn.LSTM(input_size={inp}, hidden_size={units}, batch_first=True)"
        if ntype == "gru":
            inp = p.get("inputSize", 64)
            units = p.get("units", 64)
            return f"nn.GRU(input_size={inp}, hidden_size={units}, batch_first=True)"
        if ntype == "embedding":
            vocab = p.get("vocabSize", 10000)
            dim = p.get("embeddingDim", 64)
            return f"nn.Embedding({vocab}, {dim})"
        if ntype in ("outputlayer", "output"):
            inp = p.get("inputSize", 64)
            units = p.get("units", 10)
            return f"nn.Linear({inp}, {units})"
        return None


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _parse_shape(shape_val: Any) -> int:
    """Best-effort parse of a shape string or int → single int for input size."""
    if isinstance(shape_val, int):
        return shape_val
    s = str(shape_val).replace("(", "").replace(")", "").strip()
    parts = [p.strip() for p in s.split(",") if p.strip()]
    try:
        return int(parts[-1]) if parts else 784
    except ValueError:
        return 784
