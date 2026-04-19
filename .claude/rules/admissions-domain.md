---
paths:
  - "backend/**/*.py"
  - "frontend/src/**/*.{ts,tsx}"
  - "src/**/*.{ts,tsx}"
---

# Admissions Domain Rules

## Core entities
- Candidate
- Subject score set
- Combination
- Major
- Aspiration
- Exclusion list
- Admission condition
- Cut-off score
- Admission result

## Business invariants
- Candidate identity is centered on CCCD unless the existing system defines another canonical key.
- Candidate subject sets may differ; code must not assume uniform subject columns.
- A combination can have weighted subjects.
- A major can accept multiple combinations.
- Admission result depends on both score and eligibility condition.

## Analytical scopes
Support filters for:
- all candidates
- candidates applying to the institution
- by major
- by combination within major
- by institution-wide combination
- by score threshold/range where applicable

## Guardrails
- Do not rename domain terms casually.
- Do not change formulas without documenting the impact.
- Keep export columns deterministic.
