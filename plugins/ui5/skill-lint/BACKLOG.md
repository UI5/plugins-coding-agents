# skill-lint Development Backlog

> **Status:** Phase 1 Testing — 66% Coverage Achieved (Target: 80%)  
> **Last Updated:** 2026-05-20  
> **Current Version:** 1.0.0

## Legend

- 🔴 **CRITICAL** — Blocking issue or high-priority work
- 🟡 **HIGH** — Important for production readiness
- 🟢 **MEDIUM** — Nice to have, improves functionality
- 🔵 **LOW** — Future enhancement, not urgent

Status:
- ⬜ Not Started
- 🟨 In Progress
- ✅ Done
- ❌ Blocked
- ⏸️ Paused

---

## 📊 Today's Progress (2026-05-20)

### ✅ Completed
1. **Test Infrastructure Setup**
   - Installed Vitest 4.1.7 + coverage plugin
   - Created test directory structure (6 categories)
   - Configured vitest.config.ts with 80% coverage thresholds
   - Added test scripts to package.json

2. **Test Implementation**
   - Created 54 unit tests across 6 test files
   - Config schema: 13/13 tests passing ✅
   - Triggering validator: 12/12 tests passing ✅
   - JSON formatter: 8/8 tests passing ✅
   - Structure validator: 7/7 tests passing ✅
   - Performance validator: 9/9 tests passing ✅
   - File utils: 5/5 tests passing ✅

3. **Critical Issue Resolution**
   - Fixed extractFrontmatter() to return empty object instead of throwing
   - Fixed PerformanceValidator to count lines from skill.content
   - Fixed vitest.config.ts to exclude dist/ from test execution
   - Updated test expectations to match actual validator rule names

4. **Coverage Report**
   - **Overall: 66% coverage** (below 80% target)
   - Config: 100% ✅
   - JSON formatter: 100% ✅
   - Performance validator: 98.7% ✅
   - Triggering validator: 71% 🟡
   - Structure validator: 58% 🟨
   - Integration validator: 54% 🟨
   - File utils: 27.58% 🔴
   - GitHub Actions formatter: 0% 🔴

### 🟡 Remaining Work
1. **Add tests for uncovered code:**
   - file-utils.ts: loadSkill(), findPluginRoot(), countLines()
   - github-actions-formatter.ts: All functions (0% coverage)
   - integration-validator.ts: Adapter integration tests
   - structure-validator.ts: File system operation tests

2. **Estimated effort to reach 80% coverage:** 1-2 days

### 📈 Metrics
- **Test Pass Rate:** 100% (54/54 tests) ✅
- **Coverage:** 66% (target: 80%)
- **Test Execution Time:** ~380ms
- **Code Quality:** Strong (strict TypeScript, readonly types, immutability)

---

---

## Phase 1: Testing & Quality 🔴 CRITICAL

### 1.1 Unit Tests (🟨 In Progress — 66% Coverage Achieved)
**Priority:** 🔴 CRITICAL  
**Effort:** 3-5 days  
**Target Coverage:** 80%+  
**Status Update (2026-05-20):** Test infrastructure complete, 54 tests passing (100%), 66% coverage achieved

#### Validators
- [x] `tests/validators/structure-validator.test.ts` — Complete (7 tests, ✅ ALL PASSING)
- [x] `tests/validators/performance-validator.test.ts` — Complete (9 tests, ✅ ALL PASSING)
- [x] `tests/validators/triggering-validator.test.ts` — Complete (12 tests, ✅ ALL PASSING)
- [ ] `tests/validators/integration-validator.test.ts` — Not yet created (54% coverage)

#### Formatters
- [x] `tests/formatters/json-formatter.test.ts` — Complete (8 tests, ✅ ALL PASSING, 100% coverage)
- [ ] `tests/formatters/text-formatter.test.ts` — Not yet created (60% coverage)
- [ ] `tests/formatters/github-actions-formatter.test.ts` — Not yet created (0% coverage)

#### Config
- [x] `tests/config/schema.test.ts` — Complete (13 tests, ✅ ALL PASSING, 100% coverage)
- [ ] `tests/config/loader.test.ts` — Not yet created

#### Utils
- [x] `tests/utils/file-utils.test.ts` — Partial (5 tests, ✅ ALL PASSING, but only 27.58% coverage)
  - Missing: loadSkill(), findPluginRoot(), countLines() tests
- [ ] `tests/utils/logger.test.ts` — Not yet created

#### Adapters
- [ ] `tests/adapters/claude-code-adapter.test.ts` — Not yet created

