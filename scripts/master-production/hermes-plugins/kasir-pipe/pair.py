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
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger("hermes.plugins.kasir-pipe.pair")

_lock = threading.Lock()
_pair_proc: Optional[subprocess.Popen] = None
_latest_qr: Optional[str] = None
_pair_state: str = "idle"  # idle|starting|scan_qr|connected|error
_pair_error: Optional[str] = None
_pair_user: Optional[dict] = None


def _hermes_home() -> Path:
    return Path(os.environ.get("HERMES_HOME") or "/opt/data")


def _session_dir() -> Path:
    return Path(
        os.environ.get("WHATSAPP_SESSION_DIR")
        or str(_hermes_home() / "platforms" / "whatsapp" / "session")
    )


def _creds_path() -> Path:
    return _session_dir() / "creds.json"


def _bridge_js() -> Path:
    candidates = [
        Path(os.environ.get("WHATSAPP_BRIDGE_JS") or ""),
        Path("/opt/hermes/scripts/whatsapp-bridge/bridge.js"),
        _hermes_home() / "hermes-agent" / "scripts" / "whatsapp-bridge" / "bridge.js",
    ]
    for c in candidates:
        if c and c.is_file():
            return c
    return candidates[1]


def _bridge_cwd() -> Path:
    return _bridge_js().parent


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
        me_id = user.get("id")

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


def qr_payload() -> dict[str, Any]:
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
    if qr:
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
                    _latest_qr = str(ev["qr"])
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


def start_pairing() -> dict[str, Any]:
    global _pair_proc, _latest_qr, _pair_state, _pair_error, _pair_user

    if _creds_path().is_file():
        # Already paired — report connected; caller may still want reload
        with _lock:
            _pair_state = "connected"
        return {"status": "WORKING", "connected": True, **status()}

    bridge = _bridge_js()
    if not bridge.is_file():
        return {
            "status": "ERROR",
            "connected": False,
            "error": f"bridge.js not found at {bridge}",
        }

    with _lock:
        _stop_pair_proc()
        _latest_qr = None
        _pair_error = None
        _pair_user = None
        _pair_state = "starting"

    env = os.environ.copy()
    env["WHATSAPP_MODE"] = env.get("WHATSAPP_MODE") or "bot"
    # Ensure session dir exists
    _session_dir().mkdir(parents=True, exist_ok=True)

    cmd = ["node", str(bridge), "--pair-only", "--pair-json", "--mode", "bot"]
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
    global _latest_qr, _pair_state, _pair_error, _pair_user
    with _lock:
        _stop_pair_proc()
        _latest_qr = None
        _pair_state = "idle"
        _pair_error = None
        _pair_user = None
    sess = _session_dir()
    if sess.exists():
        try:
            shutil.rmtree(sess)
            sess.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            return {"status": "ERROR", "error": str(exc)}
    return {"status": "SCAN_QR_CODE"}


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
