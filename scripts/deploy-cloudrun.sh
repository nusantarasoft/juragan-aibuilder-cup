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
# Secrets: do not pass real service-role / S3 keys on the CLI if avoidable.
# Create Secret Manager secrets and wire --set-secrets in cloudbuild.yaml
# (see docs/deploy-cloud-run.md). AR repo name may stay `nusantarasoft`.
# ═════════════════════════════════════════════════════════════════════════════

PROJECT_ID="${1:-juragan-aibuilder-cup}"
REGION="${2:-asia-southeast2}"
AR_REPO="${AR_REPO:-nusantarasoft}"
# Point at VPS / public endpoints — placeholders only in this script
SUPABASE_URL="${SUPABASE_URL:-https://your-supabase-or-vps-kong.example}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-replace-with-anon-key}"
S3_ENDPOINT="${S3_ENDPOINT:-https://your-vps-s3-or-gcs.example}"
S3_BUCKET="${S3_BUCKET:-cms-media}"
HERMES_BASE_URL="${HERMES_BASE_URL:-https://hermes.your-vps.example}"

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

SHORT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"

echo "==> 4. Submitting Cloud Build (cloudbuild.yaml) → juragan-api, juragan, juragan-showcase..."
echo "    Sensitive keys should already live in Secret Manager; this submit passes URLs + public anon only."
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions="_REGION=${REGION},_AR_REPO=${AR_REPO},_IMAGE_TAG=${SHORT_SHA},_SUPABASE_URL=${SUPABASE_URL},_NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL},_NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY},_S3_ENDPOINT=${S3_ENDPOINT},_S3_BUCKET=${S3_BUCKET},_HERMES_BASE_URL=${HERMES_BASE_URL}"

echo "==> Done! Cloud Run services in ${REGION} (expect: juragan, juragan-api, juragan-showcase):"
gcloud run services list --region="${REGION}"
