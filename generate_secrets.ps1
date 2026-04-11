$chars = (65..90) + (97..122) + (48..57)
$jwt = -join ($chars | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$vault = -join ($chars | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$pgmeta = -join ($chars | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$dashpw = -join ($chars | Get-Random -Count 24 | ForEach-Object { [char]$_ })
$logpub = -join ($chars | Get-Random -Count 48 | ForEach-Object { [char]$_ })
$logprv = -join ($chars | Get-Random -Count 48 | ForEach-Object { [char]$_ })

Write-Output "JWT_SECRET=$jwt"
Write-Output "VAULT_ENC_KEY=$vault"
Write-Output "PG_META_CRYPTO_KEY=$pgmeta"
Write-Output "DASHBOARD_PASSWORD=$dashpw"
Write-Output "LOGFLARE_PUBLIC=$logpub"
Write-Output "LOGFLARE_PRIVATE=$logprv"
