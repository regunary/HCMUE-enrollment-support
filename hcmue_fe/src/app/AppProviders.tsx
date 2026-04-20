/**
 * English note: Wraps top-level providers used by the whole application.
 */
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthContext'
import { appRouter } from './routes'

export function AppProviders() {
  return (
    <AuthProvider>
      <RouterProvider router={appRouter} />
    </AuthProvider>
  )
}