**Test Framework:** ✅ Vitest 4.1.7 configured with coverage  
**Dependencies:** Vitest, @vitest/coverage-v8  
**Current Results:** 54 tests written, 54 passing (100% pass rate), 66% coverage  
**Coverage Breakdown:**
- Config: 100% ✅
- JSON Formatter: 100% ✅
- Performance Validator: 98.7% ✅
- Triggering Validator: 71% 🟡
- Structure Validator: 58% 🟨
- Integration Validator: 54% 🟨
- File Utils: 27.58% 🔴
- GitHub Actions Formatter: 0% 🔴

**Next Steps to Reach 80%:**
1. Add file-utils tests (loadSkill, findPluginRoot, countLines)
2. Add github-actions-formatter tests
3. Add integration-validator tests
4. Expand structure-validator tests with file mocks

---

### 1.2 Integration Test Cases (⬜ Not Started)
**Priority:** 🟢 MEDIUM  
**Effort:** 1-2 days

- [ ] Convert remaining 27 test cases from `test-cases.ts` to JSON
- [ ] Add edge cases:
  - Empty responses
  - Timeout scenarios
  - Rate limiting
  - Multi-skill detection
  - Pattern matching edge cases
- [ ] Test with different adapter configurations
- [ ] Test unified format (triggering tests as integration tests)

**Current:** 3 test cases in JSON, 27 in TypeScript  
**Target:** 30+ test cases in unified JSON format

---

### 1.3 E2E Tests (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 2 days

- [ ] CLI argument parsing
  - All combinations of scenario flags
  - Config file path resolution
  - Output file creation
  
- [ ] Config file discovery
  - `.skilllintrc.json`
  - `.skilllintrc.yaml`
  - `package.json` section
  
- [ ] Error handling
  - Invalid skill path
  - Missing test files
  - Malformed config
  
- [ ] Exit codes
  - 0 = pass
  - 1 = violations
  - 2 = execution error

---

## Phase 2: Feature Completion 🟢 MEDIUM

### 2.1 Parallel Execution (⬜ Not Started)
**Priority:** 🟢 MEDIUM  
**Effort:** 2-3 days

- [ ] Refactor `SkillLinter.lint()` to use `Promise.all()`
- [ ] Add concurrency control (max parallel validators config)
- [ ] Handle race conditions in logging
- [ ] Update tests for parallel execution
- [ ] Add performance benchmarks (sequential vs parallel)

**Config exists:** `execution.parallel: boolean`  
**Current:** Sequential execution only

---

### 2.2 HTML Formatter (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 1-2 days

**Decision Required:** Implement or Remove?

**Option A: Implement**
- [ ] Create `src/formatters/html-formatter.ts`
- [ ] Design HTML template with CSS
- [ ] Support dark/light themes
- [ ] Add charts for metrics (Chart.js or similar)

**Option B: Remove** (Recommended)
- [ ] Remove 'html' from config schema enum
- [ ] Update documentation

---

### 2.3 Watch Mode (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 2 days

- [ ] Add `skill-lint watch <path>` command
- [ ] Install `chokidar` for file watching
- [ ] Implement debouncing (500ms)
- [ ] Clear terminal between runs
- [ ] Add file change notifications
- [ ] Keyboard shortcuts:
  - `r` = re-run
  - `c` = clear
  - `q` = quit
- [ ] Watch config file for changes

---

## Phase 3: Multi-Skill Support 🟢 MEDIUM

### 3.1 Bulk Linting (⬜ Not Started)
**Priority:** 🟢 MEDIUM  
**Effort:** 2-3 days

- [ ] Add glob pattern support: `skill-lint lint skills/**`
- [ ] Add `--all` flag to lint all skills in workspace
- [ ] Aggregate results across skills
- [ ] Create summary table (skills × scenarios)
- [ ] Support parallel skill processing
- [ ] Add `--continue-on-error` flag
- [ ] Add `--fail-fast` flag

**Example:**
```bash
skill-lint lint 'skills/**' --all --parallel
```

---

### 3.2 Comparative Reports (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 2 days

- [ ] Compare multiple skills side-by-side
- [ ] Accuracy comparison table
- [ ] Performance metrics across skills (lines, tokens)
- [ ] Best practices compliance score
- [ ] Identify outliers (longest, lowest accuracy, etc.)
- [ ] Export comparative report as CSV/HTML

---

## Phase 4: CI/CD Integration 🟡 HIGH

### 4.1 GitHub Actions Workflow (⬜ Not Started)
**Priority:** 🟡 HIGH  
**Effort:** 1 day

