<#
.SYNOPSIS
    Prepares Google Cloud APIs, Artifact Registry, and submits Cloud Build to deploy
    four Juragan Cloud Run services:
      juragan-api ← middleware/ · juragan ← admin/
      juragan-landing ← landing-page/ · juragan-showcase ← brochure-gallery/
    Deps (Supabase / S3 / Hermes / Kong) stay on VPS nusantarasoft.
    Artifact Registry repo may keep the legacy name `nusantarasoft`.

.EXAMPLE
    .\scripts\deploy-cloudrun.ps1 -ProjectId "juragan-aibuilder-cup" -Region "asia-southeast2"
#>

param(
    [string]$ProjectId = "juragan-aibuilder-cup",

    [string]$Region = "asia-southeast2",
    [string]$ArRepo = "nusantarasoft",
    # Point at VPS / public endpoints — placeholders only
    [string]$SupabaseUrl = "https://your-supabase-or-vps-kong.example",
    [string]$SupabaseAnonKey = "replace-with-anon-key",
    [string]$S3Endpoint = "https://your-vps-s3-or-gcs.example",
    [string]$S3Bucket = "cms-media",
    [string]$HermesBaseUrl = "https://hermes.your-vps.example"
)

$ErrorActionPreference = "Stop"

Write-Host "==> 1. Setting active GCP project to $ProjectId..." -ForegroundColor Cyan
gcloud config set project $ProjectId

Write-Host "==> 2. Enabling required Google Cloud APIs (Cloud Run, Cloud Build, Artifact Registry, Secret Manager)..." -ForegroundColor Cyan
gcloud services enable `
    run.googleapis.com `
    cloudbuild.googleapis.com `
    artifactregistry.googleapis.com `
    secretmanager.googleapis.com

Write-Host "==> 3. Ensuring Artifact Registry repository '$ArRepo' exists in $Region..." -ForegroundColor Cyan
Write-Host "    (AR repo name may remain legacy 'nusantarasoft'.)" -ForegroundColor DarkGray
$repoExists = gcloud artifacts repositories describe $ArRepo --location=$Region 2>$null
if (-not $repoExists) {
    gcloud artifacts repositories create $ArRepo `
        --repository-format=docker `
        --location=$Region `
        --description="Juragan Cloud Run images (AR repo may keep legacy nusantarasoft name)"
}

Write-Host "==> 4. Submitting Cloud Build → juragan-api, juragan, juragan-landing, juragan-showcase..." -ForegroundColor Cyan
Write-Host "    Prefer Secret Manager for service-role / S3 keys (see docs/deploy-cloud-run.md)." -ForegroundColor DarkGray
$shortSha = (git rev-parse --short HEAD 2>$null)
if (-not $shortSha) { $shortSha = "manual" }

gcloud builds submit --config=cloudbuild.yaml `
    --substitutions="_REGION=$Region,_AR_REPO=$ArRepo,_IMAGE_TAG=$shortSha,_SUPABASE_URL=$SupabaseUrl,_NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl,_NEXT_PUBLIC_SUPABASE_ANON_KEY=$SupabaseAnonKey,_S3_ENDPOINT=$S3Endpoint,_S3_BUCKET=$S3Bucket,_HERMES_BASE_URL=$HermesBaseUrl"

Write-Host "==> Done! Cloud Run services (expect juragan*):" -ForegroundColor Green
gcloud run services list --region=$Region
