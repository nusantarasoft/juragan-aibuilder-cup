<#
.SYNOPSIS
    Install the Hermes plugins into the local Docker volume and restart Hermes.

.DESCRIPTION
    volumes/hermes is bind-mounted to /opt/data in the hermes container, and
    Hermes loads plugins from /opt/data/plugins. That directory is gitignored,
    so a fresh clone runs Hermes with no plugins at all - no kasir pipe, no
    tools. This is the local mirror of the sync step in
    scripts/master-production/deploy-hermes-purge.py.

.PARAMETER Plugin
    Install only the named plugin(s). Default: every plugin in the source tree.

.PARAMETER NoRestart
    Copy the files but leave the container alone. Hermes only picks up plugin
    changes on restart, so use this when batching several edits.

.EXAMPLE
    ./scripts/hermes-plugins-local.ps1
    ./scripts/hermes-plugins-local.ps1 -Plugin kasir-probe
#>
[CmdletBinding()]
param(
    [string[]]$Plugin,
    [switch]$NoRestart
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'scripts/master-production/hermes-plugins'
$target = Join-Path $root 'volumes/hermes/plugins'

if (-not (Test-Path $source)) {
    throw "Plugin source tree not found: $source"
}

$available = Get-ChildItem -Path $source -Directory | Select-Object -ExpandProperty Name
if ($Plugin) {
    $unknown = $Plugin | Where-Object { $available -notcontains $_ }
    if ($unknown) {
        throw "Unknown plugin(s): $($unknown -join ', '). Available: $($available -join ', ')"
    }
    $selected = $Plugin
} else {
    $selected = $available
}

New-Item -ItemType Directory -Force -Path $target | Out-Null

foreach ($name in $selected) {
    $from = Join-Path $source $name
    $to = Join-Path $target $name
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    Copy-Item -Path (Join-Path $from '*') -Destination $to -Recurse -Force
    # Host bytecode is useless to the Linux container and only confuses a
    # `docker exec ls` when debugging which files actually shipped.
    Get-ChildItem -Path $to -Directory -Recurse -Filter '__pycache__' |
        Remove-Item -Recurse -Force
    Write-Host "installed $name -> volumes/hermes/plugins/$name"
}

if ($NoRestart) {
    Write-Host 'skipped restart (-NoRestart); Hermes loads plugins only on start'
    return
}

Push-Location $root
try {
    docker compose restart hermes
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose restart hermes failed (exit $LASTEXITCODE)"
    }
} finally {
    Pop-Location
}

Write-Host ''
Write-Host 'Verify the plugins loaded:'
Write-Host '  docker logs hermes --tail 80 | Select-String "kasir-"'
