/**
 * English note: Thin JSON fetch wrapper; extend with auth headers when backend issues tokens.
 */
import { appEnv } from '../config/env'

function joinBaseAndPath(base: string, path: string): string {
  const b = base.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

export class ApiHttpError extends Error {
  readonly status: number
  readonly bodySnippet: string

  constructor(status: number, bodySnippet: string) {
    super(`HTTP ${status}: ${bodySnippet}`)
    this.name = 'ApiHttpError'
    this.status = status
    this.bodySnippet = bodySnippet
  }
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const url = joinBaseAndPath(appEnv.apiBaseUrl, path)
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
  const text = await response.text()
  if (!response.ok) {
    throw new ApiHttpError(response.status, text.slice(0, 240))
  }
  if (!text) {
    return undefined as T
  }
  return JSON.parse(text) as T
}
