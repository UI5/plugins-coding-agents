# skill-lint

> CLI linter for Claude Code skills — validates structure, performance, triggering, and integration

A standalone TypeScript CLI tool for validating Claude Code skill files. **Skill and agent agnostic** — works with any skill by reading patterns from configuration files.

## Features

- **4 Validation Scenarios**
  - **Structure** — plugin.json, frontmatter, sections, links, project scaffolding
  - **Performance** — file sizes, token budgets, duplicate content detection
  - **Triggering** — keyword-based simulation with accuracy metrics (⚠️ NOT real Claude behavior)
  - **Integration** — real Claude CLI execution with skill detection (requires Claude Code CLI)

- **Multiple Output Formats**
  - `text` — colored terminal output (default)
  - `json` — machine-readable for CI/CD
  - `github-actions` — annotations for GitHub Actions

- **Configurable**
  - Cosmiconfig-based (`.skilllintrc.json`, `.skilllintrc.yaml`, or `package.json`)
  - Zod schema validation with sensible defaults
  - Override via CLI flags

- **Extensible & Agnostic**
  - Plugin architecture for validators, adapters, formatters
  - No hardcoded skill patterns — reads from test case metadata
  - Easy to add new validation rules or adapt to other AI platforms

## Installation

```bash
cd plugins/ui5/skill-lint
npm install
npm run build
```

## Usage

### Quick Start

```bash
# Lint a skill (structure + performance + triggering)
npm run lint

# From parent directory
cd plugins/ui5
npm test  # runs build + lint
```

### CLI Commands

```bash
# Lint a single skill
node bin/skill-lint.js lint skills/ui5-best-practices

# Lint with specific scenarios
node bin/skill-lint.js lint skills/ui5-best-practices --structure --no-triggering

# Output JSON
node bin/skill-lint.js lint skills/ui5-best-practices -f json

# Save report to file
node bin/skill-lint.js lint skills/ui5-best-practices -f json -o reports/lint-result.json

# GitHub Actions format (for CI)
node bin/skill-lint.js lint skills/ui5-best-practices -f github-actions

# Check if skill loads correctly
node bin/skill-lint.js check skills/ui5-best-practices

# Check adapter availability
node bin/skill-lint.js check skills/ui5-best-practices --adapter claude-code

# Generate config file
node bin/skill-lint.js init
```

### Configuration

Create `.skilllintrc.json` in your project root:

```json
{
  "scenarios": {
    "structure": true,
    "triggering": true,
    "performance": true,
    "integration": false
  },
  "adapter": "claude-code",
  "thresholds": {
    "performance": {
      "maxLines": 700,
      "maxTokens": 4000
    },
    "triggering": {
      "minAccuracy": 90
    }
  },
  "testCases": {
    "triggering": "./test/fixtures/trigger-cases.json",
    "integration": "./test/integration/fixtures/test-cases.json"
  },
  "execution": {
    "timeout": 60000,
    "maxRetries": 2,
    "parallel": false
  },
  "formatters": {
    "default": "text",
    "options": {
      "colors": true,
      "verbose": false
    }
  },
  "output": {
    "directory": ".lint-reports",
    "formats": ["text", "json"]
  }
}
```

### Test Case Format (Skill-Agnostic)

The linter reads skill-specific patterns from your test case files:

```json
{
  "version": "3.0.0",
  "description": "Skill triggering test cases",
  "skill": {
    "name": "my-skill-name",
    "triggerKeywords": ["keyword1", "keyword2", "..."],
    "antiKeywords": ["exclude1", "exclude2"],
    "detectionPatterns": ["pattern1", "pattern2", "..."],
    "criticalKeywords": ["critical1", "critical2"]
  },
  "tests": [
    {
      "prompt": "How do I use keyword1?",
      "expected_skill": "my-skill-name",
      "should_trigger": true,
      "category": "category-name"
    }
  ]
}
```

**Unified format**: Both triggering and integration tests can use the same file structure. The integration validator automatically converts trigger test cases.

## Architecture

