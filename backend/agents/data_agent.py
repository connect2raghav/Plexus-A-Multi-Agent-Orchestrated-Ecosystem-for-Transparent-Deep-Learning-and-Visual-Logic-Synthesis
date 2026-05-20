"""
agents/data_agent.py
--------------------
Data Agent – the first fully functional Plexus agent.

Responsibilities
----------------
1. Profile a CSV dataset via DatasetAnalyzer.
2. Ask the LLM to write a `clean_data(df)` function that handles:
   - Missing values
   - Categorical encoding
   - Numeric feature scaling
3. Optionally validate the generated code by executing it on 5 sample rows
   inside a sandboxed namespace (exec with restricted globals).
4. Return the cleaning code + a structured list of cleaning steps.

Inputs (dict keys)
------------------
    csv_path  : str   – path to the CSV file
    target_col: str | None – target column name (optional, for context)

Outputs (AgentResult.data keys)
--------------------------------
    profile      : DatasetProfile  – computed dataset profile
    code         : str             – generated `clean_data(df)` function
    steps        : list[dict]      – machine-readable cleaning steps
    validation   : dict            – {"passed": bool, "error": str | None}
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

import pandas as pd

from .base import AgentResult, BaseAgent
from ..core.dataset_analyzer import DatasetAnalyzer, DatasetProfile
from ..core.llm_client import LLMClient

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt injected before every LLM call for this agent
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """\
You are an expert data scientist who writes clean, idiomatic pandas code.
When asked to write a data-cleaning function you MUST:
  - Output ONLY the Python function definition, inside a single ```python ... ``` block.
  - The function signature MUST be: def clean_data(df: pd.DataFrame) -> pd.DataFrame:
  - Do NOT import pandas inside the function (it is already imported).
  - Handle missing values, encode categorical columns, and scale numeric features.
  - Add a brief docstring.
  - Do NOT include any explanation outside the code block.
