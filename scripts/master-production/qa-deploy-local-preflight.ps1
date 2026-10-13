<#
  QA harness for local deploy preflight (_deploy-local-git.ps1).
  Run from repo root: pwsh -File scripts/master-production/qa-deploy-local-preflight.ps1
#>
$ErrorActionPreference = "Stop"

$module = Join-Path $PSScriptRoot "_deploy-local-git.ps1"
. $module

$failures = 0
function Assert-Test {
  param([string]$Name, [scriptblock]$Body)
  try {
    & $Body
    Write-Host "PASS  $Name" -ForegroundColor Green
  } catch {
    Write-Host "FAIL  $Name — $($_.Exception.Message)" -ForegroundColor Red
    $script:failures++
  }
}

function New-TempRepo {
  $dir = Join-Path ([System.IO.Path]::GetTempPath()) ("nsoft3-deploy-qa-" + [guid]::NewGuid().ToString("n"))
  New-Item -ItemType Directory -Path $dir | Out-Null
  Push-Location $dir
  git init -q
  git config user.email "qa@test.local"
  git config user.name "QA"
  "base" | Out-File -Encoding utf8 readme.txt
  git add readme.txt
  git commit -q -m "init"
  return $dir
}

function Remove-TempRepo([string]$Dir) {
  Pop-Location
  Remove-Item -Recurse -Force $Dir
}

Assert-Test "dirty tracked change aborts with file list" {
  $dir = New-TempRepo
  try {
    "dirty" | Out-File -Encoding utf8 readme.txt
    $entries = Get-DeployLocalWorkingTreeEntries
    if ($entries.Count -lt 1) { throw "expected dirty entries" }
    $paths = ($entries | ForEach-Object { $_.Path }) -join ","
    if ($paths -notmatch "readme") { throw "missing readme in list: $paths" }
    $result = Test-DeployLocalPreflight
    if ($null -ne $result) { throw "expected abort (`$null), got $result" }
  } finally {
    Remove-TempRepo $dir
  }
}

Assert-Test "untracked non-ignored file aborts" {
  $dir = New-TempRepo
  try {
    "secret" | Out-File -Encoding utf8 untracked-local.txt
    $entries = Get-DeployLocalWorkingTreeEntries
    $ut = @($entries | Where-Object { $_.Kind -eq 'untracked' })
    if ($ut.Count -ne 1) { throw "expected 1 untracked, got $($ut.Count)" }
    $result = Test-DeployLocalPreflight
    if ($null -ne $result) { throw "expected abort, got $result" }
  } finally {
    Remove-TempRepo $dir
  }
}

Assert-Test "clean tree passes preflight" {
  $dir = New-TempRepo
  try {
    if (-not (Test-DeployLocalWorkingTreeClean)) { throw "tree should be clean" }
    $result = Test-DeployLocalPreflight
    if ($result -ne $true) { throw "expected `$true, got $result" }
  } finally {
    Remove-TempRepo $dir
  }
}

Assert-Test "-AllowDirty does not modify dirty files" {
  $dir = New-TempRepo
  try {
    "keep-me" | Out-File -Encoding utf8 local-edit.txt
    git add local-edit.txt
    $before = Get-Content local-edit.txt -Raw
    $result = Test-DeployLocalPreflight -AllowDirty
    if ($result -ne $false) { throw "AllowDirty should return `$false when dirty, got $result" }
    $after = Get-Content local-edit.txt -Raw
    if ($before -ne $after) { throw "file content changed" }
    if (-not (Test-Path local-edit.txt)) { throw "file was removed" }
  } finally {
    Remove-TempRepo $dir
  }
}

Assert-Test "deploy.ps1 parses (syntax)" {
  $deploy = Join-Path $PSScriptRoot "deploy.ps1"
  $tokens = $null
  $errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($deploy, [ref]$tokens, [ref]$errors)
  if ($errors -and $errors.Count -gt 0) {
    throw ($errors | ForEach-Object { $_.ToString() } | Out-String)
  }
}

Write-Host ""
if ($failures -gt 0) {
  Write-Host "qa-deploy-local-preflight: FAILED ($failures)" -ForegroundColor Red
  exit 1
}
Write-Host "qa-deploy-local-preflight: OK" -ForegroundColor Green
exit 0
