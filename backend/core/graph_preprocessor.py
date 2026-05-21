"""
core/graph_preprocessor.py
---------------------------
Executes canvas preprocessing nodes as real pandas operations on a dataset.

When the user connects nodes on the canvas:
    Dataset → Normalize → OneHotEncode → SVM → Train

This module walks the graph in topological order, applies each preprocessing
node as a real pandas transformation, and returns the processed DataFrame.
The result is saved as a new dataset record so the ML model always trains
on the fully-processed data.

Supported preprocessing node types (maps to real sklearn/pandas ops):
    normalize     → StandardScaler on numeric columns
    scale         → MinMaxScaler on numeric columns
    dropNulls     → dropna / fillna strategies
    oneHotEncode  → pd.get_dummies on low-cardinality categoricals
    embedEncode   → LabelEncoder on high-cardinality categoricals
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Node types that are preprocessing steps (not models or config)
PREPROCESSING_NODE_TYPES = {
    "normalize", "scale", "dropNulls", "oneHotEncode", "embedEncode",
}

# Node types that are ML models (training happens after preprocessing)
MODEL_NODE_TYPES = {
    "randomForest", "svm", "knn", "logisticRegression", "decisionTree",
    "gradientBoosting", "extraTrees", "naiveBayes", "adaBoost",
    "linearRegression", "ridgeRegression", "lassoRegression", "mlpClassifier",
    "dense", "dropout", "batchnorm", "lstm", "gru", "conv2d",
    "inputLayer", "outputLayer", "hidden", "activation", "flatten", "reshape",
}

IGNORED_TYPES = {
    "training_config", "metrics", "exportCode", "apiDeploy",
    "lossCurve", "gradientFlow", "confMatrix", "predTable",
    "modelComparison", "evaluationResults", "activationHeatmap",
    "testModel", "ghost",
}


def extract_preprocessing_pipeline(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Walk the graph from the dataset node and collect preprocessing nodes
    in topological order, stopping at the first model node.

    Returns
    -------
    (preprocessing_nodes, dataset_node_id)
    """
    # Find dataset node
    dataset_node = next(
        (n for n in nodes if n.get("type") == "dataset"), None
    )
    if not dataset_node:
        return [], None

    dataset_id = dataset_node["id"]

    # Build adjacency map
    adjacency: Dict[str, List[str]] = {}
    for edge in edges:
        adjacency.setdefault(edge["source"], []).append(edge["target"])

    node_map = {n["id"]: n for n in nodes}

    # BFS from dataset node, collect preprocessing nodes in order
    visited = set()
    queue = [dataset_id]
    ordered_preprocessing: List[Dict[str, Any]] = []

    while queue:
        current_id = queue.pop(0)
        if current_id in visited:
            continue
        visited.add(current_id)

        current_node = node_map.get(current_id)
        if not current_node:
            continue

        ntype = current_node.get("type", "")

        if ntype in PREPROCESSING_NODE_TYPES:
            ordered_preprocessing.append(current_node)
        elif ntype in MODEL_NODE_TYPES:
            # Stop at model nodes — don't traverse further
            continue
        elif ntype in IGNORED_TYPES:
            continue

        # Continue traversal
        for next_id in adjacency.get(current_id, []):
            if next_id not in visited:
                queue.append(next_id)

    return ordered_preprocessing, dataset_id


