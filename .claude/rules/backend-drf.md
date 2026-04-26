---
paths:
  - "hcmue_be/**/*.py"
  - "hcmue_be/apps/**/*.py"
  - "hcmue_be/src/**/*.py"
---

# DRF Backend Rules

## API design
- Keep views/viewsets thin.
- Put calculation and import logic in services.
- Serializers validate all external input.
- Return stable response shapes.

## Permissions
- Admin can import and mutate master data.
- Admissions council can view aggregates, enter cut-off scores, and view results.
- Faculty is read-only for its scope.
- Never trust frontend role gating alone.

## Query and model practices
- Use `select_related` and `prefetch_related` where appropriate.
- Avoid putting raw JSON mutation logic in views.
- Use explicit indexes for high-cardinality lookup fields like CCCD, major code, combination code when relevant.

## Import behavior
- Imports must specify:
  - identity field
  - upsert behavior
  - changed-field update logic
  - validation error reporting
  - partial success policy
- Flexible Excel mapping should be normalized before persistence.

## Testing
- Add API tests for permission boundaries.
- Add service tests for formula-heavy logic.
