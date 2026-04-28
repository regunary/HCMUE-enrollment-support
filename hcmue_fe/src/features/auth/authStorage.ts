/**
 * English note: Shared auth storage access for session and token retrieval.
 */
import type { UserRole } from '../../types/role'

export const AUTH_STORAGE_KEY = 'hcmue-fe-auth'

export type AuthStorageState = {
  userId: string
  username: string
  fullname: string
  role: UserRole
  accessToken: string
  refreshToken: string
}

/** Gọi sau khi access (và tùy chọn refresh) được ghi vào localStorage — để AuthContext đồng bộ state. */
export type SessionTokensUpdate = { accessToken: string; refreshToken?: string }

type SessionTokensListener = (update: SessionTokensUpdate) => void

const sessionTokensListeners = new Set<SessionTokensListener>()

export function subscribeSessionTokens(listener: SessionTokensListener): () => void {
  sessionTokensListeners.add(listener)
  return () => {
    sessionTokensListeners.delete(listener)
  }
}

function emitSessionTokensUpdated(update: SessionTokensUpdate): void {
  for (const listener of sessionTokensListeners) {
    try {
      listener(update)
    } catch {
      // listener must not break storage writes
    }
  }
}

export function getStoredAccessToken(): string | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuthStorageState>
    return typeof parsed.accessToken === 'string' ? parsed.accessToken : null
  } catch {
    return null
  }
}

export function getStoredRefreshToken(): string | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuthStorageState>
    return typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null
  } catch {
    return null
  }
}

export function setStoredAccessToken(accessToken: string, refreshToken?: string): void {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuthStorageState>
    if (typeof parsed.refreshToken !== 'string') {
      return
    }
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        accessToken,
        ...(typeof refreshToken === 'string' ? { refreshToken } : {}),
      }),
    )
    emitSessionTokensUpdated({
      accessToken,
      ...(typeof refreshToken === 'string' ? { refreshToken } : {}),
    })
  } catch {
    // ignore malformed storage
  }
}

export function clearStoredSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
