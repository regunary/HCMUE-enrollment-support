/**
 * English note: Lightweight authentication context for role-based mock sessions.
 */
import { createContext, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { UserRole } from '../../types/role'

const AUTH_STORAGE_KEY = 'hcmue-fe-auth'

type AuthState = {
  role: UserRole
}

type AuthContextValue = {
  session: AuthState | null
  login: (role: UserRole) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function getInitialSession(): AuthState | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as AuthState
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthState | null>(() => getInitialSession())

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      login: (role) => {
        const nextSession = { role }
        setSession(nextSession)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
      },
      logout: () => {
        setSession(null)
        localStorage.removeItem(AUTH_STORAGE_KEY)
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export { AuthContext }
