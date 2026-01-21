# feat: PM2 JSON Logging with DuckDB Log Explorer Sub-agent

## Overview

Set up PM2 to run the Vite dev server with structured JSON logging, then create a context-efficient log-explorer skill that uses DuckDB to query logs via SQL. This enables powerful log analysis without bloating Claude's context window.

## Problem Statement / Motivation

**Current State:**
- Dev server runs via plain `npm run dev` (Vite) with no process management
- Logging uses `console.log` with `[MODULE]` prefixes (e.g., `[XMTP]`)
- No structured logging - hard to search, filter, or aggregate
- Log analysis requires manual grep/search, which is context-inefficient

**Why This Matters:**
- Debugging XMTP client issues requires correlating logs across modules
- Smart contract wallet support adds complexity that benefits from queryable logs
- Context-efficient log analysis enables better AI-assisted debugging
- Structured logs can be queried with SQL for advanced analysis

## Proposed Solution

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Vite Dev      │────▶│  PM2 Process     │────▶│  logs/dev.jsonl │
│   Server        │     │  Manager         │     │  (JSON Lines)   │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  /log-explorer  │────▶│  DuckDB CLI      │────▶│  SQL Results    │
│  skill          │     │  (read_json)     │     │  (summarized)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Key Components:**
1. **PM2 ecosystem config** - Manages Vite process with JSON logging
2. **JSON log format** - Structured, queryable log entries
3. **DuckDB integration** - SQL queries over JSON log files
4. **Log-explorer skill** - Context-efficient Claude Code skill

## Technical Approach

### Phase 1: PM2 Configuration

**File: `ecosystem.config.cjs`** (CommonJS required for ES module project)

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'gateway-console',
    script: 'npm',
    args: 'run dev',

    // Logging
    out_file: './logs/dev.jsonl',
    error_file: './logs/dev-error.jsonl',
    log_type: 'json',
    merge_logs: true,
    time: true,

    // Process management
    instances: 1,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 1000,

    // Environment
    env: {
      NODE_ENV: 'development',
      FORCE_COLOR: '1'  // Preserve colors for pretty output
    }
  }]
};
```

**NPM Scripts:**
```json
{
  "dev": "vite",
  "dev:pm2": "pm2 start ecosystem.config.cjs",
  "dev:pm2:stop": "pm2 stop gateway-console",
  "dev:pm2:logs": "pm2 logs gateway-console --lines 50",
  "dev:pm2:flush": "pm2 flush gateway-console"
}
```

### Phase 2: JSON Log Schema

**Log Entry Structure:**
```json
{
  "timestamp": "2026-01-20T15:30:00.000Z",
  "type": "out",
  "process_id": 0,
  "app_name": "gateway-console",
  "message": "[XMTP] Client created for wallet 0x1234...5678"
}
```

**Enhanced Schema (via custom logger - optional future enhancement):**
```json
{
  "timestamp": "2026-01-20T15:30:00.000Z",
  "level": "info",
  "module": "XMTP",
  "message": "Client created",
  "metadata": {
    "walletType": "SCW",
    "chainId": 8453
  }
}
```

### Phase 3: DuckDB Integration

**Installation:**
```bash
# Global CLI (recommended for simplicity)
brew install duckdb

# Or as project devDependency
npm install --save-dev duckdb
```

**Common Queries:**

```sql
-- Recent errors
SELECT * FROM read_json_auto('logs/dev.jsonl')
WHERE message LIKE '%error%' OR message LIKE '%Error%'
ORDER BY timestamp DESC
LIMIT 20;

-- Count by module (parsing [MODULE] prefix)
SELECT
  regexp_extract(message, '^\[([A-Z]+)\]', 1) as module,
  COUNT(*) as count
FROM read_json_auto('logs/dev.jsonl')
WHERE message LIKE '[%'
GROUP BY module
ORDER BY count DESC;

-- Wallet connection events
SELECT timestamp, message
FROM read_json_auto('logs/dev.jsonl')
WHERE message LIKE '%wallet%' OR message LIKE '%connect%'
ORDER BY timestamp DESC;

-- Time-windowed analysis
SELECT * FROM read_json_auto('logs/dev.jsonl')
WHERE timestamp >= now() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

### Phase 4: Log Explorer Skill

**File: `.claude/skills/log-explorer/SKILL.md`**

