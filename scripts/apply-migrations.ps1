# Apply SQL migrations with schema_migrations tracking.
# Usage:
#   .\scripts\apply-migrations.ps1              # core manifest
#   .\scripts\apply-migrations.ps1 -Manifest modules
#   .\scripts\apply-migrations.ps1 -DryRun

param(
    [ValidateSet('core', 'modules', 'seeds')]
    [string] $Manifest = 'core',
    [switch] $DryRun,
    [string] $Container = 'postgres',
    [string] $DbUser = 'supabase_admin',
    [string] $Database = ''
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $RepoRoot '.env'
$ManifestFile = Join-Path $RepoRoot "supabase/manifest.$Manifest.txt"

if (-not (Test-Path $ManifestFile)) {
    Write-Error "Manifest not found: $ManifestFile"
}

if (-not $Database -and (Test-Path $EnvFile)) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*POSTGRES_DB=(.*)$') { $Database = $matches[1].Trim() }
    }
}
if (-not $Database) { $Database = 'nusantarasoft' }

function Test-DockerContainer {
    param([string] $Name)
    $null -ne (docker ps --filter "name=^/${Name}$" --format '{{.Names}}' 2>$null)
}

if (-not (Test-DockerContainer $Container)) {
    Write-Error "Container '$Container' is not running. Start the stack first (docker compose up -d postgres)."
}

function Get-AppliedMigrations {
    $check = docker exec $Container psql -U $DbUser -d $Database -tAc `
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schema_migrations');" 2>$null
    if ($check.Trim() -ne 't') { return @{} }
    $rows = docker exec $Container psql -U $DbUser -d $Database -tAc 'SELECT id FROM public.schema_migrations;' 2>$null
    $map = @{}
    foreach ($line in ($rows -split "`n")) {
        $id = $line.Trim()
        if ($id) { $map[$id] = $true }
    }
    return $map
}

function Invoke-SqlFile {
    param([string] $Path)
    $full = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $RepoRoot $Path }
    if (-not (Test-Path $full)) {
        Write-Error "SQL file not found: $full"
    }
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = Get-Content $full -Raw | docker exec -i $Container psql -U $DbUser -d $Database -v ON_ERROR_STOP=1 2>&1
        $exit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevEap
    }
    foreach ($line in @($output)) {
        if ($line -match '^ERROR:') { Write-Host $line -ForegroundColor Red }
        elseif ($line -notmatch '^NOTICE:') { Write-Host $line }
    }
    if ($exit -ne 0) {
        throw "psql failed for $Path (exit $exit)"
    }
}

function Register-Migration {
    param([string] $Id)
    $escaped = $Id.Replace("'", "''")
    docker exec $Container psql -U $DbUser -d $Database -c `
        "INSERT INTO public.schema_migrations (id) VALUES ('$escaped') ON CONFLICT (id) DO NOTHING;" | Out-Null
}

$lines = Get-Content $ManifestFile | Where-Object {
    $_ -and -not ($_.Trim().StartsWith('#'))
}

$applied = Get-AppliedMigrations
$pending = @()
$skipped = @()

foreach ($rel in $lines) {
    $id = $rel.Trim().Replace('\', '/')
    if ($applied.ContainsKey($id)) {
        $skipped += $id
        continue
    }
    $pending += $id
}

Write-Host "Manifest: $Manifest ($ManifestFile)"
Write-Host "Database: $Database @ container $Container (user $DbUser)"
Write-Host "Skipped (already applied): $($skipped.Count)"
Write-Host "Pending: $($pending.Count)"

if ($DryRun) {
    foreach ($p in $pending) { Write-Host "  [dry-run] $p" }
    exit 0
}

if ($pending.Count -eq 0) {
    Write-Host 'Nothing to apply.'
    exit 0
}

foreach ($rel in $pending) {
    Write-Host "`n==> Applying: $rel"
    try {
        Invoke-SqlFile -Path $rel
        Register-Migration -Id $rel
        Write-Host "    OK"
    } catch {
        Write-Error "Failed on $rel : $_"
    }
}

Write-Host "`nReloading PostgREST..."
if (Test-DockerContainer 'supabase-rest') {
    docker restart supabase-rest | Out-Null
    Write-Host 'Restarted supabase-rest'
} else {
    Write-Host 'supabase-rest not running — NOTIFY already sent if 999_reload_postgrest.sql ran'
}

Write-Host "`nDone. Applied $($pending.Count) migration(s)."
