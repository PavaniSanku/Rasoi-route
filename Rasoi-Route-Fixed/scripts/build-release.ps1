$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
pnpm.cmd install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
pnpm.cmd build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
pnpm.cmd test
if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed.' }
New-Item -ItemType Directory -Force 'backend/src/main/resources/static' | Out-Null
Copy-Item -Recurse -Force 'artifacts/rasoi-route/dist/public/*' 'backend/src/main/resources/static/'
mvn -f backend/pom.xml clean verify
if ($LASTEXITCODE -ne 0) { throw 'Backend build or tests failed.' }
New-Item -ItemType Directory -Force 'release' | Out-Null
Copy-Item -Force 'backend/target/rasoi-backend-1.0.0.jar' 'release/rasoi-route.jar'
Write-Host 'Release ready: run Run-Demo.cmd.' -ForegroundColor Green
