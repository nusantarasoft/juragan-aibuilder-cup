#!/usr/bin/env bash
# ============================================================================
# pull-on-server.sh — run ON THE SERVER inside /opt/nusantarasoft-3 (or via
# deploy.ps1 over SSH). Always updates to branch master-production.
#
#   export DEPLOY_GIT_URL='git@github-nusantarasoft-3:nusantarasoft/nusantarasoft-3.git'
#   # or: export GITHUB_TOKEN='ghp_...'   (HTTPS legacy — prefer setup-deploy-key.sh)
#   bash scripts/master-production/pull-on-server.sh
#
# Env:
#   DEPLOY_GIT_URL   clone/fetch URL (SSH deploy key or HTTPS+token)
#   GITHUB_TOKEN     optional; builds HTTPS URL if DEPLOY_GIT_URL unset
#   REMOTE_DIR       default /opt/nusantarasoft-3
#   BRANCH           default master-production (do not change for go-live)
#   HERMES_BACKUP_DIR   tar backups before pull (default $REMOTE_DIR/backups/hermes-runtime)
#   HERMES_BACKUP_KEEP  keep newest N tar backups (default 5)
#   HERMES_BACKUP_RETRIES / HERMES_BACKUP_RETRY_DELAY  see hermes-runtime-backup.sh
# ============================================================================
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=hermes-runtime-backup.sh
source "$_SCRIPT_DIR/hermes-runtime-backup.sh"

BRANCH="${BRANCH:-master-production}"
REMOTE_DIR="${REMOTE_DIR:-/opt/nusantarasoft-3}"
REPO_HTTPS_PATH="${REPO_HTTPS_PATH:-nusantarasoft/nusantarasoft-3}"

if [[ -z "${DEPLOY_GIT_URL:-}" && -n "${GITHUB_TOKEN:-}" ]]; then
  DEPLOY_GIT_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_HTTPS_PATH}.git"
fi

resolve_url() {
  if [[ -n "${DEPLOY_GIT_URL:-}" ]]; then
    printf '%s' "$DEPLOY_GIT_URL"
    return
  fi
  if [[ -d "$REMOTE_DIR/.git" ]]; then
    git -C "$REMOTE_DIR" remote get-url origin
    return
  fi
  echo "ERROR: set DEPLOY_GIT_URL (or GITHUB_TOKEN) — server has no git remote yet." >&2
  echo "  Prefer a read-only deploy key:" >&2
  echo "    DEPLOY_GIT_URL=git@github.com:${REPO_HTTPS_PATH}.git" >&2
  exit 1
}

URL="$(resolve_url)"
# Mask credentials in logs
SAFE_URL="$(printf '%s' "$URL" | sed -E 's#(://[^:]+:)[^@]+@#\1***@#')"

echo "==> target dir : $REMOTE_DIR"
echo "==> branch     : $BRANCH"
echo "==> remote     : $SAFE_URL"

HERMES_BACKUP_DIR="${HERMES_BACKUP_DIR:-$REMOTE_DIR/backups/hermes-runtime}"
HERMES_BACKUP_KEEP="${HERMES_BACKUP_KEEP:-5}"

backup_hermes_runtime() {
  local hermes_dir="$REMOTE_DIR/volumes/hermes"
  [[ -d "$hermes_dir" ]] || return 0
  if [[ -z "$(ls -A "$hermes_dir" 2>/dev/null || true)" ]]; then
    return 0
  fi
  mkdir -p "$HERMES_BACKUP_DIR"
  local ts archive
  ts="$(date +%Y%m%dT%H%M%SZ)"
  archive="$HERMES_BACKUP_DIR/hermes-runtime-${ts}.tar.gz"
  echo "==> Hermes runtime backup → $archive"
  hermes_backup_runtime_with_retries "$hermes_dir" "$archive"
  local count
  count="$(find "$HERMES_BACKUP_DIR" -maxdepth 1 -type f -name 'hermes-runtime-*.tar.gz' | wc -l | tr -d ' ')"
  if [[ "${count:-0}" -gt "$HERMES_BACKUP_KEEP" ]]; then
    find "$HERMES_BACKUP_DIR" -maxdepth 1 -type f -name 'hermes-runtime-*.tar.gz' \
      | sort \
      | head -n "$(( count - HERMES_BACKUP_KEEP ))" \
      | while read -r old; do
          echo "    pruning old backup $(basename "$old")"
          rm -f "$old"
        done
  fi
}

