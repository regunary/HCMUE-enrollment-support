import { useState } from 'react'
import { Button } from '../Button/Button'

type ToastItem = { id: number; message: string }

export function ToastDemo() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = () => {
    const item = { id: Date.now(), message: 'Đã lưu dữ liệu mô phỏng thành công.' }
    setToasts((current) => [...current, item])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== item.id))
    }, 2000)
  }

  return (
    <div className="mt-3">
      <Button variant="secondary" onClick={push}>
        Test Toast
      </Button>
      <div className="fixed right-5 bottom-5 grid gap-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="border border-border bg-surface rounded-lg px-3 py-2.5 shadow-sm text-sm"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
