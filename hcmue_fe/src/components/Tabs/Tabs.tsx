export function Tabs(props: {
  tabs: Array<{ key: string; label: string }>
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 my-4">
      {props.tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`border rounded-full px-3 py-2 text-sm cursor-pointer transition-colors ${
            props.value === tab.key
              ? 'border-primary bg-primary-100 text-primary font-bold'
              : 'border-border bg-surface text-primary hover:bg-primary-100 hover:border-primary'
          }`}
          onClick={() => props.onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
