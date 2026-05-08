/**
 * English note: Major import module page.
 */
import { majorSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef, RowModel } from '../imports/importEntity.types'
import type { Major } from '../../types/domain'

const MAJOR_FIELDS: ImportFieldDef[] = [
  { key: 'code', label: 'Mã ngành', kind: 'text' },
  { key: 'name', label: 'Tên ngành', kind: 'text' },
  { key: 'combinations', label: 'Tổ hợp xét tuyển', kind: 'text' },
  { key: 'minScores', label: 'Điểm sàn theo tổ hợp', kind: 'text' },
  { key: 'scoreOffsets', label: 'Độ lệch theo tổ hợp', kind: 'text' },
  { key: 'primaryCombination', label: 'Tổ hợp gốc', kind: 'text' },
]

export function MajorsPage() {
  const saveMajor = async (payload: RowModel, selectedRowIndex: number | null, rows: RowModel[]): Promise<RowModel[]> => {
    const major = payload as Major
    if (selectedRowIndex !== null && enrollmentApi.updateMajor) {
      const code = String(rows[selectedRowIndex]?._pk ?? rows[selectedRowIndex]?.code ?? '')
      const updated = await enrollmentApi.updateMajor(code, major)
      return rows.map((row, index) => (index === selectedRowIndex ? (updated as RowModel) : row))
    }
    if (enrollmentApi.createMajor) {
      const created = await enrollmentApi.createMajor(major)
      return [created as RowModel, ...rows]
    }
    return selectedRowIndex === null ? [payload, ...rows] : rows.map((row, index) => (index === selectedRowIndex ? payload : row))
  }

  const deleteMajors = async (selectedRows: RowModel[], rows: RowModel[]): Promise<RowModel[]> => {
    await Promise.all(
      selectedRows.map((row) => enrollmentApi.deleteMajor?.(String(row._pk ?? row.code))),
    )
    const selected = new Set(selectedRows)
    return rows.filter((row) => !selected.has(row))
  }

  return (
    <ImportEntityPage
      title="Nhập ngành xét tuyển"
      description="Quản lý thông tin ngành, mã ngành và tổ hợp áp dụng."
      fields={MAJOR_FIELDS}
      rowSchema={majorSchema}
      getRows={enrollmentApi.getMajors}
      importFile={enrollmentApi.importMajors}
      saveRow={saveMajor}
      deleteRows={enrollmentApi.deleteMajor ? deleteMajors : undefined}
      sampleRows={[{ MaNganh: '7480201', TenNganh: 'Công nghệ thông tin', MaTH: 'A00', DiemSan: 18, DiemLech: 0 }]}
    />
  )
}
