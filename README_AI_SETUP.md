# AI project setup for Admissions System

This package gives you a production-oriented `.claude/` setup for a DRF + React + TypeScript + Vite system.

## Suggested repo shape

```text
hcmue_be/   # Django REST Framework
hcmue_fe/  # React + TypeScript + Vite
```

## What is included
- Root `CLAUDE.md`
- Optional local override example
- Path-scoped rules for backend, frontend, domain logic, and Excel import
- Agents for review and debugging
- Skills for feature implementation and PR review
- Hooks and settings examples
- MCP config example

## How to use
1. Copy these files into your repo root.
2. Adjust paths in `.claude/rules/*.md` if your folders differ.
3. Rename `CLAUDE.local.md.example` to `CLAUDE.local.md` for your own machine-only notes.
4. Rename `settings.local.json.example` to `settings.local.json` if needed.
5. Keep secrets out of committed files.
```
