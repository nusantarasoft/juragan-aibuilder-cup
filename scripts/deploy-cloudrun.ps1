<#
.SYNOPSIS
    Prepares Google Cloud APIs, Artifact Registry, and submits Cloud Build to deploy
    `nusantarasoft-middleware` and `nusantarasoft-admin` to Google Cloud Run.

.EXAMPLE
    .\scripts\deploy-cloudrun.ps1 -ProjectId "my-gcp-project" -Region "asia-southeast2"
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [string]$Region = "asia-southeast2",
    [string]$ArRepo = "nusantarasoft",
    [string]$SupabaseUrl = "https://your-project.supabase.co",
    [string]$SupabaseAnonKey = "replace-with-anon-key",
    [string]$SupabaseServiceKey = "replace-with-service-role-key"
)

$ErrorActionPreference = "Stop"

Write-Host "==> 1. Setting active GCP project to $ProjectId..." -ForegroundColor Cyan
gcloud config set project $ProjectId

Write-Host "==> 2. Enabling required Google Cloud APIs (Cloud Run, Cloud Build, Artifact Registry)..." -ForegroundColor Cyan
gcloud services enable `
    run.googleapis.com `
    cloudbuild.googleapis.com `
    artifactregistry.googleapis.com `
    secretmanager.googleapis.com

Write-Host "==> 3. Ensuring Artifact Registry repository '$ArRepo' exists in $Region..." -ForegroundColor Cyan
$repoExists = gcloud artifacts repositories describe $ArRepo --location=$Region 2>$null
if (-not $repoExists) {
    gcloud artifacts repositories create $ArRepo `
        --repository-format=docker `
        --location=$Region `
        --description="NusantaraSoft Cloud Run container images"
}

Write-Host "==> 4. Submitting Cloud Build (cloudbuild.yaml) to build & deploy middleware + admin..." -ForegroundColor Cyan
$shortSha = (git rev-parse --short HEAD 2>$null)
if (-not $shortSha) { $shortSha = "manual" }

gcloud builds submit --config=cloudbuild.yaml `
    --substitutions="_REGION=$Region,_AR_REPO=$ArRepo,SHORT_SHA=$shortSha,_SUPABASE_URL=$SupabaseUrl,_NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl,_NEXT_PUBLIC_SUPABASE_ANON_KEY=$SupabaseAnonKey,_SUPABASE_SERVICE_KEY=$SupabaseServiceKey"

Write-Host "==> Done! Cloud Run services deployed:" -ForegroundColor Green
gcloud run services list --region=$Region
