/**
 * English note: Major import module page.
 */
import { majorSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef } from '../imports/importEntity.types'

const MAJOR_FIELDS: ImportFieldDef[] = [
  { key: 'code', label: 'Mã ngành', kind: 'text' },
  { key: 'name', label: 'Tên ngành', kind: 'text' },
  { key: 'combinations', label: 'Tổ hợp xét tuyển', kind: 'text' },
]

export function MajorsPage() {
  return (
    <ImportEntityPage
      title="Nhập ngành xét tuyển"
      description="Quản lý thông tin ngành, mã ngành và tổ hợp áp dụng."
      fields={MAJOR_FIELDS}
      rowSchema={majorSchema}
      getRows={enrollmentApi.getMajors}
      mockNotice="Đang dùng dữ liệu giả vì chưa có API."
      sampleRows={[{ code: '7480201', name: 'Công nghệ thông tin', combinations: 'A00,A01,D01' }]}
    />
  )
}
