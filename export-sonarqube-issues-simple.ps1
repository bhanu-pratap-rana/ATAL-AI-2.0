# SonarQube Issues Export Script (Simplified)
# Exports issues in CSV format

param(
    [string]$ProjectKey = "Atal-AI",
    [string]$SonarQubeUrl = "http://localhost:9000",
    [string]$Token = "squ_1e4c2b8d8d74b82974d73d6909a3047c0c6ff150",
    [string]$OutputDir = "sonarqube-export"
)

Write-Host "SonarQube Issues Exporter" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "Created output directory: $OutputDir" -ForegroundColor Green
}

# Create base64 auth header
$bytes = [System.Text.Encoding]::ASCII.GetBytes("${Token}:")
$base64 = [System.Convert]::ToBase64String($bytes)
$headers = @{
    "Authorization" = "Basic $base64"
}

Write-Host "Fetching issues from SonarQube..." -ForegroundColor Yellow
Write-Host "Project: $ProjectKey" -ForegroundColor White
Write-Host "URL: $SonarQubeUrl" -ForegroundColor White
Write-Host ""

try {
    # Build URL manually to avoid ampersand parsing issues
    $queryPart = "componentKeys=" + [System.Uri]::EscapeDataString($ProjectKey) + "&ps=500"
    $jsonUrl = "${SonarQubeUrl}/api/issues/search?" + $queryPart
    
    Write-Host "Fetching JSON format..." -ForegroundColor Yellow
    Write-Host "URL: $jsonUrl" -ForegroundColor Gray
    
    $jsonResponse = Invoke-RestMethod -Uri $jsonUrl -Headers $headers -Method Get
    $jsonFile = Join-Path $OutputDir "issues.json"
    $jsonResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonFile -Encoding UTF8
    
    Write-Host "JSON export saved: $jsonFile" -ForegroundColor Green
    Write-Host "Issues found: $($jsonResponse.issues.Count)" -ForegroundColor White
    
    # Convert to CSV
    Write-Host "Converting to CSV..." -ForegroundColor Yellow
    $csvFile = Join-Path $OutputDir "issues.csv"
    $csvLines = @()
    
    # CSV Header
    $csvLines += "Key,Severity,Type,Status,Component,Line,Message,Rule,Effort,Author,Creation Date"
    
    # CSV Rows
    foreach ($issue in $jsonResponse.issues) {
        $message = $issue.message -replace '"', '""'
        $line = "$($issue.key),$($issue.severity),$($issue.type),$($issue.status),$($issue.component),$($issue.line),`"$message`",$($issue.rule),$($issue.effort),$($issue.author),$($issue.creationDate)"
        $csvLines += $line
    }
    
    $csvLines | Out-File -FilePath $csvFile -Encoding UTF8
    Write-Host "CSV export saved: $csvFile" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Export completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Cyan
    Write-Host "  - $jsonFile" -ForegroundColor White
    Write-Host "  - $csvFile" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "Error exporting issues!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if SonarQube server is running" -ForegroundColor White
    Write-Host "  2. Verify project key: $ProjectKey" -ForegroundColor White
    Write-Host "  3. Check token permissions" -ForegroundColor White
    exit 1
}

