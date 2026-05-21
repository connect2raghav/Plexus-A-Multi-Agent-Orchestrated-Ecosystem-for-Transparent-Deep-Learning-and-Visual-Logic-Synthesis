"""
core/dataset_analyzer.py
------------------------
Utilities for loading and profiling a CSV dataset.

All heavy computation is isolated here so that agents only deal with
the `DatasetProfile` dataclass, not raw DataFrames.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

# Maximum number of rows loaded for profiling (keeps things fast)
PROFILE_SAMPLE_SIZE = 1000


@dataclass
class ColumnProfile:
    """Statistics for a single column."""

    name: str
    dtype: str
    missing_count: int
    missing_pct: float          # 0-100
    unique_count: int
    is_numeric: bool
    is_categorical: bool
    sample_values: List[Any]    # up to 5 example values
    # numeric-only fields (None for categoricals)
    mean: Optional[float] = None
    std: Optional[float] = None
    min_val: Optional[float] = None
    max_val: Optional[float] = None


@dataclass
class DatasetProfile:
    """Full profile of a CSV dataset used as input for agents."""

    file_path: str
    num_rows_total: int          # rows in the full file
    num_rows_sampled: int        # rows actually used for profiling
    num_columns: int
    columns: List[ColumnProfile] = field(default_factory=list)
    target_column: Optional[str] = None   # set externally after user input
    numeric_columns: List[str] = field(default_factory=list)
    categorical_columns: List[str] = field(default_factory=list)
    missing_columns: List[str] = field(default_factory=list)  # cols with any NaN

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)

    def summary_text(self) -> str:
        """Return a compact human-readable summary (used in LLM prompts)."""
        lines = [
            f"Dataset: {self.file_path}",
            f"Rows: {self.num_rows_total} (profiled {self.num_rows_sampled})",
            f"Columns: {self.num_columns}",
            f"Numeric columns: {', '.join(self.numeric_columns) or 'none'}",
            f"Categorical columns: {', '.join(self.categorical_columns) or 'none'}",
            f"Columns with missing values: {', '.join(self.missing_columns) or 'none'}",
        ]
        if self.target_column:
            lines.append(f"Target column: {self.target_column}")

        lines.append("\nPer-column detail:")
        for col in self.columns:
            stat = (
                f"mean={col.mean:.2f}, std={col.std:.2f}, "
                f"min={col.min_val}, max={col.max_val}"
                if col.is_numeric
                else f"unique={col.unique_count}, samples={col.sample_values}"
            )
            lines.append(
                f"  • {col.name} [{col.dtype}] "
                f"missing={col.missing_pct:.1f}%  {stat}"
            )
        return "\n".join(lines)


class DatasetAnalyzer:
    """
    Loads and profiles a CSV file.

    Example
    -------
    >>> analyzer = DatasetAnalyzer("data/titanic.csv")
    >>> profile = analyzer.profile()
    >>> print(profile.summary_text())
    """

    def __init__(self, file_path: str | Path):
        self.file_path = Path(file_path)
        self._df_full: Optional[pd.DataFrame] = None
        self._df_sample: Optional[pd.DataFrame] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    # Encodings tried in order.  latin-1 accepts every byte value so it is the
    # safe last-resort fallback for any single-byte legacy encoding.
    _ENCODINGS = ("utf-8", "utf-8-sig", "cp1252", "latin-1")

    def load(self) -> "DatasetAnalyzer":
        """Load the CSV into memory, trying multiple encodings on decode failure."""
        if not self.file_path.exists():
            raise FileNotFoundError(f"Dataset not found: {self.file_path}")

        logger.info("Loading dataset from %s …", self.file_path)
        last_err: Exception = RuntimeError("No encodings attempted.")
        for encoding in self._ENCODINGS:
            try:
                self._df_full = pd.read_csv(self.file_path, encoding=encoding)
                if encoding != "utf-8":
                    logger.info("Loaded with encoding '%s'.", encoding)
                break
            except UnicodeDecodeError as exc:
                logger.debug("Encoding '%s' failed: %s", encoding, exc)
                last_err = exc
        else:
            raise ValueError(
                f"Could not decode '{self.file_path}' with any of {self._ENCODINGS}. "
                f"Last error: {last_err}"
            )

        self._df_sample = self._df_full.head(PROFILE_SAMPLE_SIZE).copy()
        logger.info(
            "Loaded %d rows × %d columns.", len(self._df_full), len(self._df_full.columns)
        )
        return self

    def profile(self) -> DatasetProfile:
        """
        Compute and return a `DatasetProfile` for the loaded dataset.
        Call `load()` first (or the two are chained automatically here).
        """
        if self._df_full is None:
            self.load()

        df = self._df_sample  # type: ignore[assignment]
        full_len = len(self._df_full)  # type: ignore[arg-type]

        columns: List[ColumnProfile] = []
        numeric_cols: List[str] = []
        categorical_cols: List[str] = []
        missing_cols: List[str] = []

        for col_name in df.columns:
            series = df[col_name]
            missing = int(series.isna().sum())
            missing_pct = missing / len(df) * 100
            is_numeric = pd.api.types.is_numeric_dtype(series)
            unique_count = int(series.nunique(dropna=True))
            sample_vals = series.dropna().unique()[:5].tolist()

            cp = ColumnProfile(
                name=col_name,
                dtype=str(series.dtype),
                missing_count=missing,
                missing_pct=round(missing_pct, 2),
                unique_count=unique_count,
                is_numeric=is_numeric,
                is_categorical=not is_numeric,
                sample_values=sample_vals,
            )

            if is_numeric:
                cp.mean = round(float(series.mean()), 4) if not series.isna().all() else None
                cp.std = round(float(series.std()), 4) if not series.isna().all() else None
                cp.min_val = float(series.min()) if not series.isna().all() else None
                cp.max_val = float(series.max()) if not series.isna().all() else None
                numeric_cols.append(col_name)
            else:
                categorical_cols.append(col_name)

            if missing > 0:
                missing_cols.append(col_name)

            columns.append(cp)

        return DatasetProfile(
            file_path=str(self.file_path),
            num_rows_total=full_len,
            num_rows_sampled=len(df),
            num_columns=len(df.columns),
            columns=columns,
            numeric_columns=numeric_cols,
            categorical_columns=categorical_cols,
            missing_columns=missing_cols,
        )

    def get_sample_df(self, n: int = 5) -> pd.DataFrame:
        """Return a tiny sample DataFrame (for code validation)."""
        if self._df_sample is None:
            self.load()
        return self._df_sample.head(n).copy()  # type: ignore[union-attr]

    def get_random_sample(self, n: int = 100) -> pd.DataFrame:
        """Return n random rows from the full dataset (for semantic profiling)."""
        if self._df_full is None:
            self.load()
        df = self._df_full  # type: ignore[assignment]
        return df.sample(min(n, len(df)), random_state=42).copy()

    def get_full_df(self) -> pd.DataFrame:
        if self._df_full is None:
            self.load()
        return self._df_full  # type: ignore[return-value]
