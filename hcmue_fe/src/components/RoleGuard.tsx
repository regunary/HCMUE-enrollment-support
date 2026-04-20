/**
 * English note: Route guard to enforce login and role-based access.
 */
import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import type { UserRole } from '../types/role'

type RoleGuardProps = PropsWithChildren<{
  allowedRoles?: UserRole[]
}>

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to={`/dashboard/${session.role}`} replace />
  }

  return <>{children}</>
}
