param([switch]$Demo)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Get-Command java -ErrorAction SilentlyContinue)) { throw 'Install Java JDK 21 and set JAVA_HOME first.' }
if (!(Get-Command mvn -ErrorAction SilentlyContinue)) { throw 'Install Maven 3.9+ and add it to PATH first.' }
if (!(Test-Path .env)) { throw 'Copy .env.example to .env and fill JWT_SECRET. For PostgreSQL also fill DATABASE_PASSWORD.' }
Get-Content .env | ForEach-Object {
  $line = $_.Trim()
  if ($line -and !$line.StartsWith('#')) {
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) { [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process') }
  }
}
Push-Location backend
try {
  if ($Demo) { mvn spring-boot:run '-Dspring-boot.run.profiles=demo' }
  else { mvn spring-boot:run }
  if ($LASTEXITCODE -ne 0) { throw 'Backend stopped with an error. Read the output above.' }
} finally { Pop-Location }
