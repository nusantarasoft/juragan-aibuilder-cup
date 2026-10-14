#!/usr/bin/env bash
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# pull-on-server.sh â€” run ON THE SERVER inside /opt/nusantarasoft-3 (or via
# deploy.ps1 over SSH). Always updates to branch master-production.
#
#   export DEPLOY_GIT_URL='git@github.com:nusantarasoft/nusantarasoft-3.git'
#   # or: export GITHUB_TOKEN='ghp_...'   (HTTPS)
#   bash scripts/master-production/pull-on-server.sh
#
# Env:
#   DEPLOY_GIT_URL   clone/fetch URL (SSH deploy key or HTTPS+token)
#   GITHUB_TOKEN     optional; builds HTTPS URL if DEPLOY_GIT_URL unset
#   REMOTE_DIR       default /opt/nusantarasoft-3
#   BRANCH           default master-production (do not change for go-live)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
set -euo pipefail

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
  echo "ERROR: set DEPLOY_GIT_URL (or GITHUB_TOKEN) â€” server has no git remote yet." >&2
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
    # Prefer moving to avoid double disk use; fall back to copy.
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
}

if [[ -d "$REMOTE_DIR/.git" ]]; then
  echo "==> git repo found â€” fetch + hard reset to origin/$BRANCH"
  cd "$REMOTE_DIR"
  git remote set-url origin "$URL"
  git fetch --prune origin "$BRANCH"
  git checkout -B "$BRANCH" "origin/$BRANCH"
  git reset --hard "origin/$BRANCH"
  git clean -fd --exclude=.env.master-production --exclude=volumes/db/data --exclude=volumes/storage
else
  echo "==> no .git under $REMOTE_DIR â€” cloning $BRANCH (bootstrap)"
  TMP="${REMOTE_DIR}.pull-tmp.$$"
  BAK="${REMOTE_DIR}.bak.$(date +%Y%m%d%H%M%S)"
  rm -rf "$TMP"
  git clone --branch "$BRANCH" --single-branch "$URL" "$TMP"
  if [[ -d "$REMOTE_DIR" ]]; then
    preserve_runtime "$REMOTE_DIR" "$TMP"
    echo "    moving old tree aside â†’ $BAK"
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
  echo "WARNING: .env.master-production missing on server â€” create it before redeploy." >&2
fi
