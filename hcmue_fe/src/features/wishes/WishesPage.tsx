/**
 * English note: Wish import module page.
 */
import { wishSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef, RowModel } from '../imports/importEntity.types'
import type { Wish } from '../../types/domain'

const WISH_FIELDS: ImportFieldDef[] = [
  { key: 'idNumber', label: 'Số CCCD', kind: 'text' },
  { key: 'majorCode', label: 'Mã ngành', kind: 'text' },
  { key: 'order', label: 'Thứ tự nguyện vọng', kind: 'number' },
]

export function WishesPage() {
  const saveWish = async (payload: RowModel, selectedRowIndex: number | null, rows: RowModel[]): Promise<RowModel[]> => {
    const wish = payload as Wish
    if (selectedRowIndex !== null && enrollmentApi.updateWish) {
      const pk = String(rows[selectedRowIndex]?._pk ?? '')
      const updated = await enrollmentApi.updateWish(pk, wish)
      return rows.map((row, index) => (index === selectedRowIndex ? (updated as RowModel) : row))
    }
    if (enrollmentApi.createWish) {
      const created = await enrollmentApi.createWish(wish)
      return [created as RowModel, ...rows]
    }
    return selectedRowIndex === null ? [payload, ...rows] : rows.map((row, index) => (index === selectedRowIndex ? payload : row))
  }

  const deleteWishes = async (selectedRows: RowModel[], rows: RowModel[]): Promise<RowModel[]> => {
    await Promise.all(selectedRows.map((row) => enrollmentApi.deleteWish?.(String(row._pk))))
    const selected = new Set(selectedRows)
    return rows.filter((row) => !selected.has(row))
  }

  return (
    <ImportEntityPage
      title="Nhập nguyện vọng"
      description="Nhập danh sách nguyện vọng của thí sinh theo thứ tự ưu tiên."
      fields={WISH_FIELDS}
      rowSchema={wishSchema}
      getRows={enrollmentApi.getWishes}
      importFile={enrollmentApi.importWishes}
      saveRow={saveWish}
      deleteRows={enrollmentApi.deleteWish ? deleteWishes : undefined}
      sampleRows={[{ CCCD: '079300000000', MaXT: '7480201', TTNV: 1 }]}
    />
  )
}
