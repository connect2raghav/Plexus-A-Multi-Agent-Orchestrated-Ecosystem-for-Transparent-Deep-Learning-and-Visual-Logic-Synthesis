"""
cli.py
------
Command-line interface for testing the Plexus orchestration layer.

Run:
    python cli.py

The CLI is intentionally thin: all business logic lives in the agents.
This file only handles I/O, progress printing, and error display.
Later it will be replaced by FastAPI endpoints that call the same agents.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Make sure the parent directory (neod/) is in sys.path so the orchestration
# package is importable when cli.py is run directly as `python cli.py`.
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent
_PROJECT_ROOT = _HERE.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Load .env before importing any module that reads env-vars
# ---------------------------------------------------------------------------
from dotenv import load_dotenv  # noqa: E402

load_dotenv(_HERE / ".env")      # backend/.env  (preferred)
load_dotenv(_PROJECT_ROOT / ".env")  # neod/.env  (fallback)

# ---------------------------------------------------------------------------
# Module-level logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.WARNING,   # suppress library noise; agents log at INFO+
    format="%(levelname)s  %(name)s  %(message)s",
)

# ---------------------------------------------------------------------------
# Import agents (after path fix)
# ---------------------------------------------------------------------------
from backend.agents.data_agent import DataAgent       # noqa: E402
from backend.agents.architect import ArchitectAgent   # noqa: E402


# ---------------------------------------------------------------------------
# ANSI helpers (degrade gracefully on Windows without ANSI support)
# ---------------------------------------------------------------------------
def _supports_ansi() -> bool:
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


def _color(text: str, code: str) -> str:
    if _supports_ansi():
        return f"\033[{code}m{text}\033[0m"
    return text


def bold(text: str) -> str:
    return _color(text, "1")


def green(text: str) -> str:
    return _color(text, "32")


def yellow(text: str) -> str:
    return _color(text, "33")


def red(text: str) -> str:
    return _color(text, "31")


def cyan(text: str) -> str:
    return _color(text, "36")


def rule(char: str = "─", width: int = 60) -> str:
    return char * width


# ---------------------------------------------------------------------------
# Progress / section helpers
# ---------------------------------------------------------------------------

def section(title: str) -> None:
    print(f"\n{bold(cyan(rule()))}")
    print(f"  {bold(title)}")
    print(f"{bold(cyan(rule()))}")


def step(msg: str) -> None:
    print(f"  {cyan('▸')} {msg}")


def ok(msg: str) -> None:
    print(f"  {green('✔')} {msg}")


def warn(msg: str) -> None:
    print(f"  {yellow('⚠')} {msg}")


def err(msg: str) -> None:
    print(f"  {red('✖')} {msg}")


# ---------------------------------------------------------------------------
# Input helpers
# ---------------------------------------------------------------------------

def prompt(question: str, default: Optional[str] = None) -> str:
    """Read a line from stdin; return default if the user just presses Enter."""
    suffix = f" [{default}]" if default else ""
    try:
        value = input(f"{bold(question)}{suffix}: ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        sys.exit(0)
    return value if value else (default or "")


def choose(question: str, options: list[str], default: str) -> str:
    """Present a numbered menu and return the user's choice."""
    print(f"\n{bold(question)}")
    for i, opt in enumerate(options, 1):
        tag = green("(default)") if opt == default else ""
        print(f"  {i}. {opt} {tag}")
    raw = prompt("Enter number", default="1").strip()
    try:
        idx = int(raw) - 1
        return options[idx]
    except (ValueError, IndexError):
        return default


# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------

BANNER = r"""
  ____  _
 |  _ \| | _____  ___   _ ___
 | |_) | |/ _ \ \/ / | | / __|
 |  __/| |  __/>  <| |_| \__ \
 |_|   |_|\___/_/\_\\__,_|___/

 Orchestration Layer  v0.1.0
 CLI Test Interface
"""


# ---------------------------------------------------------------------------
# Main async workflow
# ---------------------------------------------------------------------------

