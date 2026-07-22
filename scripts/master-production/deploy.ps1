<#
  deploy.ps1 - merge master → master-production, push, git-pull on the server,
  then (re)deploy the stack.

  Run from the repo root on the Windows dev machine:

      $env:SSH_HOST="31.97.66.39"; $env:SSH_USER="root"; $env:SSH_PASS="********"
      # one of these so the server can read the private repo:
      $env:DEPLOY_GIT_URL="git@github.com:spygunpro/nusantarasoft-3.git"
      # or: $env:GITHUB_TOKEN="ghp_..."
      powershell -ExecutionPolicy Bypass -File scripts/master-production/deploy.ps1

  What it does:
    1. Checks out master-production and merges latest master into it, then
       pushes origin/master-production.
    2. On the server: git fetch/checkout/reset to master-production
       (bootstraps a clone if /opt/nusantarasoft-3 is not a git repo yet,
       while preserving .env.master-production + DB/storage volumes).
    3. Runs scripts/master-production/redeploy.sh (serial build + up + migrations).

  Optional switches:
      -SkipMerge   skip the local git merge (still pulls whatever is on origin)
      -SkipPush    merge locally but do not push (server pull will not see new commits)

  Requires: Python 3 with paramiko  (pip install paramiko)
            Server git auth via deploy key (DEPLOY_GIT_URL=git@...) or GITHUB_TOKEN
#>
param(
  [switch]$SkipMerge,
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

foreach ($v in "SSH_HOST","SSH_USER","SSH_PASS") {
  if (-not [Environment]::GetEnvironmentVariable($v)) { throw "Env var $v is required" }
}

$repo       = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ssh        = Join-Path $PSScriptRoot "_ssh.py"
$pullSh     = Join-Path $PSScriptRoot "pull-on-server.sh"
$remoteDir  = "/opt/nusantarasoft-3"
$branch     = "master-production"

Set-Location $repo

if (-not (Test-Path $pullSh)) {
  throw "Missing $pullSh"
}

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

if (-not $SkipMerge) {
  Write-Host "==> [1/3] merge master → $branch" -ForegroundColor Cyan

  $dirty = git status --porcelain
  if ($dirty) {
    throw "Working tree is dirty. Commit or stash changes before deploy, or pass -SkipMerge."
  }

  git fetch origin master $branch 2>$null | Out-Null

  $current = (git rev-parse --abbrev-ref HEAD).Trim()
  if ($current -ne $branch) {
    Write-Host "    checking out $branch (was on $current)"
    git checkout $branch
    if ($LASTEXITCODE -ne 0) { throw "git checkout $branch failed" }
  }

  $mergeSource = "master"
  git rev-parse --verify origin/master 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $mergeSource = "origin/master" }

  Write-Host "    merging $mergeSource into $branch"
  git merge $mergeSource --no-edit
  if ($LASTEXITCODE -ne 0) {
    throw "Merge from $mergeSource failed (resolve conflicts, then re-run deploy)."
  }

  if (-not $SkipPush) {
    git remote get-url origin 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No origin remote — cannot push $branch." }
    Write-Host "    pushing $branch to origin"
    git push -u origin $branch
    if ($LASTEXITCODE -ne 0) { throw "git push origin $branch failed." }
  } else {
    Write-Warning "-SkipPush: server pull will not include unpushed local commits."
  }
} else {
  Write-Host "==> [1/3] skip merge (-SkipMerge)" -ForegroundColor Yellow
  if (-not $SkipPush) {
    $current = (git rev-parse --abbrev-ref HEAD).Trim()
    if ($current -ne $branch) {
      throw "On branch '$current' with -SkipMerge; checkout $branch first or pass -SkipPush."
    }
    Write-Host "    pushing current $branch to origin"
    git push origin $branch
    if ($LASTEXITCODE -ne 0) { throw "git push origin $branch failed." }
  }
}

$deployUrl = Get-DeployGitUrl
Write-Host "==> [2/3] server git pull ($branch)" -ForegroundColor Cyan
Write-Host "    remote: $(Mask-GitUrl $deployUrl)"

$urlEscaped = $deployUrl.Replace("'", "'\''")
$pullBody = [System.IO.File]::ReadAllText($pullSh) -replace "`r`n", "`n" -replace "`r", "`n"
# Concatenate so bash `$vars` inside pull-on-server.sh are NOT expanded by PowerShell.
$header = (
  "set -euo pipefail`n" +
  "export BRANCH='$branch'`n" +
  "export REMOTE_DIR='$remoteDir'`n" +
  "export DEPLOY_GIT_URL='$urlEscaped'`n`n"
)
$footer = @'

CUR=$(git -C '__REMOTE_DIR__' rev-parse --abbrev-ref HEAD)
test "$CUR" = '__BRANCH__' || { echo "ERROR: server on $CUR, expected __BRANCH__" >&2; exit 1; }
echo "server branch OK: $CUR @ $(git -C '__REMOTE_DIR__' rev-parse --short HEAD)"
'@
$footer = $footer.Replace('__REMOTE_DIR__', $remoteDir).Replace('__BRANCH__', $branch) -replace "`r`n", "`n"
$remoteScript = $header + $pullBody + $footer

$pullFile = Join-Path $env:TEMP "nsoft3-pull-on-server.sh"
[System.IO.File]::WriteAllText($pullFile, ($remoteScript -replace "`r`n", "`n" -replace "`r", "`n"))
python $ssh script $pullFile
if ($LASTEXITCODE -ne 0) {
  throw "server git pull failed (set DEPLOY_GIT_URL=git@... with deploy key, or GITHUB_TOKEN)."
}

Write-Host "==> [3/3] running redeploy.sh on server (build + up)" -ForegroundColor Cyan
$env:SSH_TIMEOUT = "3600"
$redeployCmd = 'cd {0} && test "$(git rev-parse --abbrev-ref HEAD)" = {1} && bash scripts/master-production/redeploy.sh' -f $remoteDir, $branch
python $ssh run $redeployCmd
if ($LASTEXITCODE -ne 0) { throw "redeploy.sh failed." }

Write-Host "==> deploy finished ($branch)." -ForegroundColor Green
