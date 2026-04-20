/**
 * English note: Redirects authenticated users to their role dashboard.
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

export function DashboardRedirectPage() {
  const { session } = useAuth()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={`/dashboard/${session.role}`} replace />
}
