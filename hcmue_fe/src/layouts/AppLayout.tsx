import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { AppTopbar } from './AppTopbar'

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div
      className="min-h-screen bg-bg max-[1080px]:block min-[1080px]:grid"
      style={{
        gridTemplateColumns: sidebarCollapsed ? '68px minmax(0,1fr)' : '236px minmax(0,1fr)',
      }}
    >
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="flex flex-col min-w-0 min-h-screen">
        <AppTopbar />
        <main className="flex-1 min-h-0 overflow-y-auto px-5 py-[18px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
