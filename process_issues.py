import json
import csv
import sys
from collections import defaultdict
from io import StringIO

# Load both pages
with open('issues_page1.json', 'r') as f:
    page1 = json.load(f)

with open('issues_page2.json', 'r') as f:
    page2 = json.load(f)

# Combine all issues
all_issues = page1.get('issues', []) + page2.get('issues', [])

print(f"Total issues fetched: {len(all_issues)}", file=sys.stderr)

# Save combined to file
with open('all-issues.json', 'w') as f:
    json.dump({'issues': all_issues, 'total': len(all_issues)}, f, indent=2)

print(f"Combined JSON saved to all-issues.json", file=sys.stderr)

# Initialize counters for analysis
severity_counts = defaultdict(int)
type_counts = defaultdict(int)
quality_counts = defaultdict(int)
component_counts = defaultdict(int)
status_counts = defaultdict(int)

# Create CSV in memory
output = StringIO()
writer = csv.writer(output)

# Write header
writer.writerow([
    'Issue ID',
    'Rule',
    'Severity',
    'Type',
    'Component/File',
    'Line',
    'Message',
    'Status',
    'Effort'
])

# Process issues
for issue in all_issues:
    issue_id = issue.get('key', 'N/A')
    rule = issue.get('rule', 'N/A')
    severity = issue.get('severity', 'N/A')
    issue_type = issue.get('type', 'N/A')
    component = issue.get('component', 'N/A')
    line = issue.get('line', '')
    message = issue.get('message', '')
    status = issue.get('status', 'N/A')
    effort = issue.get('effort', '')
    
    # Count categories
    severity_counts[severity] += 1
    type_counts[issue_type] += 1
    status_counts[status] += 1
    
    # Extract component/file path
    if component:
        component_counts[component] += 1
    
    # Extract quality attribute from impacts
    impacts = issue.get('impacts', [])
    for impact in impacts:
        quality = impact.get('softwareQuality', '')
        if quality:
            quality_counts[quality] += 1
    
    # Write row
    writer.writerow([
        issue_id,
        rule,
        severity,
        issue_type,
        component,
        line if line else '',
        message,
        status,
        effort
    ])

# Get CSV content
csv_content = output.getvalue()

# Print analysis summary to stderr
print("\n" + "="*80, file=sys.stderr)
print("SONARQUBE ISSUES ANALYSIS SUMMARY", file=sys.stderr)
print("="*80, file=sys.stderr)

print("\nBY SEVERITY:", file=sys.stderr)
for severity in sorted(severity_counts.keys()):
    count = severity_counts[severity]
    pct = (count / len(all_issues)) * 100
    print(f"  {severity}: {count:4d} ({pct:5.1f}%)", file=sys.stderr)

print("\nBY TYPE:", file=sys.stderr)
for issue_type in sorted(type_counts.keys()):
    count = type_counts[issue_type]
    pct = (count / len(all_issues)) * 100
    print(f"  {issue_type}: {count:4d} ({pct:5.1f}%)", file=sys.stderr)

print("\nBY STATUS:", file=sys.stderr)
for status in sorted(status_counts.keys()):
    count = status_counts[status]
    pct = (count / len(all_issues)) * 100
    print(f"  {status}: {count:4d} ({pct:5.1f}%)", file=sys.stderr)

print("\nBY QUALITY ATTRIBUTE:", file=sys.stderr)
if quality_counts:
    for quality in sorted(quality_counts.keys()):
        count = quality_counts[quality]
        pct = (count / len(all_issues)) * 100
        print(f"  {quality}: {count:4d} ({pct:5.1f}%)", file=sys.stderr)
else:
    print("  (No quality tags found)", file=sys.stderr)

print("\nTOP 15 AFFECTED COMPONENTS:", file=sys.stderr)
sorted_components = sorted(component_counts.items(), key=lambda x: x[1], reverse=True)[:15]
for i, (component, count) in enumerate(sorted_components, 1):
    # Clean up component name for display
    display_name = component.replace('Atal-AI:', '').strip() if 'Atal-AI:' in component else component
    pct = (count / len(all_issues)) * 100
    print(f"  {i:2d}. {display_name}: {count:3d} ({pct:5.1f}%)", file=sys.stderr)

print("\n" + "="*80, file=sys.stderr)

# Print CSV to stdout
print(csv_content, end='')
