"""
core/script_runner.py
---------------------
ScriptRunner – executes auto-generated Python scripts in a subprocess.

Why subprocess instead of exec()?
  - Isolation: a bad script cannot crash the FastAPI process.
  - Real stdout/stderr streaming: output is captured line-by-line.
  - Timeout: long-running scripts are killed after `timeout` seconds.
  - Environment: the same venv Python is used automatically.

Usage
-----
    runner = ScriptRunner()
    result = await runner.run_script(script_code, timeout=120)
    print(result["stdout"])
    print(result["returncode"])

For saved scripts (from orchestrator):
    result = await runner.run_saved_script(script_path, timeout=120)
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Use the same Python interpreter that is running the backend
_PYTHON = sys.executable


class ScriptRunner:
    """
    Executes Python scripts in an isolated subprocess with streaming output.
    """

    def __init__(self, timeout: int = 300):
        self.default_timeout = timeout

    async def run_script(
        self,
        script_code: str,
        timeout: Optional[int] = None,
        env_extra: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Write `script_code` to a temp file and execute it.

        Returns
        -------
        dict with keys: stdout, stderr, returncode, success, error
        """
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", delete=False, encoding="utf-8"
        ) as f:
            f.write(script_code)
            tmp_path = f.name

        try:
            return await self._execute(tmp_path, timeout, env_extra)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    async def run_saved_script(
        self,
        script_path: str,
        timeout: Optional[int] = None,
        env_extra: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Execute a script that already exists on disk."""
        if not Path(script_path).exists():
            return {
                "stdout": "",
                "stderr": f"Script not found: {script_path}",
                "returncode": -1,
                "success": False,
                "error": "Script file not found.",
            }
        return await self._execute(script_path, timeout, env_extra)

    async def _execute(
        self,
        script_path: str,
        timeout: Optional[int],
        env_extra: Optional[Dict[str, str]],
    ) -> Dict[str, Any]:
        t = timeout or self.default_timeout
        env = {**os.environ, **(env_extra or {})}

        stdout_lines: list[str] = []
        stderr_lines: list[str] = []

        try:
            proc = await asyncio.create_subprocess_exec(
                _PYTHON,
                script_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )

            async def _read_stream(stream, lines: list[str], label: str):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    decoded = line.decode("utf-8", errors="replace").rstrip()
                    lines.append(decoded)
                    logger.info("[ScriptRunner:%s] %s", label, decoded)

            await asyncio.wait_for(
                asyncio.gather(
                    _read_stream(proc.stdout, stdout_lines, "stdout"),
                    _read_stream(proc.stderr, stderr_lines, "stderr"),
                    proc.wait(),
                ),
                timeout=t,
            )

            rc = proc.returncode or 0
            return {
                "stdout": "\n".join(stdout_lines),
                "stderr": "\n".join(stderr_lines),
                "returncode": rc,
                "success": rc == 0,
                "error": None if rc == 0 else f"Process exited with code {rc}",
            }

        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            return {
                "stdout": "\n".join(stdout_lines),
                "stderr": f"Script timed out after {t}s",
                "returncode": -1,
                "success": False,
                "error": f"Execution timed out after {t} seconds.",
            }
        except Exception as exc:
            logger.exception("ScriptRunner execution error")
            return {
                "stdout": "\n".join(stdout_lines),
                "stderr": str(exc),
                "returncode": -1,
                "success": False,
                "error": str(exc),
            }
