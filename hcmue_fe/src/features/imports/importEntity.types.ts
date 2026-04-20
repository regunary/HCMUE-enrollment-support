/**
 * English note: Field metadata for import drawers and tables (labels + input kind + order).
 */
export type ImportFieldKind = 'text' | 'number' | 'textarea'

export type ImportFieldDef = {
  key: string
  label: string
  kind: ImportFieldKind
}

export type RowModel = Record<string, string | number>