async def main() -> None:
    print(bold(cyan(BANNER)))
    print("Type Ctrl-C at any time to exit.\n")

    # ------------------------------------------------------------------ #
    # 1. Get dataset path
    # ------------------------------------------------------------------ #
    section("Step 1 – Dataset")
    csv_path = prompt("Enter path to dataset (CSV file)")

    if not csv_path:
        err("No path provided. Exiting.")
        sys.exit(1)

    if not Path(csv_path).exists():
        err(f"File not found: {csv_path}")
        sys.exit(1)

    # ------------------------------------------------------------------ #
    # 2. Ask for target column (optional)
    # ------------------------------------------------------------------ #
    target_col = prompt("Target column name (press Enter to skip)", default="")
    task_type = choose(
        "What type of ML task?",
        ["classification", "regression"],
        default="classification",
    )

    # ------------------------------------------------------------------ #
    # 3. Run Data Agent
    # ------------------------------------------------------------------ #
    section("Step 2 – Data Agent")

    step("Profiling dataset…")
    data_agent = DataAgent()

    result = await data_agent.run(
        {
            "csv_path": csv_path,
            "target_col": target_col or None,
        }
    )

    if not result.success:
        err(f"Data Agent failed: {result.error}")
        sys.exit(1)

    profile = result.data["profile"]
    ok(
        f"Dataset profiled: {profile.num_rows_total} rows × "
        f"{profile.num_columns} columns"
    )

    # ---- Print profile summary ----------------------------------------
    print(f"\n{bold('Dataset Profile:')}")
    print(profile.summary_text())

    # ---- Cleaning steps -----------------------------------------------
    steps = result.data.get("steps", [])
    if steps:
        print(f"\n{bold('Inferred Cleaning Steps:')}")
        for s in steps:
            print(f"  • [{s['type']}]  columns={s.get('columns', [])}  "
                  f"method={s.get('method') or s.get('strategy', '')}")

    # ---- Generated cleaning code --------------------------------------
    code = result.data.get("code", "")
    validation = result.data.get("validation", {})

    if code:
        print(f"\n{bold('Generated clean_data() function:')}")
        print("─" * 60)
        print(code)
        print("─" * 60)

        if validation.get("passed"):
            ok("Code validation passed (executed on 5-row sample).")
        else:
            val_err = validation.get("error", "unknown error")
            warn(f"Code validation failed: {val_err}")
            warn("The code may still be valid – try it manually.")
    else:
        warn("No cleaning code was generated (LLM may have returned unexpected output).")

    # ------------------------------------------------------------------ #
    # 4. Run Architect Agent
    # ------------------------------------------------------------------ #
    section("Step 3 – Architect Agent")
    step(f"Designing architecture for {task_type}…")

    architect = ArchitectAgent()
    arch_result = await architect.run(
        {
            "profile": profile,
            "task_type": task_type,
            "target_col": target_col or None,
        }
    )

    if not arch_result.success:
        err(f"Architect Agent failed: {arch_result.error}")
        warn("Skipping architecture generation.")
        return

    description = arch_result.data.get("description", "")
    keras_code = arch_result.data.get("keras_code", "")
    layers = arch_result.data.get("layers", [])

    ok(f"Architecture generated: {len(layers)} layers")

    if description:
        print(f"\n{bold('Architecture Description:')}")
        print(description)

    if keras_code:
        print(f"\n{bold('Keras Model Code:')}")
        print("─" * 60)
        print(keras_code)
        print("─" * 60)

    # ---- React-Flow graph hint ----------------------------------------
    nodes = arch_result.data.get("nodes", [])
    edges = arch_result.data.get("edges", [])
    if nodes:
        ok(
            f"React-Flow graph ready: {len(nodes)} nodes, {len(edges)} edges "
            f"(use these to populate the NEOD frontend)."
        )

    # ------------------------------------------------------------------ #
    # 5. Done
    # ------------------------------------------------------------------ #
    section("Done")
    print(f"  {green('All agents ran successfully.')}")
    print(
        "\n  Next steps:\n"
        "    • Refine the generated clean_data() function.\n"
        "    • Copy the Keras code into a training script.\n"
        "    • Later: expose these agents via FastAPI endpoints.\n"
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    asyncio.run(main())
