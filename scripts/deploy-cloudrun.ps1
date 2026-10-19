<#
.SYNOPSIS
    Prepares Google Cloud APIs, Artifact Registry, and submits Cloud Build to deploy
    three Juragan Cloud Run services:
      juragan-api ← middleware/ · juragan ← admin/
      juragan-showcase ← brochure-gallery/
    Out of scope: juragan-landing / landing-page/ (not deployed).
    Deps (Supabase / S3 / Hermes / Kong) stay on VPS nusantarasoft.
    Sensitive keys come from Secret Manager (--set-secrets in cloudbuild.yaml);
    this script only passes non-secret URLs. See docs/deploy-cloud-run.md.
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
    [string]$S3Endpoint = "https://your-vps-s3-or-gcs.example",
    [string]$S3Bucket = "cms-media",
    [string]$S3Region = "asia-southeast2",
    [string]$HermesBaseUrl = "https://hermes.your-vps.example",
    # Optional: set to whatsapp-webhook-hmac-key to attach HMAC on juragan-api
    [string]$SecretWaHmac = ""
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

Write-Host "==> 3b. Secret Manager prerequisite (required before deploy):" -ForegroundColor Cyan
Write-Host "    Expect: supabase-anon-key, supabase-service-key, s3-access-key, s3-secret-key" -ForegroundColor DarkGray
Write-Host "    Create + IAM: docs/deploy-cloud-run.md (values from VPS — do not invent)." -ForegroundColor DarkGray
foreach ($secretId in @("supabase-anon-key", "supabase-service-key", "s3-access-key", "s3-secret-key")) {
    gcloud secrets describe $secretId --project=$ProjectId 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    OK: secret '$secretId' exists" -ForegroundColor DarkGray
    } else {
        Write-Host "    MISSING: secret '$secretId' — create before deploy" -ForegroundColor Yellow
    }
}
if ($SecretWaHmac) {
    gcloud secrets describe $SecretWaHmac --project=$ProjectId 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    OK: secret '$SecretWaHmac' exists" -ForegroundColor DarkGray
    } else {
        Write-Host "    MISSING: secret '$SecretWaHmac' — create before deploy with WA HMAC" -ForegroundColor Yellow
    }
}

Write-Host "==> 4. Submitting Cloud Build → juragan-api, juragan, juragan-showcase..." -ForegroundColor Cyan
Write-Host "    Substitutions are URLs/names only; keys via Secret Manager --set-secrets." -ForegroundColor DarkGray
$shortSha = (git rev-parse --short HEAD 2>$null)
if (-not $shortSha) { $shortSha = "manual" }

$subs = "_REGION=$Region,_AR_REPO=$ArRepo,_IMAGE_TAG=$shortSha,_SUPABASE_URL=$SupabaseUrl,_NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl,_S3_ENDPOINT=$S3Endpoint,_S3_BUCKET=$S3Bucket,_S3_REGION=$S3Region,_HERMES_BASE_URL=$HermesBaseUrl"
if ($SecretWaHmac) {
    $subs = "$subs,_SECRET_WA_HMAC=$SecretWaHmac"
}

gcloud builds submit --config=cloudbuild.yaml --substitutions=$subs

Write-Host "==> Done! Cloud Run services (expect juragan, juragan-api, juragan-showcase):" -ForegroundColor Green
gcloud run services list --region=$Region
