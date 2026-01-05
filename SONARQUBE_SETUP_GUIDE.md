# 🔍 SonarQube Setup & Scanning Guide for Windows

## Prerequisites

1. **SonarQube Server** - Must be running at `http://localhost:9000`
2. **Java 17+** - Required for SonarQube Scanner
3. **SonarQube Scanner** - CLI tool for scanning

---

## Step 1: Install Java 17+ (if not installed)

### Check if Java is installed:
```powershell
java -version
```

### If not installed, download and install:
1. Download Java 17+ from: https://adoptium.net/
2. Install and add to PATH
3. Verify: `java -version`

---

## Step 2: Install SonarQube Scanner

### Option A: Using Chocolatey (Recommended for Windows)

```powershell
# Install Chocolatey if not installed
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install SonarQube Scanner
choco install sonar-scanner-msbuild-net46 -y
```

### Option B: Manual Installation

1. **Download SonarQube Scanner:**
   - Go to: https://docs.sonarqube.org/latest/analyzing-source-code/scanners/sonarscanner/
   - Download: `sonar-scanner-cli-[version]-windows-x86-64.zip`

2. **Extract and Setup:**
   ```powershell
   # Extract to C:\sonar-scanner (or your preferred location)
   # Add to PATH:
   # C:\sonar-scanner\bin
   ```

3. **Verify Installation:**
   ```powershell
   sonar-scanner --version
   ```

---

## Step 3: Configure SonarQube Project

### 3.1: Create Project in SonarQube UI

1. Open SonarQube: http://localhost:9000
2. Login (default: admin/admin)
3. Go to **Projects** → **Create Project**
4. Select **Manually**
5. Enter:
   - **Project Key:** `Atal-AI` (must match `sonar-project.properties`)
   - **Display Name:** `Atal AI`
6. Click **Set Up**

### 3.2: Generate Token

1. Go to **My Account** → **Security**
2. Generate a new token (or use existing: `squ_1e4c2b8d8d74b82974d73d6909a3047c0c6ff150`)
3. Copy the token

### 3.3: Update Configuration

The `sonar-project.properties` file is already created in the project root with:
- Project Key: `Atal-AI`
- Source: `apps/web/src`
- Exclusions: node_modules, tests, config files
- Server URL: `http://localhost:9000`
- Token: (from your .mcp.json)

---

## Step 4: Run SonarQube Scan

### Method 1: Using SonarQube Scanner CLI

```powershell
# Navigate to project root
cd C:\Users\ranab\Downloads\Atal-ai-1.0

# Run scan
sonar-scanner
```

### Method 2: Using NPM Script (Recommended)

Add to `apps/web/package.json`:

```json
{
  "scripts": {
    "sonar": "sonar-scanner",
    "sonar:local": "sonar-scanner -Dsonar.host.url=http://localhost:9000"
  }
}
```

Then run:
```powershell
cd apps/web
npm run sonar
```

### Method 3: Using Docker (Alternative)

```powershell
docker run --rm -v "${PWD}:/usr/src" -w /usr/src sonarsource/sonar-scanner-cli
```

---

## Step 5: View Results

1. Open SonarQube: http://localhost:9000
2. Go to **Projects** → **Atal AI**
3. View:
   - **Issues** - Code smells, bugs, vulnerabilities
   - **Measures** - Code coverage, complexity, duplications
   - **Code** - Source code with issue highlights
   - **Security** - Security hotspots

---

## Quick Start Commands

### First-Time Setup:
```powershell
# 1. Verify Java
java -version

# 2. Install SonarQube Scanner (if not installed)
choco install sonar-scanner-msbuild-net46 -y

# 3. Verify Scanner
sonar-scanner --version

# 4. Navigate to project
cd C:\Users\ranab\Downloads\Atal-ai-1.0

# 5. Run scan
sonar-scanner
```

### Regular Scanning:
```powershell
cd C:\Users\ranab\Downloads\Atal-ai-1.0
sonar-scanner
```

---

## Troubleshooting

### Issue: "sonar-scanner: command not found"
**Solution:** Add SonarQube Scanner to PATH or use full path:
```powershell
C:\sonar-scanner\bin\sonar-scanner.bat
```

### Issue: "Java not found"
**Solution:** Install Java 17+ and add to PATH

### Issue: "Connection refused"
**Solution:** Ensure SonarQube server is running:
```powershell
# Check if SonarQube is running
curl http://localhost:9000/api/system/status
```

### Issue: "Authentication failed"
**Solution:** Verify token in `sonar-project.properties`:
```properties
sonar.login=squ_1e4c2b8d8d74b82974d73d6909a3047c0c6ff150
```

### Issue: "Project not found"
**Solution:** Create project in SonarQube UI first (Step 3.1)

---

## Advanced Configuration

### Exclude More Files:
Edit `sonar-project.properties`:
```properties
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/.next/**,**/coverage/**,**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx,**/__tests__/**,**/playwright/**,**/tests/**,**/*.config.*,**/jest.setup.js,**/jest.config.js,**/playwright.config.ts,**/migrations/**
```

### Include Test Coverage:
```powershell
# Generate coverage first
cd apps/web
npm run test:coverage

# Then run SonarQube scan
cd ../..
sonar-scanner
```

### Scan Specific Directory:
```powershell
sonar-scanner -Dsonar.sources=apps/web/src/app/actions
```

---

## Integration with CI/CD

### GitHub Actions Example:
```yaml
name: SonarQube Scan
on: [push, pull_request]
jobs:
  sonar:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Run SonarQube Scan
        run: sonar-scanner
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

---

## Next Steps

1. ✅ Run initial scan to populate metrics
2. ✅ Configure Quality Gates
3. ✅ Set up automated scanning in CI/CD
4. ✅ Review and fix issues
5. ✅ Monitor code quality trends

---

**Last Updated:** January 5, 2026  
**SonarQube Version:** Latest  
**Project Key:** Atal-AI

