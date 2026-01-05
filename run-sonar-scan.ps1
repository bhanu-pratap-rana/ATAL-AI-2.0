# SonarQube Scan Script for Windows PowerShell
# Usage: .\run-sonar-scan.ps1

Write-Host "🔍 SonarQube Code Analysis Scanner" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Java is installed
Write-Host "Checking Java installation..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "✅ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Java not found! Please install Java 17+" -ForegroundColor Red
    Write-Host "Download from: https://adoptium.net/" -ForegroundColor Yellow
    exit 1
}

# Check if SonarQube Scanner is installed
Write-Host "Checking SonarQube Scanner..." -ForegroundColor Yellow
try {
    $scannerVersion = sonar-scanner --version 2>&1 | Select-Object -First 1
    Write-Host "✅ SonarQube Scanner found: $scannerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ SonarQube Scanner not found!" -ForegroundColor Red
    Write-Host "Install with: choco install sonar-scanner-msbuild-net46 -y" -ForegroundColor Yellow
    Write-Host "Or download from: https://docs.sonarqube.org/latest/analyzing-source-code/scanners/sonarscanner/" -ForegroundColor Yellow
    exit 1
}

# Check if sonar-project.properties exists
Write-Host "Checking configuration..." -ForegroundColor Yellow
if (Test-Path "sonar-project.properties") {
    Write-Host "✅ sonar-project.properties found" -ForegroundColor Green
} else {
    Write-Host "❌ sonar-project.properties not found!" -ForegroundColor Red
    Write-Host "Please create the configuration file first." -ForegroundColor Yellow
    exit 1
}

# Check if SonarQube server is accessible
Write-Host "Checking SonarQube server connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9000/api/system/status" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ SonarQube server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Warning: Could not connect to SonarQube server at http://localhost:9000" -ForegroundColor Yellow
    Write-Host "   Make sure SonarQube is running before scanning." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Navigate to project root
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host ""
Write-Host "Starting SonarQube scan..." -ForegroundColor Cyan
Write-Host "Project: Atal-AI" -ForegroundColor White
Write-Host "Source: apps/web/src" -ForegroundColor White
Write-Host ""

# Run the scan
try {
    sonar-scanner
    Write-Host ""
    Write-Host "✅ Scan completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "View results at: http://localhost:9000/dashboard?id=Atal-AI" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "❌ Scan failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

