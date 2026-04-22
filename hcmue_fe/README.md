<!-- Quick start and environment notes for the frontend project. -->
# hcmue_fe - Frontend

- React + TypeScript + Vite
- Zod for data validation

## Node version

This project is currently aligned to:

- Node `24.11.1`
- npm `11.6.2`

To avoid version conflicts:

- use `.nvmrc` with `nvm use`
- follow `engines` in `package.json`

## Start

```bash
nvm use
npm install
npm run dev
```

## Structure

- `src/main.tsx`: application bootstrap
- `src/app/routes.tsx`: route registry
- `src/styles/`: tokens, reset, and global styles
- `src/schemas/`: Zod schemas

## Notes

Base frontend setup for the HCMUE enrollment support system.