```markdown
---
name: log-explorer
description: Query application logs using DuckDB SQL. Use when debugging issues, investigating errors, or analyzing log patterns. Context-efficient - returns only relevant results.
allowed-tools:
  - Bash
  - Read
  - Glob
---

# Log Explorer

Analyze application logs using SQL queries via DuckDB.

## Log Location

Logs are stored in `./logs/dev.jsonl` (JSON Lines format from PM2).

## Quick Commands

### Show recent errors
```bash
duckdb -c "SELECT timestamp, message FROM read_json_auto('logs/dev.jsonl') WHERE message ILIKE '%error%' ORDER BY timestamp DESC LIMIT 20"
```

### Count by module
```bash
duckdb -c "SELECT regexp_extract(message, '^\\\[([A-Z]+)\\\]', 1) as module, COUNT(*) FROM read_json_auto('logs/dev.jsonl') WHERE message LIKE '[%' GROUP BY 1 ORDER BY 2 DESC"
```

### Search for pattern
```bash
duckdb -c "SELECT timestamp, message FROM read_json_auto('logs/dev.jsonl') WHERE message ILIKE '%PATTERN%' ORDER BY timestamp DESC LIMIT 50"
```

### Time-windowed search
```bash
duckdb -c "SELECT * FROM read_json_auto('logs/dev.jsonl') WHERE timestamp >= now() - INTERVAL '1 hour' ORDER BY timestamp DESC LIMIT 100"
```

## Usage Guidelines

1. **Start with counts** - Get overview before drilling down
2. **Use LIMIT** - Never return more than 100 rows to preserve context
3. **Time filter first** - Narrow down by timestamp before other filters
4. **Summarize results** - Provide insights, not raw dumps

## Output Format

When presenting results:
- Show row count first
- Highlight key patterns or anomalies
- Provide 3-5 actionable insights
- Include relevant log snippets (max 10)
```

## File Structure

```
gateway-console/
├── ecosystem.config.cjs          # PM2 configuration
├── logs/                         # Log directory (gitignored)
│   ├── dev.jsonl                 # Main dev server logs
│   └── dev-error.jsonl           # Error-only logs
├── .claude/
│   └── skills/
│       └── log-explorer/
│           └── SKILL.md          # Log explorer skill
└── package.json                  # Updated with PM2 scripts
```

## Acceptance Criteria

### Functional Requirements
- [ ] PM2 starts Vite dev server with `npm run dev:pm2`
- [ ] Logs are written to `logs/dev.jsonl` in JSON Lines format
- [ ] DuckDB can query log files with `read_json_auto()`
- [ ] Log-explorer skill responds to log analysis requests
- [ ] Queries return results within 2 seconds for files < 10MB

### Non-Functional Requirements
- [ ] Log files are gitignored
- [ ] PM2 restarts on crash (max 10 restarts)
- [ ] Skill queries use LIMIT to preserve context
- [ ] No sensitive data (private keys, message content) in logs

### Quality Gates
- [ ] `npm run dev:pm2` starts without errors
- [ ] `duckdb -c "SELECT COUNT(*) FROM read_json_auto('logs/dev.jsonl')"` returns valid count
- [ ] `/log-explorer "recent errors"` returns meaningful results

## Dependencies & Prerequisites

**System Dependencies:**
- Node.js 18+ (already satisfied)
- PM2 (`npm install -g pm2`)
- DuckDB CLI (`brew install duckdb`)

**Project Dependencies:**
- pm2-logrotate module (optional, for rotation)

**Permissions:**
Add to `.claude/settings.local.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(pm2 *)",
      "Bash(duckdb *)"
    ]
  }
}
```

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Log files grow unbounded | Medium | High | Configure pm2-logrotate with 10MB max |
| DuckDB not installed | Medium | Medium | Document installation in README |
| Vite HMR breaks with PM2 | Low | Medium | Test HMR; fallback to plain `npm run dev` |
| JSON parsing fails on malformed logs | Low | Low | Use `ignore_errors: true` in DuckDB |

## Future Considerations

1. **Structured Logger**: Replace `console.log` with Pino for consistent JSON output
2. **Log Rotation**: Implement automatic rotation with compression
3. **MCP Server**: Create DuckDB MCP server for richer integration
4. **Real-time Streaming**: Watch mode for live log analysis
5. **Dashboard**: Simple web UI for log visualization

## References

### Internal
- Existing logging patterns: `src/lib/xmtp-signer.ts:42`
- Ralph agent system: `scripts/ralph/ralph.sh`
- Flow task structure: `.flow/epics/`

### External
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 Log Management](https://pm2.keymetrics.io/docs/usage/log-management/)
- [DuckDB JSON Loading](https://duckdb.org/docs/stable/data/json/loading_json)
- [DuckDB CLI Reference](https://duckdb.org/docs/stable/clients/cli/overview)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [pm2-logrotate](https://github.com/keymetrics/pm2-logrotate)

---

## Implementation Checklist

### Setup
- [ ] Install PM2 globally: `npm install -g pm2`
- [ ] Install DuckDB: `brew install duckdb`
- [ ] Create `logs/` directory
- [ ] Add `logs/` to `.gitignore`

### Configuration
- [ ] Create `ecosystem.config.cjs`
- [ ] Add PM2 scripts to `package.json`
- [ ] Update `.claude/settings.local.json` permissions

### Skill Creation
- [ ] Create `.claude/skills/log-explorer/` directory
- [ ] Write `SKILL.md` with queries and guidelines

### Testing
- [ ] Start dev server with PM2
- [ ] Verify JSON logs are written
- [ ] Test DuckDB queries
- [ ] Invoke log-explorer skill

### Documentation
- [ ] Update README with PM2 usage
- [ ] Document log-explorer skill examples
