# Free ports 3003 (admin) and 4001 (middleware) so host dev servers can bind.
# Infra (postgres, kong, minio, ...) should stay running: docker compose up -d

$ErrorActionPreference = "Continue"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Stopping Docker services admin + middleware (if running)..." -ForegroundColor Cyan
docker compose stop admin middleware 2>$null

Write-Host ""
Write-Host "Next steps (two terminals):" -ForegroundColor Green
Write-Host "  1. Middleware:  cd middleware; copy .env.local.example .env.local; npm run start:dev"
Write-Host "  2. Admin:       cd admin;       copy .env.local.example .env.local; fill keys in .env.local; npm run dev"
Write-Host ""
Write-Host "Ensure Kong (e.g. localhost:8000) and MinIO (localhost:9000) are up from Docker compose." -ForegroundColor Yellow
