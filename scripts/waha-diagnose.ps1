# Diagnose WAHA + Studio WhatsApp integration (Windows dev)
$ErrorActionPreference = "Continue"
$wahaPort = $env:WAHA_HOST_PORT
$key = $env:WAHA_API_KEY
$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if (-not $key -and $_ -match '^\s*WAHA_API_KEY=(.+)$') { $key = $matches[1].Trim() }
        if (-not $wahaPort -and $_ -match '^\s*WAHA_HOST_PORT=(.+)$') { $wahaPort = $matches[1].Trim() }
    }
}
if (-not $wahaPort) { $wahaPort = "3010" }
$wahaBase = "http://localhost:$wahaPort"
$h = @{ "X-Api-Key" = $key }

Write-Host "=== WAHA session ($wahaBase) ===" -ForegroundColor Cyan
try {
    $s = (Invoke-WebRequest -Uri "$wahaBase/api/sessions/default" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
    Write-Host "status:" $s.status
    if ($s.me.id) { Write-Host "business (chat TO this number):" ($s.me.id -replace '@.*','') }
    if ($s.status -ne "WORKING") {
        Write-Host "BLOCKER: Scan QR at $wahaBase/dashboard until WORKING" -ForegroundColor Red
    }
} catch { Write-Host "WAHA unreachable:" $_.Exception.Message -ForegroundColor Red }

Write-Host "`n=== Docker WAHA webhook ===" -ForegroundColor Cyan
$hookUrl = docker exec waha printenv WHATSAPP_HOOK_URL 2>$null
Write-Host "WHATSAPP_HOOK_URL:" $hookUrl
if ($hookUrl -match '^(https?)://([^:/]+)(?::(\d+))?') {
    $hookHost = $matches[2]
    $hookPort = if ($matches[3]) { $matches[3] } else { if ($matches[1] -eq 'https') { '443' } else { '80' } }
    $probe = "http://${hookHost}:${hookPort}/webhooks/health"
    $code = docker exec waha curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 $probe 2>$null
    if ($code -eq "200") {
        Write-Host "WAHA container -> middleware host: OK ($probe)" -ForegroundColor Green
    } else {
        Write-Host "BLOCKER: WAHA container cannot reach middleware at $hookHost`:$hookPort (HTTP $code)" -ForegroundColor Red
        Write-Host "  Fix: set WHATSAPP_HOOK_URL in .env to http://<LAN-IP>:4001/... then docker compose up -d waha --force-recreate" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Middleware webhook test ===" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:4001/api/studio/whatsapp/webhook" -Method POST `
        -ContentType "application/json" `
        -Body '{"event":"message","session":"default","payload":{"from":"6280000000001@c.us","body":"diagnose","fromMe":false}}' `
        -UseBasicParsing -TimeoutSec 60
    Write-Host "webhook:" $r.Content
} catch { Write-Host "middleware:" $_.Exception.Message -ForegroundColor Red }

Write-Host "`n=== DB config ===" -ForegroundColor Cyan
docker exec postgres psql -U supabase_admin -d nusantarasoft -t -c "SELECT enabled, notebook_id FROM studio_whatsapp_config WHERE tenant_id='default';"

Write-Host "`n=== Recent WA sessions in DB ===" -ForegroundColor Cyan
docker exec postgres psql -U supabase_admin -d nusantarasoft -c "SELECT chat_id, phone, last_message_at FROM studio_whatsapp_sessions ORDER BY last_message_at DESC LIMIT 5;"
