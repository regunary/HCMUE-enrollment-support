export function LineChart(props: { points: Array<{ label: string; value: number }> }) {
  return (
    <div className="mt-4 border border-border rounded-xl bg-surface p-4 grid gap-2">
      {props.points.map((point) => (
        <div key={point.label} className="flex justify-between items-center px-2.5 py-2 rounded-lg bg-table-head">
          <span className="text-sm text-muted">{point.label}</span>
          <strong className="text-sm font-semibold text-primary">{point.value.toFixed(2)}</strong>
        </div>
      ))}
    </div>
  )
}
