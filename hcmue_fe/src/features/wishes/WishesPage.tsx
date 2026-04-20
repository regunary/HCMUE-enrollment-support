/**
 * English note: Wish import module page.
 */
import { wishSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef } from '../imports/importEntity.types'

const WISH_FIELDS: ImportFieldDef[] = [
  { key: 'idNumber', label: 'Số CCCD', kind: 'text' },
  { key: 'majorCode', label: 'Mã ngành', kind: 'text' },
  { key: 'order', label: 'Thứ tự nguyện vọng', kind: 'number' },
]

export function WishesPage() {
  return (
    <ImportEntityPage
      title="Nhập nguyện vọng"
      description="Nhập danh sách nguyện vọng của thí sinh theo thứ tự ưu tiên."
      fields={WISH_FIELDS}
      rowSchema={wishSchema}
      getRows={enrollmentApi.getWishes}
      sampleRows={[{ idNumber: '079300000000', majorCode: '7480201', order: 1 }]}
    />
  )
}
