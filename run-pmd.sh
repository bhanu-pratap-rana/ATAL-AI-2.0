#!/bin/bash

# PMD Analysis Script for Atal-ai-1.0 Project

echo "Running PMD Static Analysis..."
echo "=============================="

# Analyze TypeScript files in apps/web/src
pmd check \
  --dir apps/web/src \
  --format html \
  --reportfile pmd-report.html \
  --language javascript \
  --enable-properties \
  2>&1

echo ""
echo "PMD Analysis Complete!"
echo "Report saved to: pmd-report.html"
echo ""
echo "Summary of Issues Found:"
grep -c "error" pmd-report.html 2>/dev/null || echo "No issues found"
