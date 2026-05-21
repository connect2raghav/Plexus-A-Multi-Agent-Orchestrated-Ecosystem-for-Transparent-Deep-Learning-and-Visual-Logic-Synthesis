from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import numpy as np
import pandas as pd


CLASSICAL_MODEL_TYPES = {
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
}

DEEP_GRAPH_TYPES = {
    "inputLayer",
    "outputLayer",
    "dense",
    "hidden",
    "dropout",
    "batchnorm",
    "activation",
    "flatten",
    "reshape",
    "embedding",
    "lstm",
    "gru",
    "conv2d",
    "maxpool",
    "pooling",
}

SUPPORTED_DEEP_TYPES = {
    "inputLayer",
    "outputLayer",
    "dense",
    "hidden",
    "dropout",
    "batchnorm",
    "activation",
    "flatten",
    "reshape",
}

IGNORED_NODE_TYPES = {
    "dataset",
    "training_config",
    "metrics",
    "exportCode",
    "apiDeploy",
    "lossCurve",
    "gradientFlow",
    "confMatrix",
    "predTable",
    "modelComparison",
    "evaluationResults",
    "activationHeatmap",
    "testModel",
}


@dataclass
class DatasetSplit:
    X_train: Any
    X_test: Any
    y_train: Any
    y_test: Any
    task_type: str
    target_column: str
    class_names: Optional[List[str]] = None
    preprocessor: Any = None
    feature_columns: Optional[List[str]] = None


def run_training(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    dataset_record: Dict[str, Any],
    framework: str,
    epochs: int,
    batch_size: int,
    lr: float,
    artifact_dir: str | None = None,
    status_cb: Optional[Callable[[], str]] = None,
    resume_from: str | None = None,
    start_epoch: int = 0,
) -> Dict[str, Any]:
    """Train the graph against a CSV dataset with sklearn or PyTorch."""
    if dataset_record.get("type") != "csv":
        raise ValueError("Real local training currently supports CSV/tabular datasets.")

    split = _load_dataset_split(dataset_record)
    deep_present = _has_deep_graph(nodes)
    model_nodes = _select_model_nodes(nodes, split.task_type, allow_fallback=not deep_present)
    artifact_path = Path(artifact_dir) if artifact_dir else None
    if artifact_path:
        artifact_path.mkdir(parents=True, exist_ok=True)

    warnings: List[str] = []

    if model_nodes:
        if deep_present:
            warnings.append("Deep graph nodes detected but classical models were selected; deep graph training was skipped.")
        return _run_classical_training(
            model_nodes,
            split,
            nodes,
            epochs,
            lr,
            artifact_path,
            framework,
            warnings,
            dataset_record.get("id"),
        )

    if deep_present:
        return _run_deep_training(
            nodes,
            edges,
            split,
            epochs,
            batch_size,
            lr,
            artifact_path,
            status_cb,
            resume_from,
            start_epoch,
            framework,
        )

    raise ValueError("No trainable model nodes were found in the graph.")


