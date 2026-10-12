$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (!(Get-Command java -ErrorAction SilentlyContinue)) { throw 'Install Java JDK 21 first. No Maven, PostgreSQL or Node.js is needed for this prebuilt demo.' }
$version = (cmd /c "java -version 2>&1" | Out-String)
if ($version -notmatch 'version "(\d+)') { throw 'Could not detect Java version.' }
if ([int]$Matches[1] -lt 21) { throw 'Java 21 or newer is required. Set JAVA_HOME and PATH to your JDK 21 installation.' }
if (!(Test-Path 'release/rasoi-route.jar')) { throw 'Prebuilt application is missing. Follow the source-build instructions in README.md.' }
if (Test-Path '.env') {
  Get-Content '.env' | ForEach-Object {
    $line = $_.Trim()
    if ($line -and !$line.StartsWith('#')) {
      $parts = $line -split '=', 2
      if ($parts.Count -eq 2) { [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process') }
    }
  }
}
if (!$env:JWT_SECRET -or $env:JWT_SECRET.StartsWith('replace_')) {
  New-Item -ItemType Directory -Force 'data' | Out-Null
  if (!(Test-Path 'data/demo-jwt.key')) {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes); $rng.Dispose()
    [Convert]::ToBase64String($bytes) | Set-Content 'data/demo-jwt.key'
  }
  $env:JWT_SECRET = (Get-Content 'data/demo-jwt.key' -Raw).Trim()
}
Write-Host 'Starting Rasoi Route at http://localhost:8080' -ForegroundColor Green
Write-Host 'Keep this window open. Use COD without provider credentials. Close with Ctrl+C.'
java -jar release/rasoi-route.jar --spring.profiles.active=demo --server.address=127.0.0.1
if ($LASTEXITCODE -ne 0) { throw 'Application stopped with an error. Read the output above.' }
