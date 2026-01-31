Write-Host "1. Building Middleware locally (TypeScript -> Dist)..." -ForegroundColor Cyan
Push-Location middleware
try {
    # Ensure dependencies are installed
    npm install
    # Build the application
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Middleware build failed!"
        exit 1
    }
}
finally {
    Pop-Location
}

Write-Host "2. Building Docker Images (Admin & Middleware)..." -ForegroundColor Cyan
docker-compose build --no-cache admin middleware

Write-Host "3. Restarting Containers..." -ForegroundColor Cyan
docker-compose up -d --force-recreate admin middleware

Write-Host "✅ Rebuild Complete!" -ForegroundColor Green
