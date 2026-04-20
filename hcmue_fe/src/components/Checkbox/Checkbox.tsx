export function Checkbox(props: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span className="text-sm">{props.label}</span>
    </label>
  )
}