- [ ] Create `.github/workflows/skill-lint.yml`
- [ ] Run on PRs targeting main
- [ ] Add status check requirement
- [ ] Cache npm dependencies
- [ ] Upload JSON reports as artifacts
- [ ] Comment results on PR (optional)
- [ ] Support matrix testing (multiple Node versions)

**Sample Workflow:**
```yaml
name: Skill Linting
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm test -- -f github-actions
```

---

### 4.2 Pre-commit Hook (⬜ Not Started)
**Priority:** 🟢 MEDIUM  
**Effort:** 1 day

- [ ] Add `husky` dependency
- [ ] Add `lint-staged` configuration
- [ ] Configure to run on `skills/*/SKILL.md` changes
- [ ] Add setup instructions to README

**Configuration:**
```json
{
  "lint-staged": {
    "skills/*/SKILL.md": "npm run lint"
  }
}
```

---

## Phase 5: Documentation 🟢 MEDIUM

### 5.1 Tutorial/Walkthrough (⬜ Not Started)
**Priority:** 🟢 MEDIUM  
**Effort:** 1 day

Create `docs/TUTORIAL.md`:
- [ ] "Creating your first skill with linting"
- [ ] "Writing effective trigger test cases"
- [ ] "Understanding validation errors"
- [ ] "Debugging failed validations"
- [ ] "Optimizing skill performance"
- [ ] "Best practices for skill structure"

---

### 5.2 Migration Guide (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 1 day

Create `docs/MIGRATION.md`:
- [ ] Migrating from AVA tests
- [ ] Converting existing test cases
- [ ] Mapping AVA assertions to validation rules
- [ ] Common pitfalls and solutions
- [ ] Before/after examples

---

### 5.3 API Documentation (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 2 days

- [ ] Set up TypeDoc
- [ ] Add JSDoc comments to all public APIs
- [ ] Generate HTML documentation
- [ ] Publish to GitHub Pages
- [ ] Add API docs link to README

---

## Phase 6: Advanced Features 🔵 LOW

### 6.1 Custom Rules (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 3-4 days

- [ ] Design custom rule schema
- [ ] Implement rule engine
- [ ] Add regex pattern matching
- [ ] Support custom violation levels
- [ ] Add rule configuration in config file

**Example Config:**
```json
{
  "customRules": {
    "no-hardcoded-urls": {
      "pattern": "https?://(?!example\\.com)",
      "level": "warning",
      "message": "Avoid hardcoded URLs except example.com"
    }
  }
}
```

---

### 6.2 Auto-fix Mode (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 5+ days

- [ ] Identify fixable violations
- [ ] Implement fix transformations
- [ ] Add `--fix` flag
- [ ] Add `--dry-run` mode
- [ ] Backup original files before fixing
- [ ] Show diff of changes
- [ ] Support interactive mode (approve each fix)

**Fixable Rules:**
- Frontmatter formatting
- Metadata completeness
- File organization

---

### 6.3 Plugin System (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 3-4 days

- [ ] Design plugin API
- [ ] Implement plugin loader
- [ ] Support npm packages as plugins
- [ ] Plugin discovery and registration
- [ ] Plugin configuration

**Example:**
```json
{
  "plugins": [
    "@company/skill-lint-plugin-security",
    "@company/skill-lint-plugin-i18n"
  ]
}
```

---

### 6.4 Performance Profiling (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 2 days

- [ ] Add `--profile` flag
- [ ] Track validator execution time
- [ ] Track memory usage
- [ ] Identify bottlenecks
- [ ] Generate flame graphs
- [ ] Optimization suggestions

---

## Phase 7: Multi-Agent Support 🔵 LOW

### 7.1 Additional Adapters (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 2-3 days per adapter

- [ ] **OpenAI GPT Adapter**
  - Direct API integration
  - Model selection (gpt-4, gpt-3.5-turbo)
  - Token usage tracking
  
- [ ] **Anthropic Claude API Adapter**
  - Direct API (not CLI)
  - Support Claude 3+ models
  
- [ ] **Local LLM Adapter**
  - Ollama support
  - LM Studio support
  
- [ ] **Mock Adapter**
  - For testing without API calls
  - Configurable responses

---

### 7.2 Adapter Configuration (⬜ Not Started)
**Priority:** 🔵 LOW  
**Effort:** 1-2 days

- [ ] Per-adapter config schema
- [ ] Environment variable support
- [ ] API key management
- [ ] Model selection per adapter
- [ ] Timeout and retry settings