def apply_graph_preprocessing(
    df: pd.DataFrame,
    preprocessing_nodes: List[Dict[str, Any]],
    target_column: Optional[str] = None,
) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Apply each preprocessing node as a real pandas/sklearn operation.

    Returns
    -------
    (processed_df, applied_steps)
    """
    applied_steps: List[Dict[str, Any]] = []

    for node in preprocessing_nodes:
        ntype = node.get("type")
        node_data = node.get("data", {})
        # Columns specified on the node (if any); default to all applicable
        specified_cols: List[str] = node_data.get("columns", [])

        try:
            if ntype == "dropNulls":
                df, step = _apply_drop_nulls(df, specified_cols, target_column)
                applied_steps.append(step)

            elif ntype == "normalize":
                df, step = _apply_normalize(df, specified_cols, target_column)
                applied_steps.append(step)

            elif ntype == "scale":
                df, step = _apply_scale(df, specified_cols, target_column)
                applied_steps.append(step)

            elif ntype == "oneHotEncode":
                df, step = _apply_onehot(df, specified_cols, target_column)
                applied_steps.append(step)

            elif ntype == "embedEncode":
                df, step = _apply_label_encode(df, specified_cols, target_column)
                applied_steps.append(step)

        except Exception as exc:
            logger.warning("Preprocessing node '%s' failed: %s", ntype, exc)
            applied_steps.append({
                "node_type": ntype,
                "status": "failed",
                "error": str(exc),
                "columns_affected": [],
            })

    return df, applied_steps


# ── Individual transformations ────────────────────────────────────────────────

def _apply_drop_nulls(
    df: pd.DataFrame,
    specified_cols: List[str],
    target_column: Optional[str],
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    before_rows = len(df)
    cols = specified_cols or df.columns.tolist()

    # For numeric: fill with median; for categorical: fill with mode
    for col in cols:
        if col not in df.columns:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            median = df[col].median()
            df[col] = df[col].fillna(0 if pd.isna(median) else median)
        else:
            mode = df[col].mode()
            df[col] = df[col].fillna(mode.iloc[0] if len(mode) > 0 else "__missing__")

    # Drop any remaining fully-null rows
    df = df.dropna(how="all")
    return df, {
        "node_type": "dropNulls",
        "status": "applied",
        "columns_affected": cols,
        "rows_before": before_rows,
        "rows_after": len(df),
    }


def _apply_normalize(
    df: pd.DataFrame,
    specified_cols: List[str],
    target_column: Optional[str],
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    from sklearn.preprocessing import StandardScaler

    num_cols = df.select_dtypes(include=np.number).columns.tolist()
    if target_column and target_column in num_cols:
        num_cols.remove(target_column)
    cols = [c for c in (specified_cols or num_cols) if c in df.columns and c != target_column]

    if cols:
        scaler = StandardScaler()
        df[cols] = scaler.fit_transform(df[cols].fillna(0))

    return df, {
        "node_type": "normalize",
        "status": "applied",
        "columns_affected": cols,
        "method": "StandardScaler",
    }


def _apply_scale(
    df: pd.DataFrame,
    specified_cols: List[str],
    target_column: Optional[str],
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    from sklearn.preprocessing import MinMaxScaler

    num_cols = df.select_dtypes(include=np.number).columns.tolist()
    if target_column and target_column in num_cols:
        num_cols.remove(target_column)
    cols = [c for c in (specified_cols or num_cols) if c in df.columns and c != target_column]

    if cols:
        scaler = MinMaxScaler()
        df[cols] = scaler.fit_transform(df[cols].fillna(0))

    return df, {
        "node_type": "scale",
        "status": "applied",
        "columns_affected": cols,
        "method": "MinMaxScaler",
    }


def _apply_onehot(
    df: pd.DataFrame,
    specified_cols: List[str],
    target_column: Optional[str],
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    cat_cols = df.select_dtypes(exclude=np.number).columns.tolist()
    if target_column and target_column in cat_cols:
        cat_cols.remove(target_column)
    # Only low-cardinality (≤ 20 unique values)
    low_card = [c for c in cat_cols if df[c].nunique() <= 20]
    cols = [c for c in (specified_cols or low_card) if c in df.columns and c != target_column]

    if cols:
        df = pd.get_dummies(df, columns=cols, drop_first=False)

    return df, {
        "node_type": "oneHotEncode",
        "status": "applied",
        "columns_affected": cols,
        "method": "pd.get_dummies",
    }


def _apply_label_encode(
    df: pd.DataFrame,
    specified_cols: List[str],
    target_column: Optional[str],
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    from sklearn.preprocessing import LabelEncoder

    cat_cols = df.select_dtypes(exclude=np.number).columns.tolist()
    if target_column and target_column in cat_cols:
        cat_cols.remove(target_column)
    cols = [c for c in (specified_cols or cat_cols) if c in df.columns and c != target_column]

    for col in cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str).fillna("__missing__"))

    return df, {
        "node_type": "embedEncode",
        "status": "applied",
        "columns_affected": cols,
        "method": "LabelEncoder",
    }
