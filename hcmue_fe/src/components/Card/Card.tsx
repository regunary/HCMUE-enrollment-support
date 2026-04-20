import type { PropsWithChildren } from 'react'

export function Card(props: PropsWithChildren<{ title?: string }>) {
  return (
    <section className="border border-border rounded-2xl p-6 bg-surface shadow-sm w-full">
      {props.title ? (
        <h2 className="text-[17px] font-bold text-primary mb-4 mt-0">{props.title}</h2>
      ) : null}
      {props.children}
    </section>
  )
}
