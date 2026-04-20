import { useMemo } from 'react'

export function HistogramChart(props: { bins: Array<{ label: string; value: number }> }) {
  const max = useMemo(() => Math.max(...props.bins.map((item) => item.value), 1), [props.bins])

  return (
    <div
      className="mt-4 border border-border rounded-xl bg-surface p-4 min-h-[220px] grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))', alignItems: 'end' }}
    >
      {props.bins.map((item) => (
        <div key={item.label} className="grid justify-items-center gap-2">
          <div
            className="w-9 min-h-[6px] rounded-lg bg-primary transition-all duration-300"
            style={{ height: `${(item.value / max) * 100}%` }}
          />
          <small className="text-xs text-muted">{item.label}</small>
        </div>
      ))}
    </div>
  )
}
