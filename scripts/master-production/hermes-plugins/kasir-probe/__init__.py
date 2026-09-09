"""kasir-probe — Fase 0 probe for the full-Hermes migration.

Throwaway plugin. It exists to answer three questions before a single line of
real kasir logic is ported into Hermes:

1. Does a manifest-bearing plugin load at all in our Docker image?
2. Does a tool handler get told WHICH WhatsApp number it is acting for?
   Kasir is multi-tenant (``studio_whatsapp_config`` keys off the owner's
   phone), so without a sender JID reaching the handler, no real tool can know
   which shop it is mutating. This is the question that gates Fase 1.
3. Does an agent reply reach WhatsApp once kasir-pipe stops skipping a number?

Findings append to ``/opt/data/logs/kasir-probe.jsonl``. A reply that never
arrives is exactly the failure mode being tested, so the log has to survive it
rather than the answer riding back on the WhatsApp message.

Env:
- ``KASIR_PROBE_LOG`` — override the log path.

Delete this directory when Fase 1 starts.
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("hermes.plugins.kasir-probe")

_JID_RE = re.compile(r"\d{6,}@[a-z.]*whatsapp\.net")
_LOG_PATH = Path(os.environ.get("KASIR_PROBE_LOG") or "/opt/data/logs/kasir-probe.jsonl")

_SCHEMA = {
    "name": "kasir_probe",
    "description": (
        "Diagnostic probe for the NusantaraSoft kasir migration. Call this whenever "
        "the user asks to run a probe, test the tooling, or simply says 'probe'. "
        "It reports the identity context visible to the tool layer."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "note": {
                "type": "string",
                "description": "Optional free-text note to record alongside the probe",
            }
        },
        "required": [],
    },
}


def _summarize(value: Any, depth: int = 0) -> Any:
    """Bounded, never-raising view of a value.

    Plugin context objects can be enormous (whole gateway/session graphs), so
    everything here is depth-, width- and length-capped. Correctness matters
    less than never crashing the agent loop.
    """
    if depth > 2:
        return "<depth-capped>"
    try:
        if value is None or isinstance(value, (bool, int, float)):
            return value
        if isinstance(value, str):
            return value[:300]
        if isinstance(value, dict):
            return {
                str(k)[:60]: _summarize(v, depth + 1) for k, v in list(value.items())[:25]
            }
        if isinstance(value, (list, tuple, set)):
            return [_summarize(v, depth + 1) for v in list(value)[:10]]
        attrs: dict[str, Any] = {}
        for name in dir(value):
            if name.startswith("_"):
                continue
            try:
                attr = getattr(value, name)
            except Exception:
                continue
            if callable(attr):
                continue
            attrs[name] = _summarize(attr, depth + 1)
            if len(attrs) >= 25:
                break
        return attrs or repr(value)[:300]
    except Exception as exc:
        return f"<unreadable: {exc}>"


def _record(source: str, params: Any, kwargs: dict[str, Any]) -> dict[str, Any]:
    summarized = {k: _summarize(v) for k, v in kwargs.items()}
    blob = json.dumps(
        {"params": _summarize(params), "kwargs": summarized},
        ensure_ascii=False,
        default=str,
    )
    return {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "kwarg_keys": sorted(str(k) for k in kwargs),
        # The whole point of the probe: any WhatsApp JID reachable from the
        # handler's arguments, at any nesting level.
        "jids_seen": sorted(set(_JID_RE.findall(blob))),
        "params": _summarize(params),
        "kwargs": summarized,
    }


def _append(record: dict[str, Any]) -> None:
    try:
        _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _LOG_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")
    except Exception as exc:
        logger.warning("kasir-probe: cannot write %s: %s", _LOG_PATH, exc)


def _handle_probe(params, **kwargs) -> str:
    try:
        record = _record("tool", params, kwargs)
        _append(record)
        logger.info(
            "kasir-probe: tool called jids=%s kwargs=%s",
            record["jids_seen"],
            record["kwarg_keys"],
        )
        return json.dumps(
            {
                "success": True,
                "identity_visible": bool(record["jids_seen"]),
                "jids_seen": record["jids_seen"],
                "kwarg_keys": record["kwarg_keys"],
                "logged_to": str(_LOG_PATH),
            },
            ensure_ascii=False,
        )
    except Exception as exc:
        logger.exception("kasir-probe: handler failed")
        return json.dumps({"success": False, "error": str(exc)})


def _handle_command(*args, **kwargs) -> str:
    """Deterministic trigger, so the probe does not depend on the model deciding
    to call the tool."""
    try:
        record = _record("command", list(args), kwargs)
        _append(record)
        return json.dumps(
            {
                "success": True,
                "identity_visible": bool(record["jids_seen"]),
                "jids_seen": record["jids_seen"],
                "kwarg_keys": record["kwarg_keys"],
            },
            ensure_ascii=False,
        )
    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)})


def _make_hook_logger(hook_name: str):
    def _hook(*args, **kwargs):
        try:
            _append(_record(f"hook:{hook_name}", list(args), kwargs))
        except Exception:
            logger.debug("kasir-probe: hook %s logging failed", hook_name, exc_info=True)
        return None

    return _hook


def register(ctx):
    # Every registration is guarded: the plugin context surface varies between
    # Hermes releases, and a probe that crashes on startup teaches nothing.
    try:
        ctx.register_tool(
            name="kasir_probe",
            toolset="kasir",
            schema=_SCHEMA,
            handler=_handle_probe,
        )
    except Exception as exc:
        logger.error("kasir-probe: register_tool failed: %s", exc)

    for hook_name in ("post_tool_call", "on_session_start"):
        try:
            ctx.register_hook(hook_name, _make_hook_logger(hook_name))
        except Exception as exc:
            logger.warning("kasir-probe: hook %s unavailable: %s", hook_name, exc)

    try:
        ctx.register_command("probe", _handle_command, "Run the kasir migration probe")
    except Exception as exc:
        logger.warning("kasir-probe: register_command unavailable: %s", exc)

    logger.info("kasir-probe registered (log=%s)", _LOG_PATH)
