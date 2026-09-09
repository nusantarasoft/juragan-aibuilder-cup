"""kasir-pipe — Hermes WhatsApp inbound → middleware webhook (pipe-only).

Uses ``pre_gateway_dispatch`` to:
1. Build a WhatsApp webhook JSON body from the MessageEvent
2. HMAC-SHA512 sign with ``WHATSAPP_WEBHOOK_HMAC_KEY`` (header ``x-webhook-hmac``)
3. POST to ``KASIR_WHATSAPP_WEBHOOK_URL``
4. Return ``skip`` so Hermes never runs the agent / LLM

Numbers listed in ``KASIR_AGENT_PHONES`` are the exception: their messages are
left alone for the Hermes agent to answer, which is how the full-Hermes
migration is rolled out one phone at a time. Such a message is deliberately NOT
forwarded — letting both the agent and the middleware answer would send the
user two replies.

Env (set on hermes container / ``volumes/hermes/.env``):
- ``KASIR_WHATSAPP_WEBHOOK_URL`` — default ``http://middleware:4001/api/studio/whatsapp/webhook``
- ``WHATSAPP_WEBHOOK_HMAC_KEY`` — same key middleware verifies
- ``KASIR_PIPE_SESSION`` — webhook ``session`` field (default ``hermes``)
- ``KASIR_PIPE_PLATFORMS`` — comma list; default ``whatsapp``
- ``KASIR_AGENT_PHONES`` — comma list of numbers handled by the agent; empty
  (the default) keeps every number on the pipe-only path. Written as ordinary
  phone numbers even though inbound senders arrive as LIDs; the translation
  happens here.
- ``KASIR_WA_SESSION_DIR`` — bridge session dir holding the LID mapping files
  (default ``/opt/data/platforms/whatsapp/session``)
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger("hermes.plugins.kasir-pipe")


def _platforms() -> set[str]:
    raw = (os.environ.get("KASIR_PIPE_PLATFORMS") or "whatsapp").strip()
    return {p.strip().lower() for p in raw.split(",") if p.strip()}


def _webhook_url() -> str:
    return (
        os.environ.get("KASIR_WHATSAPP_WEBHOOK_URL")
        or "http://middleware:4001/api/studio/whatsapp/webhook"
    ).strip()


def _hmac_key() -> str:
    return (os.environ.get("WHATSAPP_WEBHOOK_HMAC_KEY") or "").strip()


def _session_name() -> str:
    return (os.environ.get("KASIR_PIPE_SESSION") or "hermes").strip() or "hermes"


# Where the Baileys bridge keeps its session state, including the
# lid-mapping-{phone}.json files used to translate LIDs back to numbers.
_SESSION_DIR = (
    os.environ.get("KASIR_WA_SESSION_DIR") or "/opt/data/platforms/whatsapp/session"
)


def _digits(value: str) -> str:
    # Drop the "@server" and ":device" suffixes before reading digits, so a
    # multi-device JID like 628111:12@s.whatsapp.net yields 628111, not
    # 62811112 (which would silently never match the allowlist).
    head = (value or "").split("@", 1)[0].split(":", 1)[0]
    return re.sub(r"\D", "", head)


def _agent_phones() -> set[str]:
    raw = os.environ.get("KASIR_AGENT_PHONES") or ""
    return {d for d in (_digits(p) for p in raw.split(",")) if d}


def _lid_for_phone(phone: str) -> str:
    """The LID WhatsApp assigns to a phone, per the bridge's session files.

    Inbound messages identify the sender by LID (``37551234617412@lid``), never
    by number, so an allowlist written in phone numbers cannot match until it is
    translated. The bridge keeps ``lid-mapping-{phone}.json`` files for exactly
    this and rebuilds its own map from them on every creds update.

    Resolving phone -> LID (rather than the reverse) is deliberate: the reverse
    means scanning every mapping file in the session dir on every message, and
    there are hundreds of them.
    """
    try:
        path = os.path.join(_SESSION_DIR, f"lid-mapping-{_digits(phone)}.json")
        with open(path, "r", encoding="utf-8") as fh:
            return _digits(str(json.load(fh)))
    except Exception:
        return ""


def _agent_identities() -> set[str]:
    """Sender ids routed to the agent: the configured phones and their LIDs."""
    identities: set[str] = set()
    for phone in _agent_phones():
        identities.add(phone)
        lid = _lid_for_phone(phone)
        if lid:
            identities.add(lid)
    return identities


def _platform_name(event: Any) -> str:
    source = getattr(event, "source", None)
    platform = getattr(source, "platform", None) if source is not None else None
    if platform is None:
        return ""
    return str(getattr(platform, "value", platform) or "").lower()


def _chat_id(event: Any) -> str:
    source = getattr(event, "source", None)
    for candidate in (
        getattr(event, "user_id", None),
        getattr(source, "chat_id", None) if source is not None else None,
        getattr(source, "user_id", None) if source is not None else None,
    ):
        if candidate:
            return str(candidate)
    return ""


def _selected_button_id(event: Any) -> Optional[str]:
    pr = getattr(event, "prompt_response", None)
    if isinstance(pr, dict):
        oid = pr.get("option_id") or pr.get("selectedButtonId")
        if oid:
            return str(oid)
    meta = getattr(event, "metadata", None) or {}
    if isinstance(meta, dict):
        for key in ("selectedButtonId", "selected_button_id", "option_id"):
            if meta.get(key):
                return str(meta[key])
    return None


def _webhook_body(event: Any) -> dict[str, Any]:
    chat_id = _chat_id(event)
    text = getattr(event, "text", None) or ""
    name = (
        getattr(event, "user_name", None)
        or getattr(getattr(event, "source", None), "user_name", None)
        or ""
    )
    message_id = getattr(event, "message_id", None) or ""
    ts = getattr(event, "timestamp", None)
    if isinstance(ts, datetime):
        timestamp = int(ts.replace(tzinfo=timezone.utc).timestamp()) if ts.tzinfo is None else int(ts.timestamp())
    else:
        timestamp = int(datetime.now(timezone.utc).timestamp())

    payload: dict[str, Any] = {
        "id": message_id,
        "timestamp": timestamp,
        "from": chat_id,
        "fromMe": False,
        "body": text,
        "hasMedia": bool(getattr(event, "media_urls", None)),
        "notifyName": name,
        "pushName": name,
        "source": "hermes-kasir-pipe",
    }
    button_id = _selected_button_id(event)
    if button_id:
        payload["selectedButtonId"] = button_id
        # List replies sometimes nest under _data / listResponse — keep flat for extractUmkmButtonReply
    media_urls = list(getattr(event, "media_urls", None) or [])
    media_types = list(getattr(event, "media_types", None) or [])
    if media_urls:
        payload["media"] = {
            "url": media_urls[0],
            "mimetype": media_types[0] if media_types else "",
        }

    return {
        "event": "message",
        "session": _session_name(),
        "payload": payload,
        "engine": "HERMES",
        "me": {"id": "hermes-pipe"},
    }


def _post_signed(body: dict[str, Any]) -> tuple[int, str]:
    raw = json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    key = _hmac_key()
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "hermes-kasir-pipe/1.0",
    }
    if key:
        digest = hmac.new(key.encode("utf-8"), raw, hashlib.sha512).hexdigest()
        headers["x-webhook-hmac"] = digest
    else:
        logger.warning("kasir-pipe: WHATSAPP_WEBHOOK_HMAC_KEY empty — posting unsigned")

    req = urllib.request.Request(
        _webhook_url(),
        data=raw,
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return int(resp.status), resp.read()[:500].decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        detail = e.read()[:500].decode("utf-8", "replace") if e.fp else ""
        return int(e.code), detail
    except Exception as e:
        return 0, str(e)


def _on_pre_gateway_dispatch(event, gateway=None, session_store=None, **kwargs):
    del gateway, session_store, kwargs
    try:
        if getattr(event, "internal", False):
            return None
        platform = _platform_name(event)
        if platform not in _platforms():
            return None

        sender = _chat_id(event)
        if _digits(sender) in _agent_identities():
            # Hand the message to the Hermes agent. Returning None (not skip)
            # lets the agent loop run; forwarding it as well would have the
            # middleware answer the same message a second time.
            logger.info("kasir-pipe: agent-mode chat=%s (not forwarded)", sender)
            return None

        body = _webhook_body(event)
        chat = body["payload"].get("from") or "?"
        status, detail = _post_signed(body)
        if status and 200 <= status < 300:
            logger.info(
                "kasir-pipe: forwarded ok status=%s chat=%s session=%s",
                status,
                chat,
                body.get("session"),
            )
        else:
            logger.error(
                "kasir-pipe: forward failed status=%s chat=%s detail=%s",
                status,
                chat,
                detail,
            )
        # Always skip agent on WhatsApp kasir path (even if forward failed — avoid LLM replies)
        return {"action": "skip", "reason": f"kasir-pipe forward status={status}"}
    except Exception as exc:
        logger.exception("kasir-pipe: unexpected error: %s", exc)
        return {"action": "skip", "reason": f"kasir-pipe error: {exc}"}


def register(ctx):
    ctx.register_hook("pre_gateway_dispatch", _on_pre_gateway_dispatch)
    _start_bridge_proxy()
    logger.info(
        "kasir-pipe registered (webhook=%s platforms=%s)",
        _webhook_url(),
        ",".join(sorted(_platforms())),
    )


# ── Outbound bridge proxy (middleware → Hermes Baileys on docker network) ──
# Bridge binds 127.0.0.1 inside the container; other containers cannot reach it.
# This thread listens on 0.0.0.0:KASIR_BRIDGE_PROXY_PORT (default 8765) and
# reverse-proxies to http://127.0.0.1:WHATSAPP_BRIDGE_PORT (default 3000).
# Also serves /pair/* for admin QR pairing from NusantaraSoft.

_proxy_started = False


def _start_bridge_proxy() -> None:
    global _proxy_started
    if _proxy_started:
        return
    if os.environ.get("KASIR_BRIDGE_PROXY", "1").strip() in ("0", "false", "no"):
        return
    try:
        import importlib.util
        import threading
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        from pathlib import Path as _Path

        _pair_path = _Path(__file__).with_name("pair.py")
        _spec = importlib.util.spec_from_file_location("kasir_pipe_pair", _pair_path)
        if _spec is None or _spec.loader is None:
            raise RuntimeError("cannot load pair.py")
        pair_mod = importlib.util.module_from_spec(_spec)
        _spec.loader.exec_module(pair_mod)
    except Exception as exc:
        logger.warning("kasir-pipe: bridge proxy deps missing: %s", exc)
        return

    listen_port = int(os.environ.get("KASIR_BRIDGE_PROXY_PORT") or "8765")
    upstream_port = int(os.environ.get("WHATSAPP_BRIDGE_PORT") or "3000")
    upstream = f"http://127.0.0.1:{upstream_port}"

    def _json_response(handler: BaseHTTPRequestHandler, code: int, payload: dict) -> None:
        raw = json.dumps(payload).encode("utf-8")
        handler.send_response(code)
        handler.send_header("Content-Type", "application/json")
        handler.send_header("Content-Length", str(len(raw)))
        handler.end_headers()
        handler.wfile.write(raw)

    def _read_body(handler: BaseHTTPRequestHandler) -> bytes:
        length = int(handler.headers.get("Content-Length") or 0)
        return handler.rfile.read(length) if length else b""

    class _Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):  # noqa: N802
            logger.debug("kasir-bridge-proxy: " + fmt, *args)

        def _handle_pair(self) -> bool:
            path = (self.path or "/").split("?", 1)[0]
            if path == "/pair/status" and self.command == "GET":
                _json_response(self, 200, pair_mod.status())
                return True
            if path == "/pair/qr" and self.command == "GET":
                _json_response(self, 200, pair_mod.qr_payload())
                return True
            if path == "/pair/start" and self.command == "POST":
                raw = _read_body(self)
                force = False
                if raw:
                    try:
                        body = json.loads(raw.decode("utf-8"))
                        force = bool(body.get("force"))
                    except Exception:
                        force = False
                _json_response(self, 200, pair_mod.start_pairing(force=force))
                return True
            if path == "/pair/logout" and self.command == "POST":
                _read_body(self)
                _json_response(self, 200, pair_mod.logout())
                return True
            if path == "/pair/rebind" and self.command == "POST":
                # Atomic: wipe old number session + start QR for a new phone
                _read_body(self)
                _json_response(self, 200, pair_mod.start_pairing(force=True))
                return True
            if path == "/pair/reload" and self.command == "POST":
                _read_body(self)
                _json_response(self, 200, pair_mod.reload_gateway())
                return True
            return False

        def _proxy(self):
            if self._handle_pair():
                return
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length) if length else b""
            path = self.path or "/"
            url = upstream + path
            headers = {
                k: v
                for k, v in self.headers.items()
                if k.lower() not in ("host", "content-length", "transfer-encoding", "connection")
            }
            if body and "Content-Type" not in {k.title(): k for k in headers}:
                headers["Content-Type"] = self.headers.get("Content-Type") or "application/json"
            req = urllib.request.Request(url, data=body or None, headers=headers, method=self.command)
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = resp.read()
                    self.send_response(resp.status)
                    for hk, hv in resp.headers.items():
                        # Drop hop-by-hop + Content-Length — we set length from the
                        # fully-buffered body (upstream may already send Content-Length).
                        if hk.lower() in (
                            "transfer-encoding",
                            "connection",
                            "content-encoding",
                            "content-length",
                        ):
                            continue
                        self.send_header(hk, hv)
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
            except urllib.error.HTTPError as e:
                data = e.read() if e.fp else b""
                self.send_response(e.code)
                self.send_header("Content-Type", e.headers.get("Content-Type", "text/plain"))
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                msg = str(e).encode()
                self.send_response(502)
                self.send_header("Content-Type", "text/plain")
                self.send_header("Content-Length", str(len(msg)))
                self.end_headers()
                self.wfile.write(msg)

        def do_GET(self):  # noqa: N802
            self._proxy()

        def do_POST(self):  # noqa: N802
            self._proxy()

        def do_PUT(self):  # noqa: N802
            self._proxy()

        def do_DELETE(self):  # noqa: N802
            self._proxy()

    def _run():
        try:
            server = ThreadingHTTPServer(("0.0.0.0", listen_port), _Handler)
            logger.info(
                "kasir-pipe: bridge+pair proxy on 0.0.0.0:%s → %s (+ /pair/*)",
                listen_port,
                upstream,
            )
            server.serve_forever()
        except Exception as exc:
            logger.error("kasir-pipe: bridge proxy failed: %s", exc)

    threading.Thread(target=_run, name="kasir-bridge-proxy", daemon=True).start()
    _proxy_started = True
