"""Hermes WhatsApp pairing HTTP helpers for kasir-pipe proxy.

Endpoints (same port as bridge proxy, default 8765):
  GET  /pair/status   → { connected, status, meId?, credsPresent, pairing }
  POST /pair/start    → start ``bridge.js --pair-only --pair-json``
  GET  /pair/qr       → { available, qr, error? }  (raw WA QR string)
  POST /pair/logout   → wipe session dir + stop pair process
  POST /pair/reload   → best-effort restart gateway so it picks up creds
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import signal
import subprocess
import threading
import time
from contextvars import ContextVar
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger("hermes.plugins.kasir-pipe.pair")

_active_session: ContextVar[Optional[str]] = ContextVar("kasir_pair_session", default=None)


def set_active_session(session: Optional[str]) -> None:
    """Scope pair/* handlers to a dedicated session dir (P2-5)."""
    _active_session.set((session or "").strip() or None)

_lock = threading.Lock()
_pair_proc: Optional[subprocess.Popen] = None
_latest_qr: Optional[str] = None
_pair_state: str = "idle"  # idle|starting|scan_qr|connected|error
_pair_error: Optional[str] = None
_pair_user: Optional[dict] = None


def _hermes_home() -> Path:
    return Path(os.environ.get("HERMES_HOME") or "/opt/data")


def _session_dir() -> Path:
    dedicated = _active_session.get()
    if dedicated and dedicated not in ("hermes", "default"):
        safe = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in dedicated).strip("-")
        if safe:
            return _hermes_home() / "platforms" / "whatsapp" / "sessions" / safe
    return Path(
        os.environ.get("WHATSAPP_SESSION_DIR")
        or str(_hermes_home() / "platforms" / "whatsapp" / "session")
    )


def _creds_path() -> Path:
    return _session_dir() / "creds.json"


def _me_id_from_creds() -> Optional[str]:
    """Read paired JID from Baileys creds after restart (in-memory _pair_user is gone)."""
    path = _creds_path()
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        me = data.get("me") if isinstance(data, dict) else None
        if isinstance(me, dict):
            mid = me.get("id") or me.get("jid")
            if mid:
                return str(mid)
        # Some Baileys dumps nest under creds.me
        creds = data.get("creds") if isinstance(data, dict) else None
        if isinstance(creds, dict):
            me2 = creds.get("me")
            if isinstance(me2, dict):
                mid = me2.get("id") or me2.get("jid")
                if mid:
                    return str(mid)
    except Exception as exc:
        logger.debug("creds meId read failed: %s", exc)
    return None


def _bridge_dir() -> Path:
    """Prefer Hermes writable mirror (HERMES_HOME) so npm install persists across image layers."""
    override = os.environ.get("WHATSAPP_BRIDGE_DIR") or ""
    if override:
        return Path(override)

    try:
        from gateway.platforms.whatsapp_common import resolve_whatsapp_bridge_dir

        return Path(resolve_whatsapp_bridge_dir())
    except Exception:
        pass

    candidates = [
        _hermes_home() / "scripts" / "whatsapp-bridge",
        Path("/opt/hermes/scripts/whatsapp-bridge"),
        _hermes_home() / "hermes-agent" / "scripts" / "whatsapp-bridge",
    ]
    for c in candidates:
        if (c / "bridge.js").is_file():
            return c
    return candidates[1]


def _bridge_js() -> Path:
    env_js = Path(os.environ.get("WHATSAPP_BRIDGE_JS") or "")
    if env_js.is_file():
        return env_js
    return _bridge_dir() / "bridge.js"


def _bridge_cwd() -> Path:
    return _bridge_js().parent


def _ensure_bridge_deps(bridge_dir: Path) -> Optional[str]:
    """Install Baileys deps when missing (Docker image ships bridge without node_modules)."""
    stamp = bridge_dir / "node_modules" / "@whiskeysockets" / "baileys" / "package.json"
    if stamp.is_file():
        return None
    npm = os.environ.get("NPM_BIN") or "npm"
    try:
        r = subprocess.run(
            [npm, "ci", "--omit=dev"],
            cwd=str(bridge_dir),
            capture_output=True,
            text=True,
            timeout=180,
        )
        if r.returncode != 0:
            r = subprocess.run(
                [npm, "install", "--omit=dev"],
                cwd=str(bridge_dir),
                capture_output=True,
                text=True,
                timeout=180,
            )
        if r.returncode != 0:
            detail = (r.stderr or r.stdout or "").strip()[-500:]
            return f"npm install failed in {bridge_dir}: {detail}"
        if not stamp.is_file():
            return f"npm install finished but baileys missing in {bridge_dir}"
    except Exception as exc:
        return f"npm install error: {exc}"
    return None


def status() -> dict[str, Any]:
    creds = _creds_path().is_file()
    health_status = "UNKNOWN"
    me_id = None
    try:
        import urllib.request

        port = int(os.environ.get("WHATSAPP_BRIDGE_PORT") or "3000")
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as r:
            data = json.loads(r.read().decode())
            health_status = str(data.get("status") or "UNKNOWN").upper()
    except Exception:
        health_status = "UNREACHABLE" if not creds else "STARTING"

    with _lock:
        pairing = _pair_state
        err = _pair_error
        user = _pair_user

    connected = health_status == "CONNECTED" or (
        creds and pairing == "connected" and health_status != "UNREACHABLE"
    )
    # Prefer live bridge health when available
    if health_status == "CONNECTED":
        connected = True
        status_name = "WORKING"
    elif pairing == "scan_qr":
        status_name = "SCAN_QR_CODE"
        connected = False
    elif pairing == "starting":
        status_name = "STARTING"
        connected = False
    elif not creds:
        status_name = "SCAN_QR_CODE"
        connected = False
    elif health_status == "UNREACHABLE":
        status_name = "STARTING"
        connected = False
    else:
        status_name = health_status or "UNKNOWN"

    if user and isinstance(user, dict):
        me_id = user.get("id") or user.get("jid")
    if not me_id and creds:
        me_id = _me_id_from_creds()

    return {
        "name": "hermes",
        "status": status_name,
        "connected": connected,
        "meId": me_id,
        "credsPresent": creds,
        "pairing": pairing,
        "error": err,
        "provider": "hermes",
    }


def _pair_proc_alive() -> bool:
    with _lock:
        return _pair_proc is not None and _pair_proc.poll() is None


def qr_payload() -> dict[str, Any]:
    global _latest_qr, _pair_state, _pair_error
    st = status()
    if st["connected"]:
        return {
            "available": False,
            "qr": None,
            "imageBase64": None,
            "mimetype": None,
            "connected": True,
            "error": None,
        }
    with _lock:
        qr = _latest_qr
        err = _pair_error
        state = _pair_state
        alive = _pair_proc is not None and _pair_proc.poll() is None

    # Never serve a QR after the pair-only bridge has exited — scan will always fail.
    if qr and not alive:
        with _lock:
            _latest_qr = None
            if state == "scan_qr":
                _pair_state = "error"
                _pair_error = _pair_error or "QR expired — klik Mulai sesi / Ganti nomor untuk QR baru"
        return {
            "available": False,
            "qr": None,
            "imageBase64": None,
            "mimetype": None,
            "connected": False,
            "error": "QR expired — klik Mulai sesi untuk generate QR baru",
        }

    if qr and alive:
        return {
            "available": True,
            "qr": qr,
            "imageBase64": None,
            "mimetype": None,
            "connected": False,
            "error": None,
        }
    if state in ("idle", "error") and not st["credsPresent"]:
        return {
            "available": False,
            "qr": None,
            "imageBase64": None,
            "mimetype": None,
            "connected": False,
            "error": err or "QR belum ada — klik Mulai sesi untuk generate QR Hermes",
        }
    return {
        "available": False,
        "qr": None,
        "imageBase64": None,
        "mimetype": None,
        "connected": False,
        "error": err or "Menunggu QR…",
    }


def _stop_pair_proc() -> None:
    global _pair_proc
    if _pair_proc and _pair_proc.poll() is None:
        try:
            _pair_proc.send_signal(signal.SIGTERM)
            try:
                _pair_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                _pair_proc.kill()
        except Exception as exc:
            logger.warning("kasir-pipe pair: stop failed: %s", exc)
    _pair_proc = None


def _normalize_qr_payload(qr: str) -> str:
    """WhatsApp scanners expect the raw ``2@…`` ref; Baileys 7 may wrap it in a wa.me URL."""
    q = (qr or "").strip()
    marker = "linked_devices#"
    if marker in q:
        return q.split(marker, 1)[1].strip() or q
    if q.startswith("https://wa.me/") and "#" in q:
        return q.split("#", 1)[1].strip() or q
    return q


def _read_pair_stdout(proc: subprocess.Popen) -> None:
    global _latest_qr, _pair_state, _pair_error, _pair_user
    assert proc.stdout is not None
    try:
        for line in proc.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                logger.debug("kasir-pipe pair stdout: %s", line[:200])
                continue
            event = ev.get("event")
            if event == "qr" and ev.get("qr"):
                with _lock:
                    _latest_qr = _normalize_qr_payload(str(ev["qr"]))
                    _pair_state = "scan_qr"
                    _pair_error = None
                logger.info("kasir-pipe pair: QR received")
            elif event == "connected":
                with _lock:
                    _pair_state = "connected"
                    _pair_user = ev.get("user") if isinstance(ev.get("user"), dict) else None
                    _latest_qr = None
                    _pair_error = None
                logger.info("kasir-pipe pair: connected")
                threading.Thread(
                    target=reload_gateway,
                    name="kasir-pair-reload",
                    daemon=True,
                ).start()
            elif event == "disconnected":
                reason = ev.get("reason")
                logger.info("kasir-pipe pair: disconnected reason=%s (515=reconnect normal)", reason)
                # 515 after scan is normal — bridge reconnects; do not mark error.
                if reason not in (515, "515"):
                    with _lock:
                        if _pair_state not in ("connected",):
                            _pair_error = _pair_error or f"disconnected ({reason})"
            elif event == "error":
                with _lock:
                    _pair_state = "error"
                    _pair_error = str(ev.get("error") or "pair error")
                logger.error("kasir-pipe pair error: %s", _pair_error)
            elif event == "started":
                with _lock:
                    _pair_state = "starting"
    finally:
        code = proc.poll()
        with _lock:
            if _pair_state not in ("connected", "error"):
                if _creds_path().is_file():
                    _pair_state = "connected"
                elif code not in (0, None):
                    _pair_state = "error"
                    _pair_error = _pair_error or f"pair process exited {code}"


def _kill_all_bridges() -> None:
    """Stop pair-only AND gateway-managed Baileys bridges (same binary)."""
    global _pair_proc
    _stop_pair_proc()
    try:
        subprocess.run(
            ["pkill", "-f", "whatsapp-bridge/bridge.js"],
            check=False,
            timeout=5,
        )
    except Exception as exc:
        logger.warning("kasir-pipe pair: pkill bridges failed: %s", exc)
    time.sleep(0.4)
    _pair_proc = None


def _session_candidates() -> list[Path]:
    return [
        _session_dir(),
        _hermes_home() / ".hermes" / "whatsapp" / "session",
        _hermes_home() / "whatsapp" / "session",
        Path("/opt/data/.hermes/whatsapp/session"),
    ]


def _path_exists_safe(p: Path) -> bool:
    try:
        return p.exists()
    except (PermissionError, OSError):
        return False


def _wipe_sessions() -> Optional[str]:
    """Remove all known WhatsApp session dirs. Returns error string or None."""
    seen: set[str] = set()
    for sess in _session_candidates():
        key = str(sess)
        if key in seen:
            continue
        seen.add(key)
        if not _path_exists_safe(sess):
            continue
        try:
            shutil.rmtree(sess)
            sess.mkdir(parents=True, exist_ok=True)
            logger.info("kasir-pipe pair: wiped session %s", sess)
        except PermissionError:
            logger.warning("kasir-pipe pair: skip wipe (permission denied): %s", sess)
        except Exception as exc:
            return f"{sess}: {exc}"
    return None


def start_pairing(force: bool = False) -> dict[str, Any]:
    global _pair_proc, _latest_qr, _pair_state, _pair_error, _pair_user

    if force:
        lo = logout()
        if lo.get("status") == "ERROR":
            return {"status": "ERROR", "connected": False, "error": lo.get("error")}
        time.sleep(0.5)

    if _creds_path().is_file() and not force:
        with _lock:
            _pair_state = "connected"
        return {
            "status": "WORKING",
            "connected": True,
            "error": (
                "Sesi nomor lama masih ada. Untuk ganti nomor: Logout Hermes "
                "(atau POST /pair/start {\"force\":true}), lalu scan QR nomor baru."
            ),
            **status(),
        }

    bridge = _bridge_js()
    if not bridge.is_file():
        return {
            "status": "ERROR",
            "connected": False,
            "error": f"bridge.js not found at {bridge}",
        }

    dep_err = _ensure_bridge_deps(_bridge_cwd())
    if dep_err:
        with _lock:
            _pair_state = "error"
            _pair_error = dep_err
        return {"status": "ERROR", "connected": False, "error": dep_err}

    with _lock:
        # Re-clicking Mulai sesi must not SIGTERM a live QR the user is scanning.
        if (
            not force
            and _pair_proc is not None
            and _pair_proc.poll() is None
            and _pair_state in ("scan_qr", "starting")
        ):
            st = status()
            return {
                "status": st["status"],
                "connected": st["connected"],
                "error": None,
                "detail": "Pairing already running — scan QR on screen",
            }
        _kill_all_bridges()
        _latest_qr = None
        _pair_error = None
        _pair_user = None
        _pair_state = "starting"

    env = os.environ.copy()
    env["WHATSAPP_MODE"] = env.get("WHATSAPP_MODE") or "bot"
    # Ensure session dir exists — must match Hermes adapter path
    session_dir = _session_dir()
    session_dir.mkdir(parents=True, exist_ok=True)
    env["WHATSAPP_SESSION_DIR"] = str(session_dir)

    # Bridge defaults to ~/.hermes/whatsapp/session; force the platforms path Hermes reads.
    cmd = [
        "node",
        str(bridge),
        "--pair-only",
        "--pair-json",
        "--mode",
        "bot",
        "--session",
        str(session_dir),
    ]
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=str(_bridge_cwd()),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
    except Exception as exc:
        with _lock:
            _pair_state = "error"
            _pair_error = str(exc)
        return {"status": "ERROR", "connected": False, "error": str(exc)}

    with _lock:
        _pair_proc = proc

    threading.Thread(
        target=_read_pair_stdout,
        args=(proc,),
        name="kasir-pair-stdout",
        daemon=True,
    ).start()

    # Give QR a moment
    for _ in range(20):
        time.sleep(0.25)
        with _lock:
            if _latest_qr or _pair_state in ("scan_qr", "connected", "error"):
                break

    st = status()
    return {
        "status": st["status"],
        "connected": st["connected"],
        "error": st.get("error"),
    }


def logout() -> dict[str, Any]:
    """Fully detach WhatsApp so a different phone can pair.

    Restart Hermes alone does NOT clear the old number — creds stay on disk and
    the gateway bridge may keep the old session alive. Logout must kill bridges
    and wipe every known session directory before a new QR is valid.
    """
    global _latest_qr, _pair_state, _pair_error, _pair_user
    with _lock:
        _kill_all_bridges()
        _latest_qr = None
        _pair_state = "idle"
        _pair_error = None
        _pair_user = None

    wipe_err = _wipe_sessions()
    if wipe_err:
        return {"status": "ERROR", "error": wipe_err}

    # Do not s6-restart the gateway here — that kills this plugin mid-request.
    # Bridges are already dead; a later /pair/reload after successful pair is enough.

    return {
        "status": "SCAN_QR_CODE",
        "detail": "Session wiped. Start pairing and scan with the new phone number.",
    }


def reload_gateway() -> dict[str, Any]:
    """Best-effort: signal s6-supervised gateway to restart and load new creds."""
    candidates = [
        ["/package/admin/s6/command/s6-svc", "-r", "/run/service/main-hermes"],
        ["s6-svc", "-r", "/run/service/main-hermes"],
        ["s6-svc", "-r", "/var/run/s6/services/main-hermes"],
    ]
    # Also try killing node bridge so gateway respawns it
    try:
        subprocess.run(["pkill", "-f", "whatsapp-bridge/bridge.js"], check=False, timeout=5)
    except Exception:
        pass

    for cmd in candidates:
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if r.returncode == 0:
                return {"status": "RESTARTING", "ok": True, "via": cmd[0]}
        except Exception:
            continue

    return {
        "status": "RESTART_MANUAL",
        "ok": False,
        "detail": "creds saved; restart nsoft3-hermes if WhatsApp still offline",
    }
