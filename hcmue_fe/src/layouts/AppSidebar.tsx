import { PanelLeft } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logoImage from '../assets/logo-hcmue.png'
import { useAuth } from '../features/auth/useAuth'
import { navByRole } from './navigation'

type AppSidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function AppSidebar({ collapsed, onToggleCollapse }: AppSidebarProps) {
  const { session } = useAuth()

  if (!session) {
    return null
  }

  const navSections = navByRole[session.role]

  return (
    <aside
      className={[
        'flex flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200',
        'max-[1080px]:static max-[1080px]:h-auto max-[1080px]:w-full',
        'min-[1080px]:sticky min-[1080px]:top-0 min-[1080px]:h-screen',
        collapsed ? 'min-[1080px]:w-[68px]' : 'min-[1080px]:w-[236px]',
      ].join(' ')}
    >
      {/* Header */}
      <div
        className={[
          'flex items-center min-h-16 shrink-0 bg-sidebar border-b border-sidebar-border',
          collapsed ? 'justify-center px-2 py-4' : 'justify-between gap-2 px-4',
        ].join(' ')}
      >
        <div className={`flex items-center min-w-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <img
            src={logoImage}
            alt="HCMUE"
            className="w-11 h-11 rounded-lg shrink-0 object-contain"
            width={44}
            height={44}
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-primary text-[17px] font-bold leading-tight truncate">
                Tuyển sinh
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 inline-flex items-center justify-center w-[34px] h-[34px] rounded-lg border border-sidebar-border bg-transparent text-sidebar-text cursor-pointer hover:bg-sidebar-hover hover:text-primary transition-colors"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
        >
          <PanelLeft size={16} />
        </button>
      </div>

      {/* Nav scroll */}
      <div
        className={[
          'flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-brand',
          collapsed ? 'px-2 py-3' : 'p-4',
        ].join(' ')}
      >
        {navSections.map((section) => (
          <section key={section.title} className="mb-5">
            {!collapsed && (
              <p className="text-[11px] font-bold uppercase tracking-widest text-sidebar-muted mb-2 ml-1 m-0">
                {section.title}
              </p>
            )}
            <nav className="flex flex-col gap-1" aria-label={section.title}>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg border transition-colors',
                      collapsed ? 'justify-center p-[10px]' : 'px-3 py-[10px]',
                      isActive
                        ? 'text-primary bg-sidebar-active border-primary/35 shadow-[inset_3px_0_0_var(--color-primary)]'
                        : 'text-sidebar-text border-transparent hover:bg-sidebar-hover hover:text-primary',
                    ].join(' ')
                  }
                >
                  <span className="inline-flex items-center justify-center shrink-0">
                    <item.icon size={18} aria-hidden="true" />
                  </span>
                  {!collapsed && (
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  )
}
