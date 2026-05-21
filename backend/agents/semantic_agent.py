"""
agents/semantic_agent.py
------------------------
Semantic Agent – reads 100 random rows and produces a full intelligence
JSON for the dataset, stored as dataset_intelligence.json in the registry.

The intelligence JSON drives:
  1. Suggested preprocessing nodes (normalize, dropNulls, oneHotEncode…)
  2. Compatible ML model nodes (randomForest, svm, dense…)
  3. Compatible optimizers (adam, sgd…)
  4. Compatible visualizations (lossCurve, confMatrix…)
  5. Incompatible nodes → shown as warnings on canvas when user adds them

All LLM calls use gemini-2.5-flash via the unified LLMClient.
Results are cached in dataset_registry["dataset_intelligence"] so the
LLM is never called twice for the same dataset.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional

import pandas as pd

from .base import AgentResult, BaseAgent
from ..core.llm_client import LLMClient

logger = logging.getLogger(__name__)

# ── All node types that exist in the frontend ────────────────────────────────
ALL_PREPROCESSING_NODES = [
    "normalize", "dropNulls", "oneHotEncode", "embedEncode", "scale",
]
ALL_MODEL_NODES = [
    "randomForest", "svm", "knn", "logisticRegression", "decisionTree",
    "gradientBoosting", "extraTrees", "naiveBayes", "adaBoost",
    "linearRegression", "ridgeRegression", "lassoRegression", "mlpClassifier",
    "dense", "dropout", "batchnorm", "lstm", "gru", "conv2d",
]
ALL_OPTIMIZER_NODES = ["adam", "sgd", "rmsprop", "adagrad", "adamw"]
ALL_LOSS_NODES = ["crossentropy", "mse", "mae", "bce"]
ALL_VIZ_NODES = [
    "lossCurve", "gradientFlow", "confMatrix", "predTable",
    "activationHeatmap", "modelComparison", "evaluationResults",
]

_SYSTEM_PROMPT = """\
You are a senior ML engineer. Given a dataset sample, respond ONLY with a
single JSON object inside a ```json ... ``` block. No extra text.

JSON schema (fill every field):
{
  "domain": "<healthcare|finance|ecommerce|sports|nlp|timeseries|generic>",
  "description": "<1-2 sentence plain-English description>",
  "task_type": "<classification|regression|clustering|unknown>",
  "recommended_target": "<column name or null>",
  "columns": {
    "<col_name>": {
      "role": "<target|feature|id|datetime|text|unknown>",
      "meaning": "<plain-English meaning>",
      "data_quality": "<good|has_missing|high_cardinality|constant|suspicious>"
    }
  },
  "compatible_preprocessing": ["<node_type>", ...],
  "compatible_models": ["<node_type>", ...],
  "compatible_optimizers": ["<node_type>", ...],
  "compatible_losses": ["<node_type>", ...],
  "compatible_visualizations": ["<node_type>", ...],
  "incompatible_nodes": {
    "<node_type>": "<reason why this node should NOT be used with this dataset>"
  }
}

Rules for compatibility:
- compatible_preprocessing: only nodes that make sense for this data
  (e.g. dropNulls only if missing values exist, oneHotEncode only if
  categorical columns exist, normalize/scale for numeric columns)
- compatible_models: models suited for the task_type and data size
  (e.g. conv2d/lstm only for image/sequence data, not tabular)
- compatible_optimizers: adam always works; sgd for large datasets
- compatible_losses: crossentropy/bce for classification, mse/mae for regression
- compatible_visualizations: confMatrix only for classification,
  lossCurve always, predTable always
- incompatible_nodes: list every node from the full set that should NOT
  be used and explain why (e.g. conv2d on tabular data, bce on multiclass)

Full node sets to evaluate:
  preprocessing: normalize, dropNulls, oneHotEncode, embedEncode, scale
  models: randomForest, svm, knn, logisticRegression, decisionTree,
          gradientBoosting, extraTrees, naiveBayes, adaBoost,
          linearRegression, ridgeRegression, lassoRegression, mlpClassifier,
          dense, dropout, batchnorm, lstm, gru, conv2d
  optimizers: adam, sgd, rmsprop, adagrad, adamw
  losses: crossentropy, mse, mae, bce
  visualizations: lossCurve, gradientFlow, confMatrix, predTable,
                  activationHeatmap, modelComparison, evaluationResults