"""

# ---------------------------------------------------------------------------
# Few-shot example appended to every user prompt (helps GPT-3.5 format JSON)
# ---------------------------------------------------------------------------
_FEW_SHOT = """
Example output:
```python
def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    \"\"\"Auto-generated cleaning function.\"\"\"
    # Drop rows where all values are NaN
    df = df.dropna(how='all')
    # Fill numeric missing values with median
    for col in df.select_dtypes(include='number').columns:
        df[col] = df[col].fillna(df[col].median())
    # Encode categoricals with label encoding
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].astype('category').cat.codes
    return df
```
"""


class DataAgent(BaseAgent):
    """
    Generates a pandas data-cleaning function for a given CSV dataset.

    Parameters
    ----------
    llm_client : LLMClient, optional
        If not supplied a default client (GPT-3.5-turbo) is created
        automatically when the first `run()` is called.
    """

    def __init__(self, llm_client: Optional[LLMClient] = None):
        super().__init__(
            name="data_agent",
            description="Profiles a CSV dataset and generates a pandas cleaning function.",
        )
        self._llm: Optional[LLMClient] = llm_client

    # ------------------------------------------------------------------
    # Lazy LLM initialisation (avoids crashing at import time if no key)
    # ------------------------------------------------------------------

    def _get_llm(self) -> LLMClient:
        if self._llm is None:
            self._llm = LLMClient()
        return self._llm

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def run(self, inputs: Dict[str, Any]) -> AgentResult:
        """
        Run the Data Agent pipeline.

        Expected keys in `inputs`
        -------------------------
        csv_path   : str  – path to the CSV file
        target_col : str  – (optional) name of the target column
        """
        csv_path: Optional[str] = inputs.get("csv_path")
        target_col: Optional[str] = inputs.get("target_col")

        if not csv_path:
            return self._fail("'csv_path' is required in inputs.")

        # ---- Step 1: Profile the dataset --------------------------------
        self._logger.info("Profiling dataset: %s", csv_path)
        try:
            analyzer = DatasetAnalyzer(csv_path)
            profile = analyzer.profile()
            if target_col:
                profile.target_column = target_col
        except Exception as exc:  # noqa: BLE001
            return self._fail(f"Failed to load/profile dataset: {exc}")

        # ---- Step 2: Build the LLM prompt--------------------------------
        user_prompt = self._build_prompt(profile)

        # ---- Step 3: Call LLM -------------------------------------------
        self._logger.info("Calling LLM to generate cleaning code…")
        try:
            raw_response = self._get_llm().chat(
                messages=[{"role": "user", "content": user_prompt}],
                system_prompt=_SYSTEM_PROMPT,
                max_tokens=1200,
            )
        except Exception as exc:  # noqa: BLE001
            return self._fail(f"LLM call failed: {exc}")

        # ---- Step 4: Extract code block ---------------------------------
        code = self._extract_code(raw_response)
        if not code:
            return self._fail(
                "LLM did not return a valid Python code block.",
                raw_response=raw_response,
            )

        # ---- Step 5: Validate the code on a tiny sample -----------------
        sample_df = analyzer.get_sample_df(n=5)
        validation = self._validate_code(code, sample_df)

        # ---- Step 6: Build structured steps list ------------------------
        steps = self._infer_steps(profile)

        return self._ok(
            {
                "profile": profile,
                "code": code,
                "steps": steps,
                "validation": validation,
            }
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _build_prompt(self, profile: DatasetProfile) -> str:
        """Construct the user-facing LLM prompt."""
        return (
            f"Here is a profile of my dataset:\n\n"
            f"{profile.summary_text()}\n\n"
            f"Please write a `clean_data(df)` function in pandas that:\n"
            f"1. Fills or drops missing values appropriately for each column.\n"
            f"2. Encodes all categorical/object columns as integers.\n"
            f"3. Scales numeric features using StandardScaler (from sklearn) or "
            f"   min-max normalisation – whichever is more appropriate.\n"
            f"4. Returns the cleaned DataFrame.\n\n"
            f"{_FEW_SHOT}"
        )

    @staticmethod
    def _extract_code(raw: str) -> str:
        """
        Pull the first Python code block out of an LLM response.

        Tries (in order):
          1. ```python ... ```  (standard fenced block with language tag)
          2. ``` ... ```        (fenced block without language tag, must contain "def")
          3. Bare function      (response starts with / contains "def clean_data")
        """
        # 1 – fenced with explicit python tag
        match = re.search(r"```python\s*([\s\S]+?)```", raw, re.IGNORECASE)
        if match:
            return match.group(1).strip()

        # 2 – fenced without language tag but body contains a function def
        match = re.search(r"```\s*([\s\S]+?)```", raw)
        if match:
            candidate = match.group(1).strip()
            if "def " in candidate:
                return candidate

        # 3 – bare function anywhere in the response
        func_match = re.search(r"(def clean_data[\s\S]+)", raw)
        if func_match:
            return func_match.group(1).strip()

        return ""

    @staticmethod
    def _validate_code(code: str, sample_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Execute the generated code on a 5-row sample inside a sandboxed
        namespace.  Only pandas and basic builtins are available.

        Returns {"passed": bool, "error": str | None}.
        """
        # ----- build a minimal safe namespace -----
        safe_globals: Dict[str, Any] = {
            "__builtins__": {
                "print": print,
                "range": range,
                "len": len,
                "list": list,
                "dict": dict,
                "int": int,
                "float": float,
                "str": str,
                "bool": bool,
                "None": None,
                "True": True,
                "False": False,
            },
            "pd": pd,
        }
        # Also allow sklearn if available
        try:
            from sklearn import preprocessing  # type: ignore
            safe_globals["preprocessing"] = preprocessing
            from sklearn.preprocessing import StandardScaler, MinMaxScaler  # type: ignore
            safe_globals["StandardScaler"] = StandardScaler
            safe_globals["MinMaxScaler"] = MinMaxScaler
        except ImportError:
            pass

        namespace: Dict[str, Any] = {}
        try:
            exec(code, safe_globals, namespace)  # noqa: S102
            clean_fn = namespace.get("clean_data")
            if clean_fn is None:
                return {"passed": False, "error": "Function 'clean_data' not defined in code."}
            # Actually call it
            result = clean_fn(sample_df.copy())
            if not isinstance(result, pd.DataFrame):
                return {"passed": False, "error": "clean_data must return a DataFrame."}
            return {"passed": True, "error": None}
        except Exception as exc:  # noqa: BLE001
            return {"passed": False, "error": str(exc)}

    @staticmethod
    def _infer_steps(profile: DatasetProfile) -> List[Dict[str, Any]]:
        """
        Build a machine-readable list of cleaning steps inferred from the
        profile (used for future pipeline visualisation in the frontend).
        """
        steps: List[Dict[str, Any]] = []

        if profile.missing_columns:
            steps.append(
                {
                    "type": "handle_missing",
                    "columns": profile.missing_columns,
                    "strategy": "fill_or_drop",
                }
            )

        if profile.categorical_columns:
            # Exclude target column from encoding step
            cols = [c for c in profile.categorical_columns if c != profile.target_column]
            if cols:
                steps.append(
                    {"type": "encode_categorical", "columns": cols, "method": "label_encoding"}
                )

        if profile.numeric_columns:
            # Exclude target column from scaling
            cols = [c for c in profile.numeric_columns if c != profile.target_column]
            if cols:
                steps.append(
                    {"type": "scale_numeric", "columns": cols, "method": "standard_scaler"}
                )

        return steps
