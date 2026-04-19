---
name: review-pr
description: Review changed files before merge with emphasis on permissions, admission rules, and regressions.
allowed-tools: Read, Grep, Glob, Bash
---

# review-pr

## Review checklist
- Does the change preserve role boundaries?
- Does it alter any admission formula or eligibility rule?
- Are API changes reflected in TypeScript types?
- Are import/update semantics explicit?
- Are tests updated for changed logic?
- Any N+1 queries or missing indexes?
- Any risk of leaking personal candidate data?

## Output
Return:
- verdict: SHIP / FIX / BLOCK
- top risks
- required fixes
- optional improvements
