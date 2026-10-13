#!/usr/bin/env bash
# ============================================================================
# setup-deploy-key.sh — run ON THE PRODUCTION SERVER (or piped via deploy SSH)
#
# One-time migration: HTTPS origin with embedded token → read-only deploy key (SSH).
# Adding the printed public key to GitHub deploy keys is manual (out of scope).
#
# From Akbar's Mac (repo root, SSH_* env set):
#   python scripts/master-production/_ssh.py script scripts/master-production/setup-deploy-key.sh
#
# Env:
#   REMOTE_DIR          default /opt/nusantarasoft-3
#   DEPLOY_KEY_BASENAME default nsoft3-readonly (under $REMOTE_DIR/.deploy-keys/)
#   GIT_SSH_HOST_ALIAS  default github-nusantarasoft-3
#   REPO_SSH_SLUG       default nusantarasoft/nusantarasoft-3
#   DRY_RUN             1 = print actions only (no writes, no fetch)
#   SKIP_FETCH          1 = configure but skip git fetch (for dry-run QA)
# ============================================================================
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/opt/nusantarasoft-3}"
DEPLOY_KEY_BASENAME="${DEPLOY_KEY_BASENAME:-nsoft3-readonly}"
GIT_SSH_HOST_ALIAS="${GIT_SSH_HOST_ALIAS:-github-nusantarasoft-3}"
REPO_SSH_SLUG="${REPO_SSH_SLUG:-nusantarasoft/nusantarasoft-3}"
DRY_RUN="${DRY_RUN:-0}"
SKIP_FETCH="${SKIP_FETCH:-0}"

KEY_DIR="$REMOTE_DIR/.deploy-keys"
PRIVATE_KEY="$KEY_DIR/$DEPLOY_KEY_BASENAME"
PUBLIC_KEY="${PRIVATE_KEY}.pub"
SNIPPET="$KEY_DIR/ssh-config-snippet"
SSH_ORIGIN="git@${GIT_SSH_HOST_ALIAS}:${REPO_SSH_SLUG}.git"
CANONICAL_ORIGIN="git@github.com:${REPO_SSH_SLUG}.git"

mask_url() {
  printf '%s' "$1" | sed -E 's#(://[^:]+:)[^@]+@#\1***@#'
}

log() { echo "==> $*"; }

run_or_echo() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

rollback_origin=""
rollback_ssh_command=""

cleanup_on_fail() {
  local code=$?
  if [[ "$code" -eq 0 ]]; then
    return 0
  fi
  if [[ "$DRY_RUN" == "1" ]]; then
    return "$code"
  fi
  echo "ERROR: setup failed (exit $code) — rolling back git remote/config if changed" >&2
  if [[ -d "$REMOTE_DIR/.git" && -n "$rollback_origin" ]]; then
    git -C "$REMOTE_DIR" remote set-url origin "$rollback_origin" 2>/dev/null || true
    if [[ -n "$rollback_ssh_command" ]]; then
      if [[ "$rollback_ssh_command" == "__UNSET__" ]]; then
        git -C "$REMOTE_DIR" config --unset core.sshCommand 2>/dev/null || true
      else
        git -C "$REMOTE_DIR" config core.sshCommand "$rollback_ssh_command"
      fi
    fi
  fi
  return "$code"
}

trap cleanup_on_fail EXIT

if [[ ! -d "$REMOTE_DIR/.git" ]]; then
  echo "ERROR: no git repo at $REMOTE_DIR — bootstrap clone first or set REMOTE_DIR." >&2
  exit 1
fi

OLD_ORIGIN="$(git -C "$REMOTE_DIR" remote get-url origin)"
rollback_origin="$OLD_ORIGIN"
if git -C "$REMOTE_DIR" config --get core.sshCommand >/dev/null 2>&1; then
  rollback_ssh_command="$(git -C "$REMOTE_DIR" config --get core.sshCommand)"
else
  rollback_ssh_command="__UNSET__"
fi

log "repo dir     : $REMOTE_DIR"
log "origin (now) : $(mask_url "$OLD_ORIGIN")"
log "target origin: $SSH_ORIGIN"
log "deploy key   : $PRIVATE_KEY"

# --- Idempotent key generation (server) ---
if [[ -f "$PRIVATE_KEY" && -f "$PUBLIC_KEY" ]]; then
  log "deploy key already exists — not regenerating"
else
  log "generating ed25519 deploy key under $KEY_DIR"
  run_or_echo mkdir -p "$KEY_DIR"
  if [[ "$DRY_RUN" != "1" ]]; then
    ssh-keygen -t ed25519 -f "$PRIVATE_KEY" -N "" -C "nsoft3-prod-readonly@$(hostname -f 2>/dev/null || hostname)"
    chmod 700 "$KEY_DIR"
    chmod 600 "$PRIVATE_KEY"
    chmod 644 "$PUBLIC_KEY"
  fi
fi

echo ""
echo "========== DEPLOY KEY (public only — add in GitHub repo Deploy keys) =========="
if [[ -f "$PUBLIC_KEY" ]]; then
  cat "$PUBLIC_KEY"
