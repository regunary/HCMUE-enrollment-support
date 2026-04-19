# Admissions System Operating Manual

## Project context
This repository is an admissions management system for a university.
Main stack:
- Backend: Django + Django REST Framework
- Frontend: React + TypeScript + Vite
- Database: PostgreSQL
- Import/export: Excel files
- Domain: candidate data, combinations, majors, aspirations, exclusion lists, admission conditions, score calculation, percentile, score distribution, and admission result export.

## Product goals
The system supports:
- Admin: import data, manage combinations, majors, admission conditions, and export official results.
- Admissions council: view aggregate data, score distribution, percentile, enter cut-off scores, and review admitted candidates.
- Faculty: view data, score distribution, and cut-off scores by major, but cannot modify data.

## Engineering principles
- Always produce production-ready code, not demo code.
- Preserve existing business rules unless the task explicitly changes them.
- Prefer small, reversible changes.
- Do not invent fields, tables, or workflows without checking existing code.
- Keep backend business rules in service/domain layer, not scattered in views or React components.
- Keep frontend UI state separate from API contract mapping.

## Architecture rules
- Backend:
  - Use serializers for input validation.
  - Keep viewsets/views thin.
  - Put admission calculations in dedicated services.
  - Use transactions for multi-step writes.
  - Use explicit permissions per role.
  - Add tests for every changed business rule.
- Frontend:
  - Use typed API clients.
  - Keep pages focused on orchestration, extract reusable UI into components.
  - Keep filter state serializable.
  - Do not embed business formulas in UI unless they are purely presentational.
- Shared:
  - API request/response names must stay consistent across backend and frontend.
  - Every import flow must define conflict/update behavior explicitly.
  - Logging must avoid leaking personal data.

## Domain constraints
- Candidate import must support flexible Excel columns and update changed fields.
- Candidate scores may differ per candidate and should be modeled flexibly.
- Combination rules support weighted subjects.
- Admission conditions can include threshold rules per subject or academic requirement.
- Score distribution and percentile must support:
  - all candidates
  - by aspiration
  - by major
  - by combination within a major
  - by global combination across the institution
- Admission export is based on cut-off scores and eligibility rules.

## Code quality rules
- Functions should usually stay under 80 lines unless a longer function is justified.
- No duplicated calculation logic across backend and frontend.
- Add docstrings/comments only where they reduce ambiguity.
- Prefer explicit names over abbreviations.
- Validate edge cases:
  - duplicate CCCD
  - missing subject score
  - invalid combination mapping
  - repeated aspiration rank
  - import update collisions
  - permission leaks between Admin, Council, Faculty

## Testing minimum
For changed backend logic, add or update:
- serializer validation tests
- service tests
- API tests for permissions and happy path
For changed frontend logic, add or update:
- component behavior tests for critical UI
- API contract typing if endpoint shape changed

## Safe workflow
Before large edits:
1. Summarize the task.
2. Identify affected modules.
3. State assumptions.
4. Implement in small steps.
5. Review changed files for regression risk.

## Forbidden behavior
- Do not hardcode secrets.
- Do not bypass permission checks.
- Do not delete import history or audit-relevant fields without explicit instruction.
- Do not silently change admission formulas.
