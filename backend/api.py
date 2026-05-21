"""
backend/api.py
--------------
Plexus FastAPI backend.

Endpoints
---------
POST   /api/datasets/upload          – upload file, starts BG profiling, returns dataset record immediately
GET    /api/datasets                 – list all datasets
GET    /api/datasets/{id}            – metadata + preview for one dataset
GET    /api/datasets/{id}/status     – profiling progress (0-100) and status
DELETE /api/datasets/{id}            – remove a dataset

POST   /api/agents/data              – run Data Agent on a dataset
POST   /api/agents/architect         – run Architect Agent
POST   /api/agents/resource          – run Resource Agent (graph stats)
POST   /api/agents/debug             – run Debugger Agent on training history
POST   /api/agents/optimize          – run Optimizer Agent

POST   /api/train/start              – create a training job
GET    /api/train/{job_id}/status    – poll job status
WS     /ws/train/{job_id}            – real-time training updates

POST   /api/generate/code            – generate Python code from graph JSON
POST   /api/projects/export          – export project as .plexus file

Run with:
    uvicorn backend.api:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import tempfile
import traceback
import uuid
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("plexus.api")

import pydantic.json

try:
    from backend.database import (
        SessionLocal,
        DBDataset,
        DBJob,
        delete_state,
        list_state,
        set_state,
    )
except ImportError:  # Allows running from inside backend/ during local debugging.
    from database import (  # type: ignore
        SessionLocal,
        DBDataset,
        DBJob,
        delete_state,
        list_state,
        set_state,
    )

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)
REGISTRY_FILE = BASE_DIR / "dataset_registry.json"
JOBS_FILE = BASE_DIR / "jobs_registry.json"

# ---------------------------------------------------------------------------
# In-memory stores (sync to sqlite)
# ---------------------------------------------------------------------------
_dataset_registry: Dict[str, Any] = {}
_jobs: Dict[str, Any] = {}
_agent_activity: List[Dict[str, Any]] = []
_ws_connections: Dict[str, List[WebSocket]] = {}   # job_id -> [ws, ...]
# Profiling progress for dataset uploads: dataset_id -> {progress, message, done}
_profiling_status: Dict[str, Dict[str, Any]] = {}


def _load_registry() -> None:
    global _dataset_registry
    state_records = list_state("dataset")
    if state_records:
        _dataset_registry = {
            record["id"]: record for record in state_records if isinstance(record, dict) and record.get("id")
        }
        return

    db = SessionLocal()
    try:
        datasets = db.query(DBDataset).all()
        for ds in datasets:
            _dataset_registry[ds.id] = {
                "id": ds.id,
                "name": ds.name,
                "type": ds.type,
                "size_bytes": ds.size_bytes,
                "path": ds.path,
                "uploaded_at": ds.uploaded_at.isoformat() if ds.uploaded_at else None,
                "columns": ds.columns,
                "numeric_columns": ds.numeric_columns,
                "categorical_columns": ds.categorical_columns,
                "target_column": ds.target_column,
                "row_count": ds.row_count,
                "summary_stats": ds.summary_stats,
                "preprocessing_suggestions": ds.preprocessing_suggestions
            }
    finally:
        db.close()


def _save_registry() -> None:
    for ds_id, data in _dataset_registry.items():
        set_state("dataset", ds_id, data)

    db = SessionLocal()
    try:
        for ds_id, data in _dataset_registry.items():
            ds = db.query(DBDataset).filter(DBDataset.id == ds_id).first()
            if not ds:
                ds = DBDataset(id=ds_id)
                db.add(ds)
            ds.name = data.get("name")
            ds.type = data.get("type")
            ds.size_bytes = data.get("size_bytes")
            ds.path = data.get("path")
            ds.columns = data.get("columns", [])
            ds.numeric_columns = data.get("numeric_columns", [])
            ds.categorical_columns = data.get("categorical_columns", [])
            ds.target_column = data.get("target_column")
            ds.row_count = data.get("row_count", 0)
            ds.summary_stats = data.get("summary_stats", {})
            ds.preprocessing_suggestions = data.get("preprocessing_suggestions", [])
        db.commit()
    finally:
        db.close()


def _load_jobs() -> None:
    global _jobs
    state_records = list_state("job")
    if state_records:
        _jobs = {
            record["id"]: record for record in state_records if isinstance(record, dict) and record.get("id")
        }
        return

    db = SessionLocal()
    try:
        jobs = db.query(DBJob).all()
        for j in jobs:
            _jobs[j.id] = {
                "id": j.id,
                "dataset_id": j.dataset_id,
                "status": j.status,
                "metrics": j.metrics,
                "architecture": j.architecture
            }
    finally:
        db.close()

def _save_jobs() -> None:
    for j_id, jdata in _jobs.items():
        set_state("job", j_id, jdata)

    db = SessionLocal()
    try:
        for j_id, jdata in _jobs.items():
            job = db.query(DBJob).filter(DBJob.id == j_id).first()
            if not job:
                job = DBJob(id=j_id)
                db.add(job)
            job.dataset_id = jdata.get("dataset_id")
            job.status = jdata.get("status", "created")
            job.metrics = jdata.get("metrics", {})
            job.architecture = jdata.get("architecture", [])
        db.commit()
    finally:
        db.close()


def _load_agent_activity() -> None:
    global _agent_activity
    _agent_activity = sorted(
        [
            record
            for record in list_state("agent_event")
            if isinstance(record, dict) and record.get("id")
        ],
        key=lambda item: item.get("timestamp", ""),
    )[-500:]


def _agent_log(
    agent: str,
    status: str,
    task: str,
    dataset_id: Optional[str] = None,
    job_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Persist and print a backend agent activity event."""
    def _format_details(details: Dict[str, Any]) -> str:
        if not details:
            return "-"
        parts: List[str] = []
        for key, value in details.items():
            if isinstance(value, (dict, list)):
                value_str = json.dumps(value, ensure_ascii=True)
            else:
                value_str = str(value)
            parts.append(f"{key}={value_str}")
        return "; ".join(parts)

    event = {
        "id": str(uuid.uuid4())[:8],
        "timestamp": datetime.utcnow().isoformat(),
        "agent": agent,
        "status": status,
        "task": task,
        "dataset_id": dataset_id,
        "job_id": job_id,
        "details": details or {},
    }
    _agent_activity.append(event)
    del _agent_activity[:-500]
    set_state("agent_event", event["id"], event)
    logger.info(
        "[AGENT:%s] %s | %s | dataset=%s | job=%s | %s",
        agent,
        status.upper(),
        task,
        dataset_id or "-",
        job_id or "-",
        _format_details(event["details"]),
    )
    return event


