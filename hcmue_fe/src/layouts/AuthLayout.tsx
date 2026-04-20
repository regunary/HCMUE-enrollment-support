import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <main className="min-h-screen grid place-items-center px-6 py-8 bg-bg">
      <Outlet />
    </main>
  )
}
