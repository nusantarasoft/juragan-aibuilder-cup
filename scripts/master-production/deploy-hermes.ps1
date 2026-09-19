<#
  deploy-hermes.ps1 — pull master-production on server + up Hermes only (no app rebuild).

  $env:SSH_HOST="31.97.66.39"; $env:SSH_USER="root"; $env:SSH_PASS="********"
  powershell -ExecutionPolicy Bypass -File scripts/master-production/deploy-hermes.ps1
#>
$ErrorActionPreference = "Stop"
foreach ($v in "SSH_HOST","SSH_USER","SSH_PASS") {
  if (-not [Environment]::GetEnvironmentVariable($v)) { throw "Env var $v is required" }
}

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ssh  = Join-Path $PSScriptRoot "_ssh.py"
$remoteDir = "/opt/nusantarasoft-3"

Set-Location $repo
$env:PYTHONIOENCODING = "utf-8"

Write-Host "==> [1/2] git pull master-production on server" -ForegroundColor Cyan
$pull = @"
set -euo pipefail
cd $remoteDir
git fetch origin master-production
git checkout master-production
git reset --hard origin/master-production
echo PULLED=\$(git rev-parse --short HEAD)
"@
$pullFile = Join-Path $env:TEMP "nsoft3-hermes-pull.sh"
[System.IO.File]::WriteAllText($pullFile, ($pull -replace "`r`n","`n"))
python $ssh script $pullFile
if ($LASTEXITCODE -ne 0) { throw "git pull on server failed ($LASTEXITCODE)" }

Write-Host "==> [2/2] up-hermes.sh on server" -ForegroundColor Cyan
python $ssh run "cd $remoteDir && bash scripts/master-production/up-hermes.sh"
if ($LASTEXITCODE -ne 0) { throw "up-hermes.sh failed ($LASTEXITCODE)" }

Write-Host "DONE — Hermes Phase 1 up. Pair test number next (docs/aistudio/umkm-wa/system/hermes-local.md)." -ForegroundColor Green