# load on startup
_load_registry()
_load_jobs()
_load_agent_activity()

# ---------------------------------------------------------------------------
# Auto-register demo Iris dataset if registry is empty
# ---------------------------------------------------------------------------
DEMO_DIR = UPLOADS_DIR / "demo"
DEMO_CSV = DEMO_DIR / "iris.csv"

def _seed_demo_dataset() -> None:
    """Register the bundled Iris CSV so new users have something to test."""
    if _dataset_registry or not DEMO_CSV.exists():
        return
    import pandas as pd
    try:
        df = pd.read_csv(DEMO_CSV)
        demo_id = "demo-iris"
        _dataset_registry[demo_id] = {
            "id": demo_id,
            "name": "Iris (Demo)",
            "type": "csv",
            "size_bytes": DEMO_CSV.stat().st_size,
            "path": str(DEMO_CSV),
            "uploaded_at": datetime.utcnow().isoformat(),
            "columns": list(df.columns),
            "row_count": len(df),
            "preview": json.loads(df.head(5).to_json(orient="records")),
            "stats": {
                "numeric_columns": list(df.select_dtypes(include="number").columns),
                "categorical_columns": list(df.select_dtypes(include="object").columns),
                "missing_count": int(df.isnull().sum().sum()),
            },
            "status": "ready",
            "is_demo": True,
        }
        _save_registry()
        logger.info("Seeded demo dataset: Iris (150 rows, 5 columns)")
    except Exception as exc:
        logger.warning("Could not seed demo dataset: %s", exc)

_seed_demo_dataset()

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Plexus Backend API",
    description="AI-powered deep learning visual IDE – backend services",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================================================
# Pydantic models
# ===========================================================================

class AgentDataRequest(BaseModel):
    dataset_id: str
    target_col: Optional[str] = None


class AgentArchitectRequest(BaseModel):
    dataset_id: str
    task_type: Optional[str] = "classification"
    graph_context: Optional[Dict[str, Any]] = None


class AgentResourceRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    batch_size: int = 32
    epochs: int = 10


class AgentDebugRequest(BaseModel):
    history: Dict[str, List[float]]    # {"loss": [...], "val_loss": [...], ...}
    threshold_overfit: float = 0.1
    patience: int = 3


class AgentOptimizeRequest(BaseModel):
    history: Dict[str, List[float]]
    current_lr: float = 0.001
    current_batch_size: int = 32


class AgentDeployRequest(BaseModel):
    framework: str = "tensorflow"
    model_path: Optional[str] = None
    input_shape: Optional[List[int]] = None
    output_units: int = 1
    task_type: str = "classification"
    return_zip: bool = False


class TrainStartRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    dataset_id: str
    framework: str = "tensorflow"
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001


class ModelPredictRequest(BaseModel):
    artifact_path: str
    rows: List[Dict[str, Any]]


class CodeGenRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    framework: str = "tensorflow"
    dataset_id: Optional[str] = None


# ===========================================================================
# Helper: import agents lazily so missing optional deps don't break startup
# ===========================================================================

def _get_data_agent():
    from backend.agents.data_agent import DataAgent
    return DataAgent()


def _get_architect_agent():
    from backend.agents.architect import ArchitectAgent
    return ArchitectAgent()


def _get_debugger_agent():
    from backend.agents.debugger import DebuggerAgent
    return DebuggerAgent()


def _get_optimizer_agent():
    from backend.agents.optimizer import OptimizerAgent
    return OptimizerAgent()


def _get_resource_agent():
    from backend.agents.resource import ResourceAgent
    return ResourceAgent()


def _get_deployment_agent():
    from backend.agents.deployment import DeploymentAgent
    return DeploymentAgent()


# ===========================================================================
# Health
# ===========================================================================

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/agents/activity")
async def get_agent_activity(limit: int = 100):
    """Return recent backend agent activity events for frontend/debug panels."""
    return {"events": _agent_activity[-max(1, min(limit, 500)):]}


# ===========================================================================
# Dataset endpoints
# ===========================================================================

