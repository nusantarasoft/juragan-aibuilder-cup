<#
  deploy.ps1 - merge master into master-production, push, git-pull on the server,
  then (re)deploy the stack.

  Run from the repo root on the Windows dev machine:

      $env:SSH_HOST="31.97.66.39"; $env:SSH_USER="root"; $env:SSH_PASS="********"
      # one of these so the server can read the private repo:
      $env:DEPLOY_GIT_URL="git@github.com:nusantarasoft/nusantarasoft-3.git"
      # or: $env:GITHUB_TOKEN="ghp_..."
      powershell -ExecutionPolicy Bypass -File scripts/master-production/deploy.ps1

  What it does:
    1. Checks out master-production and merges latest master into it, then
       pushes origin/master-production.
    2. Uploads stdin-safe pull-on-server logic + triggers one detached server job:
       Hermes backup, git fetch/reset to target SHA, then redeploy.sh (build + smoke).
       SSH is only used to upload, start the job, and poll status/tail.

  Local git: preflight aborts if the working tree is dirty (lists paths). No reset/clean.
  Sync with origin uses fast-forward only when clean.

  Optional switches:
      -SkipMerge   skip the local git merge (still pulls whatever is on origin)
      -SkipPush    merge locally but do not push (server pull will not see new commits)
      -AllowDirty  skip all local git sync; server still deploys origin/master-production
                   (never discards local changes)
      -Attach      skip local git + pull; tail the in-flight server redeploy log until done
      -Status      skip local git + pull; print remote redeploy status + exit code if finished

  Server pull + redeploy run as one detached job (setsid/nohup) with logs under
  /opt/nusantarasoft-3/logs/deploy-YYYYMMDD-HHMMSS.log so Mac sleep / SSH drop
  does not kill git fetch or docker builds. Re-run with -Attach or -Status to reconnect.
  Polling uses short SSH capture calls with retries.

  Requires: Python 3 with paramiko  (pip install paramiko)
            Server git auth via deploy key (DEPLOY_GIT_URL=git@...) or GITHUB_TOKEN
#>
param(
  [switch]$SkipMerge,
  [switch]$SkipPush,
  [switch]$AllowDirty,
  [switch]$Attach,
  [switch]$Status
)

$ErrorActionPreference = "Continue"
# Prefer explicit exit-code checks for git/python; stderr progress must not abort.
foreach ($v in "SSH_HOST","SSH_USER","SSH_PASS") {
  if (-not [Environment]::GetEnvironmentVariable($v)) { throw "Env var $v is required" }
}

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw ("git " + ($GitArgs -join " ") + " failed with exit $LASTEXITCODE")
  }
}

$repo       = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ssh        = Join-Path $PSScriptRoot "_ssh.py"
$pullSh     = Join-Path $PSScriptRoot "pull-on-server.sh"
$remoteDir  = "/opt/nusantarasoft-3"
$branch     = "master-production"
$detachedSh = "scripts/master-production/redeploy-detached.sh"

. (Join-Path $PSScriptRoot "_deploy-local-git.ps1")

function Parse-DeployKeyValues {
  param([string]$Text)
  $map = @{}
  foreach ($line in ($Text -split "`n")) {
    $t = $line.Trim()
    if ($t -match '^([A-Z_]+)=(.*)$') { $map[$Matches[1]] = $Matches[2] }
  }
  return $map
}

function Invoke-SshCapture {
  param([Parameter(Mandatory)][string]$RemoteCmd)
  $prevTimeout = $env:SSH_TIMEOUT
  $env:SSH_TIMEOUT = "120"
  $out = & python $ssh capture $RemoteCmd 2>&1
  $code = $LASTEXITCODE
  if ($null -ne $prevTimeout) { $env:SSH_TIMEOUT = $prevTimeout }
  else { Remove-Item Env:SSH_TIMEOUT -ErrorAction SilentlyContinue }
  return @{ ExitCode = $code; Text = ($out | Out-String) }
}

