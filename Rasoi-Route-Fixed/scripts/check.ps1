$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
pnpm.cmd install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
pnpm.cmd typecheck:libs
if ($LASTEXITCODE -ne 0) { throw 'Library type check failed.' }
pnpm.cmd --dir artifacts/rasoi-route typecheck
if ($LASTEXITCODE -ne 0) { throw 'Frontend type check failed.' }
pnpm.cmd --dir artifacts/rasoi-route test
if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed.' }
pnpm.cmd --dir artifacts/rasoi-route build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
mvn -f backend/pom.xml clean verify
if ($LASTEXITCODE -ne 0) { throw 'Backend tests or packaging failed.' }
Write-Host 'All automated checks passed.' -ForegroundColor Green
