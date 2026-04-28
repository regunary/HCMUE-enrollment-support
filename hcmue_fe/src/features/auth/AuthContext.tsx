/**
 * English note: Authentication context backed by backend JWT endpoints.
 */
import { createContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { UserRole } from '../../types/role'
import { authApi } from '../../services/authApi'
import { AUTH_STORAGE_KEY, subscribeSessionTokens } from './authStorage'

type AuthState = {
  userId: string
  username: string
  fullname: string
  role: UserRole
  accessToken: string
  refreshToken: string
}

type AuthContextValue = {
  session: AuthState | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function isValidRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'council' || value === 'faculty'
}

function isAuthState(value: unknown): value is AuthState {
  if (!value || typeof value !== 'object') {
    return false
  }
  const data = value as Record<string, unknown>
  return (
    typeof data.userId === 'string' &&
    typeof data.username === 'string' &&
    typeof data.fullname === 'string' &&
    isValidRole(data.role) &&
    typeof data.accessToken === 'string' &&
    typeof data.refreshToken === 'string'
  )
}

function getInitialSession(): AuthState | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (isAuthState(parsed)) {
      return parsed
    }
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthState | null>(() => getInitialSession())

  useEffect(() => {
    return subscribeSessionTokens(({ accessToken, refreshToken }) => {
      setSession((prev) => {
        if (!prev) {
          return null
        }
        return {
          ...prev,
          accessToken,
          ...(refreshToken !== undefined ? { refreshToken } : {}),
        }
      })
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      login: async (username, password) => {
        const loginData = await authApi.login(username, password)
        const nextSession: AuthState = {
          userId: loginData.user.id,
          username: loginData.user.username,
          fullname: loginData.user.fullname,
          role: loginData.user.role,
          accessToken: loginData.access,
          refreshToken: loginData.refresh,
        }
        setSession(nextSession)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
      },
      logout: async () => {
        if (session) {
          try {
            await authApi.logout(session.refreshToken, session.accessToken)
          } catch {
            // Clear local session anyway; backend token may already be invalid/expired.
          }
        }
        setSession(null)
        localStorage.removeItem(AUTH_STORAGE_KEY)
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export { AuthContext }
