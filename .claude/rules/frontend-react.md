---
paths:
  - "frontend/src/**/*.{ts,tsx}"
  - "src/**/*.{ts,tsx}"
---

# React + TypeScript + Vite Rules

## Component design
- Page components orchestrate data fetching and layout.
- Shared tables, filters, cards, charts, and dialogs should be extracted into reusable components.
- Keep form schemas and field mapping centralized.

## Data flow
- Use typed API clients.
- Normalize backend enums/status values in one place.
- Avoid duplicating server-derived values in local state.

## UX requirements
- Every async screen needs loading, empty, error states.
- Tables with sensitive data should support explicit column control and search.
- Import workflow should clearly show:
  - selected file
  - detected mapping
  - validation errors
  - update summary

## Charts and analytics
- Filters for major, combination, aspiration, and score threshold should be explicit and serializable.
- Keep percentile and score distribution terminology consistent with backend/API labels.
