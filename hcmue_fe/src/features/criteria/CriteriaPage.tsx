/**
 * English note: Criteria import module page.
 */
import { criteriaSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef } from '../imports/importEntity.types'

const CRITERIA_FIELDS: ImportFieldDef[] = [
  { key: 'combinationCode', label: 'Mã tổ hợp', kind: 'text' },
  { key: 'rule', label: 'Điều kiện (biểu thức)', kind: 'textarea' },
]

export function CriteriaPage() {
  return (
    <ImportEntityPage
      title="Nhập điều kiện xét tuyển"
      description="Quản lý điều kiện theo từng tổ hợp xét tuyển."
      fields={CRITERIA_FIELDS}
      rowSchema={criteriaSchema}
      getRows={enrollmentApi.getCriteria}
      mockNotice="Đang dùng dữ liệu giả vì chưa có API."
      sampleRows={[{ combinationCode: 'A00', rule: 'toan >= 6 AND ly >= 6 AND hoa >= 6' }]}
    />
  )
}