"""


class SemanticAgent(BaseAgent):
    """
    Builds a full dataset intelligence profile from 100 random rows.
    Uses gemini-2.5-flash. Results cached in dataset_registry.
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        super().__init__(
            name="semantic_agent",
            description="Builds full dataset intelligence JSON from 100 random rows.",
        )
        self._llm: Optional[LLMClient] = llm_client

    def _get_llm(self) -> LLMClient:
        if self._llm is None:
            # Force gemini-2.5-flash
            self._llm = LLMClient(model="gemini-2.5-flash")
        return self._llm

    async def run(self, inputs: Dict[str, Any]) -> AgentResult:
        csv_path: Optional[str] = inputs.get("csv_path")
        dataset_id: Optional[str] = inputs.get("dataset_id")
        cached: Optional[Dict] = inputs.get("cached_semantic")

        if not csv_path:
            return self._fail("'csv_path' is required.")

        # ── Cache hit ────────────────────────────────────────────────────
        if cached and cached.get("domain") and cached.get("compatible_models"):
            self._logger.info("Intelligence loaded from cache for %s", dataset_id)
            return self._ok({"semantic": cached, "cached": True})

        # ── Load 100 random rows ─────────────────────────────────────────
        try:
            df = _read_sample(csv_path, n=100)
        except Exception as exc:
            return self._fail(f"Could not read CSV: {exc}")

        prompt = _build_prompt(df)

        # ── LLM call (gemini-2.5-flash) ──────────────────────────────────
        raw = ""
        used_fallback = False
        try:
            raw = self._get_llm().chat(
                messages=[{"role": "user", "content": prompt}],
                system_prompt=_SYSTEM_PROMPT,
                max_tokens=2000,
            )
        except Exception as exc:
            self._logger.warning("LLM failed; using deterministic profile: %s", exc)
            used_fallback = True

        intelligence = _parse_json(raw) if raw else None
        if not intelligence or not intelligence.get("compatible_models"):
            intelligence = _deterministic_intelligence(df)
            used_fallback = True

        # Ensure all required keys exist (fill missing with deterministic)
        intelligence = _fill_missing_keys(intelligence, df)

        return self._ok(
            {"semantic": intelligence, "cached": False},
            mode="deterministic_fallback" if used_fallback else "llm",
        )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _read_sample(csv_path: str, n: int = 100) -> pd.DataFrame:
    last_err: Exception | None = None
    for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(csv_path, encoding=enc)
            return df.sample(min(n, len(df)), random_state=42) if len(df) > n else df
        except UnicodeDecodeError as e:
            last_err = e
    raise last_err or RuntimeError("Could not read CSV")


def _build_prompt(df: pd.DataFrame) -> str:
    sample_json = df.head(10).fillna("").to_json(orient="records", indent=2)
    col_info: List[str] = []
    for col in df.columns:
        s = df[col]
        dtype = str(s.dtype)
        missing_pct = round(s.isna().mean() * 100, 1)
        unique = s.nunique()
        samples = s.dropna().unique()[:5].tolist()
        col_info.append(
            f"  - {col} [dtype={dtype}, missing={missing_pct}%, "
            f"unique={unique}, samples={samples}]"
        )
    return (
        f"Dataset: {len(df)} rows × {len(df.columns)} columns\n\n"
        f"Column statistics:\n" + "\n".join(col_info) +
        f"\n\nFirst 10 rows:\n{sample_json}\n\n"
        "Return the full dataset intelligence JSON."
    )


def _parse_json(raw: str) -> Optional[Dict[str, Any]]:
    for pattern in (r"```json\s*([\s\S]+?)```", r"```\s*([\s\S]+?)```"):
        m = re.search(pattern, raw, re.IGNORECASE)
        if m:
            try:
                d = json.loads(m.group(1).strip())
                if isinstance(d, dict):
                    return d
            except json.JSONDecodeError:
                pass
    try:
        d = json.loads(raw.strip())
        if isinstance(d, dict):
            return d
    except json.JSONDecodeError:
        pass
    return None