def _load_dataset_split(dataset_record: Dict[str, Any]) -> DatasetSplit:
    from sklearn.compose import ColumnTransformer
    from sklearn.impute import SimpleImputer
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler

    df = _read_csv(dataset_record["path"])
    if df.empty or len(df.columns) < 2:
        raise ValueError("Dataset must contain at least one feature column and one target column.")

    target_column = dataset_record.get("target_column") or df.columns[-1]
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' was not found in dataset.")

    y = df[target_column]
    X = df.drop(columns=[target_column])
    numeric_cols = X.select_dtypes(include=np.number).columns.tolist()
    categorical_cols = [col for col in X.columns if col not in numeric_cols]

    encoder_kwargs = {"handle_unknown": "ignore"}
    try:
        encoder = OneHotEncoder(sparse_output=False, **encoder_kwargs)
    except TypeError:
        encoder = OneHotEncoder(sparse=False, **encoder_kwargs)

    transformers = []
    if numeric_cols:
        transformers.append(
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_cols,
            )
        )
    if categorical_cols:
        transformers.append(
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", encoder),
                    ]
                ),
                categorical_cols,
            )
        )

    if not transformers:
        raise ValueError("Dataset has no usable feature columns.")

    preprocessor = ColumnTransformer(transformers=transformers)
    X_processed = preprocessor.fit_transform(X)

    is_numeric_target = pd.api.types.is_numeric_dtype(y)
    unique_count = int(y.nunique(dropna=True))
    task_type = "regression" if is_numeric_target and unique_count > max(20, len(y) * 0.1) else "classification"

    if task_type == "classification":
        label_encoder = LabelEncoder()
        y_values = label_encoder.fit_transform(y.astype(str).fillna("__missing__"))
        class_names = [str(item) for item in label_encoder.classes_]
        stratify = y_values if unique_count > 1 and min(np.bincount(y_values)) >= 2 else None
    else:
        y_values = pd.to_numeric(y, errors="coerce").fillna(y.median()).to_numpy(dtype=float)
        class_names = None
        stratify = None

    X_train, X_test, y_train, y_test = train_test_split(
        X_processed,
        y_values,
        test_size=0.2,
        random_state=42,
        stratify=stratify,
    )

    return DatasetSplit(
        X_train,
        X_test,
        y_train,
        y_test,
        task_type,
        target_column,
        class_names,
        preprocessor,
        X.columns.tolist(),
    )


def _read_csv(path: str) -> pd.DataFrame:
    last_error: Exception | None = None
    for encoding in ("utf-8", "utf-8-sig", "latin1", "cp1252"):
        try:
            return pd.read_csv(path, encoding=encoding)
        except UnicodeDecodeError as exc:
            last_error = exc
    if last_error:
        raise last_error
    return pd.read_csv(path)


def _select_model_nodes(
    nodes: List[Dict[str, Any]],
    task_type: str,
    allow_fallback: bool = True,
) -> List[Dict[str, Any]]:
    selected: List[Dict[str, Any]] = []
    for node in nodes:
        node_type = node.get("type")
        if node_type in CLASSICAL_MODEL_TYPES:
            if task_type == "regression" and node_type in {"logisticRegression", "naiveBayes", "mlpClassifier"}:
                continue
            if task_type == "classification" and node_type in {"linearRegression", "ridgeRegression", "lassoRegression"}:
                continue
            selected.append(node)
    if selected:
        return selected
    if not allow_fallback:
        return []
    fallback_type = "randomForest" if task_type == "classification" else "ridgeRegression"
    return [{"id": f"auto-{fallback_type}", "type": fallback_type, "data": {"label": fallback_type}}]


def _has_deep_graph(nodes: List[Dict[str, Any]]) -> bool:
    for node in nodes:
        node_type = node.get("type")
        if node_type in DEEP_GRAPH_TYPES:
            return True
    return False


