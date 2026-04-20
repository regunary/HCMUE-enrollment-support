/**
 * English note: Central runtime config from Vite env; swap mock vs live without code changes elsewhere.
 */
function envBool(value: string | undefined, defaultTrue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultTrue
  }
  return value === '1' || value.toLowerCase() === 'true'
}

export const appEnv = {
  /** API origin, no trailing slash */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  /** Prefer mock data until backend is wired */
  useMock: envBool(import.meta.env.VITE_USE_MOCK, true),
} as const
