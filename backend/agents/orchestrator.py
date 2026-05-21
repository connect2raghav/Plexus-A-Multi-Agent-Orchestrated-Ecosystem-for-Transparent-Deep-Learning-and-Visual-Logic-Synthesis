"""
agents/orchestrator.py
----------------------
AgentOrchestrator – coordinates the full dataset intelligence pipeline:

  Stage 1 – SemanticAgent   : 100-row sample → semantic JSON (cached)
  Stage 2 – DataAgent       : cleaning script generation (cached)
  Stage 3 – ArchitectAgent  : model suggestions (cached)
  Stage 4 – ScriptBuilder   : generate ready-to-run preprocessing + training
                               scripts from semantic + cleaning outputs

Cache logic
-----------
Each stage checks the dataset registry for a cached result before calling
the LLM. If all three stages are cached, the orchestrator returns instantly
with zero LLM calls.

Inputs
------
    dataset_id  : str
    csv_path    : str
    record      : dict  – current dataset registry record (for cache fields)
    log_fn      : callable(agent, status, task, **kw) – backend _agent_log

Outputs (AgentResult.data)
--------------------------
    semantic        : dict
    cleaning_code   : str
    cleaning_steps  : list
    suggested_nodes : list[str]
    architect_desc  : str
    scripts         : dict  – {preprocessing.py, train.py}
    stages_cached   : dict  – which stages were served from cache
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable, Dict, Optional

from .base import AgentResult, BaseAgent
from .semantic_agent import SemanticAgent
from .data_agent import DataAgent
from .architect import ArchitectAgent

logger = logging.getLogger(__name__)


class AgentOrchestrator(BaseAgent):
    """
    Chains all dataset-intelligence agents with cache-first logic.
    Designed to be called once per dataset upload (and again on cache miss).
    """

    def __init__(self):
        super().__init__(
            name="orchestrator",
            description="Chains Semantic → Data → Architect agents with DB caching.",
        )

    async def run(self, inputs: Dict[str, Any]) -> AgentResult:
        dataset_id: str = inputs["dataset_id"]
        csv_path: str = inputs["csv_path"]
        record: Dict[str, Any] = inputs.get("record", {})
        log_fn: Optional[Callable] = inputs.get("log_fn")

        def _log(agent: str, status: str, task: str, **kw):
            if log_fn:
                log_fn(agent, status, task, dataset_id=dataset_id, **kw)
            else:
                logger.info("[%s] %s | %s", agent.upper(), status.upper(), task)

        stages_cached: Dict[str, bool] = {}

        # ── Stage 1: Semantic ────────────────────────────────────────────
        _log("semantic_agent", "started", "build semantic profile")
        cached_semantic = record.get("semantic_profile")
        sem_agent = SemanticAgent()
        sem_result = await sem_agent.run({
            "csv_path": csv_path,
            "dataset_id": dataset_id,
            "cached_semantic": cached_semantic,
        })
        if not sem_result.success:
            _log("semantic_agent", "failed", "build semantic profile",
                 details={"error": sem_result.error})
            return self._fail(f"SemanticAgent failed: {sem_result.error}")

        semantic = sem_result.data["semantic"]
        stages_cached["semantic"] = sem_result.data.get("cached", False)
        _log("semantic_agent", "completed", "build semantic profile",
             details={
                 "domain": semantic.get("domain"),
                 "task_type": semantic.get("task_type"),
                 "target": semantic.get("recommended_target"),
                 "cached": stages_cached["semantic"],
             })

        # ── Stage 2: Data Agent (cleaning script) ────────────────────────
        cached_cleaning = record.get("cleaning_status", {})
        if cached_cleaning.get("status") == "done" and cached_cleaning.get("code"):
            _log("data_agent", "completed", "cleaning script (cache hit)",
                 details={"steps": len(cached_cleaning.get("steps") or [])})
            cleaning_code = cached_cleaning["code"]
            cleaning_steps = cached_cleaning.get("steps", [])
            stages_cached["data"] = True
        else:
            _log("data_agent", "started", "generate cleaning script")
            data_agent = DataAgent()
            target_col = semantic.get("recommended_target")
            data_result = await data_agent.run({
                "csv_path": csv_path,
                "target_col": target_col,
            })
            if not data_result.success:
                _log("data_agent", "failed", "generate cleaning script",
                     details={"error": data_result.error})
                cleaning_code = ""
                cleaning_steps = []
            else:
                cleaning_code = data_result.data.get("code", "")
                cleaning_steps = data_result.data.get("steps", [])
            stages_cached["data"] = False
            _log("data_agent", "completed", "generate cleaning script",
                 details={"steps": len(cleaning_steps), "cached": False})

        # ── Stage 3: Architect Agent (model suggestions) ─────────────────
        cached_arch = record.get("architect_status", {})
        if cached_arch.get("status") == "done" and cached_arch.get("suggested_nodes"):
            _log("architect_agent", "completed", "model suggestions (cache hit)",
                 details={"suggested_nodes": cached_arch["suggested_nodes"]})
            suggested_nodes = cached_arch["suggested_nodes"]
            architect_desc = cached_arch.get("description", "")
            stages_cached["architect"] = True
        else:
            _log("architect_agent", "started", "suggest model architecture")
            arch_agent = ArchitectAgent()
            arch_result = await arch_agent.run({
                "dataset_info": record,
                "task_type": semantic.get("task_type", "classification"),
                "target_col": semantic.get("recommended_target"),
            })
            if not arch_result.success:
                _log("architect_agent", "failed", "suggest model architecture",
                     details={"error": arch_result.error})
                suggested_nodes = []
                architect_desc = ""
            else:
                suggested_nodes = arch_result.data.get("suggested_nodes", [])
                architect_desc = arch_result.data.get("description", "")
            stages_cached["architect"] = False
            _log("architect_agent", "completed", "suggest model architecture",
                 details={"suggested_nodes": suggested_nodes, "cached": False})

        # ── Stage 4: Script Builder ──────────────────────────────────────
        _log("script_builder", "started", "generate preprocessing and training scripts")
        scripts = _build_scripts(csv_path, semantic, cleaning_code, suggested_nodes)
        _log("script_builder", "completed", "generate scripts",
             details={"scripts": list(scripts.keys())})

        return self._ok({
            "semantic": semantic,
            "cleaning_code": cleaning_code,
            "cleaning_steps": cleaning_steps,
            "suggested_nodes": suggested_nodes,
            "architect_desc": architect_desc,
            "scripts": scripts,
            "stages_cached": stages_cached,
        })


# ── Script Builder ────────────────────────────────────────────────────────────

def _build_scripts(
    csv_path: str,
    semantic: Dict[str, Any],
    cleaning_code: str,
    suggested_nodes: list,
) -> Dict[str, str]:
    """
    Generate ready-to-run Python scripts derived from semantic + cleaning outputs.
    These scripts are stored in the dataset record and executed by ScriptRunner.
    """
    target = semantic.get("recommended_target", "")
    task_type = semantic.get("task_type", "classification")
    domain = semantic.get("domain", "generic")

    # ── preprocessing.py ─────────────────────────────────────────────────
    preprocessing_script = f'''"""
