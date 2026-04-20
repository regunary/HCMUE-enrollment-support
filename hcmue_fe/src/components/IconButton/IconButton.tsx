import type { ReactNode } from 'react'

export function IconButton(props: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center w-10 h-10 border border-border bg-surface text-primary rounded-full cursor-pointer hover:bg-primary-100 transition-colors"
      aria-label={props.label}
      onClick={props.onClick}
    >
      {props.icon}
    </button>
  )
}
