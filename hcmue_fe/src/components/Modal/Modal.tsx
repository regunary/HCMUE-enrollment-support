import type { PropsWithChildren } from 'react'
import { Button } from '../Button/Button'

export function Modal(props: PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>) {
  if (!props.open) {
    return null
  }
  return (
    <div
      className="fixed inset-0 grid place-items-center z-[100]"
      style={{ background: 'var(--color-overlay)' }}
      role="dialog"
      aria-modal="true"
    >
      <article className="w-[min(520px,calc(100%-32px))] border border-border rounded-xl bg-surface p-5 grid gap-3 shadow-md">
        <h3 className="text-lg font-bold text-primary m-0">{props.title}</h3>
        {props.children}
        <Button variant="secondary" onClick={props.onClose}>
          Đóng
        </Button>
      </article>
    </div>
  )
}
