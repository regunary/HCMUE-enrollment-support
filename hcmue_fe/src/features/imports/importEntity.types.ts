/**
 * English note: Field metadata for import drawers and tables (labels + input kind + order).
 */
import type { ZodType } from 'zod'

export type ImportFieldKind = 'text' | 'number' | 'textarea'

export type ImportFieldDef = {
  key: string
  label: string
  kind: ImportFieldKind
}

export type RowModel = Record<string, string | number>

export type DraftValues = Record<string, string>

export type ImportResultSummary = {
  success: boolean
  created: number
  updated: number
  skipped: number
  errors: Array<Record<string, unknown>>
}

export type ImportEntityPageProps = {
  title: string
  description: string
  importHint?: string
  uploaderPlaceholder?: string
  importButtonLabel?: string
  getRows: () => Promise<RowModel[]>
  sampleRows: RowModel[]
  fields: ImportFieldDef[]
  rowSchema: ZodType<RowModel>
  importFile?: (file: File) => Promise<ImportResultSummary>
  saveRow?: (payload: RowModel, selectedRowIndex: number | null, rows: RowModel[]) => Promise<RowModel[]>
  mockNotice?: string
  selectOptionsByField?: Record<string, Array<{ label: string; value: string }>>
  onDraftChange?: (nextDraft: DraftValues, changedKey: string) => DraftValues
  combinationSubjectOptions?: Array<{ id: string; name: string }>
  hiddenTableFieldKeys?: string[]
  /** Tăng sau khi dữ liệu nguồn thay đổi bên ngoài (vd: import điểm) để tự load lại bảng. */
  listRefreshToken?: number
}
