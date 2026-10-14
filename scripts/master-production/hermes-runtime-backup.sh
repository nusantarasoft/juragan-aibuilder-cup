#!/usr/bin/env bash
# Hermes runtime tar backup helpers (sourced by pull-on-server.sh).
# Does not stop Hermes, chown, or mutate live volumes/hermes except read + sqlite3 .backup.

HERMES_BACKUP_RETRIES="${HERMES_BACKUP_RETRIES:-3}"
HERMES_BACKUP_RETRY_DELAY="${HERMES_BACKUP_RETRY_DELAY:-2}"

# Accept tar exit 0, or exit 1 when stderr mentions "file changed as we read it".
hermes_tar_exit_acceptable() {
  local code="$1"
  local err_file="${2:-}"
  if [[ "$code" -eq 0 ]]; then
    return 0
  fi
  if [[ "$code" -eq 1 && -n "$err_file" && -f "$err_file" ]]; then
    if grep -q 'file changed as we read it' "$err_file"; then
      return 0
    fi
  fi
  return 1
}

hermes_backup_sqlite_snapshots() {
  local hermes_dir="$1"
  local staging_hermes="$2"
  command -v sqlite3 >/dev/null 2>&1 || return 0
  local db rel snap
  while IFS= read -r -d '' db; do
    rel="${db#"$hermes_dir"/}"
    rel="${rel#/}"
    [[ -n "$rel" ]] || continue
    snap="$staging_hermes/$rel"
    mkdir -p "$(dirname "$snap")"
    sqlite3 "$db" ".backup '$snap'" 2>/dev/null || true
  done < <(find "$hermes_dir" -type f -name '*.db' -print0 2>/dev/null || true)
}

# Snapshot copy then tar (avoids tar reading live mutating tree).
hermes_backup_via_staging() {
  local hermes_dir="$1"
  local archive="$2"
  local staging err_file tar_code
  staging="$(mktemp -d "${TMPDIR:-/tmp}/hermes-backup-staging.XXXXXX")"
  err_file="$(mktemp)"
  mkdir -p "$staging/hermes"
  if ! cp -a "$hermes_dir/." "$staging/hermes/"; then
    rm -rf "$staging"
    rm -f "$err_file"
    return 1
  fi
  hermes_backup_sqlite_snapshots "$hermes_dir" "$staging/hermes"
  tar_code=0
  tar -czf "$archive" -C "$staging" hermes 2>"$err_file" || tar_code=$?
  rm -rf "$staging"
  if hermes_tar_exit_acceptable "$tar_code" "$err_file"; then
    if [[ "$tar_code" -eq 1 ]]; then
      echo "WARNING: Hermes staging backup tar exit 1 (file changed) — archive kept; deploy continues." >&2
    fi
    rm -f "$err_file"
    return 0
  fi
  [[ -s "$err_file" ]] && cat "$err_file" >&2
  rm -f "$err_file" "$archive"
  return 1
}

# Direct tar on live volume (fallback); exit 1 + "file changed" is non-fatal.
hermes_backup_direct_tar() {
  local hermes_dir="$1"
  local archive="$2"
  local parent name err_file tar_code
  parent="$(dirname "$hermes_dir")"
  name="$(basename "$hermes_dir")"
  err_file="$(mktemp)"
  tar_code=0
  tar -czf "$archive" -C "$parent" "$name" 2>"$err_file" || tar_code=$?
  if hermes_tar_exit_acceptable "$tar_code" "$err_file"; then
    if [[ "$tar_code" -eq 1 ]]; then
      echo "WARNING: Hermes live tar exit 1 (file changed as we read it) — archive kept; deploy continues." >&2
    fi
    rm -f "$err_file"
    return 0
  fi
  [[ -s "$err_file" ]] && cat "$err_file" >&2
  rm -f "$err_file" "$archive"
  return 1
}

# One attempt: staging first, then direct tar.
hermes_backup_runtime_once() {
  local hermes_dir="$1"
  local archive="$2"
  if hermes_backup_via_staging "$hermes_dir" "$archive"; then
    return 0
  fi
  echo "    Hermes staging backup failed — trying direct tar on live volume" >&2
  hermes_backup_direct_tar "$hermes_dir" "$archive"
}

hermes_backup_runtime_with_retries() {
  local hermes_dir="$1"
  local archive="$2"
  local attempt=1
  while [[ "$attempt" -le "$HERMES_BACKUP_RETRIES" ]]; do
    if hermes_backup_runtime_once "$hermes_dir" "$archive"; then
      return 0
    fi
    if [[ "$attempt" -lt "$HERMES_BACKUP_RETRIES" ]]; then
      echo "    Hermes backup attempt $attempt/$HERMES_BACKUP_RETRIES failed — retry in ${HERMES_BACKUP_RETRY_DELAY}s" >&2
      sleep "$HERMES_BACKUP_RETRY_DELAY"
    fi
    attempt=$(( attempt + 1 ))
  done
  echo "ERROR: Hermes runtime backup failed after $HERMES_BACKUP_RETRIES attempt(s)." >&2
  return 1
}
