export function NumberInput(props: {
  value: number | ''
  onChange: (value: number | '') => void
  min?: number
  max?: number
}) {
  return (
    <input
      type="number"
      className="field-base"
      value={props.value === '' ? '' : props.value}
      min={props.min}
      max={props.max}
      onChange={(event) => {
        const raw = event.target.value
        if (raw === '') {
          props.onChange('')
        } else {
          props.onChange(Number(raw))
        }
      }}
    />
  )
}
