"""
agents/base.py
--------------
Abstract base class that all Plexus agents must implement.

Design goals
------------
- Uniform `run(inputs)` interface so agents can be triggered identically
  from the CLI, FastAPI endpoints, or future orchestration pipelines.
- `run` is defined as async so agents can be awaited inside an asyncio
  event-loop (FastAPI, background tasks, etc.).  The CLI wraps it with
  `asyncio.run()` for convenience.
- Each agent stores `name`, `description`, and optional `metadata` so
  orchestration layers can introspect registered agents without executing them.
"""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


logger = logging.getLogger(__name__)


@dataclass
class AgentResult:
    """
    Standardised return type for every agent.

    Attributes
    ----------
    success : bool
        True when the agent completed without unrecoverable errors.
    data : dict
        Primary output – agent-specific keys and values.
    error : str, optional
        Human-readable error message when success=False.
    metadata : dict
        Extra info (execution time, token counts, etc.).
    """

    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseAgent(ABC):
    """
    Abstract base class for Plexus agents.

    Subclasses *must* implement `async def run(inputs)`.

    Parameters
    ----------
    name : str
        Unique agent name (used in logs and API routing).
    description : str
        One-line description shown in help / introspection.
    """

    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self._logger = logging.getLogger(f"plexus.agent.{name}")

    # ------------------------------------------------------------------
    # Abstract interface – subclasses must override this
    # ------------------------------------------------------------------

    @abstractmethod
    async def run(self, inputs: Dict[str, Any]) -> AgentResult:
        """
        Execute the agent with the given inputs.

        Parameters
        ----------
        inputs : dict
            Agent-specific key-value pairs.  Each subclass documents
            its own expected keys.

        Returns
        -------
        AgentResult
        """

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    def run_sync(self, inputs: Dict[str, Any]) -> AgentResult:
        """
        Synchronous wrapper around `run` – useful for CLI / notebooks.

        Example
        -------
        >>> result = agent.run_sync({"csv_path": "data.csv"})
        """
        return asyncio.run(self.run(inputs))

    def _ok(self, data: Dict[str, Any], **meta: Any) -> AgentResult:
        """Helper to build a successful AgentResult."""
        return AgentResult(success=True, data=data, metadata=meta)

    def _fail(self, error: str, **meta: Any) -> AgentResult:
        """Helper to build a failed AgentResult."""
        self._logger.error("Agent '%s' failed: %s", self.name, error)
        return AgentResult(success=False, error=error, metadata=meta)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name!r}>"