@app.post("/api/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Accept CSV, zip (image folder), or plain text file.

    Returns immediately with a preliminary record (status=profiling).
    The actual profiling happens in a background task – poll
    GET /api/datasets/{id}/status to track progress.
    """
    dataset_id = str(uuid.uuid4())[:8]
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()

    dataset_dir = UPLOADS_DIR / dataset_id
    dataset_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dataset_dir / filename

    # Save the file immediately (await the read, sync write is fine for small files)
    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    record: Dict[str, Any] = {
        "id": dataset_id,
        "name": filename,
        "type": _detect_type(ext),
        "size_bytes": len(content),
        "path": str(dest_path),
        "uploaded_at": datetime.utcnow().isoformat(),
        "status": "profiling",       # <-- new field: profiling | ready | error
        "preview": [],
        "columns": [],
        "row_count": 0,
        "stats": {},
        "preprocessing_suggestions": [],
        "cleaning_status": {"status": "pending"} if ext == ".csv" else None,
    }

    _dataset_registry[dataset_id] = record
    _profiling_status[dataset_id] = {
        "progress": 0,
        "message": "File saved, starting profiling…",
        "done": False,
        "error": None,
        "cleaning_status": {"status": "pending"},
    }
    _save_registry()           # save stub so the ID is visible immediately
    logger.info("Dataset upload accepted: id=%s name=%s bytes=%s", dataset_id, filename, len(content))
    _agent_log(
        "orchestrator",
        "queued",
        "dataset profiling and agent preparation",
        dataset_id=dataset_id,
        details={"filename": filename, "type": record["type"], "bytes": len(content)},
    )

    # Kick off profiling in the background
    background_tasks.add_task(_profile_dataset_bg, dataset_id, dest_path, ext, dataset_dir)

    return JSONResponse(content=record, status_code=201)


async def _profile_dataset_bg(
    dataset_id: str,
    dest_path: Path,
    ext: str,
    dataset_dir: Path,
) -> None:
    """Background task: profile the dataset and update the registry entry."""
    def _set_progress(pct: int, msg: str) -> None:
        _profiling_status[dataset_id] = {
            "progress": pct,
            "message": msg,
            "done": False,
            "error": None,
            "cleaning_status": _profiling_status.get(dataset_id, {}).get("cleaning_status", {"status": "pending"}),
        }
        _agent_log(
            "data_pipeline",
            "progress",
            msg,
            dataset_id=dataset_id,
            details={"progress": pct},
        )

    try:
        _set_progress(10, "Reading file…")
        await asyncio.sleep(0)   # yield so the response can be sent first

        loop = asyncio.get_event_loop()

        if ext == ".csv":
            _set_progress(20, "Parsing CSV…")
            update = await loop.run_in_executor(None, lambda: _csv_preview(dest_path))
            _set_progress(60, "Generating preprocessing suggestions…")
            await asyncio.sleep(0)
            suggestions = await loop.run_in_executor(
                None, lambda: _infer_preprocessing_suggestions(update)
            )
            update["preprocessing_suggestions"] = suggestions
            _set_progress(90, "Finalising…")

        elif ext == ".zip":
            _set_progress(30, "Extracting archive…")
            update = await loop.run_in_executor(
                None, lambda: _zip_preview(dest_path, dataset_dir)
            )
            update["preprocessing_suggestions"] = []
            _set_progress(90, "Finalising…")

        elif ext in (".txt", ".text"):
            _set_progress(40, "Counting lines…")
            update = await loop.run_in_executor(None, lambda: _text_preview(dest_path))
            update["preprocessing_suggestions"] = []
            _set_progress(90, "Finalising…")

        else:
            update = {"preprocessing_suggestions": []}
            _set_progress(90, "Unsupported format – skipping deep profiling.")

        update["status"] = "ready"
        _dataset_registry[dataset_id].update(update)
        _save_registry()
        _profiling_status[dataset_id] = {
            "progress": 100,
            "message": "Profiling complete.",
            "done": True,
            "error": None,
            "cleaning_status": _profiling_status.get(dataset_id, {}).get("cleaning_status", {"status": "pending"}),
        }
        logger.info("Dataset %s profiling complete.", dataset_id)
        _agent_log(
            "data_pipeline",
            "completed",
            "dataset profiling",
            dataset_id=dataset_id,
            details={
                "columns": len(_dataset_registry[dataset_id].get("columns", [])),
                "rows": _dataset_registry[dataset_id].get("row_count", 0),
                "suggestions": len(_dataset_registry[dataset_id].get("preprocessing_suggestions", [])),
            },
        )

        # Kick off auto-cleaning agent if it's a CSV
        if ext == ".csv":
            asyncio.create_task(_run_data_agent_bg(dataset_id))
            asyncio.create_task(_run_architect_agent_bg(dataset_id))

    except Exception as exc:
        logger.exception("Profiling failed for dataset %s", dataset_id)
        _agent_log(
            "data_pipeline",
            "failed",
            "dataset profiling",
            dataset_id=dataset_id,
            details={"error": str(exc)},
        )
        _dataset_registry[dataset_id]["status"] = "error"
        _save_registry()
        _profiling_status[dataset_id] = {
            "progress": 0,
            "message": f"Profiling failed: {exc}",
            "done": True,
            "error": str(exc),
            "cleaning_status": {"status": "error", "error": "Profiling failed, skipping cleaning."},
        }
        


async def _run_data_agent_bg(dataset_id: str) -> None:
    """Background task: run Data Agent on newly profiled dataset."""
    _agent_log("data_agent", "started", "generate cleaning script", dataset_id=dataset_id)
    _profiling_status[dataset_id]["cleaning_status"] = {"status": "running"}
    if dataset_id in _dataset_registry:
        _dataset_registry[dataset_id]["cleaning_status"] = {"status": "running"}
        _save_registry()
    try:
        agent = _get_data_agent()
        record = _dataset_registry[dataset_id]
        result = await agent.run({"csv_path": record["path"], "target_col": None})
        
        if not result.success:
            status = {"status": "error", "error": result.error}
            _profiling_status[dataset_id]["cleaning_status"] = status
            _dataset_registry[dataset_id]["cleaning_status"] = status
            _save_registry()
            _agent_log(
                "data_agent",
                "failed",
                "generate cleaning script",
                dataset_id=dataset_id,
                details={"error": result.error},
            )
            return
            
        data = result.data.copy()
        status = {
            "status": "done",
            "code": data.get("code"),
            "steps": data.get("steps"),
            "validation": data.get("validation")
        }
        _profiling_status[dataset_id]["cleaning_status"] = status
        _dataset_registry[dataset_id]["cleaning_status"] = status
        _save_registry()
        _agent_log(
            "data_agent",
            "completed",
            "generate cleaning script",
            dataset_id=dataset_id,
            details={
                "steps": len(data.get("steps") or []),
                "validation": data.get("validation"),
                "mode": result.metadata.get("mode"),
            },
        )
        logger.info("Dataset %s auto-cleaning generation complete.", dataset_id)
    except Exception as exc:
        logger.exception("Auto data agent failed for dataset %s", dataset_id)
        status = {"status": "error", "error": str(exc)}
        _profiling_status[dataset_id]["cleaning_status"] = status
        if dataset_id in _dataset_registry:
            _dataset_registry[dataset_id]["cleaning_status"] = status
            _save_registry()
        _agent_log(
            "data_agent",
            "failed",
            "generate cleaning script",
            dataset_id=dataset_id,
            details={"error": str(exc)},
        )


async def _run_architect_agent_bg(dataset_id: str) -> None:
    """Prepare model suggestions as soon as a CSV dataset is profiled."""
    _agent_log("architect_agent", "started", "prepare model suggestions", dataset_id=dataset_id)
    try:
        record = _dataset_registry[dataset_id]
        agent = _get_architect_agent()
        result = await agent.run(
            {
                "dataset_id": dataset_id,
                "dataset_info": record,
                "task_type": "classification",
                "graph_context": {"source": "auto_after_profile"},
            }
        )
        if not result.success:
            _dataset_registry[dataset_id]["architect_status"] = {
                "status": "error",
                "error": result.error,
            }
            _save_registry()
            _agent_log(
                "architect_agent",
                "failed",
                "prepare model suggestions",
                dataset_id=dataset_id,
                details={"error": result.error},
            )
            return

        _dataset_registry[dataset_id]["architect_status"] = {
            "status": "done",
            "suggested_nodes": result.data.get("suggested_nodes", []),
            "description": result.data.get("description"),
        }
        _save_registry()
        _agent_log(
            "architect_agent",
            "completed",
            "prepare model suggestions",
            dataset_id=dataset_id,
            details={
                "suggested_nodes": result.data.get("suggested_nodes", []),
                "description": result.data.get("description"),
            },
        )
    except Exception as exc:
        logger.exception("Auto architect agent failed for dataset %s", dataset_id)
        if dataset_id in _dataset_registry:
            _dataset_registry[dataset_id]["architect_status"] = {
                "status": "error",
                "error": str(exc),
            }
            _save_registry()
        _agent_log(
            "architect_agent",
            "failed",
            "prepare model suggestions",
            dataset_id=dataset_id,
            details={"error": str(exc)},
        )

def _infer_preprocessing_suggestions(csv_update: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Derive deterministic (no-AI) preprocessing steps from column statistics.
    Returns a list of { type, columns, reason, node_type } dicts.
    """
    stats = csv_update.get("stats", {})
    columns = csv_update.get("columns", [])
    suggestions: List[Dict[str, Any]] = []

    missing_cols: List[str] = []
    categorical_cols: List[str] = []
    numeric_cols: List[str] = []
    high_cardinality_cols: List[str] = []

    for col in columns:
        s = stats.get(col, {})
        dtype = s.get("dtype", "object")
        missing_pct = s.get("missing_pct", 0)
        unique = s.get("unique", 0)

        if missing_pct > 0:
            missing_cols.append(col)

        is_numeric = "int" in str(dtype) or "float" in str(dtype)
        if is_numeric:
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)
            if unique > 10:
                high_cardinality_cols.append(col)

    # Fill / drop missing values
    if missing_cols:
        suggestions.append({
            "type": "handle_missing",
            "columns": missing_cols,
            "reason": f"{len(missing_cols)} column(s) have missing values.",
            "node_type": "dropNulls",   # maps to a canvas preprocessing node
        })

    # Encode categoricals
    low_card = [c for c in categorical_cols if c not in high_cardinality_cols]
    if low_card:
        suggestions.append({
            "type": "encode_categorical",
            "columns": low_card,
            "reason": "Categorical columns must be encoded for ML.",
            "node_type": "oneHotEncode",
        })

    # OneHot / embedding for high-cardinality
    if high_cardinality_cols:
        suggestions.append({
            "type": "encode_high_cardinality",
            "columns": high_cardinality_cols,
            "reason": "High-cardinality columns may need embedding or hashing.",
            "node_type": "embedEncode",
        })

    # Scale numerics
    if numeric_cols:
        suggestions.append({
            "type": "scale_numeric",
            "columns": numeric_cols,
            "reason": "Numeric features should be normalised for stable training.",
            "node_type": "normalize",
        })

    return suggestions


