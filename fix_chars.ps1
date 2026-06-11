$f = "admin\src\app\admin\pm\construction-3d\page.tsx"
$lines = [System.IO.File]::ReadAllLines($f, [System.Text.Encoding]::UTF8)

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match '[^\x00-\x7F]') {
        if ($line -match '^\s*//\s*[^\x00-\x7F]{10,}') {
            $lines[$i] = "// ---------------------------------------------------------------"
        }
        elseif ($line -match '^\s*//\s*[^\x00-\x7F]+\s+([A-Z][\w\s\-\>]+\w)\s+[^\x00-\x7F]+') {
            $title = $Matches[1]
            $lines[$i] = "// --  $title  --"
        }
        else {
            $lines[$i] = $line -replace '[^\x00-\x7F]+', ''
        }
    }
}

[System.IO.File]::WriteAllLines($f, $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Fixed"
