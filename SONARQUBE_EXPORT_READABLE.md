# 📊 SonarQube Issues Export - Readable Format

## What You Exported

The `atal-ai` directory contains **Protocol Buffer (.pb) files** - these are binary files used by SonarQube for internal data exchange. They are **not human-readable**.

### Files in the Export:
- `issues.pb` - Issues data (binary)
- `rules.pb` - Rules definitions (binary)
- `components.pb` - Component information (binary)
- `measures.pb` - Metrics data (binary)
- `metadata.pb` - Project metadata (binary)
- And more...

---

## ✅ How to Export Issues in Readable Format

### Method 1: Export from SonarQube UI (Recommended)

1. **Open SonarQube Dashboard:**
   ```
   http://localhost:9000/dashboard?id=Atal-AI
   ```

2. **Go to Issues Tab:**
   - Click on **"Issues"** in the left menu
   - Or go to: `http://localhost:9000/project/issues?id=Atal-AI`

3. **Export Issues:**
   - Click the **"Export"** button (top right)
   - Choose format:
     - **CSV** - For Excel/Spreadsheet
     - **JSON** - For programmatic access
     - **Excel** - Direct Excel file

4. **Save the file:**
   - The file will download with a readable format
   - CSV can be opened in Excel, Notepad, etc.
   - JSON can be viewed in any text editor

---

### Method 2: Use SonarQube API

#### Export as JSON:
```powershell
# Get authentication token from SonarQube UI
$token = "squ_1e4c2b8d8d74b82974d73d6909a3047c0c6ff150"
$projectKey = "Atal-AI"

# Export issues as JSON
Invoke-WebRequest -Uri "http://localhost:9000/api/issues/search?componentKeys=$projectKey&ps=500" `
  -Headers @{Authorization = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$token:")))}" } `
  -OutFile "sonarqube-issues.json"
```

#### Export as CSV:
```powershell
# Export issues as CSV
Invoke-WebRequest -Uri "http://localhost:9000/api/issues/search?componentKeys=$projectKey&ps=500&format=csv" `
  -Headers @{Authorization = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$token:")))}" } `
  -OutFile "sonarqube-issues.csv"
```

---

### Method 3: Use SonarQube MCP (Already Available)

I can fetch issues directly using the SonarQube MCP server. The issues are being fetched now and will be displayed in a readable format.

---

## 📋 What Information is in the Export?

The readable export contains:
- **Issue Key** - Unique identifier
- **Severity** - BLOCKER, CRITICAL, MAJOR, MINOR, INFO
- **Type** - BUG, VULNERABILITY, CODE_SMELL
- **Status** - OPEN, CONFIRMED, RESOLVED, etc.
- **Component** - File path
- **Line** - Line number
- **Message** - Issue description
- **Rule** - Rule that detected the issue
- **Effort** - Time to fix (in minutes)
- **Author** - Who introduced the issue
- **Creation Date** - When issue was found

---

## 🔧 Converting .pb Files (Advanced)

If you need to read the .pb files, you would need:
1. Protocol Buffer compiler (`protoc`)
2. SonarQube's protobuf schema definitions
3. Custom script to decode

**This is complex and not recommended.** Use the UI export instead.

---

## 📝 Quick Export Script

I'll create a PowerShell script to export issues in readable format for you.

---

**Next Steps:**
1. Use SonarQube UI to export (easiest)
2. Or use the API commands above
3. Or I can fetch issues using MCP and create a readable report

