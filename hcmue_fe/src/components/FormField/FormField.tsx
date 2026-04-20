import type { PropsWithChildren } from 'react'

export function FormField(props: PropsWithChildren<{ label: string; error?: string }>) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {props.label}
      </span>
      {props.children}
      {props.error ? (
        <small className="text-accent text-sm">{props.error}</small>
      ) : null}
    </label>
  )
}
