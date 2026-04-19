---
paths:
  - "backend/**/*.py"
  - "frontend/src/**/*Import*.{ts,tsx}"
  - "frontend/src/**/*Upload*.{ts,tsx}"
  - "src/**/*Import*.{ts,tsx}"
  - "src/**/*Upload*.{ts,tsx}"
---

# Excel Import Rules

## Import UX
- Show a clear mapping preview before final submit when possible.
- Surface row-level validation errors.
- Distinguish create vs update counts.

## Backend import logic
- Separate parsing, normalization, validation, and persistence.
- Capture unknown columns without crashing.
- Support manual edit fallback.

## Data handling
- Candidate fixed columns: CCCD, priority area, priority object, graduation year.
- Subject score group can be flexible and should support JSON-like normalization if needed.
- Combination import includes code, subjects, and weights.
- Aspiration import includes candidate identity, major code, and priority order.
- Cut-off import uses a strict template if the business requires it.

## Safety
- Never overwrite valid data with blank input unless explicitly configured.
- Generate import summary logs.
