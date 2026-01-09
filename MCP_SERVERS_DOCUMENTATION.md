# 🔌 Available MCP Servers Documentation

This document describes all Model Context Protocol (MCP) servers available in this project and their purposes.

---

## 📋 Available MCP Servers

### 1. **SonarQube MCP** ✅
**Status:** Connected and Active  
**Purpose:** Code quality analysis, issue tracking, and quality gate monitoring

**Key Capabilities:**
- Scan codebase for bugs, vulnerabilities, and code smells
- Track code quality metrics (coverage, complexity, duplication)
- Monitor quality gate status
- Identify security hotspots
- Export issues for remediation

**Use Cases:**
- Pre-deployment code quality checks
- Security vulnerability scanning
- Technical debt tracking
- Code coverage monitoring
- Quality gate enforcement

**Example Usage:**
```typescript
// Get quality gate status
quality_gate_status({ project_key: "Atal-AI" })

// Get all issues
issues({ project_key: "Atal-AI", severities: ["CRITICAL", "MAJOR"] })

// Get security hotspots
hotspots({ project_key: "Atal-AI" })
```

---

### 2. **Filesystem MCP** ✅
**Status:** Active  
**Purpose:** File system operations and file management

**Key Capabilities:**
- Read and write files
- List directories
- Search for files by pattern
- Navigate file system

**Use Cases:**
- Reading configuration files
- Writing reports and exports
- Searching for specific file types
- File manipulation tasks

**Example Usage:**
```typescript
// Read a file
read_file({ target_file: "package.json" })

// List directory
list_dir({ target_directory: "src" })

// Search for files
glob_file_search({ glob_pattern: "*.ts" })
```

---

### 3. **Memory MCP** ✅
**Status:** Active  
**Purpose:** Knowledge graph storage and retrieval

**Key Capabilities:**
- Store entities and relationships
- Search knowledge graph
- Retrieve stored information
- Manage observations

**Use Cases:**
- Storing project patterns and conventions
- Remembering architectural decisions
- Tracking relationships between components
- Knowledge management

**Example Usage:**
```typescript
// Create an entity
create_entities({
  entities: [{
    name: "UserService",
    entityType: "Service",
    observations: ["Handles user authentication"]
  }]
})

// Search knowledge graph
search_nodes({ query: "authentication" })
```

---

### 4. **Sequential Thinking MCP** ✅
**Status:** Active  
**Purpose:** Complex problem-solving through structured thinking

**Key Capabilities:**
- Break down complex problems
- Plan multi-step solutions
- Analyze and revise approaches
- Generate solution hypotheses

**Use Cases:**
- Debugging complex issues
- Planning refactoring tasks
- Analyzing architectural decisions
- Problem-solving workflows

**Example Usage:**
```typescript
sequentialthinking({
  thought: "Analyze the root cause of the authentication bug",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
})
```

---

### 5. **Fetch MCP** ✅
**Status:** Active  
**Purpose:** Web resource access and content fetching

**Key Capabilities:**
- Fetch URLs from the internet
- Extract content as markdown
- Access web resources
- Get up-to-date information

**Use Cases:**
- Fetching documentation
- Getting latest library information
- Accessing external APIs
- Retrieving web content

**Example Usage:**
```typescript
// Fetch a URL
fetch({
  url: "https://example.com/docs",
  max_length: 5000
})
```

---

### 6. **Playwright MCP** ✅
**Status:** Active  
**Purpose:** Browser automation and web testing

**Key Capabilities:**
- Navigate web pages
- Interact with elements
- Take screenshots
- Test web applications

**Use Cases:**
- End-to-end testing
- UI automation
- Web scraping
- Browser-based testing

**Example Usage:**
```typescript
// Navigate to a page
browser_navigate({ url: "https://example.com" })

// Take a screenshot
browser_take_screenshot({ fullPage: true })
```

---

### 7. **Supabase MCP** ✅
**Status:** Active (HTTP)  
**Purpose:** Database operations and Supabase integration

**Key Capabilities:**
- Execute SQL queries
- List tables and migrations
- Get database advisors
- Manage database schema

**Use Cases:**
- Database queries
- Migration management
- Schema validation
- Database optimization

