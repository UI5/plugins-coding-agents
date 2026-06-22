# Documentation Phase Templates

After Phase 5 completes, create these two files and commit them.

---

## MODERNIZATION-ISSUES.md

Use this template for unfixable errors:

```markdown
# UI5 Modernization - Unfixable Issues

This document lists issues that could not be automatically fixed.

Generated: [DATE]

## Summary
- Total unfixable issues: [COUNT]

## Issues by File

### [file-path]

#### Issue 1
- **Rule**: [rule-id]
- **Line**: [line-number]
- **Error**: [error-message]
- **Attempted Fix**: [what was tried]
- **Reason Not Fixed**: [specific technical reason]
- **Suggested Manual Action**: [what the developer should do]
```

---

## MODERNIZATION-REPORT.md

Use this template for the final summary:

```markdown
# UI5 Modernization Summary

Model: [MODEL-NAME]
Generated: [DATE]
Verification mode: [full autonomous / half autonomous / manual]

## Statistics

| Phase | Errors | Warnings | Total |
|---|---|---|---|
| Baseline | [X] | [Y] | [Z] |
| After Phase 1 (autofix + test starter) | [X] | [Y] | [Z] |
| After Phase 2 (foundation) | [X] | [Y] | [Z] |
| After Phase 3 (module system) | [X] | [Y] | [Z] |
| After Phase 4 (deprecated APIs) | [X] | [Y] | [Z] |
| After Phase 5 (CSP) | [X] | [Y] | [Z] |

## Improvement
- **Resolved**: [N] issues ([P]%)
- **Remaining**: [N] (see MODERNIZATION-ISSUES.md)

## Verification Results
[Per-phase build/test pass/fail summary, if gates were run]

## Next Steps
[Recommended manual actions]
```