def _deterministic_intelligence(df: pd.DataFrame) -> Dict[str, Any]:
    """Rule-based intelligence when LLM is unavailable."""
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    cat_cols = df.select_dtypes(exclude="number").columns.tolist()
    has_missing = df.isnull().any().any()

    # Guess target
    recommended_target = df.columns[-1]
    for col in df.columns:
        if df[col].nunique() < 20 and col.lower() not in ("id", "index"):
            recommended_target = col
            break

    target_series = df[recommended_target]
    is_num_target = pd.api.types.is_numeric_dtype(target_series)
    unique_target = target_series.nunique()
    task_type = "regression" if is_num_target and unique_target > 20 else "classification"

    # Column profiles
    columns: Dict[str, Any] = {}
    for col in df.columns:
        s = df[col]
        is_num = pd.api.types.is_numeric_dtype(s)
        col_lower = col.lower()
        if any(k in col_lower for k in ("id", "_key", "uuid")):
            role = "id"
        elif col == recommended_target:
            role = "target"
        elif any(k in col_lower for k in ("date", "time", "year", "month")):
            role = "datetime"
        elif not is_num and s.nunique() > 50:
            role = "text"
        else:
            role = "feature"
        missing_pct = s.isna().mean()
        quality = (
            "has_missing" if missing_pct > 0.05
            else "constant" if s.nunique() == 1
            else "high_cardinality" if not is_num and s.nunique() > 100
            else "good"
        )
        columns[col] = {
            "role": role,
            "meaning": f"{'Numeric' if is_num else 'Categorical'} column '{col}'.",
            "data_quality": quality,
        }

    # Preprocessing
    preprocessing = ["normalize"] if numeric_cols else []
    if has_missing:
        preprocessing.append("dropNulls")
    if cat_cols:
        high_card = [c for c in cat_cols if df[c].nunique() > 10]
        low_card = [c for c in cat_cols if df[c].nunique() <= 10]
        if low_card:
            preprocessing.append("oneHotEncode")
        if high_card:
            preprocessing.append("embedEncode")
    if numeric_cols:
        preprocessing.append("scale")

    # Models
    n_rows = len(df)
    if task_type == "classification":
        models = ["randomForest", "gradientBoosting", "logisticRegression",
                  "decisionTree", "mlpClassifier", "dense", "dropout"]
        if n_rows < 5000:
            models += ["svm", "knn"]
    else:
        models = ["randomForest", "gradientBoosting", "ridgeRegression",
                  "lassoRegression", "linearRegression", "mlpClassifier"]

    # Incompatible
    incompatible: Dict[str, str] = {}
    if task_type == "classification":
        for n in ["linearRegression", "ridgeRegression", "lassoRegression", "mse", "mae"]:
            incompatible[n] = f"Regression node not suitable for classification task."
    else:
        for n in ["logisticRegression", "naiveBayes", "crossentropy", "bce", "confMatrix"]:
            incompatible[n] = f"Classification node not suitable for regression task."
    for n in ["conv2d", "lstm", "gru"]:
        incompatible[n] = "Deep sequence/image node not suitable for tabular data."

    # Visualizations
    viz = ["lossCurve", "predTable", "evaluationResults", "modelComparison"]
    if task_type == "classification":
        viz += ["confMatrix", "gradientFlow"]
    else:
        viz.append("gradientFlow")

    return {
        "domain": "generic",
        "description": f"Tabular dataset with {len(df.columns)} columns.",
        "task_type": task_type,
        "recommended_target": recommended_target,
        "columns": columns,
        "compatible_preprocessing": preprocessing,
        "compatible_models": models,
        "compatible_optimizers": ["adam", "sgd", "rmsprop"],
        "compatible_losses": (
            ["crossentropy", "bce"] if task_type == "classification"
            else ["mse", "mae"]
        ),
        "compatible_visualizations": viz,
        "incompatible_nodes": incompatible,
    }


def _fill_missing_keys(intel: Dict[str, Any], df: pd.DataFrame) -> Dict[str, Any]:
    """Ensure all required keys exist, filling from deterministic if absent."""
    det = _deterministic_intelligence(df)
    for key in [
        "compatible_preprocessing", "compatible_models", "compatible_optimizers",
        "compatible_losses", "compatible_visualizations", "incompatible_nodes",
        "domain", "task_type", "recommended_target", "columns",
    ]:
        if key not in intel or not intel[key]:
            intel[key] = det[key]
    return intel
