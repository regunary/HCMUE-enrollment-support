/**
 * English note: Exclusion import module page.
 */
import { exclusionSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef, RowModel } from '../imports/importEntity.types'
import type { Exclusion } from '../../types/domain'

const EXCLUSION_FIELDS: ImportFieldDef[] = [
  { key: 'idNumber', label: 'Số CCCD', kind: 'text' },
  { key: 'reason', label: 'Lý do loại bỏ', kind: 'textarea' },
]

export function ExclusionsPage() {
  const saveExclusion = async (payload: RowModel, selectedRowIndex: number | null, rows: RowModel[]): Promise<RowModel[]> => {
    const exclusion = payload as Exclusion
    if (selectedRowIndex !== null && enrollmentApi.updateExclusion) {
      const pk = String(rows[selectedRowIndex]?._pk ?? '')
      const updated = await enrollmentApi.updateExclusion(pk, exclusion)
      return rows.map((row, index) => (index === selectedRowIndex ? (updated as RowModel) : row))
    }
    if (enrollmentApi.createExclusion) {
      const created = await enrollmentApi.createExclusion(exclusion)
      return [created as RowModel, ...rows]
    }
    return selectedRowIndex === null ? [payload, ...rows] : rows.map((row, index) => (index === selectedRowIndex ? payload : row))
  }

  const deleteExclusions = async (selectedRows: RowModel[], rows: RowModel[]): Promise<RowModel[]> => {
    await Promise.all(selectedRows.map((row) => enrollmentApi.deleteExclusion?.(String(row._pk))))
    const selected = new Set(selectedRows)
    return rows.filter((row) => !selected.has(row))
  }

  return (
    <ImportEntityPage
      title="Nhập danh sách loại bỏ"
      description="Quản lý danh sách thí sinh bị loại khỏi quá trình xét tuyển."
      fields={EXCLUSION_FIELDS}
      rowSchema={exclusionSchema}
      getRows={enrollmentApi.getExclusions}
      importFile={enrollmentApi.importExclusions}
      saveRow={saveExclusion}
      deleteRows={enrollmentApi.deleteExclusion ? deleteExclusions : undefined}
      sampleRows={[{ CCCD: '079300000000', LyDo: 'Đã trúng tuyển sớm' }]}
    />
  )
}
