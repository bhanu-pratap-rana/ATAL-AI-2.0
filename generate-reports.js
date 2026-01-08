const fs = require('fs');
const path = require('path');

// Read the all-issues.json file
const issuesPath = 'all-issues.json';
const outputDir = '.';

console.log(`Reading issues from: ${issuesPath}`);
const rawData = fs.readFileSync(issuesPath, 'utf8');
const data = JSON.parse(rawData);
const issues = data.issues || [];

console.log(`Processing ${issues.length} issues...`);

// ============================================
// 1. Generate CSV Report
// ============================================
const csvHeaders = [
  'Issue ID',
  'Rule',
  'Severity',
  'Type',
  'File',
  'Line',
  'Message',
  'Status',
  'Effort',
  'Quality Impact',
  'Quick Fix Available'
].join(',');

const csvRows = issues.map(issue => {
  const file = issue.component.split(':').pop() || '';
  const qualityImpact = issue.impacts && issue.impacts.length > 0
    ? issue.impacts[0].softwareQuality
    : 'UNKNOWN';

  const msg = (issue.message || '').replace(/"/g, '""');
  const fields = [
    issue.key,
    issue.rule,
    issue.severity,
    issue.type,
    file,
    issue.line || '',
    `"${msg}"`,
    issue.status,
    issue.effort || '',
    qualityImpact,
    issue.quickFixAvailable ? 'Yes' : 'No'
  ];

  return fields.join(',');
});

const csvContent = [csvHeaders, ...csvRows].join('\n');
const csvPath = path.join(outputDir, 'SONARQUBE_ISSUES_DETAILED.csv');
fs.writeFileSync(csvPath, csvContent, 'utf8');
console.log(`✓ CSV Report: ${csvPath} (${issues.length} issues)`);

// ============================================
// 2. Generate Categorized Report
// ============================================

// Categorize by Severity
const bySeverity = {};
issues.forEach(issue => {
  const sev = issue.severity || 'UNKNOWN';
  if (!bySeverity[sev]) bySeverity[sev] = [];
  bySeverity[sev].push(issue);
});

// Categorize by Type
const byType = {};
issues.forEach(issue => {
  const type = issue.type || 'UNKNOWN';
  if (!byType[type]) byType[type] = [];
  byType[type].push(issue);
});

// Categorize by Quality
const byQuality = {};
issues.forEach(issue => {
  if (issue.impacts && issue.impacts.length > 0) {
    const quality = issue.impacts[0].softwareQuality;
    if (!byQuality[quality]) byQuality[quality] = [];
    byQuality[quality].push(issue);
  }
});

// Categorize by Rule
const byRule = {};
issues.forEach(issue => {
  const rule = issue.rule || 'UNKNOWN';
  if (!byRule[rule]) byRule[rule] = [];
  byRule[rule].push(issue);
});

// Categorize by File
const byFile = {};
issues.forEach(issue => {
  const file = issue.component.split(':').pop() || 'UNKNOWN';
  if (!byFile[file]) byFile[file] = [];
  byFile[file].push(issue);
});

// Build categorized report
let report = `================================================================================
SONARQUBE ISSUES - DETAILED CATEGORIZED ANALYSIS
Atal-AI Project
Generated: ${new Date().toISOString()}
================================================================================

EXECUTIVE SUMMARY
================================================================================
Total Issues: ${issues.length}

By Severity:
`;

Object.entries(bySeverity)
  .sort((a, b) => {
    const severityOrder = { 'BLOCKER': 0, 'CRITICAL': 1, 'MAJOR': 2, 'MINOR': 3, 'INFO': 4 };
    return (severityOrder[a[0]] || 99) - (severityOrder[b[0]] || 99);
  })
  .forEach(([severity, items]) => {
    const pct = ((items.length / issues.length) * 100).toFixed(1);
    report += `  - ${severity}: ${items.length} (${pct}%)\n`;
  });

report += `\nBy Type:\n`;
Object.entries(byType)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([type, items]) => {
    const pct = ((items.length / issues.length) * 100).toFixed(1);
    report += `  - ${type}: ${items.length} (${pct}%)\n`;
  });

report += `\nBy Quality Impact:\n`;
Object.entries(byQuality)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([quality, items]) => {
    const pct = ((items.length / issues.length) * 100).toFixed(1);
    report += `  - ${quality}: ${items.length} (${pct}%)\n`;
  });

// Add severity breakdown section
report += `\n================================================================================
SEVERITY BREAKDOWN
================================================================================\n`;

['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'].forEach(severity => {
  const items = bySeverity[severity] || [];
  if (items.length === 0) return;

  report += `\n${severity} (${items.length} issues):\n`;
  report += `-`.repeat(80) + '\n';

  items.slice(0, 10).forEach(issue => {
    const file = issue.component.split(':').pop();
    report += `  • [${issue.rule}] ${issue.message}\n`;
    report += `    File: ${file}:${issue.line}\n`;
    report += `    Effort: ${issue.effort || 'N/A'}\n\n`;
  });

  if (items.length > 10) {
    report += `  ... and ${items.length - 10} more ${severity} issues\n\n`;
  }
});

// Add type breakdown section
report += `\n================================================================================
ISSUE TYPE BREAKDOWN
================================================================================\n`;

