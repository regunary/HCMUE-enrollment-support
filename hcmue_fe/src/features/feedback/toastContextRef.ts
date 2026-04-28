import { createContext } from 'react'

type ToastKind = 'success' | 'error' | 'info'

export type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined)
