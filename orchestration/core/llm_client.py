"""
core/llm_client.py
------------------
Unified LLM client for Plexus.

Supported providers
-------------------
  • OpenAI  – set OPENAI_API_KEY  in orchestration/.env
  • Gemini  – set GEMINI_API_KEY  in orchestration/.env

Auto-detection
--------------
If you set GEMINI_API_KEY the client defaults to Gemini.
If you set OPENAI_API_KEY  the client defaults to OpenAI.
If both are set, Gemini takes precedence (editable via PREFERRED_LLM).

Usage
-----
    client = LLMClient()          # auto-detects from .env
    response = client.chat([{"role": "user", "content": "Hello"}])

    # Force a specific provider:
    client = LLMClient(provider=LLMProvider.OPENAI)
    client = LLMClient(provider=LLMProvider.GEMINI)
"""

from __future__ import annotations

import os
import time
import logging
import pathlib
from enum import Enum
from typing import Dict, List, Optional

from dotenv import load_dotenv

# Load .env from orchestration/ directory (works both from cli.py and FastAPI)
_ENV_FILE = pathlib.Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE if _ENV_FILE.exists() else None)

logger = logging.getLogger(__name__)

# HTTP status codes that should NOT be retried (client-side errors)
_NO_RETRY_CODES = {400, 401, 403, 404, 422}


class LLMProvider(Enum):
    OPENAI = "openai"
    GEMINI = "gemini"


def _auto_detect_provider() -> LLMProvider:
    """
    Pick a provider from environment variables.

    Priority:
      1. PREFERRED_LLM env var if set ("openai" or "gemini")
      2. GEMINI_API_KEY  present → Gemini
      3. OPENAI_API_KEY  present → OpenAI
    """
    preferred = os.getenv("PREFERRED_LLM", "").lower().strip()
    if preferred == "gemini":
        return LLMProvider.GEMINI
    if preferred == "openai":
        return LLMProvider.OPENAI

    if os.getenv("GEMINI_API_KEY"):
        return LLMProvider.GEMINI
    if os.getenv("OPENAI_API_KEY"):
        return LLMProvider.OPENAI

    raise EnvironmentError(
        "No LLM API key found.\n"
        "  • For Gemini  (free tier): set GEMINI_API_KEY  in orchestration/.env\n"
        "  • For OpenAI             : set OPENAI_API_KEY  in orchestration/.env\n"
        "Get a free Gemini key at https://aistudio.google.com/apikey"
    )


