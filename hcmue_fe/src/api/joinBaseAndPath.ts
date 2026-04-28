/**
 * Join API base with paths from endpoints.ts (which include /api/...).
 * Prevents /api/api/... when the base already ends with /api (e.g. Docker VITE_API_BASE_URL=/api
 * or http://host:port/api).
 */
export function joinBaseAndPath(base: string, path: string): string {
  const b = base.trim().replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`

  if (b === '' || b === '/') {
    return p
  }

  // Same-origin reverse proxy: base is exactly "/api", path is already absolute from site root
  if (b === '/api' && p.startsWith('/api/')) {
    return p
  }

  // Base ends with .../api and path starts with /api/... → single /api segment
  if (p.startsWith('/api/') && /\/api$/i.test(b)) {
    return `${b}${p.slice(4)}`
  }

  return `${b}${p}`
}
