param([switch]$Preview)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Get-Command pnpm.cmd -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 LTS and run npm.cmd install -g pnpm@10.28.0 first.' }
if (!(Test-Path node_modules)) { pnpm.cmd install --frozen-lockfile; if ($LASTEXITCODE -ne 0) { throw 'Dependency install failed.' } }
if ($Preview) { $env:VITE_DEMO_MODE = 'true' } else { Remove-Item Env:VITE_DEMO_MODE -ErrorAction SilentlyContinue }
pnpm.cmd --dir artifacts/rasoi-route dev