class LLMClient:
    """
    Unified wrapper for OpenAI and Google Gemini LLM APIs.

    Parameters
    ----------
    provider : LLMProvider, optional
        Force a specific provider.  If omitted, auto-detected from .env.
    model : str, optional
        Model name.  Defaults to the recommended fast model per provider.
    max_retries : int
        Retry count for transient server-side errors (5xx / 429 only).
        Auth errors (401 / 403) are never retried.
    retry_delay : float
        Base delay in seconds; doubles on each retry (exponential back-off).
    temperature : float
        Sampling temperature.
    """

    _DEFAULT_MODELS = {
        LLMProvider.OPENAI: "gpt-3.5-turbo",
        LLMProvider.GEMINI: "gemini-2.5-flash",
    }

    def __init__(
        self,
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None,
        max_retries: int = 3,
        retry_delay: float = 2.0,
        temperature: float = 0.2,
    ):
        self.provider = provider or _auto_detect_provider()
        self.model = model or os.getenv("OPENAI_MODEL") or self._DEFAULT_MODELS[self.provider]
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.temperature = temperature

        if self.provider == LLMProvider.OPENAI:
            self._init_openai()
        elif self.provider == LLMProvider.GEMINI:
            self._init_gemini()

        logger.info(
            "LLMClient ready: provider=%s model=%s",
            self.provider.value,
            self.model,
        )

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def _init_openai(self) -> None:
        try:
            from openai import OpenAI  # type: ignore
        except ImportError as exc:
            raise ImportError("Run: pip install openai") from exc

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise EnvironmentError("OPENAI_API_KEY not set in orchestration/.env")

        self._openai_client = OpenAI(api_key=api_key)

    def _init_gemini(self) -> None:
        try:
            from google import genai  # type: ignore
            from google.genai import types as genai_types  # type: ignore
        except ImportError as exc:
            raise ImportError(
                "google-genai is not installed.  "
                "Run: pip install google-genai"
            ) from exc

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY not set in orchestration/.env\n"
                "Get a free key at https://aistudio.google.com/apikey"
            )

        self._gemini_client = genai.Client(api_key=api_key)
        self._genai_types = genai_types

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        max_tokens: int = 2048,
    ) -> str:
        """
        Send a chat request and return the assistant's reply as a string.

        Parameters
        ----------
        messages : list of {"role": str, "content": str}
            Conversation turns.
        system_prompt : str, optional
            Injected as the leading system instruction.
        max_tokens : int
            Upper bound on response length.
        """
        if self.provider == LLMProvider.OPENAI:
            return self._openai_chat(messages, system_prompt, max_tokens)
        if self.provider == LLMProvider.GEMINI:
            return self._gemini_chat(messages, system_prompt, max_tokens)
        raise NotImplementedError(f"Provider {self.provider} has no chat implementation.")

    # ------------------------------------------------------------------
    # OpenAI backend
    # ------------------------------------------------------------------

    def _openai_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str],
        max_tokens: int,
    ) -> str:
        full_messages: List[Dict[str, str]] = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        last_exc: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = self._openai_client.chat.completions.create(
                    model=self.model,
                    messages=full_messages,  # type: ignore[arg-type]
                    max_tokens=max_tokens,
                    temperature=self.temperature,
                )
                return response.choices[0].message.content or ""

            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                # Don't retry on authentication / quota errors – they won't resolve
                if self._is_auth_error(exc):
                    msg = str(exc).lower()
                    if "insufficient_quota" in msg or "billing" in msg:
                        raise RuntimeError(
                            "OpenAI quota exhausted – your account has no remaining credits.\n"
                            "  • Add billing at https://platform.openai.com/settings/billing\n"
                            "  • Or switch to Gemini (free tier): add GEMINI_API_KEY to orchestration/.env\n"
                            f"    Get a free key at https://aistudio.google.com/apikey\n"
                            f"  Original error: {exc}"
                        ) from exc
                    raise RuntimeError(
                        f"OpenAI authentication failed: {exc}\n"
                        "  • Check OPENAI_API_KEY in orchestration/.env\n"
                        "  • Or switch to Gemini: add GEMINI_API_KEY to orchestration/.env"
                    ) from exc

                logger.warning(
                    "LLM call failed (attempt %d/%d): %s", attempt, self.max_retries, exc
                )
                if attempt < self.max_retries:
                    delay = self.retry_delay * (2 ** (attempt - 1))
                    logger.info("Retrying in %.1fs…", delay)
                    time.sleep(delay)

        raise RuntimeError(
            f"LLM call failed after {self.max_retries} attempts. Last error: {last_exc}"
        )

    # ------------------------------------------------------------------
    # Gemini backend
    # ------------------------------------------------------------------

    def _gemini_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str],
        max_tokens: int,
    ) -> str:
        """
        Call the Gemini API via the google-genai SDK.

        Config is built fresh on every call so max_tokens is respected correctly.
        System instruction is passed natively (no role-prefix workaround needed).
        """
        # Build a flat prompt from message turns
        parts: List[str] = []
        for msg in messages:
            role = msg.get("role", "user").upper()
            parts.append(f"[{role}]\n{msg.get('content', '')}")
        prompt = "\n\n".join(parts)

        # Per-call generation config
        config = self._genai_types.GenerateContentConfig(
            temperature=self.temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_prompt or "",
        )

        last_exc: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                result = self._gemini_client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config,
                )
                return result.text

            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if self._is_auth_error(exc):
                    raise RuntimeError(
                        f"Gemini authentication failed: {exc}\n"
                        "Check that GEMINI_API_KEY in orchestration/.env is correct.\n"
                        "Get a free key at https://aistudio.google.com/apikey"
                    ) from exc

                logger.warning(
                    "LLM call failed (attempt %d/%d): %s", attempt, self.max_retries, exc
                )
                if attempt < self.max_retries:
                    delay = self.retry_delay * (2 ** (attempt - 1))
                    logger.info("Retrying in %.1fs…", delay)
                    time.sleep(delay)

        raise RuntimeError(
            f"LLM call failed after {self.max_retries} attempts. Last error: {last_exc}"
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _is_auth_error(exc: Exception) -> bool:
        """
        Return True when the exception is unretryable.

        Covers:
          - Authentication / permission failures (401, 403)
          - Billing quota exhaustion (insufficient_quota) – retrying never helps
        """
        msg = str(exc).lower()
        unretryable_keywords = (
            "401", "403", "404",
            "invalid_api_key", "api key",
            "permission denied", "unauthenticated",
            "insufficient_quota",   # OpenAI billing quota exhausted
            "billing",              # broad billing-related rejections
            "not_found",            # model name wrong / not available
        )
        if any(kw in msg for kw in unretryable_keywords):
            return True
        try:
            if getattr(exc, "status_code", None) in _NO_RETRY_CODES:
                return True
            # OpenAI SDK wraps the error code in exc.code
            if getattr(exc, "code", None) == "insufficient_quota":
                return True
        except Exception:  # noqa: BLE001
            pass
        return False
