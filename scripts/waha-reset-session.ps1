# Reset WAHA session volume + recreate container (fixes stuck SCAN_QR_CODE on WEBJS)
# Run from repo root: .\scripts\waha-reset-session.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "Stopping WAHA..." -ForegroundColor Cyan
docker compose stop waha
docker rm -f waha 2>$null

Write-Host "Removing session volume (re-pair required)..." -ForegroundColor Yellow
docker volume ls -q | ForEach-Object {
    if ($_ -match "waha-sessions") {
        docker volume rm $_ 2>$null
    }
}

Write-Host "Pulling latest WAHA image..." -ForegroundColor Cyan
docker compose pull waha

Write-Host "Starting WAHA (engine WEBJS from .env)..." -ForegroundColor Cyan
docker compose up -d waha --force-recreate

Write-Host ""
Write-Host "Done. Next steps:" -ForegroundColor Green
$wahaPort = "3010"
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*WAHA_HOST_PORT=(.+)$') { $wahaPort = $matches[1].Trim() }
    }
}
Write-Host "  1. Open http://localhost:$wahaPort/dashboard"
Write-Host "  2. Connect server (API URL + WAHA_API_KEY from .env)"
Write-Host "  3. Start session 'default' and scan QR with WhatsApp BISNIS (6281110115321)"
Write-Host "  4. Wait until status WORKING (not SCAN_QR_CODE)"
Write-Host "  5. Test chat from another phone to 6281110115321"
