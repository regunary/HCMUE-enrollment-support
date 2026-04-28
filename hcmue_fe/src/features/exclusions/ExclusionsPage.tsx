/**
 * English note: Exclusion import module page.
 */
import { exclusionSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef } from '../imports/importEntity.types'

const EXCLUSION_FIELDS: ImportFieldDef[] = [
  { key: 'idNumber', label: 'Số CCCD', kind: 'text' },
  { key: 'reason', label: 'Lý do loại bỏ', kind: 'textarea' },
]

export function ExclusionsPage() {
  return (
    <ImportEntityPage
      title="Nhập danh sách loại bỏ"
      description="Quản lý danh sách thí sinh bị loại khỏi quá trình xét tuyển."
      fields={EXCLUSION_FIELDS}
      rowSchema={exclusionSchema}
      getRows={enrollmentApi.getExclusions}
      mockNotice="Đang dùng dữ liệu giả vì chưa có API."
      sampleRows={[{ idNumber: '079300000000', reason: 'Đã trúng tuyển sớm' }]}
    />
  )
}
