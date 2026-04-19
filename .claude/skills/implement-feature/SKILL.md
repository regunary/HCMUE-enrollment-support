---
name: implement-feature
description: Safely implement a backend/frontend feature with scoped analysis, coding, and review.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# implement-feature

## Step 1: Understand
- Summarize the feature in 3-5 bullets.
- Identify backend files, frontend files, and tests likely affected.
- List assumptions before editing.

## Step 2: Contract first
- If API changes, define request/response first.
- Keep naming aligned across serializer, service, TS types, and UI labels.

## Step 3: Implement
- Backend: serializer -> service -> view -> tests.
- Frontend: types -> API client -> UI state -> components.

## Step 4: Verify
- Review permissions.
- Review edge cases.
- Add/update tests.

## Step 5: Final report
Return:
- changed files
- assumptions
- risks
- follow-up suggestions
