#!/usr/bin/env bash
# redeploy-detached.sh — start/monitor redeploy.sh detached on the production server.
#
# Used by deploy.ps1 so Mac sleep / SSH drop does not kill docker builds.
#
#   start [PULL]   acquire lock, spawn setsid+nohup job, print LOG=/PID=/STATUS=
#                  optional PULL: server path to stdin-safe pull script (runs before redeploy)
#   status         print LOG=/PID=/STATUS=/EXIT= (machine-readable)
#   tail-since     args: LOG OFFSET — print new log bytes; last line OFFSET=<n>
#
# Env:
#   REMOTE_DIR  default /opt/nusantarasoft-3
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/opt/nusantarasoft-3}"
LOG_DIR="$REMOTE_DIR/logs"
LOCKFILE="$LOG_DIR/.deploy.lock"
STATEFILE="$LOG_DIR/.deploy.state"
REDEPLOY="$REMOTE_DIR/scripts/master-production/redeploy.sh"

mkdir -p "$LOG_DIR"

_read_state_val() {
  local key="$1"
  if [[ ! -f "$STATEFILE" ]]; then
    return 1
  fi
  grep -E "^${key}=" "$STATEFILE" 2>/dev/null | tail -1 | cut -d= -f2- || true
}

_write_state() {
  local tmp
  tmp="$(mktemp "${STATEFILE}.XXXXXX")"
  cat >"$tmp"
  mv -f "$tmp" "$STATEFILE"
}

_lock_pid() {
  if [[ ! -f "$LOCKFILE" ]]; then
    return 1
  fi
  awk '{print $1}' "$LOCKFILE" 2>/dev/null | head -1
}

_lock_log() {
  if [[ ! -f "$LOCKFILE" ]]; then
    return 1
  fi
  awk '{print $2}' "$LOCKFILE" 2>/dev/null | head -1
}

_stale_lock_cleanup() {
  if [[ ! -f "$LOCKFILE" ]]; then
    return 0
  fi
  local pid
  pid="$(_lock_pid || true)"
  if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  rm -f "$LOCKFILE"
}

cmd_start() {
  local pull_script="${1:-}"
  if [[ -n "$pull_script" ]] && [[ ! -f "$pull_script" ]]; then
    echo "ERROR: pull script not found: $pull_script" >&2
    exit 1
  fi

  _stale_lock_cleanup
  if [[ -f "$LOCKFILE" ]]; then
    local pid log
    pid="$(_lock_pid)"
    log="$(_lock_log)"
    echo "ERROR: deploy already running (pid=${pid:-?} log=${log:-?})" >&2
    echo "Use deploy.ps1 -Attach or -Status, or wait for the lock to clear." >&2
    exit 2
  fi

  if [[ ! -x "$REDEPLOY" ]] && [[ ! -f "$REDEPLOY" ]]; then
    echo "ERROR: missing $REDEPLOY" >&2
    exit 1
  fi

  local ts log wrapper started
  ts="$(date +%Y%m%d-%H%M%S)"
  log="$LOG_DIR/deploy-${ts}.log"
  : >"$log"
  started="$(date -Iseconds)"

  wrapper="$LOG_DIR/.deploy-run-${ts}.sh"
  local pull_escaped=""
  if [[ -n "$pull_script" ]]; then
    pull_escaped="$(printf '%s' "$pull_script" | sed "s/'/'\\\\''/g")"
  fi
  cat >"$wrapper" <<EOS
#!/usr/bin/env bash
set -uo pipefail
REMOTE_DIR='$REMOTE_DIR'
LOG='$log'
LOCKFILE='$LOCKFILE'
STATEFILE='$STATEFILE'
REDEPLOY='$REDEPLOY'
PULL_SCRIPT='${pull_escaped}'
STARTED='$started'
ec=0
finish() {
  echo "\$ec" >"\${LOG}.exit"
  tmp="\$(mktemp "\${STATEFILE}.XXXXXX")"
  cat >"\$tmp" <<EOSTATE
LOG=\$LOG
PID=
STARTED=\$STARTED
STATUS=done
EXIT=\$ec
EOSTATE
  mv -f "\$tmp" "\$STATEFILE"
  rm -f "\$LOCKFILE"
  rm -f "\$0"
  if [[ -n "\${PULL_SCRIPT:-}" ]] && [[ -f "\$PULL_SCRIPT" ]]; then
    rm -f "\$PULL_SCRIPT"
  fi
}
trap finish EXIT
{
  cd "\$REMOTE_DIR"
  if [[ -n "\${PULL_SCRIPT:-}" ]]; then
    echo "==> [deploy] server git pull (detached)"
    bash "\$PULL_SCRIPT"
  fi
  echo "==> [deploy] redeploy.sh (build + up + smoke)"
  bash "\$REDEPLOY"
} >>"\$LOG" 2>&1 || ec=\$?
exit "\$ec"
EOS
  chmod +x "$wrapper"

  setsid nohup "$wrapper" >>"$log" 2>&1 &
  local wp="$!"
  echo "$wp $log" >"$LOCKFILE"

  # Patch PID into state (keep other fields)
  local cur_log cur_started
  cur_log="$log"
  cur_started="$started"
  _write_state <<EOF
LOG=$cur_log
PID=$wp
STARTED=$cur_started
STATUS=running
EXIT=
EOF

  echo "LOG=$log"
  echo "PID=$wp"
  echo "STATUS=running"
}