**Example Usage:**
```typescript
// List tables
list_tables()

// Execute SQL
execute_sql({ query: "SELECT * FROM users" })

// Get advisors
get_advisors()
```

---

### 8. **Semgrep MCP** ✅
**Status:** Active  
**Purpose:** Static analysis and security scanning

**Key Capabilities:**
- Pattern-based code scanning
- Security vulnerability detection
- Custom rule scanning
- AST analysis

**Use Cases:**
- Security scanning
- Code pattern detection
- Custom rule enforcement
- Static analysis

**Example Usage:**
```typescript
// Scan with custom rule
semgrep_scan_with_custom_rule({
  rule: "...",
  target: "src"
})
```

---

### 9. **Time MCP** ✅
**Status:** Active  
**Purpose:** Time and timezone operations

**Key Capabilities:**
- Get current time
- Convert between timezones
- Time calculations

**Use Cases:**
- Time-based operations
- Timezone conversions
- Scheduling tasks
- Time calculations

**Example Usage:**
```typescript
// Get current time
get_current_time({ timezone: "America/New_York" })

// Convert time
convert_time({
  source_timezone: "UTC",
  time: "12:00",
  target_timezone: "Asia/Calcutta"
})
```

---

### 10. **Context7 MCP** ✅
**Status:** Active (Requires API Key)  
**Purpose:** Up-to-date library documentation

**Key Capabilities:**
- Resolve library IDs
- Fetch latest documentation
- Get code examples
- Access library docs

**Use Cases:**
- Getting latest library docs
- Finding code examples
- Resolving library information
- Documentation lookup

**Example Usage:**
```typescript
// Resolve library ID
resolve_library_id({ libraryName: "react" })

// Get library docs
get_library_docs({
  context7CompatibleLibraryID: "/facebook/react",
  topic: "hooks"
})
```

---

### 11. **PMD MCP** ✅
**Status:** Active  
**Purpose:** Static code analysis and duplicate detection

**Key Capabilities:**
- Code quality checks
- Duplicate code detection
- Rule-based analysis
- Multiple language support

**Use Cases:**
- Code quality analysis
- Finding duplicate code
- Enforcing coding standards
- Pre-commit checks

**Example Usage:**
```typescript
// Check code quality
pmd_check({
  path: "src",
  language_version: "ecmascript-ES2022",
  rulesets: ["category/ecmascript/bestpractices.xml"]
})

// Find duplicates
pmd_cpd({
  path: "src",
  language: "typescript",
  minimum_tokens: 50
})
```

---

### 12. **CLOC MCP** ✅
**Status:** Active  
**Purpose:** Count lines of code

**Key Capabilities:**
- Count lines of code
- Language statistics
- Code metrics

**Use Cases:**
- Code metrics
- Project statistics
- Language distribution
- Size analysis

---

## 🎯 MCP Usage Recommendations

### For Code Quality Analysis:
1. **SonarQube MCP** - Comprehensive quality metrics
2. **PMD MCP** - Static analysis and duplicates
3. **Semgrep MCP** - Security scanning

### For Development:
1. **Filesystem MCP** - File operations
2. **Context7 MCP** - Documentation lookup
3. **Supabase MCP** - Database operations

### For Problem Solving:
1. **Sequential Thinking MCP** - Complex analysis
2. **Memory MCP** - Knowledge storage
3. **Fetch MCP** - External information

### For Testing:
1. **Playwright MCP** - Browser testing
2. **SonarQube MCP** - Coverage tracking

---

## 📝 Configuration

All MCP servers are configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "sonarqube": { ... },
    "filesystem": { ... },
    "memory": { ... },
    // ... other servers
  }
}
```

---

## 🔧 Troubleshooting

### SonarQube MCP Not Connecting:
- Ensure SonarQube server is running at `http://localhost:9000`
- Verify token in `sonar-project.properties`
- Check project key matches: `Atal-AI`

### Context7 MCP Requires API Key:
- Set `CONTEXT7_API_KEY` environment variable
- Or configure in `.mcp.json` env section

---

**Last Updated:** 2026-01-08  
**Total MCP Servers:** 12  
**Active Servers:** 12