Auto-generated preprocessing script for dataset: {csv_path}
Domain: {domain} | Task: {task_type} | Target: {target}
Generated by Plexus SemanticAgent + DataAgent pipeline.
"""
import pandas as pd
from sklearn.model_selection import train_test_split

CSV_PATH = r"{csv_path}"
TARGET_COLUMN = "{target}"

df = pd.read_csv(CSV_PATH)

# ── LLM-generated or deterministic cleaning ──────────────────────────────
{cleaning_code if cleaning_code else "# No cleaning script available"}

if "clean_data" in dir():
    df = clean_data(df)

# ── Split ─────────────────────────────────────────────────────────────────
if TARGET_COLUMN and TARGET_COLUMN in df.columns:
    X = df.drop(columns=[TARGET_COLUMN])
    y = df[TARGET_COLUMN]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"Train: {{len(X_train)}} rows | Test: {{len(X_test)}} rows")
    print(f"Features: {{list(X.columns)}}")
else:
    print("No target column set. Skipping split.")
'''

    # ── train.py ─────────────────────────────────────────────────────────
    # Pick the first classical model from suggestions, fallback to RandomForest
    model_map = {
        "randomForest": "RandomForestClassifier(n_estimators=100, random_state=42)",
        "gradientBoosting": "GradientBoostingClassifier(n_estimators=100, random_state=42)",
        "svm": "SVC(probability=True, random_state=42)",
        "logisticRegression": "LogisticRegression(max_iter=500, random_state=42)",
        "knn": "KNeighborsClassifier(n_neighbors=5)",
        "decisionTree": "DecisionTreeClassifier(random_state=42)",
        "ridgeRegression": "Ridge(random_state=42)",
        "lassoRegression": "Lasso(random_state=42)",
        "linearRegression": "LinearRegression()",
    }
    chosen_node = next((n for n in suggested_nodes if n in model_map), None)
    if chosen_node:
        model_expr = model_map[chosen_node]
        if task_type == "regression":
            model_expr = model_map.get(chosen_node, "RandomForestRegressor(n_estimators=100, random_state=42)")
        imports = _model_imports(chosen_node, task_type)
    else:
        if task_type == "regression":
            model_expr = "RandomForestRegressor(n_estimators=100, random_state=42)"
            imports = "from sklearn.ensemble import RandomForestRegressor"
        else:
            model_expr = "RandomForestClassifier(n_estimators=100, random_state=42)"
            imports = "from sklearn.ensemble import RandomForestClassifier"

    metric_block = (
        "from sklearn.metrics import accuracy_score\n"
        "print(f'Accuracy: {accuracy_score(y_test, y_pred):.4f}')"
        if task_type == "classification"
        else
        "from sklearn.metrics import mean_squared_error, r2_score\n"
        "print(f'MSE: {mean_squared_error(y_test, y_pred):.4f}')\n"
        "print(f'R2:  {r2_score(y_test, y_pred):.4f}')"
    )

    train_script = f'''"""
