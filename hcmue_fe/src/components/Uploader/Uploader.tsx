import { Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'

export function Uploader(props: { onFileSelected: (fileName: string) => void }) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileName = event.target.files?.[0]?.name
    if (fileName) {
      props.onFileSelected(fileName)
    }
  }
  return (
    <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-xl bg-surface cursor-pointer hover:border-primary hover:bg-primary-100 transition-colors group">
      <Upload size={16} className="text-muted group-hover:text-primary transition-colors shrink-0" aria-hidden />
      <span className="text-sm text-muted group-hover:text-primary transition-colors whitespace-nowrap">
        Chọn file Excel
      </span>
      <input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={onChange} />
    </label>
  )
}