Object.entries(byType)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([type, items]) => {
    const pct = ((items.length / issues.length) * 100).toFixed(1);
    report += `\n${type} (${items.length} - ${pct}%):\n`;
    report += `  Description: ${type === 'BUG' ? 'Logic errors that may cause unexpected behavior' : 'Code maintainability and style issues'}\n`;
    report += `-`.repeat(80) + '\n';

    // Show sample issues
    items.slice(0, 5).forEach(issue => {
      const file = issue.component.split(':').pop();
      report += `  • [${issue.rule}] ${issue.message} (${file}:${issue.line})\n`;
    });

    if (items.length > 5) {
      report += `  ... and ${items.length - 5} more ${type} issues\n`;
    }
  });

// Add top rules section
report += `\n\n================================================================================
TOP 30 ISSUE RULES (By Frequency)
================================================================================\n`;

const sortedRules = Object.entries(byRule)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 30);

sortedRules.forEach(([rule, items], idx) => {
  const sample = items[0];
  const pct = ((items.length / issues.length) * 100).toFixed(1);
  report += `\n${idx + 1}. ${rule} - ${items.length} occurrences (${pct}%)\n`;
  report += `   Severity: ${sample.severity}\n`;
  report += `   Message: ${sample.message}\n`;
  report += `   Sample: ${items[0].component.split(':').pop()}:${items[0].line}\n`;
});

// Add top files section
report += `\n\n================================================================================
TOP 30 MOST AFFECTED FILES
================================================================================\n`;

const sortedFiles = Object.entries(byFile)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 30);

sortedFiles.forEach(([file, items], idx) => {
  const severityDist = {};
  items.forEach(issue => {
    severityDist[issue.severity] = (severityDist[issue.severity] || 0) + 1;
  });

  const severityStr = Object.entries(severityDist)
    .map(([sev, count]) => `${sev}: ${count}`)
    .join(', ');

  report += `\n${idx + 1}. ${file} (${items.length} issues)\n`;
  report += `   Breakdown: ${severityStr}\n`;
  report += `   Top rule: ${items[0].rule}\n`;
});

// Add quality impact section
report += `\n\n================================================================================
QUALITY ATTRIBUTE IMPACT ANALYSIS
================================================================================\n`;

Object.entries(byQuality)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([quality, items]) => {
    const pct = ((items.length / issues.length) * 100).toFixed(1);
    report += `\n${quality} (${items.length} issues - ${pct}% of total):\n`;
    report += `-`.repeat(80) + '\n';

    const typeCount = {};
    items.forEach(issue => {
      typeCount[issue.type] = (typeCount[issue.type] || 0) + 1;
    });

    report += `  Primarily: ${Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${type} (${count})`)
      .join(', ')}\n`;

    // Show top rules for this quality attribute
    const ruleCountByQuality = {};
    items.forEach(issue => {
      ruleCountByQuality[issue.rule] = (ruleCountByQuality[issue.rule] || 0) + 1;
    });

    const topRules = Object.entries(ruleCountByQuality)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    report += `  Top Rules:\n`;
    topRules.forEach(([rule, count]) => {
      report += `    • ${rule}: ${count} issues\n`;
    });
  });

// Add summary and recommendations
report += `\n\n================================================================================
REMEDIATION RECOMMENDATIONS
================================================================================\n`;

const critical = bySeverity['CRITICAL'] || [];
const major = bySeverity['MAJOR'] || [];
const minor = bySeverity['MINOR'] || [];
const bugs = byType['BUG'] || [];

report += `\nPRIORITY 1 (Critical Path - Address Immediately):\n`;
report += `  • ${critical.length} CRITICAL issues - These require immediate attention\n`;
report += `  • ${bugs.length} BUG type issues - Logic errors affecting reliability\n`;
report += `  Estimated Effort: ${(critical.length * 1.5).toFixed(0)}+ hours\n`;

report += `\nPRIORITY 2 (High Value - Next Sprint):\n`;
report += `  • ${major.length} MAJOR issues - Significant quality improvements\n`;
report += `  • Focus on accessibility and reliability issues\n`;
report += `  Estimated Effort: ${(major.length * 0.5).toFixed(0)}+ hours\n`;

report += `\nPRIORITY 3 (Nice to Have - Technical Debt):\n`;
report += `  • ${minor.length} MINOR issues - Style and convention improvements\n`;
report += `  • Address incrementally with other development work\n`;
report += `  Estimated Effort: ${(minor.length * 0.25).toFixed(0)}+ hours\n`;

report += `\n\n================================================================================
QUICK WINS (Issues with QuickFix Available)
================================================================================\n\n`;

const quickFixIssues = issues.filter(i => i.quickFixAvailable);
report += `Total issues with QuickFix: ${quickFixIssues.length}\n`;

const quickFixByRule = {};
quickFixIssues.forEach(issue => {
  const rule = issue.rule;
  if (!quickFixByRule[rule]) quickFixByRule[rule] = [];
  quickFixByRule[rule].push(issue);
});

Object.entries(quickFixByRule)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10)
  .forEach(([rule, items]) => {
    report += `  • ${rule}: ${items.length} auto-fixable issues\n`;
  });

report += `\nRun SonarQube analysis tools or IDE quick-fix features to auto-resolve these issues.\n`;

report += `\n================================================================================\n`;

const reportPath = path.join(outputDir, 'SONARQUBE_CATEGORIZED_ISSUES.txt');
fs.writeFileSync(reportPath, report, 'utf8');
console.log(`✓ Categorized Report: ${reportPath}`);

console.log('\n✓ Report generation completed successfully!');
