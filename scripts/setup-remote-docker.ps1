# ============================================================================
# Setup Remote Docker Context
# Run this on your LOCAL device to enable remote Docker management
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$RemoteIP
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Remote Docker Context Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get remote IP from parameter, .env file, or prompt
if (-not $RemoteIP) {
    $envFile = Join-Path $PSScriptRoot "..\.env"
    if (Test-Path $envFile) {
        $match = Select-String -Path $envFile -Pattern "^REMOTE_HOST_IP=(.+)$"
        if ($match) {
            $RemoteIP = $match.Matches[0].Groups[1].Value.Trim()
            if ($RemoteIP -ne "192.168.x.x") {
                Write-Host "Found REMOTE_HOST_IP in .env: $RemoteIP" -ForegroundColor Green
            } else {
                $RemoteIP = $null
            }
        }
    }
}

if (-not $RemoteIP) {
    $RemoteIP = Read-Host "Enter the remote device IP address (e.g. 192.168.1.100)"
}

Write-Host ""
Write-Host "[1/3] Testing connectivity to $RemoteIP`:2375..." -ForegroundColor Yellow

try {
    $result = Test-NetConnection -ComputerName $RemoteIP -Port 2375 -WarningAction SilentlyContinue
    if ($result.TcpTestSucceeded) {
        Write-Host "  OK - Port 2375 is reachable" -ForegroundColor Green
    } else {
        Write-Host "  FAILED - Cannot reach port 2375 on $RemoteIP" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Make sure on the REMOTE device:" -ForegroundColor Yellow
        Write-Host "    1. Docker Desktop is running" -ForegroundColor Yellow
        Write-Host "    2. Settings > General > 'Expose daemon on tcp://localhost:2375' is CHECKED" -ForegroundColor Yellow
        Write-Host "    3. Windows Firewall allows inbound TCP 2375" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host "  ERROR - $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/3] Creating Docker context 'remote'..." -ForegroundColor Yellow

# Remove existing context if present
docker context rm remote 2>$null | Out-Null
docker context create remote --docker "host=tcp://${RemoteIP}:2375"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Context 'remote' created" -ForegroundColor Green
} else {
    Write-Host "  FAILED - Could not create context" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[3/3] Verifying remote Docker connection..." -ForegroundColor Yellow

$info = docker --context remote info --format "{{.Name}}" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Connected to remote Docker: $info" -ForegroundColor Green
} else {
    Write-Host "  FAILED - $info" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Available contexts:" -ForegroundColor Cyan
docker context ls
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  # Manage LOCAL containers:" -ForegroundColor White
Write-Host '  docker compose -f docker-compose.local.yml up -d' -ForegroundColor Gray
Write-Host ""
Write-Host "  # Manage REMOTE containers (from this device):" -ForegroundColor White
Write-Host '  docker --context remote compose -f docker-compose.remote.yml up -d' -ForegroundColor Gray
Write-Host '  docker --context remote compose -f docker-compose.remote.yml ps' -ForegroundColor Gray
Write-Host '  docker --context remote compose -f docker-compose.remote.yml logs ragflow' -ForegroundColor Gray
Write-Host ""
