import { Upload } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'

type UploaderProps = {
  onFileSelected: (file: File) => void
  placeholder?: string
}

export function Uploader(props: UploaderProps) {
  const [selectedName, setSelectedName] = useState<string>('')

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedName(file.name)
      props.onFileSelected(file)
    }
  }
  return (
    <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-xl bg-surface cursor-pointer hover:border-primary hover:bg-primary-100 transition-colors group">
      <Upload size={16} className="text-muted group-hover:text-primary transition-colors shrink-0" aria-hidden />
      <span className="text-sm text-muted group-hover:text-primary transition-colors whitespace-nowrap">
        {selectedName || props.placeholder || 'Chọn file Excel'}
      </span>
      <input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={onChange} />
    </label>
  )
}