@app.get("/api/datasets/{dataset_id}/status")
async def get_dataset_status(dataset_id: str):
    """Poll background profiling progress for a dataset."""
    if dataset_id not in _dataset_registry:
        raise HTTPException(404, f"Dataset '{dataset_id}' not found.")
    status = _profiling_status.get(dataset_id, {
        "progress": 100,
        "message": "Already profiled.",
        "done": True,
        "error": None,
        "cleaning_status": _dataset_registry.get(dataset_id, {}).get("cleaning_status"),
    })
    record = _dataset_registry[dataset_id]
    return {
        **status,
        "dataset_status": record.get("status", "ready"),
        "columns": record.get("columns", []),
        "row_count": record.get("row_count", 0),
        "preprocessing_suggestions": record.get("preprocessing_suggestions", []),
        "architect_status": record.get("architect_status"),
    }




def _detect_type(ext: str) -> str:
    if ext == ".csv":
        return "csv"
    if ext == ".zip":
        return "image_folder"
    if ext in (".txt", ".text"):
        return "text"
    return "unknown"


def _csv_preview(path: Path) -> Dict[str, Any]:
    import pandas as pd
    df = _read_csv_with_fallback(path, nrows=100)
    preview_df = df.head(10)
    stats: Dict[str, Any] = {}
    for col in df.columns:
        col_data = df[col]
        col_stats: Dict[str, Any] = {
            "dtype": str(col_data.dtype),
            "missing": int(col_data.isna().sum()),
            "missing_pct": round(col_data.isna().mean() * 100, 2),
        }
        if col_data.dtype in ("float64", "int64", "float32", "int32"):
            col_stats["min"] = float(col_data.min()) if not col_data.isna().all() else None
            col_stats["max"] = float(col_data.max()) if not col_data.isna().all() else None
            col_stats["mean"] = float(col_data.mean()) if not col_data.isna().all() else None
            col_stats["std"] = float(col_data.std()) if not col_data.isna().all() else None
        else:
            col_stats["unique"] = int(col_data.nunique())
            col_stats["top"] = str(col_data.mode().iloc[0]) if not col_data.empty else None
        stats[col] = col_stats

    # read actual row count
    full_df = _read_csv_with_fallback(path)
    return {
        "columns": list(df.columns),
        "row_count": len(full_df),
        "preview": preview_df.fillna("").to_dict(orient="records"),
        "stats": stats,
    }


def _read_csv_with_fallback(path: Path | str, **kwargs: Any):
    import pandas as pd

    last_error: Exception | None = None
    for encoding in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            return pd.read_csv(path, encoding=encoding, **kwargs)
        except UnicodeDecodeError as exc:
            last_error = exc
    if last_error:
        raise last_error
    return pd.read_csv(path, **kwargs)