else
  echo "[dry-run] would print contents of $PUBLIC_KEY after keygen"
fi
echo "================================================================================"
echo ""

# --- SSH host alias snippet (Include from root ssh config) ---
log "writing SSH host alias snippet → $SNIPPET"
if [[ "$DRY_RUN" != "1" ]]; then
  mkdir -p "$KEY_DIR"
  cat >"$SNIPPET" <<EOF
# nusantarasoft-3 production read-only deploy key (managed by setup-deploy-key.sh)
Host ${GIT_SSH_HOST_ALIAS}
  HostName github.com
  User git
  IdentityFile ${PRIVATE_KEY}
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
  chmod 600 "$SNIPPET"
fi

ROOT_SSH_DIR="${ROOT_SSH_DIR:-/root/.ssh}"
ROOT_SSH_CONFIG="$ROOT_SSH_DIR/config"
INCLUDE_MARKER="# nsoft3-deploy-key-include"
INCLUDE_LINE="Include ${SNIPPET}"

log "ensuring Include in $ROOT_SSH_CONFIG"
if [[ "$DRY_RUN" != "1" ]]; then
  mkdir -p "$ROOT_SSH_DIR"
  chmod 700 "$ROOT_SSH_DIR"
  touch "$ROOT_SSH_CONFIG"
  chmod 600 "$ROOT_SSH_CONFIG"
  if ! grep -Fq "$INCLUDE_MARKER" "$ROOT_SSH_CONFIG" 2>/dev/null; then
    {
      echo ""
      echo "$INCLUDE_MARKER"
      echo "$INCLUDE_LINE"
    } >>"$ROOT_SSH_CONFIG"
  fi
fi

SSH_CMD="ssh -F ${ROOT_SSH_CONFIG} -o IdentitiesOnly=yes"

# --- Verify fetch over SSH before dropping HTTPS token from origin ---
test_fetch() {
  if [[ "$SKIP_FETCH" == "1" || "$DRY_RUN" == "1" ]]; then
    log "skip fetch (DRY_RUN=$DRY_RUN SKIP_FETCH=$SKIP_FETCH)"
    return 0
  fi
  log "testing SSH auth (origin URL unchanged until success)"
  git -C "$REMOTE_DIR" -c "core.sshCommand=${SSH_CMD}" ls-remote "$SSH_ORIGIN" HEAD >/dev/null
}

apply_ssh_origin() {
  log "configuring core.sshCommand and switching origin to SSH (no token in URL)"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[dry-run] git -C $REMOTE_DIR config core.sshCommand '$SSH_CMD'"
    echo "[dry-run] git -C $REMOTE_DIR remote set-url origin '$SSH_ORIGIN'"
    return 0
  fi
  git -C "$REMOTE_DIR" config core.sshCommand "$SSH_CMD"
  git -C "$REMOTE_DIR" remote set-url origin "$SSH_ORIGIN"
}

verify_origin_fetch() {
  if [[ "$SKIP_FETCH" == "1" || "$DRY_RUN" == "1" ]]; then
    return 0
  fi
  log "verifying git fetch via configured origin"
  git -C "$REMOTE_DIR" fetch --prune origin
}

# Already on SSH without token — idempotent refresh
if [[ "$(mask_url "$OLD_ORIGIN")" == "$(mask_url "$SSH_ORIGIN")" ]] \
  || [[ "$OLD_ORIGIN" == "$CANONICAL_ORIGIN" ]] \
  || [[ "$OLD_ORIGIN" == "$SSH_ORIGIN" ]]; then
  log "origin already SSH — refreshing ssh config and testing fetch"
  apply_ssh_origin
  verify_origin_fetch
  log "OK: deploy key path ready (origin already SSH)"
  trap - EXIT
  exit 0
fi

test_fetch || {
  echo "ERROR: git fetch over SSH failed — origin left as: $(mask_url "$OLD_ORIGIN")" >&2
  echo "Add the public key above to GitHub → repo → Settings → Deploy keys (read-only), then re-run." >&2
  exit 1
}

apply_ssh_origin
verify_origin_fetch || {
  echo "ERROR: fetch via new origin failed — rolling back" >&2
  exit 1
}

if [[ "$DRY_RUN" == "1" ]]; then
  log "OK: dry-run complete (no changes applied)"
  trap - EXIT
  exit 0
fi

NEW_ORIGIN="$(git -C "$REMOTE_DIR" remote get-url origin 2>/dev/null || echo "$SSH_ORIGIN")"
if [[ "$NEW_ORIGIN" == *"://"* ]] && [[ "$NEW_ORIGIN" == *"@"* ]]; then
  echo "ERROR: origin still looks like HTTPS with credentials: $(mask_url "$NEW_ORIGIN")" >&2
  exit 1
fi

log "OK: origin is SSH without embedded token → $(mask_url "$NEW_ORIGIN")"
log "pull-on-server.sh / deploy.ps1: use DEPLOY_GIT_URL=$SSH_ORIGIN (or $CANONICAL_ORIGIN with same key + core.sshCommand)"

trap - EXIT
exit 0