stash_hermes_runtime() {
  local stash_root="$1"
  local hermes_dir="$REMOTE_DIR/volumes/hermes"
  [[ -d "$hermes_dir" ]] || return 0
  if [[ -z "$(ls -A "$hermes_dir" 2>/dev/null || true)" ]]; then
    return 0
  fi
  echo "    stashing volumes/hermes aside (survives git reset --hard)"
  mkdir -p "$stash_root"
  rm -rf "$stash_root/hermes"
  mv "$hermes_dir" "$stash_root/hermes"
}

restore_hermes_runtime() {
  local stash_root="$1"
  if [[ ! -d "$stash_root/hermes" ]]; then
    return 0
  fi
  echo "    restoring volumes/hermes from stash"
  mkdir -p "$REMOTE_DIR/volumes"
  rm -rf "$REMOTE_DIR/volumes/hermes"
  mv "$stash_root/hermes" "$REMOTE_DIR/volumes/hermes"
}

preserve_runtime() {
  local src="$1" dst="$2"
  mkdir -p "$dst"
  if [[ -f "$src/.env.master-production" ]]; then
    echo "    preserving .env.master-production"
    cp -a "$src/.env.master-production" "$dst/.env.master-production"
  fi
  if [[ -d "$src/volumes/db/data" ]]; then
    echo "    preserving volumes/db/data"
    mkdir -p "$dst/volumes/db"
    if mv "$src/volumes/db/data" "$dst/volumes/db/data" 2>/dev/null; then
      :
    else
      cp -a "$src/volumes/db/data" "$dst/volumes/db/data"
    fi
  fi
  if [[ -d "$src/volumes/storage" ]] && [[ ! -d "$dst/volumes/storage" ]]; then
    echo "    preserving volumes/storage"
    mkdir -p "$dst/volumes"
    mv "$src/volumes/storage" "$dst/volumes/storage" 2>/dev/null \
      || cp -a "$src/volumes/storage" "$dst/volumes/storage"
  fi
  if [[ -d "$src/volumes/hermes" ]]; then
    echo "    preserving volumes/hermes"
    mkdir -p "$dst/volumes"
    rm -rf "$dst/volumes/hermes"
    mv "$src/volumes/hermes" "$dst/volumes/hermes" 2>/dev/null \
      || cp -a "$src/volumes/hermes" "$dst/volumes/hermes"
  fi
}

if [[ -d "$REMOTE_DIR/.git" ]]; then
  echo "==> git repo found — fetch + hard reset to origin/$BRANCH"
  cd "$REMOTE_DIR"
  backup_hermes_runtime
  HERMES_STASH="$(mktemp -d "${REMOTE_DIR}.hermes-stash.XXXXXX")"
  stash_hermes_runtime "$HERMES_STASH"
  git remote set-url origin "$URL"
  git fetch --prune origin "$BRANCH"
  # Tar/hotfix deploys often leave dirty/untracked files that block checkout.
  # Force align to origin; never wipe .env, DB/storage, or Hermes runtime (gitignored).
  git checkout -f -B "$BRANCH" "origin/$BRANCH"
  git reset --hard "origin/$BRANCH"
  git clean -fd \
    --exclude=.env.master-production \
    --exclude=volumes/db/data \
    --exclude=volumes/storage \
    --exclude=volumes/hermes \
    --exclude=backups/hermes-runtime
  restore_hermes_runtime "$HERMES_STASH"
  rm -rf "$HERMES_STASH"
else
  echo "==> no .git under $REMOTE_DIR — cloning $BRANCH (bootstrap)"
  TMP="${REMOTE_DIR}.pull-tmp.$$"
  BAK="${REMOTE_DIR}.bak.$(date +%Y%m%d%H%M%S)"
  rm -rf "$TMP"
  git clone --branch "$BRANCH" --single-branch "$URL" "$TMP"
  if [[ -d "$REMOTE_DIR" ]]; then
    preserve_runtime "$REMOTE_DIR" "$TMP"
    echo "    moving old tree aside → $BAK"
    mv "$REMOTE_DIR" "$BAK"
  fi
  mv "$TMP" "$REMOTE_DIR"
  cd "$REMOTE_DIR"
fi

CUR="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CUR" != "$BRANCH" ]]; then
  echo "ERROR: expected branch '$BRANCH' but got '$CUR'" >&2
  exit 1
fi

echo "==> OK: $BRANCH @ $(git rev-parse --short HEAD) ($(git log -1 --pretty=%s))"
if [[ ! -f "$REMOTE_DIR/.env.master-production" ]]; then
  echo "WARNING: .env.master-production missing on server — create it before redeploy." >&2
fi
