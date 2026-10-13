<#
  Local git safety for deploy.ps1 (dev machine / Mac / Windows).

  - Never git reset --hard, checkout -f, or clean on the local repo.
  - Abort before any local sync when the working tree is not clean (unless -AllowDirty).
  - When clean, update the local branch with fast-forward only.
#>

function Get-DeployLocalWorkingTreeEntries {
  $entries = @()
  $porcelain = @(git status --porcelain 2>$null)
  foreach ($line in $porcelain) {
    if (-not $line -or $line.Length -lt 4) { continue }
    $code = $line.Substring(0, 2)
    $path = $line.Substring(3)
    if ($path -match '^"(.+)"$') { $path = $Matches[1] }
    $kind = switch -Regex ($code) {
      '\?\?' { 'untracked' }
      'D' { 'deleted' }
      default { 'tracked' }
    }
    $entries += [PSCustomObject]@{
      Kind = $kind
      Code = $code.Trim()
      Path = $path
    }
  }
  return ,$entries
}

function Test-DeployLocalWorkingTreeClean {
  $entries = Get-DeployLocalWorkingTreeEntries
  return ($entries.Count -eq 0)
}

function Write-DeployLocalWorkingTreeAbort {
  param([array]$Entries)
  [Console]::Error.WriteLine("ERROR: Local deploy aborted — working tree is not clean.")
  [Console]::Error.WriteLine("Commit, revert, or use a separate git worktree. Deploy never auto-stashes or discards local changes.")
  [Console]::Error.WriteLine("To redeploy the server without touching local git, pass -AllowDirty (still never discards files).")
  [Console]::Error.WriteLine("")
  [Console]::Error.WriteLine("Dirty paths:")
  foreach ($e in ($Entries | Sort-Object Kind, Path)) {
    $label = switch ($e.Kind) {
      'untracked' { 'untracked' }
      default { "tracked ($($e.Code))" }
    }
    [Console]::Error.WriteLine("  - [$label] $($e.Path)")
  }
}

# Returns $true (clean), $false (dirty + AllowDirty), $null (dirty + abort).
function Test-DeployLocalPreflight {
  param([switch]$AllowDirty)

  $entries = Get-DeployLocalWorkingTreeEntries
  if ($entries.Count -eq 0) { return $true }

  if ($AllowDirty) {
    Write-Warning "Working tree is dirty; -AllowDirty skips all local git sync (server deploy only)."
    return $false
  }

  Write-DeployLocalWorkingTreeAbort -Entries $entries
  return $null
}

function Sync-DeployLocalBranchFastForward {
  param(
    [Parameter(Mandatory = $true)][string]$Branch,
    [scriptblock]$InvokeGit
  )

  & $InvokeGit fetch origin $Branch
  $current = (git rev-parse --abbrev-ref HEAD).Trim()
  if ($current -ne $Branch) {
    Write-Host "    checking out $Branch (was on $current)"
    & $InvokeGit checkout $Branch
  }

  git rev-parse --verify "origin/$Branch" 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "origin/$Branch not found after fetch."
  }

  $localHead = (git rev-parse HEAD).Trim()
  $remoteHead = (git rev-parse "origin/$Branch").Trim()
  if ($localHead -eq $remoteHead) {
    Write-Host "    local $Branch already matches origin/$Branch"
    return
  }

  git merge-base --is-ancestor $localHead $remoteHead 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "    fast-forward $Branch to origin/$Branch"
    & $InvokeGit merge --ff-only "origin/$Branch"
    return
  }

  throw (
    "Local $Branch has diverged from origin/$Branch (fast-forward only). " +
    "Reconcile manually (merge/rebase in a clean worktree), then re-run deploy."
  )
}