function Invoke-SshCaptureWithRetry {
  param(
    [Parameter(Mandatory)][string]$RemoteCmd,
    [int]$MaxAttempts = 5
  )
  $last = $null
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $last = Invoke-SshCapture $RemoteCmd
    if ($last.ExitCode -eq 0 -or $last.ExitCode -eq 2) {
      return $last
    }
    if ($attempt -lt $MaxAttempts) {
      $delay = [Math]::Min(30, 2 * $attempt)
      Write-Warning "SSH capture failed (exit $($last.ExitCode)); retry $attempt/$MaxAttempts in ${delay}s"
      Start-Sleep -Seconds $delay
    }
  }
  return $last
}

function Invoke-SshPutWithRetry {
  param(
    [Parameter(Mandatory)][string]$LocalPath,
    [Parameter(Mandatory)][string]$RemotePath,
    [int]$MaxAttempts = 5
  )
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    & python $ssh put $LocalPath $RemotePath
    if ($LASTEXITCODE -eq 0) { return }
    if ($attempt -lt $MaxAttempts) {
      $delay = [Math]::Min(30, 2 * $attempt)
      Write-Warning "SFTP upload failed; retry $attempt/$MaxAttempts in ${delay}s"
      Start-Sleep -Seconds $delay
    }
  }
  throw "SFTP upload failed after $MaxAttempts attempts: $LocalPath -> $RemotePath"
}

function Get-RemoteDeployStatus {
  $cmd = "cd $remoteDir && bash $detachedSh status"
  $r = Invoke-SshCaptureWithRetry $cmd
  $kv = Parse-DeployKeyValues $r.Text
  return @{
    SshExit   = $r.ExitCode
    Raw       = $r.Text
    Status    = $kv["STATUS"]
    Log       = $kv["LOG"]
    Pid       = $kv["PID"]
    Exit      = $kv["EXIT"]
    Started   = $kv["STARTED"]
  }
}

function Write-RemoteDeployTail {
  param(
    [string]$LogPath,
    [ref]$ByteOffset
  )
  if (-not $LogPath) { return }
  $off = [int]$ByteOffset.Value
  $escaped = $LogPath.Replace("'", "'\''")
  $cmd = "cd $remoteDir && bash $detachedSh tail-since '$escaped' $off"
  $r = Invoke-SshCaptureWithRetry $cmd
  $lines = $r.Text -split "`n"
  $newOff = $off
  $bodyLines = @()
  foreach ($line in $lines) {
    if ($line -match '^OFFSET=(\d+)$') {
      $newOff = [int]$Matches[1]
    } else {
      $bodyLines += $line
    }
  }
  if ($bodyLines.Count -gt 0) {
    $chunk = ($bodyLines -join "`n")
    if ($chunk.Length -gt 0) { Write-Host $chunk }
  }
  $ByteOffset.Value = $newOff
}

function Wait-RemoteDeploy {
  param([switch]$StatusOnly)

  $offset = 0
  $pollSec = 10
  while ($true) {
    $st = Get-RemoteDeployStatus
    if (-not $StatusOnly) {
      Write-RemoteDeployTail -LogPath $st.Log -ByteOffset ([ref]$offset)
    }

    switch ($st.Status) {
      "done" {
        $ec = 0
        if ($st.Exit -match '^\d+$') { $ec = [int]$st.Exit }
        Write-Host "==> remote redeploy finished (exit $ec) log: $($st.Log)" -ForegroundColor $(if ($ec -eq 0) { "Green" } else { "Red" })
        if ($StatusOnly) {
          Write-Host $st.Raw.TrimEnd()
        }
        if ($ec -ne 0) { exit $ec }
        return
      }
      "failed" {
        Write-Host $st.Raw.TrimEnd()
        $ec = 1
        if ($st.Exit -match '^\d+$') { $ec = [int]$st.Exit }
        throw "remote redeploy failed (exit $ec). log: $($st.Log)"
      }
      "idle" {
        throw "no remote redeploy in progress (idle). Start a normal deploy.ps1 run first."
      }
      "running" {
        if ($StatusOnly) {
          Write-Host $st.Raw.TrimEnd()
          Write-Host "==> redeploy still running (pid $($st.Pid)) log: $($st.Log)" -ForegroundColor Yellow
          exit 0
        }
        Start-Sleep -Seconds $pollSec
      }
      default {
        Write-Host $st.Raw.TrimEnd()
        throw "unexpected remote deploy status: $($st.Status)"
      }
    }
  }
}

