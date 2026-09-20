#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# prune-nsoft3-images.sh — free disk from unused NusantaraSoft images only.
#
# Safe on co-hosted servers (Portainer / pustaka / andromedia / … stay untouched):
#   - Never `docker system prune -a` / never wipe unrelated repos
#   - Never remove an image ID still used by ANY container
#   - Targets: compose project label nsoft3-prod, repo prefix nsoft3/*,
#     and unused nousresearch/hermes-agent tags (only if unused everywhere)
#
# Usage (on server):
#   bash scripts/master-production/prune-nsoft3-images.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

echo "==> [prune] disk before"
df -h / | awk 'NR==1 || /\/$/'
docker system df 2>/dev/null || true

echo "==> [prune] unused images labeled com.docker.compose.project=nsoft3-prod"
# -a = unused (not just dangling <none>); filter keeps other stacks safe
docker image prune -af --filter "label=com.docker.compose.project=nsoft3-prod" 2>/dev/null || true

echo "==> [prune] unused nsoft3/* repository images"
# Collect short IDs currently referenced by any container (running or stopped).
in_use_file="$(mktemp)"
trap 'rm -f "$in_use_file"' EXIT
{
  docker ps -aq | while read -r cid; do
    [[ -z "$cid" ]] && continue
    docker inspect --format '{{.Image}}' "$cid" 2>/dev/null || true
  done
} | sed 's/^sha256://' | cut -c1-12 | sort -u >"$in_use_file"

removed=0
kept=0
while read -r id repo tag; do
  [[ -z "$id" ]] && continue
  ref="${repo}:${tag}"
  case "$repo" in
    nsoft3/*) ;;
    *) continue ;;
  esac
  if grep -qx "$id" "$in_use_file" 2>/dev/null; then
    echo "    keep  $ref ($id)"
    kept=$((kept + 1))
    continue
  fi
  # ancestor filter catches containers that store full Image ID
  if [[ -n "$(docker ps -aq --filter "ancestor=${id}" 2>/dev/null || true)" ]]; then
    echo "    keep  $ref ($id) — ancestor in use"
    kept=$((kept + 1))
    continue
  fi
  echo "    remove $ref ($id)"
  if docker rmi "$id" 2>/dev/null; then
    removed=$((removed + 1))
  else
    echo "    skip   $ref (busy or already gone)"
  fi
done < <(docker images --format '{{.ID}} {{.Repository}} {{.Tag}}' | awk '$2 ~ /^nsoft3\//')

echo "==> [prune] unused hermes-agent tags (only if unused by any container)"
while read -r id repo tag; do
  [[ -z "$id" ]] && continue
  [[ "$repo" == "nousresearch/hermes-agent" ]] || continue
  ref="${repo}:${tag}"
  if grep -qx "$id" "$in_use_file" 2>/dev/null; then
    echo "    keep  $ref ($id)"
    continue
  fi
  if [[ -n "$(docker ps -aq --filter "ancestor=${id}" 2>/dev/null || true)" ]]; then
    echo "    keep  $ref ($id) — ancestor in use"
    continue
  fi
  echo "    remove $ref ($id)"
  docker rmi "$id" 2>/dev/null || echo "    skip   $ref"
done < <(docker images --format '{{.ID}} {{.Repository}} {{.Tag}}' | awk '$2=="nousresearch/hermes-agent"')

echo "==> [prune] dangling images with nsoft3-prod label (if any remain)"
docker image prune -f --filter "label=com.docker.compose.project=nsoft3-prod" 2>/dev/null || true

echo "==> [prune] done (removed≈${removed}, kept nsoft3≈${kept})"
echo "==> [prune] disk after"
df -h / | awk 'NR==1 || /\/$/'
docker system df 2>/dev/null || true
