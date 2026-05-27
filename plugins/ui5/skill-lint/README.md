# skill-lint

> CLI linter for Claude Code skills — validates structure, size, references, links, keywords, and harness quality

A standalone TypeScript CLI tool for validating Claude Code skill files. **Skill and agent agnostic** — works with any SKILL.md by reading patterns from configuration files.

## Features

- **6 Validation Scenarios**
  - **Structure** — plugin.json, frontmatter, sections, project scaffolding
  - **Size** — line count, token budget, context window efficiency
  - **References** — reference file analysis, README conciseness, duplicate content, split recommendations
  - **Links** — relative link resolution, reference file paths, anchor validation, external URL checking (opt-in)
  - **Keywords** — keyword-based triggering simulation, description quality scoring, keyword overlap detection (⚠️ NOT real Claude behavior)
  - **Harness** — real Claude CLI execution with skill detection, response quality, latency, token efficiency (requires adapter)

- **Multi-Skill Linting**
  - Point at a directory of skills to lint them all in one run
  - Per-skill and overall summary

- **Multiple Output Formats**
  - `text` — colored terminal output (default)
  - `json` — machine-readable for CI/CD
  - `github-actions` — annotations for GitHub Actions

- **Configurable**
  - Cosmiconfig-based (`.skilllintrc.json`, `.skilllintrc.yaml`, or `package.json`)
  - Zod schema validation with sensible defaults
  - Override via CLI flags
  - Backward compatible with old config keys (`performance`, `triggering`, `integration`)

- **Extensible**
  - Plugin architecture for validators, adapters, formatters
  - No hardcoded skill patterns — reads from test case metadata

## Installation

```bash
cd plugins/ui5/skill-lint
npm install
npm run build
```

## Usage

### Quick Start

```bash
# Lint a single skill (structure + size + references + links + keywords)
node bin/skill-lint.js lint skills/my-skill

# Lint all skills in a directory
node bin/skill-lint.js lint skills/

# From parent directory
cd plugins/ui5
npm test
```

### CLI Commands

```bash
# Lint with specific validators
node bin/skill-lint.js lint skills/my-skill --structure --size --no-keywords

# Run only link validation
node bin/skill-lint.js lint skills/my-skill --links --no-structure --no-size --no-references --no-keywords

# Enable external link checking (off by default)
# Use config: "links": { "enabled": true, "checkExternal": true }

# Output JSON
node bin/skill-lint.js lint skills/my-skill -f json

# Save report to file
node bin/skill-lint.js lint skills/my-skill -f json -o reports/lint-result.json

# GitHub Actions format (for CI)
node bin/skill-lint.js lint skills/my-skill -f github-actions

# Check if skill loads correctly
node bin/skill-lint.js check skills/my-skill

# Generate config file
node bin/skill-lint.js init
```

### Configuration

Create `.skilllintrc.json` in your project root:

```json
{
  "scenarios": {
    "structure": true,
    "size": true,
    "references": true,
    "links": { "enabled": true, "checkExternal": false },
    "keywords": true,
    "harness": false
  },
  "adapter": "claude-code",
  "thresholds": {
    "size": {
      "maxLines": 700,
      "maxTokens": 4000
    },
    "keywords": {
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
  }
}
```

> **Backward compatibility**: Old config keys (`performance`, `triggering`, `integration`) are automatically mapped to their new equivalents (`size`, `keywords`, `harness`).

## Validators

### Structure

Validates project scaffolding and SKILL.md metadata.

| Rule | Level | Description |
|------|-------|-------------|
| `skill-exists` | error | SKILL.md file must exist |
| `plugin-json-exists` | error | .claude-plugin/plugin.json must exist |
| `plugin-json-name` | error | plugin.json must have "name" field |
| `plugin-json-version` | error | plugin.json must have "version" field |
| `plugin-json-skills` | error | plugin.json must have non-empty "skills" array |
| `frontmatter-name` | error | YAML frontmatter must include "name" |
| `frontmatter-description` | error | YAML frontmatter must include "description" |
| `frontmatter-description-length` | warning | Description should be > 50 chars |
| `readme-exists` | warning | README.md recommended at plugin root |
| `readme-references-skill` | warning | README should mention the skill name |
| `trigger-fixtures-exist` | info | Test fixtures recommended |
| `trigger-fixtures-format` | error | trigger-cases.json must have "tests" array |
| `trigger-fixtures-count` | warning | Recommend ≥ 20 test cases |
| `package-json-exists` | warning | package.json recommended |
| `package-json-test-script` | warning | package.json should have "test" script |

### Size

Validates SKILL.md resource usage and context efficiency.

| Rule | Level | Description |
|------|-------|-------------|
| `skill-empty` | error | SKILL.md must not be empty |
| `skill-too-large` | error | Exceeds max line limit (default: 700) |
| `skill-getting-large` | warning | Approaching line limit (70% threshold) |
| `token-budget-exceeded` | error | Exceeds max token budget (default: 4000) |
| `context-budget` | warning | Total context (skill + metadata) too large for context window |

### References

Analyzes reference file usage and content organization.

| Rule | Level | Description |
|------|-------|-------------|
| `reference-file-count` | info | Count of reference files with token estimate |
| `reference-files` | info | Lists discovered reference files |
| `reference-loading-instructions` | warning | Reference files exist but SKILL.md has no loading guidance |
| `should-use-references` | warning | Large skill (>400 lines) with no reference files |
| `readme-too-long` | warning | README.md exceeds 150 lines |
| `duplicate-code-blocks` | warning | Duplicate code between README and SKILL.md |
| `fixture-too-large` | warning | trigger-cases.json exceeds 50 KB |