```
skill-lint/
├── src/
│   ├── cli/                    # Commander.js CLI
│   │   ├── index.ts            # CLI orchestrator
│   │   └── commands/           # lint, check, init commands
│   ├── core/
│   │   ├── linter.ts           # Main linter orchestrator
│   │   └── result-collector.ts # Aggregate validation results
│   ├── validators/
│   │   ├── base-validator.ts  # Abstract validator interface
│   │   ├── structure-validator.ts
│   │   ├── performance-validator.ts
│   │   ├── triggering-validator.ts
│   │   └── integration-validator.ts
│   ├── adapters/
│   │   ├── base-adapter.ts    # Abstract adapter interface
│   │   ├── claude-code-adapter.ts
│   │   └── adapter-registry.ts
│   ├── formatters/
│   │   ├── base-formatter.ts  # Abstract formatter interface
│   │   ├── text-formatter.ts
│   │   ├── json-formatter.ts
│   │   └── github-actions-formatter.ts
│   ├── config/
│   │   ├── schema.ts           # Zod schema + defaults
│   │   └── loader.ts           # Cosmiconfig integration
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   └── utils/
│       ├── file-utils.ts       # loadSkill, extractFrontmatter
│       └── logger.ts           # Semantic logging with emoji
└── bin/
    ├── skill-lint.js           # CLI entry point (shim)
    └── skill-lint.ts           # CLI entry point (TypeScript)
```

## Extending

### Adding a New Validator

1. Create `src/validators/my-validator.ts`:

```typescript
import { BaseValidator } from './base-validator.js';
import type { ValidationResult, Skill, LintConfig } from '../types/index.js';

export class MyValidator extends BaseValidator {
  readonly name = 'my-validator';
  readonly description = 'What it checks';

  async validate(skill: Skill, config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations = [];

    // Your validation logic
    if (somethingWrong) {
      violations.push(this.createViolation(
        'error',
        'rule-name',
        'Descriptive message',
        { suggestion: 'How to fix it' }
      ));
    }

    return this.buildResult(violations, start, { myMetric: 123 });
  }
}
```

2. Register in `src/core/linter.ts`:

```typescript
import { MyValidator } from '../validators/my-validator.js';

if (config.scenarios.myValidator) {
  validators.push(new MyValidator());
}
```

3. Update config schema in `src/config/schema.ts`

### Adding a New Adapter

1. Create `src/adapters/my-adapter.ts`:

```typescript
import { BaseAdapter } from './base-adapter.js';
import type { ExecutionRequest, ExecutionResult } from '../types/index.js';

export class MyAdapter extends BaseAdapter {
  readonly name = 'my-adapter';
  readonly description = 'My AI platform adapter';

  async isAvailable(): Promise<boolean> {
    // Check if this adapter can run
  }

  async verifySkillLoaded(skillId: string): Promise<SkillVerification> {
    // Check if skill is loaded
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // Run a prompt and detect skill usage using request.skillConfig
  }
}
```

2. Register in `src/adapters/adapter-registry.ts`

### Adding a New Formatter

1. Create `src/formatters/my-formatter.ts`:

```typescript
import { BaseFormatter } from './base-formatter.js';
import type { LintResult } from '../types/index.js';

export class MyFormatter extends BaseFormatter {
  readonly name = 'my-format';
  readonly extension = '.txt';

  format(result: LintResult): string {
    // Transform LintResult to your format
    return 'formatted output';
  }
}
```

2. Wire in `src/cli/commands/lint.ts`

## Exit Codes

- `0` — All validations passed
- `1` — Validation failures (errors found)
- `2` — Execution error (file not found, config invalid, etc.)

## Comparison to Old Test Framework

| Feature | Old (AVA) | New (skill-lint) |
|---------|-----------|------------------|
| **Architecture** | Test-centric | Linter-centric (reusable) |
| **CLI** | None | Yes (Commander.js) |
| **Config** | Hardcoded | File-based (cosmiconfig) |
| **Output** | TAP only | Text, JSON, GitHub Actions |
| **Extensibility** | Low | High (plugin architecture) |
| **Integration** | AVA infrastructure | Direct adapter calls |
| **Lines of Code** | ~7,600 | ~2,300 (70% reduction) |
| **Skill Agnostic** | No (UI5 hardcoded) | Yes (reads from metadata) |

## Known Limitations

1. **Triggering simulation** — Keyword-based heuristic, NOT how Claude actually decides. Results are a coverage proxy only. Always includes a prominent warning.

2. **Integration tests** — Require Claude Code CLI installed and available. May fail with certain proxy configurations (e.g., `effortLevel` parameter not supported).

3. **No unit tests yet** — Validators themselves are untested (TODO).

4. **Parallel execution** — Config accepts `parallel: true` but not yet implemented.

## License

Apache-2.0 — Copyright 2026 SAP SE
