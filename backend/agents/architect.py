"""
agents/architect.py
--------------------
Architect Agent – the second fully functional Plexus agent.

Responsibilities
----------------
1. Receive a DatasetProfile + task type (classification / regression).
2. Build an LLM prompt asking for a neural network architecture in JSON.
3. Parse the JSON response into a list of layer specs.
4. Generate a Keras code snippet via graph_utils.
5. Return the architecture description, layer list, and Keras code.

Inputs (dict keys)
------------------
    profile    : DatasetProfile | dict
    task_type  : str  – "classification" or "regression"
    target_col : str  – column to predict (optional if profile.target_column is set)

Outputs (AgentResult.data keys)
--------------------------------
    layers      : list[dict]   – ordered layer specs
    description : str          – human-readable architecture summary
    keras_code  : str          – Keras Sequential model code
    nodes       : list[dict]   – React-Flow node list (for frontend)
    edges       : list[dict]   – React-Flow edge list (for frontend)
    suggested_nodes : list[str] – Node types suggested (e.g. ['dense', 'dropout', 'randomForest'])
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional

from .base import AgentResult, BaseAgent
from ..core.dataset_analyzer import DatasetProfile
from ..core.graph_utils import graph_to_keras_code, layers_to_graph
from ..core.llm_client import LLMClient

logger = logging.getLogger(__name__)

SUGGESTABLE_NODE_IDS = {
    "dense",
    "dropout",
    "randomForest",
    "svm",
    "knn",
    "logisticRegression",
    "decisionTree",
    "gradientBoosting",
    "extraTrees",
    "naiveBayes",
    "adaBoost",
    "linearRegression",
    "ridgeRegression",
    "lassoRegression",
    "mlpClassifier",
    "conv2d",
    "maxpool",
    "flatten",
}


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a senior ML engineer.
When asked to design an architecture or pick ML models, you MUST respond with
a single JSON object (no extra text) inside a ```json ... ``` block.

The JSON object must have keys:
  "description": string, human-readable reasoning
  "suggested_nodes": list of strings, IDs of frontend nodes to highlight specifically. Allowable IDs include: "dense", "dropout", "randomForest", "svm", "knn", "logisticRegression", "decisionTree", "gradientBoosting", "extraTrees", "naiveBayes", "adaBoost", "linearRegression", "ridgeRegression", "lassoRegression", "mlpClassifier", "conv2d", "maxpool", "flatten".
  "layers": array of layer specs (only if neural net is recommended, else empty).

Each element of the "layers" array represents one layer and has these keys:
  "id"         : string, e.g. "layer_0"
  "type"       : string, Keras layer class name (Dense, Dropout, BatchNormalization, etc.)
  "params"     : object, keyword args for that layer (e.g. {"units": 128})
  "activation" : string or null

Rules:
  - Keep architectures practical.
  - Suggest 2-3 standard ML models if the dataset is small tabular data.
"""

_FEW_SHOT = """
Example JSON for a binary classification task with 10 features:
```json
{
  "description": "For this small tabular dataset, Random Forest is a strong baseline. A small Neural Network is also viable.",
  "suggested_nodes": ["randomForest", "svm", "dense", "dropout"],
  "layers": [
    {"id": "layer_0", "type": "InputLayer", "params": {"input_shape": [10]}, "activation": null},
    {"id": "layer_1", "type": "Dense", "params": {"units": 64}, "activation": "relu"},
    {"id": "layer_2", "type": "Dropout", "params": {"rate": 0.3}, "activation": null},
    {"id": "layer_3", "type": "Dense", "params": {"units": 1}, "activation": "sigmoid"}
  ]
}
```
"""