### Links

Validates all links in SKILL.md.

| Rule | Level | Description |
|------|-------|-------------|
| `broken-relative-link` | error | Relative file path doesn't resolve |
| `broken-reference-link` | error | Reference file path (references/*.md) missing |
| `anchor-link-invalid` | warning | #heading anchor doesn't match any heading |
| `external-link-unreachable` | warning | HTTP HEAD returns error (opt-in via `checkExternal`) |

### Keywords

Simulates keyword-based triggering and description quality (⚠️ NOT real Claude behavior).

| Rule | Level | Description |
|------|-------|-------------|
| `simulation-warning` | info | Always shown — reminds this is a proxy only |
| `no-test-cases` | warning | No trigger-cases.json found |
| `accuracy-below-threshold` | error | Overall accuracy below configured minimum |
| `positive-accuracy` | warning | Positive case accuracy < 85% |
| `negative-accuracy` | warning | Negative case accuracy < 95% |
| `category-coverage` | info | Test cases cover fewer than 9 categories |
| `failed-case` | info | Details for each failed test case |
| `description-too-short` | warning | Description < 200 chars |
| `description-too-long` | warning | Description > 2000 chars |
| `description-quality-score` | info | 0–100 heuristic (word count, action verbs, specificity) |
| `keyword-overlap` | warning | Trigger keywords that are common English words |
| `missing-critical-keywords` | info | Domain terms in SKILL.md body absent from triggerKeywords |
| `anti-keyword-gaps` | info | Suggests anti-keywords for unrelated domains |

### Harness

Runs real prompts through an adapter and measures quality (requires Claude Code CLI).

| Rule | Level | Description |
|------|-------|-------------|
| `adapter-unavailable` | error | Adapter not available in environment |
| `no-integration-cases` | warning | No test cases found |
| `execution-failed` | error | Prompt execution failed |
| `skill-not-detected` | warning | Expected skill not triggered |
| `content-mismatch` | info | Expected content not in response |
| `integration-accuracy-low` | error | Accuracy below critical threshold (70%) |
| `integration-accuracy-moderate` | warning | Accuracy below warning threshold (90%) |
| `harness-latency` | warning | Response(s) exceeded 10s |
| `harness-response-quality` | info | Keyword overlap with expected content |
| `harness-token-efficiency` | info | Average tokens per successful response |

## Test Case Format

```json
{
  "version": "3.0.0",
  "description": "Skill triggering test cases",
  "skill": {
    "name": "my-skill-name",
    "triggerKeywords": ["keyword1", "keyword2"],
    "antiKeywords": ["exclude1", "exclude2"],
    "detectionPatterns": [],
    "criticalKeywords": ["critical1"]
  },
  "tests": [
    {
      "prompt": "How do I use keyword1?",
      "expected_skill": "my-skill-name",
      "should_trigger": true,
      "category": "positive"
    },
    {
      "prompt": "Something completely unrelated",
      "expected_skill": null,
      "should_trigger": false,
      "category": "negative"
    }
  ]
}
```

Both keywords and harness validators can use the same test case file.

## Architecture

```
skill-lint/
├── src/
│   ├── cli/                    # Commander.js CLI
│   │   ├── index.ts            # CLI orchestrator
│   │   └── commands/           # lint, check, init commands
│   ├── core/
│   │   ├── linter.ts           # Orchestrates 6 validators
│   │   └── result-collector.ts # Aggregate validation results
│   ├── validators/
│   │   ├── base-validator.ts   # Abstract validator interface
│   │   ├── structure-validator.ts
│   │   ├── size-validator.ts
│   │   ├── reference-validator.ts
│   │   ├── link-validator.ts
│   │   ├── keyword-validator.ts
│   │   └── harness-validator.ts
│   ├── adapters/
│   │   ├── base-adapter.ts     # Abstract adapter interface
│   │   ├── claude-code-adapter.ts
│   │   └── adapter-registry.ts
│   ├── formatters/
│   │   ├── base-formatter.ts   # Abstract formatter interface
│   │   ├── text-formatter.ts
│   │   ├── json-formatter.ts
│   │   └── github-actions-formatter.ts
│   ├── config/
│   │   ├── schema.ts           # Zod schema + defaults + backward compat
│   │   └── loader.ts           # Cosmiconfig integration
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   └── utils/
│       ├── constants.ts        # Thresholds and scoring constants
│       ├── file-utils.ts       # loadSkill, extractFrontmatter
│       └── logger.ts           # Semantic logging with emoji
├── tests/                      # 460+ tests
└── bin/
    └── skill-lint.js           # CLI entry point
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

    if (somethingWrong) {
      violations.push(this.createViolation(
        'error', 'rule-name', 'Message',
        { suggestion: 'How to fix it' }
      ));
    }

    return this.buildResult(violations, start);
  }
}
```

2. Register in `src/core/linter.ts`
3. Add scenario flag in `src/config/schema.ts`
4. Write tests in `tests/validators/my-validator.test.ts`

## Exit Codes

- `0` — All validations passed
- `1` — Validation failures (errors found)
- `2` — Execution error (file not found, config invalid, etc.)

## License

Apache-2.0 — Copyright 2026 SAP SE