function Start-RemoteDeployDetached {
  param([Parameter(Mandatory)][string]$RemotePullScript)

  $detachedLocal = Join-Path $PSScriptRoot "redeploy-detached.sh"
  $remoteDetached = "$remoteDir/scripts/master-production/redeploy-detached.sh"
  Invoke-SshPutWithRetry -LocalPath $detachedLocal -RemotePath $remoteDetached

  $escapedPull = $RemotePullScript.Replace("'", "'\''")
  $cmd = "cd $remoteDir && bash $detachedSh start '$escapedPull'"
  $r = Invoke-SshCaptureWithRetry $cmd
  if ($r.ExitCode -eq 2) {
    Write-Host $r.Text.TrimEnd()
    throw "concurrent deploy blocked by lock — use -Attach or -Status instead of starting another deploy."
  }
  if ($r.ExitCode -ne 0) {
    Write-Host $r.Text.TrimEnd()
    throw "failed to start detached deploy on server."
  }
  $kv = Parse-DeployKeyValues $r.Text
  Write-Host "    detached pid=$($kv['PID']) log=$($kv['LOG'])" -ForegroundColor DarkGray
  Wait-RemoteDeploy
}

Set-Location $repo

if ($Attach -and $Status) {
  throw "Use -Attach or -Status, not both."
}

if ($Attach) {
  Write-Host "==> attach remote redeploy (log tail until done)" -ForegroundColor Cyan
  Wait-RemoteDeploy
  Write-Host "==> deploy finished ($branch)." -ForegroundColor Green
  exit 0
}

if ($Status) {
  Write-Host "==> remote redeploy status" -ForegroundColor Cyan
  Wait-RemoteDeploy -StatusOnly
  exit $LASTEXITCODE
}

if (-not (Test-Path $pullSh)) {
  throw "Missing $pullSh"
}

$preflight = Test-DeployLocalPreflight -AllowDirty:$AllowDirty
if ($null -eq $preflight) { exit 1 }
$localTreeClean = [bool]$preflight

function Get-DeployGitUrl {
  if ($env:DEPLOY_GIT_URL) { return $env:DEPLOY_GIT_URL.Trim() }

  $origin = (git remote get-url origin).Trim()
  if ($env:GITHUB_TOKEN) {
    if ($origin -match 'github\.com[:/](.+?)(?:\.git)?\s*$') {
      $path = $Matches[1]
      return "https://x-access-token:$($env:GITHUB_TOKEN)@github.com/$path.git"
    }
    throw "GITHUB_TOKEN is set but origin is not a github.com URL: $origin"
  }
  # Fall back to origin as-is (works if the server already has deploy key / credential helper).
  return $origin
}

function Mask-GitUrl([string]$url) {
  return [regex]::Replace($url, '(://[^:]+:)[^@]+@', '${1}***@')
}

$skipLocalGit = (-not $localTreeClean) -or $AllowDirty

