import type { PropsWithChildren } from 'react'

export function Badge(props: PropsWithChildren) {
  return (
    <span className="inline-flex w-fit mb-3 rounded-full px-2.5 py-1.5 text-accent bg-accent-50 text-[13px] font-semibold">
      {props.children}
    </span>
  )
}