Auto-generated training script for dataset: {csv_path}
Domain: {domain} | Task: {task_type} | Target: {target}
Suggested model: {chosen_node or "randomForest"}
Generated by Plexus AgentOrchestrator pipeline.
"""
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
{imports}

CSV_PATH = r"{csv_path}"
TARGET_COLUMN = "{target}"

df = pd.read_csv(CSV_PATH)

# ── Minimal inline preprocessing ─────────────────────────────────────────
for col in df.select_dtypes(include="number").columns:
    df[col] = df[col].fillna(df[col].median())
for col in df.select_dtypes(exclude="number").columns:
    df[col] = df[col].fillna("__missing__").astype("category").cat.codes

X = df.drop(columns=[TARGET_COLUMN])
y = df[TARGET_COLUMN]

{"le = LabelEncoder(); y = le.fit_transform(y.astype(str))" if task_type == "classification" else ""}

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = {model_expr}
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

{metric_block}
'''

    return {
        "preprocessing.py": preprocessing_script,
        "train.py": train_script,
    }


def _model_imports(node: str, task_type: str) -> str:
    mapping = {
        "randomForest": (
            "from sklearn.ensemble import RandomForestClassifier"
            if task_type == "classification"
            else "from sklearn.ensemble import RandomForestRegressor"
        ),
        "gradientBoosting": (
            "from sklearn.ensemble import GradientBoostingClassifier"
            if task_type == "classification"
            else "from sklearn.ensemble import GradientBoostingRegressor"
        ),
        "svm": "from sklearn.svm import SVC" if task_type == "classification" else "from sklearn.svm import SVR",
        "logisticRegression": "from sklearn.linear_model import LogisticRegression",
        "knn": (
            "from sklearn.neighbors import KNeighborsClassifier"
            if task_type == "classification"
            else "from sklearn.neighbors import KNeighborsRegressor"
        ),
        "decisionTree": (
            "from sklearn.tree import DecisionTreeClassifier"
            if task_type == "classification"
            else "from sklearn.tree import DecisionTreeRegressor"
        ),
        "ridgeRegression": "from sklearn.linear_model import Ridge",
        "lassoRegression": "from sklearn.linear_model import Lasso",
        "linearRegression": "from sklearn.linear_model import LinearRegression",
    }
    return mapping.get(node, "from sklearn.ensemble import RandomForestClassifier")
