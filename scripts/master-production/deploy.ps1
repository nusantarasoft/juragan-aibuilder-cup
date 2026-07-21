<#
  deploy.ps1 - package this repo, upload it to the server, and (re)deploy the
  master-production stack. Run from the repo root on the Windows dev machine:

      $env:SSH_HOST="31.97.66.39"; $env:SSH_USER="root"; $env:SSH_PASS="********"
      powershell -ExecutionPolicy Bypass -File scripts/master-production/deploy.ps1

  What it does:
    1. Stages the source (excludes node_modules/.next/.git/db data) and tars it.
    2. Uploads the tarball + .env.master-production over SFTP.
    3. Extracts into /opt/nusantarasoft-3 on the server.
    4. Runs scripts/master-production/redeploy.sh (serial build + up + db init).

  Requires: Python 3 with paramiko  (pip install paramiko)
#>
$ErrorActionPreference = "Stop"

foreach ($v in "SSH_HOST","SSH_USER","SSH_PASS") {
  if (-not [Environment]::GetEnvironmentVariable($v)) { throw "Env var $v is required" }
}

# repo root = two levels up from this script
$repo   = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ssh    = Join-Path $PSScriptRoot "_ssh.py"
$stage  = Join-Path $env:TEMP "nsoft3-stage"
$tar    = Join-Path $env:TEMP "nsoft3.tar.gz"
$remoteDir = "/opt/nusantarasoft-3"

Write-Host "==> [1/4] staging source (excluding heavy dirs)" -ForegroundColor Cyan
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
robocopy $repo $stage /E /XD node_modules .next .git dist build coverage .turbo /XF *.tar.gz /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
foreach ($d in @("volumes\db\data","volumes\storage")) {
  $p = Join-Path $stage $d
  if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}
if (-not (Test-Path (Join-Path $stage ".env.master-production"))) {
  Write-Warning ".env.master-production not found locally - the server must already have it."
}

Write-Host "==> [2/4] creating tarball" -ForegroundColor Cyan
if (Test-Path $tar) { Remove-Item $tar -Force }
tar -czf $tar -C $stage .

Write-Host "==> [3/4] uploading + extracting on server" -ForegroundColor Cyan
python $ssh put $tar "/root/nsoft3.tar.gz"
$extract = @"
set -e
mkdir -p $remoteDir
tar -xzf /root/nsoft3.tar.gz -C $remoteDir
rm -f /root/nsoft3.tar.gz
echo extracted to $remoteDir
"@
$extractFile = Join-Path $env:TEMP "nsoft3-extract.sh"
Set-Content -Path $extractFile -Value $extract -NoNewline
python $ssh script $extractFile

Write-Host "==> [4/4] running redeploy.sh on server (build + up)" -ForegroundColor Cyan
$env:SSH_TIMEOUT = "3600"
python $ssh run "cd $remoteDir && bash scripts/master-production/redeploy.sh"

Write-Host "==> deploy finished." -ForegroundColor Green