cmd_status() {
  local log pid status exit_code started
  log="$(_read_state_val LOG || true)"
  pid="$(_read_state_val PID || true)"
  started="$(_read_state_val STARTED || true)"
  status="$(_read_state_val STATUS || true)"
  exit_code="$(_read_state_val EXIT || true)"

  if [[ -z "$log" ]] && [[ -f "$LOCKFILE" ]]; then
    log="$(_lock_log || true)"
    pid="$(_lock_pid || true)"
  fi

  if [[ -z "$log" ]]; then
    echo "STATUS=idle"
    echo "LOG="
    echo "PID="
    echo "EXIT="
    exit 0
  fi

  if [[ -f "${log}.exit" ]]; then
    status="done"
    exit_code="$(tr -d '\r\n' <"${log}.exit")"
  elif [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
    status="running"
    exit_code=""
  elif [[ -f "$LOCKFILE" ]]; then
    local lp
    lp="$(_lock_pid || true)"
    if [[ -n "${lp:-}" ]] && kill -0 "$lp" 2>/dev/null; then
      status="running"
      pid="$lp"
      exit_code=""
    else
      status="failed"
      exit_code="${exit_code:-1}"
    fi
  else
    if [[ "$status" == "running" ]]; then
      status="failed"
      exit_code="${exit_code:-1}"
    fi
  fi

  echo "LOG=$log"
  echo "PID=${pid:-}"
  echo "STARTED=${started:-}"
  echo "STATUS=$status"
  if [[ -n "${exit_code:-}" ]]; then
    echo "EXIT=$exit_code"
  else
    echo "EXIT="
  fi

  if [[ "$status" == "done" ]]; then
    exit 0
  fi
  if [[ "$status" == "running" ]]; then
    exit 0
  fi
  exit 1
}

cmd_tail_since() {
  local log="${1:-}"
  local off="${2:-0}"
  if [[ -z "$log" ]] || [[ ! -f "$log" ]]; then
    echo "OFFSET=$off"
    return 0
  fi
  local size
  size="$(wc -c <"$log" | tr -d ' ')"
  if [[ "$off" =~ ^[0-9]+$ ]] && (( off < size )); then
    tail -c +"$((off + 1))" "$log"
  fi
  echo "OFFSET=$size"
}

usage() {
  echo "Usage: $0 {start [PULL_SCRIPT]|status|tail-since LOG [OFFSET]}" >&2
  exit 2
}

case "${1:-}" in
  start)
    shift
    cmd_start "${1:-}"
    ;;
  status) cmd_status ;;
  tail-since)
    shift
    cmd_tail_since "${1:-}" "${2:-0}"
    ;;
  *) usage ;;
esac
