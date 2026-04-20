import type { PropsWithChildren } from 'react'

const variants = {
  primary:
    'border border-accent bg-accent text-surface rounded-lg px-3.5 py-2.5 text-sm font-medium cursor-pointer ' +
    'hover:bg-accent-700 hover:border-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  secondary:
    'border border-border bg-surface text-primary rounded-lg px-3.5 py-2.5 text-sm font-medium cursor-pointer ' +
    'hover:bg-primary-100 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
}

export function Button(
  props: PropsWithChildren<{
    onClick?: () => void
    type?: 'button' | 'submit'
    variant?: 'primary' | 'secondary'
    disabled?: boolean
  }>,
) {
  const variant = props.variant ?? 'primary'
  return (
    <button
      type={props.type ?? 'button'}
      className={variants[variant]}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}
