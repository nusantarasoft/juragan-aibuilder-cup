#!/usr/bin/env bash
set -euo pipefail

# ═════════════════════════════════════════════════════════════════════════════
# Deploy Juragan (3 Cloud Run services) via Cloud Build
# Service map:
#   juragan-api ← middleware/ · juragan ← admin/
#   juragan-showcase ← brochure-gallery/
# Out of scope: juragan-landing / landing-page/ (not deployed)
# Deps (Supabase / S3 / Hermes / Kong) stay on VPS nusantarasoft — set URLs below.
#
# Usage:
#   ./scripts/deploy-cloudrun.sh [GCP_PROJECT_ID] [REGION]
# Defaults: PROJECT_ID=juragan-aibuilder-cup · REGION=asia-southeast2
#
# Secrets: create in Secret Manager first (see docs/deploy-cloud-run.md).
# This script passes non-secret URLs only — keys via --set-secrets in cloudbuild.
# Optional WA HMAC: export SECRET_WA_HMAC=whatsapp-webhook-hmac-key
# AR repo name may stay `nusantarasoft`.
# ═════════════════════════════════════════════════════════════════════════════

PROJECT_ID="${1:-juragan-aibuilder-cup}"
REGION="${2:-asia-southeast2}"
AR_REPO="${AR_REPO:-nusantarasoft}"
# Point at VPS / public endpoints — placeholders only in this script
SUPABASE_URL="${SUPABASE_URL:-https://your-supabase-or-vps-kong.example}"
S3_ENDPOINT="${S3_ENDPOINT:-https://your-vps-s3-or-gcs.example}"
S3_BUCKET="${S3_BUCKET:-cms-media}"
S3_REGION="${S3_REGION:-asia-southeast2}"
HERMES_BASE_URL="${HERMES_BASE_URL:-https://hermes.your-vps.example}"
# Optional: set to whatsapp-webhook-hmac-key to attach HMAC secret on juragan-api
SECRET_WA_HMAC="${SECRET_WA_HMAC:-}"

echo "==> 1. Setting active GCP project to ${PROJECT_ID}..."
gcloud config set project "${PROJECT_ID}"

echo "==> 2. Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

echo "==> 3. Ensuring Artifact Registry repository '${AR_REPO}' exists in ${REGION}..."
echo "    (AR repo name '${AR_REPO}' may remain the legacy 'nusantarasoft' brand.)"
if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Juragan Cloud Run images (AR repo may keep legacy nusantarasoft name)"
fi

echo "==> 3b. Secret Manager prerequisite (required before deploy):"
echo "    Expect secrets: supabase-anon-key, supabase-service-key, s3-access-key, s3-secret-key"
if [ -n "${SECRET_WA_HMAC}" ]; then
  echo "    Optional WA HMAC secret enabled: ${SECRET_WA_HMAC}"
fi
echo "    Create + IAM: see docs/deploy-cloud-run.md (Akbar fills values from VPS)."
for SECRET_ID in supabase-anon-key supabase-service-key s3-access-key s3-secret-key; do
  if gcloud secrets describe "${SECRET_ID}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "    OK: secret '${SECRET_ID}' exists"
  else
    echo "    MISSING: secret '${SECRET_ID}' — create before deploy (docs/deploy-cloud-run.md)"
  fi
done
if [ -n "${SECRET_WA_HMAC}" ]; then
  if gcloud secrets describe "${SECRET_WA_HMAC}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "    OK: secret '${SECRET_WA_HMAC}' exists"
  else
    echo "    MISSING: secret '${SECRET_WA_HMAC}' — create before deploy with WA HMAC"
  fi
fi

SHORT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"

SUBS="_REGION=${REGION},_AR_REPO=${AR_REPO},_IMAGE_TAG=${SHORT_SHA}"
SUBS="${SUBS},_SUPABASE_URL=${SUPABASE_URL},_NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}"
SUBS="${SUBS},_S3_ENDPOINT=${S3_ENDPOINT},_S3_BUCKET=${S3_BUCKET},_S3_REGION=${S3_REGION}"
SUBS="${SUBS},_HERMES_BASE_URL=${HERMES_BASE_URL}"
if [ -n "${SECRET_WA_HMAC}" ]; then
  SUBS="${SUBS},_SECRET_WA_HMAC=${SECRET_WA_HMAC}"
fi

echo "==> 4. Submitting Cloud Build (cloudbuild.yaml) → juragan-api, juragan, juragan-showcase..."
echo "    Substitutions are URLs/names only; sensitive keys come from Secret Manager --set-secrets."
gcloud builds submit --config=cloudbuild.yaml --substitutions="${SUBS}"

echo "==> Done! Cloud Run services in ${REGION} (expect: juragan, juragan-api, juragan-showcase):"
gcloud run services list --region="${REGION}"