**Example:**
```json
{
  "adapters": {
    "claude-code": {
      "timeout": 60000,
      "maxRetries": 2
    },
    "openai": {
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4",
      "temperature": 0
    }
  }
}
```

---

## Known Issues & Blockers

### 🔴 Critical Issues

- [ ] **Integration tests fail with local proxy**
  - Error: `API Error: 400 output_config.effort: Extra inputs are not permitted`
  - Cause: Local proxy doesn't support `effortLevel` parameter
  - **Resolution Options:**
    1. Fix proxy configuration
    2. Use Claude API directly
    3. Accept as environment limitation ✅ (Current)

---

## Completed Work ✅

### MVP Implementation (✅ 2026-05-20)
- ✅ Core linter architecture (validators, adapters, formatters)
- ✅ 4 validators (structure, performance, triggering, integration)
- ✅ 3 formatters (text, json, github-actions)
- ✅ CLI with 3 commands (lint, check, init)
- ✅ Configuration system (Zod + cosmiconfig)
- ✅ TypeScript with strict mode
- ✅ Immutable data patterns

### Skill-Agnostic Refactoring (✅ 2026-05-20)
- ✅ Removed hardcoded UI5 patterns
- ✅ Added skill metadata to trigger-cases.json (v3.0.0)
- ✅ Updated validators to read patterns from metadata
- ✅ Unified test case format (triggering + integration)
- ✅ Made ClaudeCodeAdapter pattern-agnostic
- ✅ Updated types for SkillTestConfiguration

### Documentation (✅ 2026-05-20)
- ✅ Comprehensive README.md (316 lines)
- ✅ Architecture documentation
- ✅ Usage examples
- ✅ Extension guides
- ✅ .gitignore
- ✅ package.json metadata (keywords, repo, homepage)

### Testing (🟨 2026-05-20 — In Progress)
- ✅ Manual testing of all scenarios (9/9)
- ✅ Verified skill-agnostic operation
- ✅ Validated all output formats
- ✅ Confirmed 100% triggering accuracy (32/32 cases)
- 🟨 **Unit tests added (38 tests, 32 passing = 84%)**
  - Vitest framework configured
  - Config tests: 13/13 passing
  - Triggering tests: 12/12 passing  
  - JSON formatter tests: 8/8 passing
  - Structure tests: 4/7 passing (needs file mocks)
  - Performance tests: 0/9 passing (needs investigation)
  - File-utils tests: 1/5 passing (needs graceful error handling)

---

## Metrics & Goals

### Current Status
- **Code Coverage:** 0% (no unit tests yet)
- **Performance:** < 10ms for structure+performance+triggering
- **Reliability:** 100% accuracy on triggering tests
- **Documentation:** README complete, tutorial pending

### Target Metrics
- **Code Coverage:** 80%+
- **Performance:** < 10s including integration tests
- **Reliability:** 0 false positives
- **Usability:** < 5 min from clone to first successful lint

---

## Sprint Planning

### 🎯 Sprint 1 (Recommended Next — 2 weeks)
**Focus:** Testing Foundation + CI/CD

1. ✅ Document work (DONE)
2. ✅ Make skill-agnostic (DONE)
3. ⬜ Add unit tests for core validators (structure, performance, triggering)
4. ⬜ Set up GitHub Actions workflow
5. ⬜ Add formatters unit tests

**Deliverable:** 50%+ test coverage, automated PR checks

---

### 🎯 Sprint 2 (2 weeks)
**Focus:** Complete Testing + Usability

1. ⬜ Complete unit test coverage (80%+)
2. ⬜ Add E2E tests
3. ⬜ Implement parallel execution
4. ⬜ Create tutorial documentation
5. ⬜ Add pre-commit hook

**Deliverable:** 80%+ coverage, developer-friendly workflow

---

### 🎯 Sprint 3 (2 weeks)
**Focus:** Feature Expansion

1. ⬜ Bulk linting (multiple skills)
2. ⬜ Watch mode
3. ⬜ Convert remaining integration test cases
4. ⬜ Comparative reports
5. ⬜ Migration guide

**Deliverable:** Enhanced functionality for multi-skill projects

---

## Notes

- **Current Version:** 1.0.0 (MVP)
- **Production Ready:** Yes (for structure/performance/triggering)
- **Integration Ready:** Partial (blocked by proxy config)
- **Next Release Target:** 1.1.0 (with unit tests + CI/CD)

**Last Review:** 2026-05-20  
**Backlog Owner:** Development Team
