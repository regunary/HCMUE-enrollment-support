/**
 * English note: Central runtime config from Vite env; swap mock vs live without code changes elsewhere.
 */
function envBool(value: string | undefined, defaultTrue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultTrue
  }
  return value === '1' || value.toLowerCase() === 'true'
}

const rawBase = import.meta.env.VITE_API_BASE_URL as string | undefined
export const appEnv = {
  /** API origin or path prefix (e.g. http://host:port or /api). Empty = same-origin paths only. */
  apiBaseUrl: rawBase == null ? 'http://localhost:8021' : String(rawBase).trim(),
  /** Prefer mock data until backend is wired */
  useMock: envBool(import.meta.env.VITE_USE_MOCK, true),
} as const