if (-not $SkipMerge -and -not $skipLocalGit) {
  Write-Host "==> [1/3] merge master -> $branch" -ForegroundColor Cyan

  Invoke-Git fetch origin master $branch

  Sync-DeployLocalBranchFastForward -Branch $branch -InvokeGit ${function:Invoke-Git}

  $mergeSource = "master"
  git rev-parse --verify origin/master 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $mergeSource = "origin/master" }

  Write-Host "    merging $mergeSource into $branch"
  try {
    Invoke-Git merge $mergeSource --no-edit
  } catch {
    throw "Merge from $mergeSource failed (resolve conflicts, then re-run deploy)."
  }

  if (-not $SkipPush) {
    git remote get-url origin 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No origin remote - cannot push $branch." }
    Write-Host "    pushing $branch to origin"
    Invoke-Git push -u origin $branch
  } else {
    Write-Warning "-SkipPush: server pull will not include unpushed local commits."
  }
} elseif ($SkipMerge -and -not $skipLocalGit) {
  Write-Host "==> [1/3] skip merge (-SkipMerge)" -ForegroundColor Yellow
  if (-not $SkipPush) {
    $current = (git rev-parse --abbrev-ref HEAD).Trim()
    if ($current -ne $branch) {
      throw "On branch '$current' with -SkipMerge; checkout $branch first or pass -SkipPush."
    }
    Write-Host "    pushing current $branch to origin"
    Invoke-Git push origin $branch
  }
} else {
  if ($AllowDirty -or -not $localTreeClean) {
    Write-Host "==> [1/3] skip local git (-AllowDirty / dirty tree)" -ForegroundColor Yellow
  } else {
    Write-Host "==> [1/3] skip merge (-SkipMerge)" -ForegroundColor Yellow
  }
}

$deployUrl = Get-DeployGitUrl
Write-Host "==> [2/3] server git pull + redeploy (detached, SSH-safe)" -ForegroundColor Cyan
Write-Host "    remote: $(Mask-GitUrl $deployUrl)"

Invoke-Git fetch origin $branch
$targetSha = (git rev-parse "origin/$branch").Trim()
if (-not $targetSha) {
  throw "Could not resolve origin/$branch for deploy target SHA."
}
Write-Host "    target SHA: $($targetSha.Substring(0, [Math]::Min(12, $targetSha.Length)))"

$urlEscaped = $deployUrl.Replace("'", "'\''")
$shaEscaped = $targetSha.Replace("'", "'\''")
$pullBody = [System.IO.File]::ReadAllText($pullSh) -replace "`r`n", "`n" -replace "`r", "`n"
# Concatenate so bash `$vars` inside pull-on-server.sh are NOT expanded by PowerShell.
$header = (
  "set -euo pipefail`n" +
  "export BRANCH='$branch'`n" +
  "export REMOTE_DIR='$remoteDir'`n" +
  "export DEPLOY_GIT_URL='$urlEscaped'`n" +
  "export TARGET_SHA='$shaEscaped'`n`n"
)
$footer = (
  "`n" +
  "CUR=`$(git -C '$remoteDir' rev-parse --abbrev-ref HEAD)`n" +
  "test `"`$CUR`" = '$branch' || { echo `"ERROR: server on `$CUR, expected $branch`" >&2; exit 1; }`n" +
  "HEAD=`$(git -C '$remoteDir' rev-parse HEAD)`n" +
  "test `"`$HEAD`" = '$shaEscaped' || { echo `"ERROR: server at `$HEAD, expected $shaEscaped`" >&2; exit 1; }`n" +
  "echo `"server branch OK: `$CUR at `$(git -C '$remoteDir' rev-parse --short HEAD)`"`n"
)
$remoteScript = $header + $pullBody + $footer

$pullFile = Join-Path $env:TEMP "nsoft3-pull-on-server.sh"
[System.IO.File]::WriteAllText($pullFile, ($remoteScript -replace "`r`n", "`n" -replace "`r", "`n"))

$localTs = Get-Date -Format "yyyyMMdd-HHmmss"
$remotePull = "$remoteDir/logs/.deploy-pull-$localTs.sh"
Write-Host "    uploading pull script -> $remotePull"
Invoke-SshPutWithRetry -LocalPath $pullFile -RemotePath $remotePull

Write-Host "==> [3/3] trigger detached full deploy on server" -ForegroundColor Cyan
Start-RemoteDeployDetached -RemotePullScript $remotePull

Write-Host "==> deploy finished ($branch)." -ForegroundColor Green
