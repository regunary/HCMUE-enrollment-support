import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PropsWithChildren } from 'react'
import { IconButton } from '../IconButton/IconButton'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.closest('[hidden], [aria-hidden="true"]')) {
      return false
    }
    const style = window.getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none'
  })
}

export function Drawer(
  props: PropsWithChildren<{
    open: boolean
    title: string
    onClose: () => void
    titleId?: string
  }>,
) {
  const { open, onClose, title, titleId: titleIdProp, children } = props
  const titleId = titleIdProp ?? 'import-drawer-title'
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const items = getFocusableElements(panel)
      const target = items[0] ?? panel
      target.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, title])

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const items = getFocusableElements(panel)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (!panel.contains(active)) return
    if (event.shiftKey) {
      if (active === first) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex" role="presentation">
      <button
        type="button"
        className="flex-1 border-none p-0 m-0 cursor-pointer"
        style={{ background: 'var(--color-overlay)' }}
        aria-label="Đóng"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="relative w-[min(460px,100vw)] h-full bg-surface border-l border-border flex flex-col shadow-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onPanelKeyDown}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <h2 id={titleId} className="text-lg font-bold text-primary leading-snug m-0">
            {title}
          </h2>
          <IconButton icon={<X size={20} aria-hidden />} label="Đóng panel" onClick={onClose} />
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 scrollbar-brand">{children}</div>
      </aside>
    </div>
  )
}
