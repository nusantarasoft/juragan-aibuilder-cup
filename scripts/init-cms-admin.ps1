# Idempotent CMS super-admin bootstrap (Supabase Auth + user_profiles)
# Usage: .\scripts\init-cms-admin.ps1
# Reads SERVICE_ROLE_KEY from repo root .env

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $RepoRoot ".env"

if (-not (Test-Path $EnvFile)) {
    Write-Error ".env not found at $EnvFile"
}

$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$ServiceKey = $envVars["SERVICE_ROLE_KEY"]
$KongUrl = if ($envVars["API_EXTERNAL_URL"]) { $envVars["API_EXTERNAL_URL"] } else { "http://localhost:8000" }
$Email = if ($env:CMS_ADMIN_EMAIL) { $env:CMS_ADMIN_EMAIL } else { "admin@nusantarasoft.local" }
$Password = if ($env:CMS_ADMIN_PASSWORD) { $env:CMS_ADMIN_PASSWORD } else { $envVars["ADMIN_PASSWORD"] }
if (-not $Password) { $Password = "Nusantarasoft123!" }

if (-not $ServiceKey) {
    Write-Error "SERVICE_ROLE_KEY missing in .env"
}

Write-Host "CMS admin init: $Email @ $KongUrl"

# Check existing user
$headers = @{
    "Authorization" = "Bearer $ServiceKey"
    "apikey"          = $ServiceKey
}

$list = Invoke-RestMethod -Uri "$KongUrl/auth/v1/admin/users?page=1&per_page=50" -Headers $headers
$existing = $list.users | Where-Object { $_.email -eq $Email } | Select-Object -First 1

if ($existing) {
    $userId = $existing.id
    Write-Host "Auth user already exists: $userId"
} else {
    $body = @{
        email         = $Email
        password      = $Password
        email_confirm = $true
        user_metadata = @{ full_name = "Super Admin" }
    } | ConvertTo-Json
    $created = Invoke-RestMethod -Uri "$KongUrl/auth/v1/admin/users" -Method POST -Headers ($headers + @{ "Content-Type" = "application/json" }) -Body $body
    $userId = $created.id
    Write-Host "Created auth user: $userId"
}

$sql = @"
INSERT INTO public.user_profiles (id, email, full_name, role, two_factor_enabled)
VALUES ('$userId', '$Email', 'Super Admin', 'super_admin', false)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'super_admin';
SELECT id, email, role FROM public.user_profiles WHERE id = '$userId';
"@

Write-Host "Upserting user_profiles..."
docker exec postgres psql -U postgres -d nusantarasoft -c $sql

Write-Host ""
Write-Host "Login Admin CMS:"
Write-Host "  Email:    $Email"
Write-Host "  Password: $Password"
Write-Host "  URL:      http://localhost:3001/login (dev) or http://localhost:3003/login (docker)"