class ArchitectAgent(BaseAgent):
    """
    Suggests a Keras neural network architecture for a given dataset profile.

    Parameters
    ----------
    llm_client : LLMClient, optional
        Lazily created if not supplied.
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        super().__init__(
            name="architect_agent",
            description="Proposes a Keras neural network architecture for a dataset.",
        )
        self._llm: Optional[LLMClient] = llm_client

    def _get_llm(self) -> LLMClient:
        if self._llm is None:
            self._llm = LLMClient()
        return self._llm

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def run(self, inputs: Dict[str, Any]) -> AgentResult:
        """
        Run the Architect Agent.

        Expected keys in `inputs`
        -------------------------
        profile      : DatasetProfile or dict representation  (legacy)
        dataset_info : dict  – dataset registry record (from API upload endpoint)
        task_type    : "classification" or "regression"
        target_col   : str (optional override)
        """
        raw_profile = inputs.get("profile")
        task_type: str = inputs.get("task_type", "classification").lower().strip()
        target_col: Optional[str] = inputs.get("target_col")

        # Allow callers to pass `dataset_info` (the flat registry record) instead
        # of a full DatasetProfile.  We build a minimal profile from it.
        if raw_profile is None:
            dataset_info: Optional[Dict[str, Any]] = inputs.get("dataset_info")
            if dataset_info:
                raw_profile = self._info_to_profile_dict(dataset_info)
            else:
                return self._fail("Either 'profile' or 'dataset_info' is required in inputs.")

        # Accept both DatasetProfile objects and plain dicts
        if isinstance(raw_profile, dict):
            profile = self._dict_to_profile(raw_profile)
        else:
            profile = raw_profile  # type: ignore[assignment]

        if target_col:
            profile.target_column = target_col

        # ---- Derive architecture parameters from the profile -----------
        n_features = self._count_features(profile)
        n_classes = self._count_classes(profile, task_type)
        n_samples = profile.num_rows_total

        # ---- Build LLM prompt ------------------------------------------
        user_prompt = self._build_prompt(profile, task_type, n_features, n_classes, n_samples)

        deterministic_nodes = self._model_suggestions_from_profile(
            profile, task_type, n_features, n_classes, n_samples
        )

        # ---- Call LLM --------------------------------------------------
        self._logger.info("Calling LLM for architecture suggestion…")
        try:
            raw_response = self._get_llm().chat(
                messages=[{"role": "user", "content": user_prompt}],
                system_prompt=_SYSTEM_PROMPT,
                max_tokens=1200,
            )
        except Exception as exc:  # noqa: BLE001
            self._logger.warning(
                "LLM call failed; using deterministic model suggestions: %s", exc
            )
            raw_response = ""

        # ---- Parse JSON layer list -------------------------------------
        parsed = self._parse_json(raw_response)
        if parsed is None:
            self._logger.warning(
                "Could not parse JSON from LLM response; using fallback architecture."
            )
            parsed = {
                "layers": self._fallback_layers(n_features, n_classes, task_type),
                "description": "Deterministic architecture and model suggestions generated from dataset profile.",
                "suggested_nodes": deterministic_nodes,
            }

        layers = parsed.get("layers", [])
        if not layers:
            layers = self._fallback_layers(n_features, n_classes, task_type)

        # ---- Generate Keras code + React-Flow graph --------------------
        keras_code = graph_to_keras_code(layers)
        nodes, edges = layers_to_graph(layers)
        description = parsed.get("description", self._describe_architecture(layers, task_type))
        suggested_nodes = self._sanitize_suggestions(
            parsed.get("suggested_nodes", []), deterministic_nodes
        )

        return self._ok(
            {
                "layers": layers,
                "description": description,
                "keras_code": keras_code,
                "nodes": nodes,
                "edges": edges,
                "suggested_nodes": suggested_nodes
            }
        )

    @staticmethod
    def _sanitize_suggestions(raw_nodes: Any, fallback_nodes: List[str]) -> List[str]:
        nodes: List[str] = []
        if isinstance(raw_nodes, list):
            for item in raw_nodes:
                if isinstance(item, str) and item in SUGGESTABLE_NODE_IDS and item not in nodes:
                    nodes.append(item)
        for item in fallback_nodes:
            if item not in nodes:
                nodes.append(item)
        return nodes[:6]

    @staticmethod
    def _model_suggestions_from_profile(
        profile: DatasetProfile,
        task_type: str,
        n_features: int,
        n_classes: int,
        n_samples: int,
    ) -> List[str]:
        """Build a deterministic model shortlist from the dataset profile."""
        has_categorical = bool(profile.categorical_columns)
        has_many_features = n_features >= 50
        is_small = bool(n_samples and n_samples < 5000)

        if task_type == "regression":
            suggestions = ["randomForest", "gradientBoosting", "ridgeRegression"]
            suggestions.append("lassoRegression" if has_many_features else "linearRegression")
            return suggestions

        suggestions = ["randomForest", "gradientBoosting"]
        if is_small:
            suggestions.extend(["svm", "knn"])
        if n_classes <= 2:
            suggestions.append("logisticRegression")
        if has_categorical:
            suggestions.append("decisionTree")
        suggestions.extend(["mlpClassifier", "dense", "dropout"])
        return suggestions

    # ------------------------------------------------------------------
    # Prompt construction
    # ------------------------------------------------------------------

    def _build_prompt(
        self,
        profile: DatasetProfile,
        task_type: str,
        n_features: int,
        n_classes: int,
        n_samples: int,
    ) -> str:
        target_info = (
            f"Target column: '{profile.target_column}' "
            f"(~{n_classes} unique class(es))."
            if profile.target_column
            else "No target column specified."
        )
        return (
            f"Design a neural network for a **{task_type}** task.\n\n"
            f"Dataset summary:\n"
            f"  - Input features: {n_features}\n"
            f"  - Dataset size: {n_samples} rows\n"
            f"  - {target_info}\n"
            f"  - Numeric columns: {', '.join(profile.numeric_columns) or 'none'}\n"
            f"  - Categorical columns: {', '.join(profile.categorical_columns) or 'none'}\n\n"
            f"Constraints:\n"
            f"  - Use Keras layer names (Dense, Dropout, BatchNormalization, etc.)\n"
            f"  - Include Dropout for regularisation if dataset has < 5000 rows.\n"
            f"  - Suggest a suitable optimizer and loss in a comment at the end of the JSON.\n\n"
            f"{_FEW_SHOT}"
        )

    # ------------------------------------------------------------------
    # JSON parsing
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_json(raw: str) -> Optional[Dict[str, Any]]:
        """
        Try to extract a JSON object from an LLM response.
        """
        def _try_parse(text: str) -> Optional[Dict[str, Any]]:
            try:
                data = json.loads(text.strip())
                if isinstance(data, dict):
                    return data
            except json.JSONDecodeError:
                pass
            return None

        # Strategy 1: strict fenced json
        match = re.search(r"```json\s*(.*?)\s*```", raw, re.DOTALL)
        if match:
            res = _try_parse(match.group(1))
            if res: return res

        # Strategy 2: any fenced code block
        match = re.search(r"```\s*(.*?)\s*```", raw, re.DOTALL)
        if match:
            res = _try_parse(match.group(1))
            if res: return res

        # Strategy 3: raw text parsing
        res = _try_parse(raw)
        if res: return res

        return None

    @staticmethod
    def _fallback_layers(
        n_features: int, n_classes: int, task_type: str
    ) -> List[Dict[str, Any]]:
        """
        Generate a sensible hardcoded architecture when LLM parsing fails.
        This ensures the CLI always produces usable output.
        """
        hidden = max(32, min(256, n_features * 4))
        layers: List[Dict[str, Any]] = [
            {"id": "layer_0", "type": "InputLayer",
             "params": {"input_shape": [n_features]}, "activation": None},
            {"id": "layer_1", "type": "Dense",
             "params": {"units": hidden}, "activation": "relu"},
            {"id": "layer_2", "type": "Dropout",
             "params": {"rate": 0.3}, "activation": None},
            {"id": "layer_3", "type": "Dense",
             "params": {"units": max(16, hidden // 2)}, "activation": "relu"},
        ]
        if task_type == "regression":
            layers.append({"id": "layer_4", "type": "Dense",
                           "params": {"units": 1}, "activation": None})
        elif n_classes <= 2:
            layers.append({"id": "layer_4", "type": "Dense",
                           "params": {"units": 1}, "activation": "sigmoid"})
        else:
            layers.append({"id": "layer_4", "type": "Dense",
                           "params": {"units": n_classes}, "activation": "softmax"})
        return layers

    # ------------------------------------------------------------------
    # Architecture description
    # ------------------------------------------------------------------

    @staticmethod
    def _describe_architecture(layers: List[Dict[str, Any]], task_type: str) -> str:
        lines = [f"Architecture Summary ({task_type})", "=" * 38]
        for i, layer in enumerate(layers):
            layer_type = layer.get("type", "Unknown")
            params = layer.get("params", {})
            activation = layer.get("activation", "")
            param_str = ", ".join(f"{k}={v}" for k, v in params.items())
            act_str = f"  activation={activation}" if activation else ""
            lines.append(f"  [{i}] {layer_type}({param_str}){act_str}")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Profile helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _count_features(profile: DatasetProfile) -> int:
        """Number of input features = total columns minus target."""
        n = profile.num_columns
        if profile.target_column:
            n -= 1
        return max(n, 1)

    @staticmethod
    def _count_classes(profile: DatasetProfile, task_type: str) -> int:
        """Estimate the number of output classes."""
        if task_type == "regression":
            return 1
        if not profile.target_column:
            return 2  # assume binary if unknown
        for col in profile.columns:
            if col.name == profile.target_column:
                return max(col.unique_count, 2)
        return 2

    @staticmethod
    def _info_to_profile_dict(info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert a dataset registry record (from /api/datasets/upload) into
        a profile dict that `_dict_to_profile` can consume.
        """
        stats = info.get("stats", {})
        columns_raw = info.get("columns", [])
        col_profiles = []
        numeric_cols: List[str] = []
        categorical_cols: List[str] = []
        missing_cols: List[str] = []

        for col_name in columns_raw:
            col_stat = stats.get(col_name, {})
            dtype = col_stat.get("dtype", "object")
            missing = col_stat.get("missing", 0)
            is_numeric = "int" in dtype or "float" in dtype
            unique = col_stat.get("unique", 2)

            col_profiles.append({
                "name": col_name,
                "dtype": dtype,
                "is_numeric": is_numeric,
                "is_categorical": not is_numeric,
                "missing_count": missing,
                "missing_pct": col_stat.get("missing_pct", 0.0),
                "unique_count": unique,
                "sample_values": [],
                "mean": col_stat.get("mean"),
                "std": col_stat.get("std"),
                "min_val": col_stat.get("min"),
                "max_val": col_stat.get("max"),
            })
            if is_numeric:
                numeric_cols.append(col_name)
            else:
                categorical_cols.append(col_name)
            if missing > 0:
                missing_cols.append(col_name)

        return {
            "file_path": info.get("path", ""),
            "num_rows_total": info.get("row_count", 0),
            "num_rows_sampled": min(info.get("row_count", 0), 10000),
            "num_columns": len(columns_raw),
            "columns": col_profiles,
            "target_column": None,
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols,
            "missing_columns": missing_cols,
        }

    @staticmethod
    def _dict_to_profile(d: Dict[str, Any]) -> DatasetProfile:
        """
        Reconstruct a DatasetProfile from its dict representation
        (returned by DataAgent via AgentResult.data["profile"]).
        """
        from ..core.dataset_analyzer import ColumnProfile

        columns = [
            ColumnProfile(
                name=c.get("name", ""),
                dtype=c.get("dtype", "object"),
                missing_count=c.get("missing_count", 0),
                missing_pct=c.get("missing_pct", 0.0),
                unique_count=c.get("unique_count", 0),
                is_numeric=c.get("is_numeric", False),
                is_categorical=c.get("is_categorical", not c.get("is_numeric", False)),
                sample_values=c.get("sample_values", []),
                mean=c.get("mean"),
                std=c.get("std"),
                min_val=c.get("min_val"),
                max_val=c.get("max_val"),
            )
            for c in d.get("columns", [])
        ]
        return DatasetProfile(
            file_path=d.get("file_path", ""),
            num_rows_total=d.get("num_rows_total", 0),
            num_rows_sampled=d.get("num_rows_sampled", 0),
            num_columns=d.get("num_columns", 0),
            columns=columns,
            target_column=d.get("target_column"),
            numeric_columns=d.get("numeric_columns", []),
            categorical_columns=d.get("categorical_columns", []),
            missing_columns=d.get("missing_columns", []),
        )
