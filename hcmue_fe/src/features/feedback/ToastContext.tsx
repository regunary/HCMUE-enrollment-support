/**
 * English note: Global toast provider for user-facing notices.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { ToastContext } from './toastContextRef'
import { GLOBAL_TOAST_EVENT } from './toastEvents'

type ToastKind = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  message: string
  kind: ToastKind
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const item: ToastItem = { id: Date.now() + Math.floor(Math.random() * 1000), message, kind }
    setToasts((current) => [...current, item])
    const duration = item.kind === 'error' && item.message.length > 120 ? 9000 : item.message.length > 240 ? 7000 : 3200
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== item.id))
    }, duration)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  useEffect(() => {
    const onGlobalToast = (event: Event) => {
      const custom = event as CustomEvent<{ message?: unknown; kind?: unknown }>
      if (!custom.detail || typeof custom.detail.message !== 'string') {
        return
      }
      const kind = custom.detail.kind
      const safeKind: ToastKind = kind === 'success' || kind === 'error' || kind === 'info' ? kind : 'info'
      showToast(custom.detail.message, safeKind)
    }
    window.addEventListener(GLOBAL_TOAST_EVENT, onGlobalToast)
    return () => {
      window.removeEventListener(GLOBAL_TOAST_EVENT, onGlobalToast)
    }
  }, [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-5 bottom-5 z-[200] grid gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-64 max-w-[min(24rem,calc(100vw-2.5rem))] max-h-[70vh] overflow-y-auto whitespace-pre-wrap break-words rounded-md border px-3 py-2 text-sm shadow-sm ${
              toast.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : toast.kind === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-border bg-surface text-primary'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
