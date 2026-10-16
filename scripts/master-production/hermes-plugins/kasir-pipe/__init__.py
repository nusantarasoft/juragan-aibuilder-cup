"""kasir-pipe — WhatsApp bridge proxy for admin QR pairing (+ outbound send).

Kasir chat logic lives in Hermes (kasir-tools → Supabase). Middleware only
drives the admin AI Gateway pair/QR UI via this plugin's ``/pair/*`` HTTP
surface on port 8765.

Inbound WhatsApp:
- Allowed only if sender matches ``studio_whatsapp_config``
  (``business_phone`` ∪ ``allowlist_phones``) for an enabled tenant with notebook.
- ``KASIR_AGENT_PHONES`` is merged as an emergency allowlist (ops bootstrap).
- Non-matching senders → skip agent (no LLM).
- Messages are NOT forwarded to the middleware Studio webhook.

Env:
- ``SUPABASE_URL`` / ``SUPABASE_SERVICE_KEY`` — DB allowlist (required for gate)
- ``KASIR_AGENT_PHONES`` — extra phones always allowed
- ``KASIR_ALLOWLIST_CACHE_SEC`` — DB cache TTL seconds (default 30)
- ``KASIR_PIPE_PLATFORMS`` — comma list; default ``whatsapp``
- ``KASIR_BRIDGE_PROXY`` / ``KASIR_BRIDGE_PROXY_PORT`` / ``WHATSAPP_BRIDGE_PORT``
- ``KASIR_WA_SESSION_DIR`` — Baileys session dir (pair + LID maps)
- ``KASIR_REGISTRATION`` — ``1`` (default) enables WA DAFTAR funnel for
  non-allowlisted senders; ``0`` restores silent skip
- ``KASIR_MULTIMODAL`` — ``0`` (default / chat-only): inbound photo/voice/
  audio/video/document/sticker get a short text refuse and skip the agent.
  ``1`` / ``true`` / ``on``: pass media through to Hermes (vision/STT later).

Also registers ``transform_llm_output`` to sanitize agent replies (denylist
``user_safe``) before they reach WhatsApp — closes G11 residual egress.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger("hermes.plugins.kasir-pipe")

# (cached_at_epoch, identities: phones + LIDs)
_ALLOW_CACHE: tuple[float, set[str]] = (0.0, set())

# Hermes MessageType.value strings that count as media for chat-only refuse.
_MEDIA_MESSAGE_TYPES = frozenset(
    {"photo", "voice", "audio", "video", "document", "sticker"}
)

_MEDIA_REFUSE_TEXT = (
    "Maaf, kasir ini masih chat teks saja. "
    "Ketik saja *jual* / *stok* / *laporan* ya."
)


def _platforms() -> set[str]:
    raw = (os.environ.get("KASIR_PIPE_PLATFORMS") or "whatsapp").strip()
    return {p.strip().lower() for p in raw.split(",") if p.strip()}


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


def _supabase_url() -> str:
    return (os.environ.get("SUPABASE_URL") or "").rstrip("/")


def _service_key() -> str:
    return (
        os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or ""
    ).strip()


def _phones_match(a: str, b: str) -> bool:
    da, db = _digits(a), _digits(b)
    if len(da) < 8 or len(db) < 8:
        return False
    return da == db


def _owner_phones_from_row(cfg: dict[str, Any]) -> list[str]:
    out: list[str] = []
    bp = cfg.get("business_phone")
    if bp:
        d = _digits(str(bp))
        if len(d) >= 8:
            out.append(d)
    allow = cfg.get("allowlist_phones") or []
    if isinstance(allow, str):
        try:
            allow = json.loads(allow)
        except Exception:
            allow = [allow]
    for p in allow if isinstance(allow, list) else []:
        d = _digits(str(p))
        if len(d) >= 8:
            out.append(d)
    return out


def _fetch_db_owner_phones() -> set[str]:
    base = _supabase_url()
    key = _service_key()
    if not base or not key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY missing for allowlist")
    url = (
        f"{base}/rest/v1/studio_whatsapp_config?"
        + urllib.parse.urlencode(
            {
                "select": "tenant_id,enabled,notebook_id,business_phone,allowlist_phones",
            }
        )
    )
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=8) as resp:
        rows = json.loads(resp.read().decode("utf-8", "replace"))
    if not isinstance(rows, list):
        rows = []
    phones: set[str] = set()
    for cfg in rows:
        if cfg.get("enabled") is False:
            continue
        if not cfg.get("notebook_id"):
            continue
        for p in _owner_phones_from_row(cfg):
            phones.add(p)
    return phones


def _expand_with_lids(phones: set[str]) -> set[str]:
    identities: set[str] = set()
    for phone in phones:
        identities.add(phone)
        lid = _lid_for_phone(phone)
        if lid:
            identities.add(lid)
    return identities


def _allowed_identities() -> set[str]:
    """Phones + LIDs allowed to reach the Hermes agent (short TTL cache)."""
    global _ALLOW_CACHE
    try:
        ttl = float(os.environ.get("KASIR_ALLOWLIST_CACHE_SEC") or "30")
    except Exception:
        ttl = 30.0
    now = time.time()
    cached_at, cached = _ALLOW_CACHE
    if cached and (now - cached_at) < max(0.0, ttl):
        return cached

    phones = set(_agent_phones())
    try:
        phones |= _fetch_db_owner_phones()
    except Exception as exc:
        logger.error("kasir-pipe: allowlist DB fetch failed: %s", exc)
        if not phones:
            _ALLOW_CACHE = (now, set())
            return set()

    identities = _expand_with_lids(phones)
    _ALLOW_CACHE = (now, identities)
    logger.info(
        "kasir-pipe: allowlist refreshed phones=%s identities=%s",
        len(phones),
        len(identities),
    )
    return identities


def _sender_allowed(sender: str) -> bool:
    dig = _digits(sender)
    if len(dig) < 6:
        return False
    allowed = _allowed_identities()
    if not allowed:
        return False
    if dig in allowed:
        return True
    for entry in allowed:
        if len(entry) >= 8 and _phones_match(dig, entry):
            return True
    return False


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
        getattr(event, "chat_id", None),
        getattr(event, "sender_id", None),
        getattr(source, "chat_id", None) if source is not None else None,
        getattr(source, "user_id", None) if source is not None else None,
    ):
        if candidate:
            return str(candidate)
    return ""


def _multimodal_enabled() -> bool:
    """Prod default is chat-only; opt in with KASIR_MULTIMODAL=1."""
    return os.environ.get("KASIR_MULTIMODAL", "0").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _msg_media_refuse() -> str:
    return _MEDIA_REFUSE_TEXT


def _event_has_media(event: Any) -> bool:
    """True when inbound looks like photo/voice/file (Hermes MessageEvent shape).

    Baileys sets ``message_type`` + ``media_urls``; Cloud API the same.
    Do not import Hermes enums — plugins must stay portable.
    """
    mt = getattr(event, "message_type", None)
    if mt is not None:
        val = str(getattr(mt, "value", mt) or "").lower()
        if val in _MEDIA_MESSAGE_TYPES:
            return True
    urls = getattr(event, "media_urls", None)
    if isinstance(urls, (list, tuple)) and len(urls) > 0:
        return True
    types = getattr(event, "media_types", None)
    if isinstance(types, (list, tuple)) and len(types) > 0:
        return True
    return False


def _on_pre_gateway_dispatch(event, gateway=None, session_store=None, **kwargs):
    """Allowlisted WhatsApp → Hermes agent; others → registration funnel or skip."""
    del session_store, kwargs
    try:
        if getattr(event, "internal", False):
            return None
        platform = _platform_name(event)
        if platform not in _platforms():
            return None
        sender = _chat_id(event)
        # Chat-only gate (eng review D10A): refuse media before agent/registration.
        if not _multimodal_enabled() and _event_has_media(event):
            logger.info(
                "kasir-pipe: media refuse chat=%s (KASIR_MULTIMODAL off)",
                sender,
            )
            if sender:
                _send_wa_text(sender, _msg_media_refuse(), gateway)
            return {
                "action": "skip",
                "reason": "kasir-pipe chat-only: media refused",
            }
        if _sender_allowed(sender):
            logger.info("kasir-pipe: allowlist ok chat=%s → agent", sender)
            # Stamp identity for kasir-tools (tool hooks often omit chat JID).
            try:
                phone = _resolve_sender_phone(event)
                if len(phone) >= 8:
                    _stamp_active_sender(chat_id=sender, phone=phone)
            except Exception:
                logger.exception("kasir-pipe: stamp active sender failed")
            return None
        logger.info("kasir-pipe: allowlist deny chat=%s → registration/skip", sender)
        if not _registration_enabled():
            return {
                "action": "skip",
                "reason": "kasir-pipe allowlist: sender not in studio_whatsapp_config",
            }
        reply = _run_registration(event, gateway)
        if reply:
            _send_wa_text(sender, reply, gateway)
        return {
            "action": "skip",
            "reason": "kasir-pipe registration handled",
        }
    except Exception as exc:
        logger.exception("kasir-pipe: unexpected error: %s", exc)
        # Never silent-drop: owner must see a reply (CEO review D6).
        try:
            from .register import msg_system_busy

            sender = _chat_id(event) if event is not None else ""
            if sender:
                _send_wa_text(sender, msg_system_busy(), gateway)
        except Exception:
            logger.exception("kasir-pipe: failed to send busy fallback")
        return {
            "action": "skip",
            "reason": f"kasir-pipe allowlist error: {exc}",
        }


def _registration_enabled() -> bool:
    return os.environ.get("KASIR_REGISTRATION", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _rest(
    method: str,
    path: str,
    query: dict[str, str] | None = None,
    body: Any = None,
    prefer: str | None = None,
) -> Any:
    base = _supabase_url()
    key = _service_key()
    if not base or not key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY missing for registration")
    url = f"{base}/rest/v1/{path}"
    if query:
        url += "?" + urllib.parse.urlencode(query)
    data = None
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer
    elif method.upper() in ("POST", "PATCH"):
        headers["Prefer"] = "return=representation"
    req = urllib.request.Request(url, data=data, method=method.upper(), headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8", "replace")
        if not raw:
            return None
        return json.loads(raw)


def _resolve_sender_phone(event: Any) -> str:
    sender = _chat_id(event)
    dig = _digits(sender)
    if "@lid" in sender or (dig and not sender.endswith("@s.whatsapp.net")):
        # Prefer LID→phone map; fall back to digits.
        mapped = ""
        try:
            # Reuse tools-style reverse scan via lid-mapping-{phone}.json
            if os.path.isdir(_SESSION_DIR):
                for name in os.listdir(_SESSION_DIR):
                    if not (name.startswith("lid-mapping-") and name.endswith(".json")):
                        continue
                    phone = _digits(name[len("lid-mapping-") : -len(".json")])
                    if not phone:
                        continue
                    try:
                        with open(
                            os.path.join(_SESSION_DIR, name), "r", encoding="utf-8"
                        ) as fh:
                            mapped_lid = _digits(str(json.load(fh)))
                    except Exception:
                        continue
                    if mapped_lid == dig:
                        return phone
        except Exception:
            pass
    return dig


def _stamp_active_sender(*, chat_id: str, phone: str) -> None:
    """Stamp current WA sender for kasir-tools (shared v2 multi-chat map)."""
    import importlib.util
    from pathlib import Path

    candidates = [
        Path(__file__).resolve().parent.parent / "kasir-tools" / "identity.py",
        Path(os.environ.get("KASIR_IDENTITY_DIR") or "/opt/data/runtime").parent
        / "plugins"
        / "kasir-tools"
        / "identity.py",
        Path("/opt/data/plugins/kasir-tools/identity.py"),
    ]
    for path in candidates:
        if not path.is_file():
            continue
        spec = importlib.util.spec_from_file_location("kasir_tools_identity", path)
        if not spec or not spec.loader:
            continue
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.remember_sender(chat_id=chat_id, phone=phone)
        return
    raise FileNotFoundError("kasir-tools/identity.py not found for stamp")


def _fetch_open_registration(phone: str) -> Optional[dict[str, Any]]:
    rows = _rest(
        "GET",
        "studio_umkm_registrations",
        {
            "select": "*",
            "phone": f"eq.{phone}",
            "status": "in.(draft,pending)",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    if not isinstance(rows, list) or not rows:
        return None
    row = rows[0]
    # Expire if past expires_at
    exp = str(row.get("expires_at") or "")
    if exp:
        try:
            # PostgREST returns ISO; compare as string-ish UTC
            from datetime import datetime as _dt

            exp_dt = _dt.fromisoformat(exp.replace("Z", "+00:00"))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < datetime.now(timezone.utc):
                _rest(
                    "PATCH",
                    "studio_umkm_registrations",
                    {"id": f"eq.{row['id']}"},
                    {
                        "status": "expired",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                )
                return None
        except Exception:
            pass
    return row


def _fetch_latest_registration(phone: str) -> Optional[dict[str, Any]]:
    rows = _rest(
        "GET",
        "studio_umkm_registrations",
        {
            "select": "*",
            "phone": f"eq.{phone}",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    if not isinstance(rows, list) or not rows:
        return None
    return rows[0]


def _apply_registration_patch(phone: str, row: Optional[dict], patch: dict) -> None:
    action = patch.pop("_action", "update")
    patch = {k: v for k, v in patch.items() if not k.startswith("_")}
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    if action == "create":
        body = {
            "phone": phone,
            "status": patch.get("status") or "draft",
            "wizard_step": patch.get("wizard_step"),
            "store_name": patch.get("store_name"),
            "session_name": _session_name(),
        }
        try:
            _rest("POST", "studio_umkm_registrations", body=body)
        except Exception as exc:
            # Unique conflict: fall back to update open row
            logger.warning("kasir-pipe: registration create failed: %s", exc)
            open_row = _fetch_open_registration(phone)
            if open_row:
                _rest(
                    "PATCH",
                    "studio_umkm_registrations",
                    {"id": f"eq.{open_row['id']}"},
                    patch,
                )
        return
    if not row or not row.get("id"):
        return
    _rest(
        "PATCH",
        "studio_umkm_registrations",
        {"id": f"eq.{row['id']}"},
        patch,
    )


def _send_wa_text(chat_id: str, text: str, gateway: Any = None) -> None:
    if not text:
        return
    from .user_safe import looks_unsafe, safe_user_error

    if looks_unsafe(text):
        logger.warning(
            "kasir-pipe: blocked unsafe WA text to %s (len=%s)",
            chat_id,
            len(text),
        )
        text = safe_user_error("registration")
    # Prefer gateway adapter send when available
    try:
        if gateway is not None:
            adapters = getattr(gateway, "adapters", None) or {}
            for key in ("whatsapp", "WhatsApp", "WHATSAPP"):
                adapter = adapters.get(key) if isinstance(adapters, dict) else None
                if adapter is None and hasattr(adapters, "get"):
                    adapter = adapters.get(key)
                if adapter is not None and hasattr(adapter, "send"):
                    adapter.send(chat_id=chat_id, text=text)
                    return
    except Exception:
        logger.exception("kasir-pipe: gateway adapter send failed")

    # Fallback: Baileys bridge HTTP
    ports = [
        int(os.environ.get("WHATSAPP_BRIDGE_PORT") or "3000"),
        int(os.environ.get("KASIR_BRIDGE_PROXY_PORT") or "8765"),
    ]
    jid = chat_id if "@" in chat_id else f"{_digits(chat_id)}@s.whatsapp.net"
    payload = json.dumps({"chatId": jid, "message": text}).encode("utf-8")
    for port in ports:
        try:
            req = urllib.request.Request(
                f"http://127.0.0.1:{port}/send",
                data=payload,
                method="POST",
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if int(resp.status) < 400:
                    return
        except Exception:
            continue
    logger.warning("kasir-pipe: failed to send registration reply to %s", chat_id)


def _run_registration(event: Any, gateway: Any = None) -> str:
    # Import submodule by path — do NOT `from . import register` (shadowed by
    # this package's register(ctx) hook entrypoint).
    from .register import advance_wizard, is_status, msg_intro

    phone = _resolve_sender_phone(event)
    text = str(getattr(event, "text", None) or "")
    if not phone or len(phone) < 8:
        return msg_intro()
    try:
        row = _fetch_open_registration(phone)
        # STATUS needs latest closed row (rejected/approved/expired) too
        if row is None and is_status(text):
            row = _fetch_latest_registration(phone)
    except Exception:
        logger.exception("kasir-pipe: fetch registration failed")
        return (
            "Sistem daftar sedang sibuk. Coba lagi sebentar, "
            "atau hubungi admin."
        )
    reply, patch = advance_wizard(text=text, phone=phone, row=row)
    if patch:
        try:
            _apply_registration_patch(phone, row, patch)
        except Exception:
            logger.exception("kasir-pipe: save registration failed")
            return "Gagal menyimpan pendaftaran. Coba ketik *DAFTAR* lagi."
    return reply


def _on_transform_llm_output(
    response_text: Any = None,
    platform: Any = None,
    **kwargs: Any,
) -> Optional[str]:
    """Last-mile sanitize of agent replies before they reach WhatsApp (G11 residual).

    Hermes ``transform_llm_output``: return a string to replace, or None to keep.
    First non-empty string wins — return None when text is already clean.
    """
    del kwargs
    text = response_text if isinstance(response_text, str) else ""
    if not text.strip():
        return None
    plat = str(getattr(platform, "value", platform) or "").lower()
    allowed = _platforms()
    # Kasir Hermes is WhatsApp-first; sanitize when platform is whatsapp or unset.
    if plat and plat not in allowed and "whatsapp" not in plat:
        return None
    from .user_safe import looks_unsafe, sanitize_user_text, safe_user_error

    if not looks_unsafe(text):
        return None
    cleaned = sanitize_user_text(text, fallback=safe_user_error("generic"))
    logger.info(
        "kasir-pipe: transform_llm_output sanitized unsafe agent reply (len %s→%s)",
        len(text),
        len(cleaned),
    )
    return cleaned


def register(ctx):
    ctx.register_hook("pre_gateway_dispatch", _on_pre_gateway_dispatch)
    ctx.register_hook("transform_llm_output", _on_transform_llm_output)
    _start_bridge_proxy()
    logger.info(
        "kasir-pipe registered (DB allowlist gate; egress sanitize; "
        "pair+bridge; platforms=%s)",
        ",".join(sorted(_platforms())),
    )


# ── Outbound bridge proxy (middleware → Hermes Baileys on docker network) ──
# Bridge binds 127.0.0.1 inside the container; other containers cannot reach it.
# This thread listens on 0.0.0.0:KASIR_BRIDGE_PROXY_PORT (default 8765) and
# reverse-proxies to http://127.0.0.1:WHATSAPP_BRIDGE_PORT (default 3000).
# Also serves /pair/* for admin QR pairing from NusantaraSoft.

_proxy_started = False
_proxy_lock = threading.Lock()


def _start_bridge_proxy() -> None:
    """Bind 0.0.0.0:8765 once per process (Hermes may register the plugin twice)."""
    global _proxy_started
    with _proxy_lock:
        if _proxy_started or os.environ.get("KASIR_BRIDGE_PROXY_BOUND") == "1":
            _proxy_started = True
            return
        if os.environ.get("KASIR_BRIDGE_PROXY", "1").strip() in ("0", "false", "no"):
            return
        try:
            import importlib.util
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

        # Already serving (prior register in this process)?
        try:
            with urllib.request.urlopen(
                f"http://127.0.0.1:{listen_port}/pair/status", timeout=1
            ) as resp:
                if int(resp.status) < 500:
                    _proxy_started = True
                    os.environ["KASIR_BRIDGE_PROXY_BOUND"] = "1"
                    logger.info(
                        "kasir-pipe: bridge proxy already up on :%s — skip bind",
                        listen_port,
                    )
                    return
        except Exception:
            pass

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
                raw_path = self.path or "/"
                path = raw_path.split("?", 1)[0]
                session_qs = None
                if "?" in raw_path:
                    from urllib.parse import parse_qs

                    qs = parse_qs(raw_path.split("?", 1)[1])
                    session_qs = (qs.get("session") or [None])[0]
                pair_mod.set_active_session(session_qs)
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
                    if k.lower()
                    not in ("host", "content-length", "transfer-encoding", "connection")
                }
                if body and "Content-Type" not in {k.title(): k for k in headers}:
                    headers["Content-Type"] = (
                        self.headers.get("Content-Type") or "application/json"
                    )
                req = urllib.request.Request(
                    url, data=body or None, headers=headers, method=self.command
                )
                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        data = resp.read()
                        self.send_response(resp.status)
                        for hk, hv in resp.headers.items():
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
                    self.send_header(
                        "Content-Type", e.headers.get("Content-Type", "text/plain")
                    )
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

        try:
            server = ThreadingHTTPServer(("0.0.0.0", listen_port), _Handler)
        except OSError as exc:
            logger.error("kasir-pipe: bridge proxy bind failed: %s", exc)
            return

        _proxy_started = True
        os.environ["KASIR_BRIDGE_PROXY_BOUND"] = "1"
        threading.Thread(
            target=server.serve_forever, name="kasir-bridge-proxy", daemon=True
        ).start()
        logger.info(
            "kasir-pipe: bridge+pair proxy on 0.0.0.0:%s → %s (+ /pair/*)",
            listen_port,
            upstream,
        )