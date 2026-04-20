/**
 * English note: Toggle implemented as a labeled checkbox for simplicity.
 */
import { Checkbox } from '../Checkbox/Checkbox'

export function Switch(props: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <Checkbox checked={props.checked} onChange={props.onChange} label={props.label} />
}