def _run_classical_training(
    model_nodes: List[Dict[str, Any]],
    split: DatasetSplit,
    nodes: List[Dict[str, Any]],
    epochs: int,
    lr: float,
    artifact_path: Path | None,
    framework: str,
    warnings: List[str],
    dataset_id: Optional[str],
) -> Dict[str, Any]:
    model_results: List[Dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=min(4, len(model_nodes))) as pool:
        futures = [
            pool.submit(_train_one_model, node, split, nodes, epochs, lr, artifact_path)
            for node in model_nodes
        ]
        for future in as_completed(futures):
            model_results.append(future.result())

    model_results.sort(
        key=lambda item: item["metrics"].get("val_accuracy", -item["metrics"].get("val_loss", 0)),
        reverse=True,
    )
    comparison = [
        {
            "rank": idx + 1,
            "node_id": item["node_id"],
            "model_type": item["model_type"],
            "label": item["label"],
            **item["metrics"],
            "artifact_path": item.get("artifact_path"),
        }
        for idx, item in enumerate(model_results)
    ]
    best = model_results[0]
    history = [
        {
            "epoch": idx + 1,
            "loss": item["metrics"]["loss"],
            "accuracy": item["metrics"].get("accuracy", 0),
            "val_loss": item["metrics"].get("val_loss", item["metrics"]["loss"]),
            "val_accuracy": item["metrics"].get("val_accuracy", item["metrics"].get("accuracy", 0)),
            "gradient_norms": item.get("gradient_norms", {}),
            "model_type": item["model_type"],
            "node_id": item["node_id"],
        }
        for idx, item in enumerate(model_results)
    ]

    if artifact_path:
        manifest = {
            "dataset_id": dataset_id,
            "target_column": split.target_column,
            "task_type": split.task_type,
            "models": comparison,
        }
        (artifact_path / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return {
        "history": history,
        "summary": {
            "final_loss": best["metrics"]["loss"],
            "final_accuracy": best["metrics"].get("accuracy", 0),
            "final_val_loss": best["metrics"].get("val_loss", best["metrics"]["loss"]),
            "final_val_accuracy": best["metrics"].get("val_accuracy", best["metrics"].get("accuracy", 0)),
            "mode": "sklearn",
            "model_type": best["model_type"],
            "best_model": best,
            "model_results": model_results,
            "comparison": comparison,
            "artifact_dir": str(artifact_path) if artifact_path else None,
            "task_type": split.task_type,
            "target_column": split.target_column,
            "framework": framework,
            "warnings": warnings,
        },
    }


def _select_model_type(nodes: List[Dict[str, Any]], task_type: str) -> str:
    return _select_model_nodes(nodes, task_type)[0]["type"]


def _topological_sort_nodes(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    node_map = {n["id"]: n for n in nodes}
    in_degree: Dict[str, int] = {n["id"]: 0 for n in nodes}
    adjacency: Dict[str, List[str]] = {}
    for edge in edges:
        adjacency.setdefault(edge["source"], []).append(edge["target"])
        in_degree[edge["target"]] = in_degree.get(edge["target"], 0) + 1

    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    ordered: List[Dict[str, Any]] = []
    while queue:
        nid = queue.pop(0)
        ordered.append(node_map[nid])
        for target in adjacency.get(nid, []):
            in_degree[target] -= 1
            if in_degree[target] == 0:
                queue.append(target)

    if len(ordered) != len(nodes):
        return nodes
    return ordered


def _run_deep_training(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    split: DatasetSplit,
    epochs: int,
    batch_size: int,
    lr: float,
    artifact_path: Path | None,
    status_cb: Optional[Callable[[], str]],
    resume_from: str | None,
    start_epoch: int,
    framework: str,
) -> Dict[str, Any]:
    try:
        import torch
        import torch.nn as nn
        from torch.utils.data import DataLoader, TensorDataset
    except ImportError as exc:
        raise ImportError("PyTorch is required for deep graph training.") from exc

    ordered = _topological_sort_nodes(nodes, edges)
    filtered = [
        n
        for n in ordered
        if n.get("type") not in IGNORED_NODE_TYPES
        and n.get("type") not in CLASSICAL_MODEL_TYPES
    ]

    unsupported = sorted({n.get("type") for n in filtered if n.get("type") not in SUPPORTED_DEEP_TYPES})
    if unsupported:
        raise ValueError(
            "Unsupported deep-learning node types: " + ", ".join(str(u) for u in unsupported)
        )

    input_dim = int(split.X_train.shape[1])
    output_units = int(len(split.class_names or [])) if split.task_type == "classification" else 1
    output_units = max(output_units, 1)

    layers: List[nn.Module] = []
    current_dim = input_dim

    for node in filtered:
        ntype = node.get("type")
        data = node.get("data") or {}
        params = data.get("params") or data.get("properties") or {}

        if ntype in ("inputLayer", "outputLayer"):
            continue

        if ntype in ("dense", "hidden"):
            units = int(params.get("units") or data.get("count") or current_dim)
            layers.append(nn.Linear(current_dim, units))
            layers.append(nn.ReLU())
            current_dim = units
            continue

        if ntype == "dropout":
            rate = float(params.get("rate") or data.get("rate") or 0.3)
            layers.append(nn.Dropout(p=rate))
            continue

        if ntype == "batchnorm":
            layers.append(nn.BatchNorm1d(current_dim))
            continue

        if ntype == "activation":
            act = str(params.get("activation") or "relu").lower()
            layers.append(_torch_activation(act))
            continue

        if ntype in ("flatten", "reshape"):
            layers.append(nn.Flatten())
            continue

    layers.append(nn.Linear(current_dim, output_units))
    model = nn.Sequential(*layers)

    optimizer = torch.optim.Adam(model.parameters(), lr=max(lr, 1e-6))
    if split.task_type == "classification":
        if output_units == 1:
            criterion = nn.BCEWithLogitsLoss()
        else:
            criterion = nn.CrossEntropyLoss()
    else:
        criterion = nn.MSELoss()

    if resume_from and Path(resume_from).exists():
        checkpoint = torch.load(resume_from, map_location="cpu")
        state = checkpoint.get("model_state") if isinstance(checkpoint, dict) else None
        if state:
            model.load_state_dict(state)
        if isinstance(checkpoint, dict) and checkpoint.get("optimizer_state"):
            optimizer.load_state_dict(checkpoint["optimizer_state"])
        if isinstance(checkpoint, dict) and checkpoint.get("epoch"):
            start_epoch = int(checkpoint["epoch"])

    X_train = torch.tensor(split.X_train, dtype=torch.float32)
    X_test = torch.tensor(split.X_test, dtype=torch.float32)

    if split.task_type == "classification":
        if output_units == 1:
            y_train = torch.tensor(split.y_train, dtype=torch.float32).view(-1, 1)
            y_test = torch.tensor(split.y_test, dtype=torch.float32).view(-1, 1)
        else:
            y_train = torch.tensor(split.y_train, dtype=torch.long)
            y_test = torch.tensor(split.y_test, dtype=torch.long)
    else:
        y_train = torch.tensor(split.y_train, dtype=torch.float32).view(-1, 1)
        y_test = torch.tensor(split.y_test, dtype=torch.float32).view(-1, 1)

    train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=batch_size, shuffle=True)

    history: List[Dict[str, Any]] = []
    last_checkpoint = None
    paused = False
    stopped = False

    for epoch in range(start_epoch + 1, epochs + 1):
        if status_cb:
            current_status = status_cb()
            if current_status == "paused":
                paused = True
                break
            if current_status == "stopped":
                stopped = True
                break

        model.train()
        epoch_loss = 0.0
        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += float(loss.detach().cpu().item())

        model.eval()
        with torch.no_grad():
            test_outputs = model(X_test)
            test_loss = criterion(test_outputs, y_test)

        if split.task_type == "classification":
            if output_units == 1:
                probs = torch.sigmoid(test_outputs)
                preds = (probs >= 0.5).long().view(-1)
                actuals = y_test.view(-1).long()
                acc = float((preds == actuals).float().mean().item())
            else:
                preds = torch.argmax(test_outputs, dim=1)
                actuals = y_test
                acc = float((preds == actuals).float().mean().item())
        else:
            acc = float(_safe_r2(y_test.cpu().numpy(), test_outputs.cpu().numpy()))

        grad_norms = _torch_gradient_norms(model)
        history.append(
            {
                "epoch": epoch,
                "loss": round(epoch_loss / max(1, len(train_loader)), 6),
                "accuracy": round(acc, 6),
                "val_loss": round(float(test_loss.detach().cpu().item()), 6),
                "val_accuracy": round(acc, 6),
                "gradient_norms": grad_norms,
                "model_type": "deepGraph",
                "node_id": "deepGraph",
            }
        )

        if artifact_path:
            checkpoint_path = artifact_path / "deep_graph_last.pt"
            torch.save(
                {
                    "epoch": epoch,
                    "model_state": model.state_dict(),
                    "optimizer_state": optimizer.state_dict(),
                    "input_dim": input_dim,
                    "output_units": output_units,
                    "task_type": split.task_type,
                },
                checkpoint_path,
            )
            last_checkpoint = str(checkpoint_path)

    model.eval()
    with torch.no_grad():
        outputs = model(X_test)
        if split.task_type == "classification":
            if output_units == 1:
                probabilities = torch.sigmoid(outputs).cpu().numpy().reshape(-1)
                predictions = (probabilities >= 0.5).astype(int)
            else:
                probabilities = torch.softmax(outputs, dim=1).cpu().numpy()
                predictions = probabilities.argmax(axis=1)
        else:
            probabilities = outputs.cpu().numpy().reshape(-1)
            predictions = probabilities

    confusion = _confusion_matrix(split, predictions)
    samples = _sample_predictions_from_arrays(split, predictions, probabilities)

    model_result = {
        "node_id": "deepGraph",
        "model_type": "deepGraph",
        "label": "Deep Graph",
        "metrics": {
            "loss": history[-1]["loss"] if history else 0.0,
            "accuracy": history[-1]["accuracy"] if history else 0.0,
            "val_loss": history[-1]["val_loss"] if history else 0.0,
            "val_accuracy": history[-1]["val_accuracy"] if history else 0.0,
        },
        "confusion_matrix": confusion,
        "class_names": split.class_names or [],
        "predictions": samples,
        "artifact_path": last_checkpoint,
    }

    summary = {
        "final_loss": model_result["metrics"]["loss"],
        "final_accuracy": model_result["metrics"]["accuracy"],
        "final_val_loss": model_result["metrics"]["val_loss"],
        "final_val_accuracy": model_result["metrics"]["val_accuracy"],
        "mode": "pytorch",
        "model_type": "deepGraph",
        "best_model": model_result,
        "model_results": [model_result],
        "comparison": [
            {
                "rank": 1,
                "node_id": "deepGraph",
                "model_type": "deepGraph",
                "label": "Deep Graph",
                **model_result["metrics"],
                "artifact_path": model_result.get("artifact_path"),
            }
        ],
        "artifact_dir": str(artifact_path) if artifact_path else None,
        "task_type": split.task_type,
        "target_column": split.target_column,
        "framework": framework,
        "input_shape": [input_dim],
        "output_units": output_units,
        "checkpoint_path": last_checkpoint,
        "status": "paused" if paused else "stopped" if stopped else "completed",
    }

    return {"history": history, "summary": summary}


def _torch_activation(act: str):
    import torch.nn as nn

    if act in ("relu", "relu6"):
        return nn.ReLU()
    if act in ("tanh",):
        return nn.Tanh()
    if act in ("sigmoid",):
        return nn.Sigmoid()
    if act in ("leakyrelu", "leaky_relu"):
        return nn.LeakyReLU()
    return nn.ReLU()


def _torch_gradient_norms(model: Any) -> Dict[str, float]:
    norms: Dict[str, float] = {}
    for name, param in model.named_parameters():
        if param.grad is None:
            continue
        norms[name] = float(param.grad.detach().abs().mean().item())
    return norms


def _safe_r2(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    from sklearn.metrics import r2_score

    try:
        return float(r2_score(y_true, y_pred))
    except Exception:
        return 0.0


def _confusion_matrix(split: DatasetSplit, predictions: Any) -> List[List[int]]:
    if split.task_type != "classification":
        return []
    from sklearn.metrics import confusion_matrix

    labels = list(range(len(split.class_names or []))) or sorted(np.unique(split.y_test).tolist())
    return confusion_matrix(split.y_test, predictions, labels=labels).tolist()


def _sample_predictions_from_arrays(
    split: DatasetSplit,
    predictions: Any,
    probabilities: Any,
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    limit = min(10, len(predictions))
    for idx in range(limit):
        actual = split.y_test[idx]
        predicted = predictions[idx]
        confidence = None
        if probabilities is not None:
            try:
                if split.task_type == "classification":
                    if np.ndim(probabilities) == 1:
                        confidence = float(probabilities[idx])
                    else:
                        confidence = float(np.max(probabilities[idx]))
            except Exception:
                confidence = None

        if split.class_names:
            actual_label = split.class_names[int(actual)]
            predicted_label = split.class_names[int(predicted)]
        else:
            actual_label = float(actual)
            predicted_label = float(predicted)

        rows.append(
            {
                "actual": actual_label,
                "predicted": predicted_label,
                "confidence": round(confidence, 4) if confidence is not None else None,
            }
        )
    return rows


def _build_model(model_type: str, task_type: str, epochs: int, lr: float) -> Any:
    from sklearn.ensemble import (
        AdaBoostClassifier,
        AdaBoostRegressor,
        ExtraTreesClassifier,
        ExtraTreesRegressor,
        GradientBoostingClassifier,
        GradientBoostingRegressor,
        RandomForestClassifier,
        RandomForestRegressor,
    )
    from sklearn.linear_model import Lasso, LinearRegression, LogisticRegression, Ridge
    from sklearn.naive_bayes import GaussianNB
    from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
    from sklearn.neural_network import MLPClassifier, MLPRegressor
    from sklearn.svm import SVC, SVR
    from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

    n_estimators = max(10, min(200, epochs * 10))
    common = {"random_state": 42}

    if model_type == "randomForest":
        cls = RandomForestClassifier if task_type == "classification" else RandomForestRegressor
        return cls(n_estimators=n_estimators, **common)
    if model_type == "extraTrees":
        cls = ExtraTreesClassifier if task_type == "classification" else ExtraTreesRegressor
        return cls(n_estimators=n_estimators, **common)
    if model_type == "gradientBoosting":
        cls = GradientBoostingClassifier if task_type == "classification" else GradientBoostingRegressor
        return cls(n_estimators=n_estimators, learning_rate=max(lr, 0.001), **common)
    if model_type == "adaBoost":
        cls = AdaBoostClassifier if task_type == "classification" else AdaBoostRegressor
        return cls(n_estimators=n_estimators, learning_rate=max(lr, 0.001), **common)
    if model_type == "svm":
        return SVC(probability=True, **common) if task_type == "classification" else SVR()
    if model_type == "knn":
        return KNeighborsClassifier(n_neighbors=5) if task_type == "classification" else KNeighborsRegressor(n_neighbors=5)
    if model_type == "logisticRegression":
        return LogisticRegression(max_iter=max(200, epochs * 50), random_state=42)
    if model_type == "decisionTree":
        cls = DecisionTreeClassifier if task_type == "classification" else DecisionTreeRegressor
        return cls(**common)
    if model_type == "naiveBayes":
        return GaussianNB()
    if model_type == "linearRegression":
        return LinearRegression()
    if model_type == "ridgeRegression":
        return Ridge(random_state=42)
    if model_type == "lassoRegression":
        return Lasso(random_state=42, max_iter=max(1000, epochs * 100))
    if model_type == "mlpClassifier":
        cls = MLPClassifier if task_type == "classification" else MLPRegressor
        return cls(
            hidden_layer_sizes=(128, 64),
            learning_rate_init=max(lr, 0.0001),
            max_iter=max(200, epochs * 20),
            random_state=42,
        )

    raise ValueError(f"Unsupported model node '{model_type}'.")


def _fit_and_measure(
    model: Any,
    model_type: str,
    split: DatasetSplit,
    nodes: List[Dict[str, Any]],
    epochs: int,
) -> List[Dict[str, Any]]:
    from sklearn.metrics import accuracy_score, log_loss, mean_squared_error, r2_score

    model.fit(split.X_train, split.y_train)

    if split.task_type == "classification":
        train_pred = model.predict(split.X_train)
        test_pred = model.predict(split.X_test)
        train_acc = float(accuracy_score(split.y_train, train_pred))
        test_acc = float(accuracy_score(split.y_test, test_pred))
        train_loss = _classification_loss(model, split.X_train, split.y_train, train_pred, log_loss)
        test_loss = _classification_loss(model, split.X_test, split.y_test, test_pred, log_loss)
    else:
        train_pred = model.predict(split.X_train)
        test_pred = model.predict(split.X_test)
        train_loss = float(mean_squared_error(split.y_train, train_pred))
        test_loss = float(mean_squared_error(split.y_test, test_pred))
        train_acc = float(max(0.0, min(1.0, r2_score(split.y_train, train_pred))))
        test_acc = float(max(0.0, min(1.0, r2_score(split.y_test, test_pred))))

    return [
        {
            "epoch": 1,
            "loss": round(train_loss, 6),
            "accuracy": round(train_acc, 6),
            "val_loss": round(test_loss, 6),
            "val_accuracy": round(test_acc, 6),
            "gradient_norms": _model_signal_strength(model, nodes),
        }
    ]


def _train_one_model(
    model_node: Dict[str, Any],
    split: DatasetSplit,
    all_nodes: List[Dict[str, Any]],
    epochs: int,
    lr: float,
    artifact_dir: Path | None,
) -> Dict[str, Any]:
    from sklearn.metrics import (
        accuracy_score,
        confusion_matrix,
        log_loss,
        mean_squared_error,
        r2_score,
    )

    model_type = model_node["type"]
    model = _build_model(model_type, split.task_type, epochs, lr)
    model.fit(split.X_train, split.y_train)

    if split.task_type == "classification":
        train_pred = model.predict(split.X_train)
        test_pred = model.predict(split.X_test)
        train_acc = float(accuracy_score(split.y_train, train_pred))
        test_acc = float(accuracy_score(split.y_test, test_pred))
        train_loss = _classification_loss(model, split.X_train, split.y_train, train_pred, log_loss)
        test_loss = _classification_loss(model, split.X_test, split.y_test, test_pred, log_loss)
        labels = list(range(len(split.class_names or []))) or sorted(np.unique(split.y_test).tolist())
        matrix = confusion_matrix(split.y_test, test_pred, labels=labels).tolist()
        predictions = _sample_predictions(model, split, test_pred)
    else:
        train_pred = model.predict(split.X_train)
        test_pred = model.predict(split.X_test)
        train_loss = float(mean_squared_error(split.y_train, train_pred))
        test_loss = float(mean_squared_error(split.y_test, test_pred))
        train_acc = float(max(0.0, min(1.0, r2_score(split.y_train, train_pred))))
        test_acc = float(max(0.0, min(1.0, r2_score(split.y_test, test_pred))))
        matrix = []
        predictions = _sample_predictions(model, split, test_pred)

    artifact_path = None
    if artifact_dir:
        from joblib import dump

        artifact_path = artifact_dir / f"{model_node.get('id', model_type)}_{model_type}.joblib"
        dump(
            {
                "model": model,
                "preprocessor": split.preprocessor,
                "feature_columns": split.feature_columns or [],
                "class_names": split.class_names or [],
                "target_column": split.target_column,
                "task_type": split.task_type,
                "model_type": model_type,
            },
            artifact_path,
        )

    metrics = {
        "loss": round(train_loss, 6),
        "accuracy": round(train_acc, 6),
        "val_loss": round(test_loss, 6),
        "val_accuracy": round(test_acc, 6),
    }

    return {
        "node_id": model_node.get("id", model_type),
        "model_type": model_type,
        "label": (model_node.get("data") or {}).get("label") or model_type,
        "metrics": metrics,
        "confusion_matrix": matrix,
        "class_names": split.class_names or [],
        "predictions": predictions,
        "artifact_path": str(artifact_path) if artifact_path else None,
        "gradient_norms": _model_signal_strength(model, [model_node]),
    }


def _sample_predictions(model: Any, split: DatasetSplit, pred: Any) -> List[Dict[str, Any]]:
    probabilities = None
    if hasattr(model, "predict_proba"):
        try:
            probabilities = model.predict_proba(split.X_test)
        except Exception:
            probabilities = None

    rows: List[Dict[str, Any]] = []
    limit = min(10, len(pred))
    for idx in range(limit):
        actual = split.y_test[idx]
        predicted = pred[idx]
        confidence = None
        if probabilities is not None:
            confidence = float(np.max(probabilities[idx]))

        if split.class_names:
            actual_label = split.class_names[int(actual)]
            predicted_label = split.class_names[int(predicted)]
        else:
            actual_label = float(actual)
            predicted_label = float(predicted)

        rows.append(
            {
                "actual": actual_label,
                "predicted": predicted_label,
                "confidence": round(confidence, 4) if confidence is not None else None,
            }
        )
    return rows


def predict_with_artifact(
    artifact_path: str,
    rows: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Run predictions from a saved sklearn model bundle."""
    if not rows:
        raise ValueError("At least one input row is required.")

    from joblib import load

    bundle = load(artifact_path)
    if isinstance(bundle, dict) and "model" in bundle:
        model = bundle["model"]
        preprocessor = bundle.get("preprocessor")
        feature_columns = bundle.get("feature_columns") or []
        class_names = bundle.get("class_names") or []
        task_type = bundle.get("task_type") or "classification"
        model_type = bundle.get("model_type")
    else:
        model = bundle
        preprocessor = None
        feature_columns = []
        class_names = []
        task_type = "classification"
        model_type = type(model).__name__

    frame = pd.DataFrame(rows)
    if feature_columns:
        missing = [col for col in feature_columns if col not in frame.columns]
        if missing:
            raise ValueError(f"Missing required feature column(s): {', '.join(missing)}")
        frame = frame[feature_columns]

    X = preprocessor.transform(frame) if preprocessor is not None else frame
    raw_predictions = model.predict(X)
    probabilities = None
    if hasattr(model, "predict_proba"):
        try:
            probabilities = model.predict_proba(X)
        except Exception:
            probabilities = None

    predictions: List[Dict[str, Any]] = []
    for idx, raw in enumerate(raw_predictions):
        value: Any = raw.item() if hasattr(raw, "item") else raw
        confidence = None
        if probabilities is not None:
            confidence = float(np.max(probabilities[idx]))
        if class_names:
            try:
                value = class_names[int(raw)]
            except Exception:
                value = str(value)
        predictions.append({"prediction": value, "confidence": confidence})

    return {
        "model_type": model_type,
        "task_type": task_type,
        "count": len(predictions),
        "predictions": predictions,
    }


def _classification_loss(model: Any, X: Any, y: Any, pred: Any, log_loss_fn: Any) -> float:
    if hasattr(model, "predict_proba"):
        try:
            return float(log_loss_fn(y, model.predict_proba(X)))
        except Exception:
            pass
    return float(1.0 - np.mean(pred == y))


def _model_signal_strength(model: Any, nodes: List[Dict[str, Any]]) -> Dict[str, float]:
    if hasattr(model, "feature_importances_"):
        base = float(np.mean(np.abs(model.feature_importances_)))
    elif hasattr(model, "coef_"):
        base = float(np.mean(np.abs(model.coef_)))
    else:
        base = 1.0
    return {
        node.get("id", f"node_{idx}"): round(base, 6)
        for idx, node in enumerate(nodes)
        if node.get("type") not in {"dataset", "training_config"}
    }
