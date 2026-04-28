/**
 * English note: Wraps top-level providers used by the whole application.
 */
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '../features/auth/AuthContext'
import { ToastProvider } from '../features/feedback/ToastContext'
import { appRouter } from './routes'

export function AppProviders() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={appRouter} />
      </AuthProvider>
    </ToastProvider>
  )
}
