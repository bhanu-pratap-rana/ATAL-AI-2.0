# SonarQube Issues Export Script
# Exports issues in readable JSON and CSV formats

param(
    [string]$ProjectKey = "Atal-AI",
    [string]$SonarQubeUrl = "http://localhost:9000",
    [string]$Token = "squ_1e4c2b8d8d74b82974d73d6909a3047c0c6ff150",
    [string]$OutputDir = "sonarqube-export"
)

Write-Host "🔍 SonarQube Issues Exporter" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "✅ Created output directory: $OutputDir" -ForegroundColor Green
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
    # Fetch issues as JSON
    $jsonUrl = "$SonarQubeUrl/api/issues/search?componentKeys=$ProjectKey&ps=500"
    Write-Host "📥 Fetching JSON format..." -ForegroundColor Yellow
    
    $jsonResponse = Invoke-RestMethod -Uri $jsonUrl -Headers $headers -Method Get
    $jsonFile = Join-Path $OutputDir "issues.json"
    $jsonResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonFile -Encoding UTF8
    
    Write-Host "✅ JSON export saved: $jsonFile" -ForegroundColor Green
    Write-Host "   Issues found: $($jsonResponse.issues.Count)" -ForegroundColor White
    
    # Convert to CSV
    Write-Host "📥 Converting to CSV..." -ForegroundColor Yellow
    $csvFile = Join-Path $OutputDir "issues.csv"
    $csvLines = @()
    
    # CSV Header
    $csvLines += "Key,Severity,Type,Status,Component,Line,Message,Rule,Effort,Author,Creation Date"
    
    # CSV Rows
    foreach ($issue in $jsonResponse.issues) {
        $line = @(
            $issue.key
            $issue.severity
            $issue.type
            $issue.status
            $issue.component
            $issue.line
            """$($issue.message -replace '"', '""')"""
            $issue.rule
            $issue.effort
            $issue.author
            $issue.creationDate
        ) -join ","
        $csvLines += $line
    }
    
    $csvLines | Out-File -FilePath $csvFile -Encoding UTF8
    Write-Host "✅ CSV export saved: $csvFile" -ForegroundColor Green
    
    # Create summary report
    Write-Host "📊 Creating summary report..." -ForegroundColor Yellow
    $summaryFile = Join-Path $OutputDir "summary.md"
    
    $summary = @"
# SonarQube Issues Summary - $ProjectKey
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Overview
- **Total Issues:** $($jsonResponse.issues.Count)
- **Total Effort:** $($jsonResponse.total) minutes
- **Paging:** $($jsonResponse.paging.pageIndex) / $($jsonResponse.paging.total)

## Issues by Severity
"@
    
    $severityCounts = $jsonResponse.issues | Group-Object -Property severity | Sort-Object Count -Descending
    foreach ($group in $severityCounts) {
        $summary += "`n- **$($group.Name):** $($group.Count) issues"
    }
    
    $summary += @"

## Issues by Type
"@
    
    $typeCounts = $jsonResponse.issues | Group-Object -Property type | Sort-Object Count -Descending
    foreach ($group in $typeCounts) {
        $summary += "`n- **$($group.Name):** $($group.Count) issues"
    }
    
    $summary += @"

## Top 10 Issues by Effort
"@
    
    $topIssues = $jsonResponse.issues | Sort-Object {[int]$_.effort} -Descending | Select-Object -First 10
    foreach ($issue in $topIssues) {
        $summary += "`n- **$($issue.severity)** - $($issue.message) (Effort: $($issue.effort) min)"
        $summary += "  - File: $($issue.component):$($issue.line)"
        $summary += "  - Rule: $($issue.rule)"
    }
    
    $summary | Out-File -FilePath $summaryFile -Encoding UTF8
    Write-Host "✅ Summary report saved: $summaryFile" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "✅ Export completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Cyan
    Write-Host "  - $jsonFile" -ForegroundColor White
    Write-Host "  - $csvFile" -ForegroundColor White
    Write-Host "  - $summaryFile" -ForegroundColor White
    Write-Host ""
    Write-Host "Open CSV in Excel: Start-Process `"$csvFile`"" -ForegroundColor Yellow
    
} catch {
    Write-Host ""
    Write-Host "❌ Error exporting issues!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if SonarQube server is running" -ForegroundColor White
    Write-Host "  2. Verify project key: $ProjectKey" -ForegroundColor White
    Write-Host "  3. Check token permissions" -ForegroundColor White
    exit 1
}

