import { ChevronDown, Moon, Sun } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useClickOutside } from '../hooks/useClickOutside'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../features/auth/useAuth'
import { roleLabels } from '../types/role'
import { getPageTitle } from './breadcrumbs'

export function AppTopbar() {
  const { session, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const closeUserMenu = useCallback(() => setUserMenuOpen(false), [])
  const userMenuRef = useClickOutside<HTMLDivElement>(closeUserMenu, userMenuOpen)
  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname])

  const userInitial = useMemo(() => {
    const label = session ? roleLabels[session.role] : 'U'
    return label.charAt(0).toUpperCase()
  }, [session])

  if (!session) {
    return null
  }

  return (
    <header className="flex items-center gap-4 min-h-16 px-5 bg-surface border-b border-border shadow-sm sticky top-0 z-30">
      {/* Page title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <p className="m-0 text-[17px] font-bold text-primary leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
          {pageTitle}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Theme toggle */}
        <button
          type="button"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-surface text-primary cursor-pointer hover:bg-primary-100 transition-colors"
          aria-label={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
          title={theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng'}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
        </button>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-full border border-border bg-surface cursor-pointer hover:bg-bg-soft transition-colors"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            <span
              className="w-9 h-9 rounded-full inline-flex items-center justify-center font-bold text-sm bg-primary text-surface shrink-0"
              aria-hidden
            >
              {userInitial}
            </span>
            <span className="hidden min-[1080px]:flex flex-col items-start min-w-0">
              <span className="text-sm font-semibold max-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis">
                {roleLabels[session.role]}
              </span>
            </span>
            <ChevronDown size={18} className="text-muted hidden min-[1080px]:block" aria-hidden />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] min-w-[200px] p-3 rounded-xl border border-border bg-surface shadow-md z-50"
              role="menu"
            >
              <p className="text-[13px] font-bold text-primary mb-2 m-0">Tài khoản</p>
              <button
                type="button"
                className="block w-full text-left px-2.5 py-2 rounded-lg bg-transparent border-0 text-sm cursor-pointer hover:bg-primary-100 transition-colors"
                role="menuitem"
                onClick={closeUserMenu}
              >
                Hồ sơ (mô phỏng)
              </button>
              <button
                type="button"
                className="block w-full text-left px-2.5 py-2 rounded-lg bg-transparent border-0 text-sm cursor-pointer hover:bg-primary-100 transition-colors"
                role="menuitem"
                onClick={closeUserMenu}
              >
                Cài đặt (mô phỏng)
              </button>
              <hr className="border-0 border-t border-border my-2" />
              <button
                type="button"
                className="block w-full text-left px-2.5 py-2 rounded-lg bg-transparent border-0 text-sm text-accent font-semibold cursor-pointer hover:bg-accent-50 transition-colors"
                role="menuitem"
                onClick={() => {
                  closeUserMenu()
                  void logout().finally(() => {
                    navigate('/login', { replace: true })
                  })
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