def _zip_preview(zip_path: Path, dataset_dir: Path) -> Dict[str, Any]:
    extract_dir = dataset_dir / "extracted"
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)
    image_exts = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp"}
    image_paths: List[str] = []
    for p in extract_dir.rglob("*"):
        if p.suffix.lower() in image_exts:
            image_paths.append(str(p.relative_to(dataset_dir)))
    classes = sorted({p.parts[-2] for p in extract_dir.rglob("*") if p.suffix.lower() in image_exts})
    return {
        "row_count": len(image_paths),
        "preview": image_paths[:20],
        "stats": {"classes": classes, "total_images": len(image_paths)},
    }


def _text_preview(path: Path) -> Dict[str, Any]:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    return {
        "row_count": len(lines),
        "preview": lines[:20],
        "stats": {"total_lines": len(lines)},
    }


@app.get("/api/datasets")
async def list_datasets():
    return {"datasets": list(_dataset_registry.values())}


@app.get("/api/datasets/{dataset_id}")
async def get_dataset(dataset_id: str):
    record = _dataset_registry.get(dataset_id)
    if not record:
        raise HTTPException(404, f"Dataset '{dataset_id}' not found.")
    return record


@app.delete("/api/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str):
    record = _dataset_registry.pop(dataset_id, None)
    if not record:
        raise HTTPException(404, f"Dataset '{dataset_id}' not found.")
    # remove files
    dataset_dir = UPLOADS_DIR / dataset_id
    if dataset_dir.exists():
        shutil.rmtree(dataset_dir)
    delete_state("dataset", dataset_id)
    _save_registry()
    return {"deleted": dataset_id}


@app.post("/api/datasets/{dataset_id}/apply-preprocessing")
async def apply_preprocessing(dataset_id: str):
    """
    Apply the LLM-generated cleaning code to the full dataset,
    saving it as a new dataset in the registry to avoid mutating the original.
    """
    record = _dataset_registry.get(dataset_id)
    if not record:
        raise HTTPException(404, f"Dataset '{dataset_id}' not found.")
    
    status_info = _profiling_status.get(dataset_id, {})
    cleaning_status = status_info.get("cleaning_status") or record.get("cleaning_status", {})
    code = cleaning_status.get("code")
    
    if cleaning_status.get("status") != "done" or not code:
        raise HTTPException(400, "Cleaning code is not ready or failed.")
        
    try:
        _agent_log(
            "data_agent",
            "started",
            "apply cleaning script",
            dataset_id=dataset_id,
            details={"source_dataset": record.get("name")},
        )
        import pandas as pd
        # Read the original dataset
        df = _read_csv_with_fallback(record["path"])
        
        # Build the same safe namespace used during validation
        safe_globals: Dict[str, Any] = {"pd": pd, "__builtins__": __builtins__}
        try:
            from sklearn import preprocessing
            safe_globals["preprocessing"] = preprocessing
            from sklearn.preprocessing import StandardScaler, MinMaxScaler
            safe_globals["StandardScaler"] = StandardScaler
            safe_globals["MinMaxScaler"] = MinMaxScaler
        except ImportError:
            pass

        # We need to execute the generated 'clean_data(df)' function in a local namespace
        local_vars: Dict[str, Any] = {}
        # Define clean_data inside local_vars
        exec(code, safe_globals, local_vars)
        clean_func = local_vars.get("clean_data")
        
        if not clean_func:
            raise ValueError("Generated code did not contain a 'clean_data' function.")
            
        # Apply the function
        cleaned_df = clean_func(df)
        
        # Save as a new dataset
        new_id = str(uuid.uuid4())[:8]
        new_dir = UPLOADS_DIR / new_id
        new_dir.mkdir(parents=True, exist_ok=True)
        
        # Insert "_cleaned" before the extension
        orig_name = record["name"]
        orig_path = Path(orig_name)
        new_name = f"{orig_path.stem}_cleaned{orig_path.suffix}"
        dest_path = new_dir / new_name
        
        cleaned_df.to_csv(dest_path, index=False)
        
        # Create new dataset record
        new_record: Dict[str, Any] = {
            "id": new_id,
            "name": new_name,
            "type": "csv",
            "size_bytes": dest_path.stat().st_size,
            "path": str(dest_path),
            "uploaded_at": datetime.utcnow().isoformat(),
            "status": "ready",
            "preview": [],
            "columns": [],
            "row_count": 0,
            "stats": {},
            "preprocessing_suggestions": [],
            "cleaning_status": {"status": "pending"},
            "is_cleaned_duplicate": True, # Custom flag to identify cleaned versions
            "parent_dataset_id": dataset_id
        }
        
        _dataset_registry[new_id] = new_record
        _save_registry()
        
        # Profile the new dataset inline so it's ready immediately
        update = _csv_preview(dest_path)
        suggestions = _infer_preprocessing_suggestions(update)
        update["preprocessing_suggestions"] = suggestions
        _dataset_registry[new_id].update(update)
        _save_registry()
        
        # Mark profiling as done for the new dataset
        _profiling_status[new_id] = {
            "progress": 100,
            "message": "Profiling complete.",
            "done": True,
            "error": None,
            "cleaning_status": {"status": "pending"}
        }
        _agent_log(
            "data_agent",
            "completed",
            "apply cleaning script",
            dataset_id=dataset_id,
            details={
                "cleaned_dataset_id": new_id,
                "cleaned_name": new_name,
                "rows": _dataset_registry[new_id].get("row_count"),
                "columns": len(_dataset_registry[new_id].get("columns", [])),
            },
        )
        
        return _dataset_registry[new_id]
        
    except Exception as exc:
        logger.exception("Failed to apply preprocessing to dataset %s", dataset_id)
        _agent_log(
            "data_agent",
            "failed",
            "apply cleaning script",
            dataset_id=dataset_id,
            details={"error": str(exc)},
        )
        raise HTTPException(500, f"Error applying preprocessing: {str(exc)}") from exc


# ===========================================================================
# Agent endpoints
# ===========================================================================

@app.post("/api/agents/data")
async def run_data_agent(req: AgentDataRequest):
    record = _dataset_registry.get(req.dataset_id)
    if not record:
        raise HTTPException(404, f"Dataset '{req.dataset_id}' not found.")
    if record.get("type") != "csv":
        raise HTTPException(400, "Data Agent only supports CSV datasets.")

    try:
        _agent_log(
            "data_agent",
            "started",
            "manual cleaning analysis",
            dataset_id=req.dataset_id,
            details={"target_col": req.target_col},
        )
        agent = _get_data_agent()
        result = await agent.run({"csv_path": record["path"], "target_col": req.target_col})
        if not result.success:
            _agent_log(
                "data_agent",
                "failed",
                "manual cleaning analysis",
                dataset_id=req.dataset_id,
                details={"error": result.error},
            )
            raise HTTPException(500, result.error)
        # Serialise DatasetProfile (dataclass) to dict
        data = result.data.copy()
        profile = data.get("profile")
        if hasattr(profile, "__dict__"):
            data["profile"] = _profile_to_dict(profile)
        _agent_log(
            "data_agent",
            "completed",
            "manual cleaning analysis",
            dataset_id=req.dataset_id,
            details={
                "steps": len(data.get("steps") or []),
                "validation": data.get("validation"),
                "mode": result.metadata.get("mode"),
            },
        )
        return data
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Data agent error")
        raise HTTPException(500, str(exc)) from exc


def _profile_to_dict(profile: Any) -> Dict[str, Any]:
    """Recursively convert DatasetProfile dataclasses to plain dicts."""
    if hasattr(profile, "__dataclass_fields__"):
        return {k: _profile_to_dict(getattr(profile, k)) for k in profile.__dataclass_fields__}
    if isinstance(profile, list):
        return [_profile_to_dict(i) for i in profile]
    if isinstance(profile, dict):
        return {k: _profile_to_dict(v) for k, v in profile.items()}
    return profile


@app.post("/api/agents/architect")
async def run_architect_agent(req: AgentArchitectRequest):
    record = _dataset_registry.get(req.dataset_id)
    if not record:
        raise HTTPException(404, f"Dataset '{req.dataset_id}' not found.")

    try:
        logger.info("Architect Agent requested for dataset=%s task=%s", req.dataset_id, req.task_type)
        cached = record.get("architect_status")
        if cached and cached.get("status") == "done" and not req.graph_context:
            _agent_log(
                "architect_agent",
                "completed",
                "return cached model suggestions",
                dataset_id=req.dataset_id,
                details={"suggested_nodes": cached.get("suggested_nodes", [])},
            )
            return {
                "layers": [],
                "description": cached.get("description") or "Cached model suggestions prepared after dataset profiling.",
                "keras_code": "",
                "nodes": [],
                "edges": [],
                "suggested_nodes": cached.get("suggested_nodes", []),
            }

        _agent_log(
            "architect_agent",
            "started",
            "manual model suggestions",
            dataset_id=req.dataset_id,
            details={"task_type": req.task_type, "has_graph_context": bool(req.graph_context)},
        )
        agent = _get_architect_agent()
        result = await agent.run({
            "dataset_id": req.dataset_id,
            "dataset_info": record,
            "task_type": req.task_type,
            "graph_context": req.graph_context,
        })
        if not result.success:
            _agent_log(
                "architect_agent",
                "failed",
                "manual model suggestions",
                dataset_id=req.dataset_id,
                details={"error": result.error},
            )
            raise HTTPException(500, result.error)
        _agent_log(
            "architect_agent",
            "completed",
            "manual model suggestions",
            dataset_id=req.dataset_id,
            details={"suggested_nodes": result.data.get("suggested_nodes", [])},
        )
        return result.data
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Architect agent error")
        raise HTTPException(500, str(exc)) from exc


@app.post("/api/agents/resource")
async def run_resource_agent(req: AgentResourceRequest):
    try:
        _agent_log(
            "resource_agent",
            "started",
            "estimate graph resources",
            details={"nodes": len(req.nodes), "edges": len(req.edges)},
        )
        agent = _get_resource_agent()
        result = await agent.run({
            "nodes": req.nodes,
            "edges": req.edges,
            "batch_size": req.batch_size,
            "epochs": req.epochs,
        })
        if not result.success:
            _agent_log(
                "resource_agent",
                "failed",
                "estimate graph resources",
                details={"error": result.error},
            )
            raise HTTPException(500, result.error)
        _agent_log(
            "resource_agent",
            "completed",
            "estimate graph resources",
            details={
                "total_parameters": result.data.get("total_parameters"),
                "memory_estimate_mb": result.data.get("memory_estimate_mb"),
                "warnings": result.data.get("warnings", []),
            },
        )
        return result.data
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Resource agent error")
        raise HTTPException(500, str(exc)) from exc


@app.post("/api/agents/debug")
async def run_debugger_agent(req: AgentDebugRequest):
    try:
        _agent_log(
            "debugger_agent",
            "started",
            "analyze training history",
            details={"history_keys": list(req.history.keys())},
        )
        agent = _get_debugger_agent()
        result = await agent.run({
            "history": req.history,
            "threshold_overfit": req.threshold_overfit,
            "patience": req.patience,
        })
        if not result.success:
            _agent_log(
                "debugger_agent",
                "failed",
                "analyze training history",
                details={"error": result.error},
            )
            raise HTTPException(500, result.error)
        _agent_log(
            "debugger_agent",
            "completed",
            "analyze training history",
            details={
                "overall": result.data.get("overall"),
                "diagnoses": len(result.data.get("diagnoses", [])),
                "summary": result.data.get("summary"),
            },
        )
        return result.data
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Debugger agent error")
        raise HTTPException(500, str(exc)) from exc


@app.post("/api/agents/optimize")
async def run_optimizer_agent(req: AgentOptimizeRequest):
    try:
        _agent_log(
            "optimizer_agent",
            "started",
            "suggest hyperparameter updates",
            details={"current_lr": req.current_lr, "current_batch_size": req.current_batch_size},
        )
        agent = _get_optimizer_agent()
        result = await agent.run({
            "history": req.history,
            "current_lr": req.current_lr,
            "current_batch_size": req.current_batch_size,
        })
        if not result.success:
            _agent_log(
                "optimizer_agent",
                "failed",
                "suggest hyperparameter updates",
                details={"error": result.error},
            )
            raise HTTPException(500, result.error)
        _agent_log(
            "optimizer_agent",
            "completed",
            "suggest hyperparameter updates",
            details={
                "suggestions": result.data.get("suggestions", []),
                "recommended": result.data.get("recommended", {}),
            },
        )
        return result.data
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Optimizer agent error")
        raise HTTPException(500, str(exc)) from exc


@app.post("/api/agents/deploy")
async def run_deployment_agent(req: AgentDeployRequest, background_tasks: BackgroundTasks):
    try:
        _agent_log(
            "deployment_agent",
            "started",
            "generate deployment package",
            details={
                "framework": req.framework,
                "model_path": req.model_path,
                "output_units": req.output_units,
                "task_type": req.task_type,
            },
        )
        agent = _get_deployment_agent()
        result = await agent.run({
            "framework": req.framework,
            "model_path": req.model_path or "model.joblib",
            "input_shape": req.input_shape or [784],
            "output_units": req.output_units,
            "task_type": req.task_type,
        })
        if not result.success:
            _agent_log(
                "deployment_agent",
                "failed",
                "generate deployment package",
                details={"error": result.error},
            )
            raise HTTPException(500, result.error)

        if req.return_zip:
            temp_dir = Path(tempfile.mkdtemp(prefix="plexus_deploy_"))
            for name, contents in result.data.get("files", {}).items():
                (temp_dir / name).write_text(contents, encoding="utf-8")
            zip_path = temp_dir / "plexus_deployment.zip"
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for file_path in temp_dir.iterdir():
                    if file_path.name == zip_path.name:
                        continue
                    zf.write(file_path, arcname=file_path.name)

            background_tasks.add_task(shutil.rmtree, temp_dir, True)
            _agent_log(
                "deployment_agent",
                "completed",
                "generate deployment package",
                details={"zip": str(zip_path)},
            )
            return FileResponse(
                path=str(zip_path),
                media_type="application/zip",
                filename="plexus_deployment.zip",
            )

        _agent_log(
            "deployment_agent",
            "completed",
            "generate deployment package",
            details={"files": list(result.data.get("files", {}).keys())},
        )
        return result.data
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Deployment agent error")
        raise HTTPException(500, str(exc)) from exc


# ===========================================================================
# Code generation endpoint
# ===========================================================================

@app.post("/api/generate/code")
async def generate_code(req: CodeGenRequest):
    """Convert a ReactFlow graph to Python code."""
    try:
        from backend.core.code_generator import GraphCodeGenerator
        gen = GraphCodeGenerator(req.nodes, req.edges)
        code = gen.generate(framework=req.framework)
        return {"code": code, "framework": req.framework}
    except Exception as exc:
        logger.exception("Code generation error")
        raise HTTPException(500, str(exc)) from exc


# ===========================================================================
# Training endpoints
# ===========================================================================

@app.post("/api/train/start")
async def start_training(req: TrainStartRequest, background_tasks: BackgroundTasks):
    record = _dataset_registry.get(req.dataset_id)
    if not record:
        raise HTTPException(404, f"Dataset '{req.dataset_id}' not found.")

    job_id = str(uuid.uuid4())[:8]
    job = {
        "id": job_id,
        "status": "queued",
        "progress": 0,
        "epoch": 0,
        "epochs": req.epochs,
        "batch_size": req.batch_size,
        "learning_rate": req.learning_rate,
        "framework": req.framework,
        "dataset_id": req.dataset_id,
        "nodes": req.nodes,
        "edges": req.edges,
        "created_at": datetime.utcnow().isoformat(),
        "logs": [],
        "metrics": {"loss": [], "accuracy": [], "val_loss": [], "val_accuracy": []},
        "gradient_norms": {},
        "error": None,
        "result": None,
        "checkpoint_path": None,
    }
    _jobs[job_id] = job
    _save_jobs()
    model_nodes = [n.get("type") for n in req.nodes if n.get("type")]
    _agent_log(
        "training_orchestrator",
        "queued",
        "start training job",
        dataset_id=req.dataset_id,
        job_id=job_id,
        details={
            "epochs": req.epochs,
            "batch_size": req.batch_size,
            "learning_rate": req.learning_rate,
            "nodes": model_nodes,
        },
    )
    logger.info(
        "Training job queued: job=%s dataset=%s epochs=%s batch=%s nodes=%s",
        job_id,
        req.dataset_id,
        req.epochs,
        req.batch_size,
        model_nodes,
    )

    background_tasks.add_task(
        _run_training_job,
        job_id,
        req.nodes,
        req.edges,
        record,
        req.framework,
        req.epochs,
        req.batch_size,
        req.learning_rate,
        None,
        0,
    )

    return {"job_id": job_id, "status": "queued"}


@app.get("/api/train/{job_id}/status")
async def get_job_status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    return job

class JobUpdate(BaseModel):
    status: str


@app.put("/api/train/{job_id}/status")
async def update_job_status(job_id: str, update: JobUpdate, background_tasks: BackgroundTasks):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job '{job_id}' not found.")
    previous = job.get("status")
    job["status"] = update.status
    _save_jobs()
    await _broadcast(job_id, {"job_id": job_id, "status": update.status, "type": "status_update"})

    if previous == "paused" and update.status == "running":
        _agent_log(
            "training_orchestrator",
            "started",
            "resume training from checkpoint",
            dataset_id=job.get("dataset_id"),
            job_id=job_id,
            details={
                "resume_epoch": job.get("epoch", 0),
                "checkpoint_path": job.get("checkpoint_path"),
            },
        )
        background_tasks.add_task(
            _run_training_job,
            job_id,
            job.get("nodes", []),
            job.get("edges", []),
            _dataset_registry.get(job.get("dataset_id")),
            job.get("framework", "tensorflow"),
            job.get("epochs", 10),
            job.get("batch_size", 32),
            job.get("learning_rate", 0.001),
            job.get("checkpoint_path"),
            job.get("epoch", 0),
        )

    return {"status": update.status}


@app.post("/api/models/predict")
async def predict_model(req: ModelPredictRequest):
    artifact = Path(req.artifact_path)
    if not artifact.is_absolute():
        artifact = BASE_DIR.parent / artifact

    try:
        resolved = artifact.resolve()
        models_root = MODELS_DIR.resolve()
        if not resolved.is_file() or not resolved.is_relative_to(models_root):
            raise HTTPException(status_code=400, detail="Invalid model artifact path.")

        from backend.core.trainer import predict_with_artifact

        result = await asyncio.to_thread(predict_with_artifact, str(resolved), req.rows)
        _agent_log(
            "model_tester",
            "completed",
            "Prediction completed from saved artifact.",
            artifact_path=str(resolved),
            count=result.get("count"),
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        _agent_log(
            "model_tester",
            "failed",
            "Prediction failed.",
            artifact_path=str(artifact),
            error=str(exc),
        )
        raise HTTPException(status_code=400, detail=str(exc))


async def _broadcast(job_id: str, message: Dict[str, Any]) -> None:
    """Send a JSON message to all WebSocket listeners for this job."""
    for ws in list(_ws_connections.get(job_id, [])):
        try:
            await ws.send_json(message)
        except Exception:
            pass


async def _run_training_job(
    job_id: str,
    nodes: List[Dict],
    edges: List[Dict],
    dataset_record: Dict,
    framework: str,
    epochs: int,
    batch_size: int,
    lr: float,
    resume_from: Optional[str] = None,
    start_epoch: int = 0,
) -> None:
    """Background task: simulate or actually run training and stream results."""
    job = _jobs[job_id]

    async def update(patch: Dict[str, Any]) -> None:
        job.update(patch)
        await _broadcast(job_id, {**patch, "job_id": job_id})

    try:
        if not dataset_record:
            raise ValueError("Dataset record missing for training job.")
        await update({"status": "running", "logs": ["Training started"]})
        logger.info("Training job %s started with framework=%s", job_id, framework)
        _agent_log(
            "training_orchestrator",
            "started",
            "execute training job",
            dataset_id=dataset_record.get("id"),
            job_id=job_id,
            details={"framework": framework, "epochs": epochs},
        )

        # ----------------------------------------------------------------
        # Try to run real training; fall back to simulation if TF/torch absent
        # ----------------------------------------------------------------
        try:
            from backend.core.trainer import run_training
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: run_training(
                    nodes,
                    edges,
                    dataset_record,
                    framework,
                    epochs,
                    batch_size,
                    lr,
                    artifact_dir=str(MODELS_DIR / job_id),
                    status_cb=lambda: _jobs.get(job_id, {}).get("status", "running"),
                    resume_from=resume_from,
                    start_epoch=start_epoch,
                ),
            )
            # Stream real epoch results
            for epoch_data in result["history"]:
                ep = epoch_data["epoch"]
                job["metrics"]["loss"].append(epoch_data["loss"])
                job["metrics"]["accuracy"].append(epoch_data.get("accuracy", 0))
                job["metrics"]["val_loss"].append(epoch_data.get("val_loss", epoch_data["loss"] * 0.9))
                job["metrics"]["val_accuracy"].append(epoch_data.get("val_accuracy", epoch_data.get("accuracy", 0) * 0.95))
                job["gradient_norms"] = epoch_data.get("gradient_norms", {})
                await update({
                    "epoch": ep,
                    "progress": int(ep / epochs * 100),
                    "metrics": job["metrics"],
                    "gradient_norms": job["gradient_norms"],
                    "type": "epoch_end",
                })
                await asyncio.sleep(0.1)
            summary = result.get("summary", {})
            job["checkpoint_path"] = summary.get("checkpoint_path")

            if summary.get("status") == "paused":
                await update(
                    {
                        "status": "paused",
                        "progress": int(job.get("progress", 0)),
                        "result": summary,
                        "checkpoint_path": job["checkpoint_path"],
                        "type": "training_paused",
                    }
                )
                _agent_log(
                    "training_orchestrator",
                    "completed",
                    "training paused",
                    dataset_id=dataset_record.get("id"),
                    job_id=job_id,
                    details={"checkpoint_path": job["checkpoint_path"]},
                )
                return

            if summary.get("status") == "stopped":
                await update(
                    {
                        "status": "stopped",
                        "progress": int(job.get("progress", 0)),
                        "result": summary,
                        "type": "training_stopped",
                    }
                )
                _agent_log(
                    "training_orchestrator",
                    "completed",
                    "training stopped",
                    dataset_id=dataset_record.get("id"),
                    job_id=job_id,
                    details={},
                )
                return

            await update(
                {
                    "status": "completed",
                    "progress": 100,
                    "result": summary,
                    "checkpoint_path": job["checkpoint_path"],
                    "type": "training_complete",
                }
            )
            logger.info("Training job %s completed with real trainer: %s", job_id, summary)
            _agent_log(
                "training_orchestrator",
                "completed",
                "execute real trainer",
                dataset_id=dataset_record.get("id"),
                job_id=job_id,
                details=summary,
            )
        except ImportError as exc:
            raise RuntimeError("Required ML dependencies are missing.") from exc

    except Exception as exc:
        logger.exception("Training job %s failed", job_id)
        _agent_log(
            "training_orchestrator",
            "failed",
            "execute training job",
            dataset_id=dataset_record.get("id"),
            job_id=job_id,
            details={"error": str(exc)},
        )
        await update({"status": "error", "error": str(exc), "type": "error"})

    finally:
        _save_jobs()


# ===========================================================================
# WebSocket for real-time training updates
# ===========================================================================

@app.websocket("/ws/train/{job_id}")
async def ws_train(websocket: WebSocket, job_id: str):
    await websocket.accept()
    _ws_connections.setdefault(job_id, []).append(websocket)
    logger.info("WS connected for job %s", job_id)
    try:
        # Immediately send current job state
        job = _jobs.get(job_id)
        if job:
            await websocket.send_json({"type": "current_state", **job})
        # Keep alive until client disconnects
        while True:
            await websocket.receive_text()   # ping-pong or client messages
    except WebSocketDisconnect:
        pass
    finally:
        conns = _ws_connections.get(job_id, [])
        if websocket in conns:
            conns.remove(websocket)
        logger.info("WS disconnected for job %s", job_id)
