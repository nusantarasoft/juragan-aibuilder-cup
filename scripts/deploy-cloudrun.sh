#!/usr/bin/env bash
set -euo pipefail

# ═════════════════════════════════════════════════════════════════════════════
# Deploy NusantaraSoft (middleware + admin) to Google Cloud Run via Cloud Build
# Usage:
#   ./scripts/deploy-cloudrun.sh <GCP_PROJECT_ID> [REGION]
# ═════════════════════════════════════════════════════════════════════════════

PROJECT_ID="${1:?Usage: ./scripts/deploy-cloudrun.sh <GCP_PROJECT_ID> [REGION]}"
REGION="${2:-asia-southeast2}"
AR_REPO="${AR_REPO:-nusantarasoft}"
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-replace-with-anon-key}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-replace-with-service-role-key}"

echo "==> 1. Setting active GCP project to ${PROJECT_ID}..."
gcloud config set project "${PROJECT_ID}"

echo "==> 2. Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

echo "==> 3. Ensuring Artifact Registry repository '${AR_REPO}' exists in ${REGION}..."
if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="NusantaraSoft Cloud Run container images"
fi

SHORT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"

echo "==> 4. Submitting Cloud Build (cloudbuild.yaml)..."
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions="_REGION=${REGION},_AR_REPO=${AR_REPO},SHORT_SHA=${SHORT_SHA},_SUPABASE_URL=${SUPABASE_URL},_NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL},_NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY},_SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}"

echo "==> Done! Cloud Run services in ${REGION}:"
gcloud run services list --region="${REGION}"
