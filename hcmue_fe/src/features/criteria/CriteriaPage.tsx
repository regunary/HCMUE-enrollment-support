/**
 * English note: Criteria import module page.
 */
import { criteriaSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef, RowModel } from '../imports/importEntity.types'
import type { Criteria } from '../../types/domain'

const CRITERIA_FIELDS: ImportFieldDef[] = [
  { key: 'majorCode', label: 'Mã ngành', kind: 'text' },
  { key: 'combinationCode', label: 'Mã tổ hợp', kind: 'text' },
  { key: 'rule', label: 'Điều kiện (biểu thức)', kind: 'textarea' },
]

export function CriteriaPage() {
  const saveCriteria = async (payload: RowModel, selectedRowIndex: number | null, rows: RowModel[]): Promise<RowModel[]> => {
    const criteria = payload as Criteria
    if (selectedRowIndex !== null && enrollmentApi.updateCriteria) {
      const pk = String(rows[selectedRowIndex]?._pk ?? '')
      const updated = await enrollmentApi.updateCriteria(pk, criteria)
      return rows.map((row, index) => (index === selectedRowIndex ? (updated as RowModel) : row))
    }
    if (enrollmentApi.createCriteria) {
      const created = await enrollmentApi.createCriteria(criteria)
      return [created as RowModel, ...rows]
    }
    return selectedRowIndex === null ? [payload, ...rows] : rows.map((row, index) => (index === selectedRowIndex ? payload : row))
  }

  const deleteCriteria = async (selectedRows: RowModel[], rows: RowModel[]): Promise<RowModel[]> => {
    await Promise.all(selectedRows.map((row) => enrollmentApi.deleteCriteria?.(String(row._pk))))
    const selected = new Set(selectedRows)
    return rows.filter((row) => !selected.has(row))
  }

  return (
    <ImportEntityPage
      title="Nhập điều kiện xét tuyển"
      description="Quản lý điều kiện theo từng tổ hợp xét tuyển."
      fields={CRITERIA_FIELDS}
      rowSchema={criteriaSchema}
      getRows={enrollmentApi.getCriteria}
      importFile={enrollmentApi.importCriteria}
      saveRow={saveCriteria}
      deleteRows={enrollmentApi.deleteCriteria ? deleteCriteria : undefined}
      sampleRows={[
        {
          MaXT: '7480201',
          MaTH: 'A00',
          MaMon: 'TO',
          DiemMonToiThieu: 6,
          DiemTongToiThieu: 18,
          GhiChu: 'Điều kiện môn chính',
          DieuKienJson: '{"main_subject":"TO"}',
        },
      ]}
    />
  )
}
