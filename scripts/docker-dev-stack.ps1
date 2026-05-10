<#!
  Start the smallest set of Docker services from docker-compose.yml so that:
  - Admin (npm run dev) and Middleware (npm run start:dev) on the host work against
    Supabase API (Kong :8000), Postgres, GoTrue, PostgREST, and MinIO (:9000).

  Does NOT start: admin, middleware, supabase-studio, pooler, edge functions, etc.

  If uploads fail with ECONNREFUSED on port 9000, MinIO is down — run this script or
  `docker compose up -d minio minio-createbucket`. The compose file sets MinIO to restart unless stopped.

  Usage (from repo root):
    .\scripts\docker-dev-stack.ps1
    .\scripts\docker-dev-stack.ps1 -WithRealtime   # add Realtime WebSocket/API
    .\scripts\docker-dev-stack.ps1 -WithStorage  # add Storage API + imgproxy (Supabase Storage routes)
#>
param(
    [switch] $WithRealtime,
    [switch] $WithStorage
)

$ErrorActionPreference = "Stop"
# PSScriptRoot = ...\scripts  →  repo root is parent
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root "docker-compose.yml"))) {
    Write-Error "docker-compose.yml not found under $root"
    exit 1
}

Set-Location $root

$services = @(
    "postgres",
    "analytics",
    "kong",
    "auth",
    "rest",
    "minio",
    "minio-createbucket"
)

if ($WithRealtime) {
    $services += "realtime"
}

if ($WithStorage) {
    $services += @("imgproxy", "storage")
}

Write-Host "Starting: $($services -join ', ')" -ForegroundColor Cyan
docker compose up -d $services

Write-Host ""
Write-Host "Host dev URLs (see .env / .env.local):" -ForegroundColor Green
Write-Host "  Kong (Supabase API): http://localhost:<KONG_HTTP_PORT from .env, often 8000>"
Write-Host "  MinIO:               http://localhost:9000"
Write-Host "  Run admin/middleware on host; stop their containers if ports 3003/4001 conflict:"
Write-Host "    docker compose stop admin middleware"
