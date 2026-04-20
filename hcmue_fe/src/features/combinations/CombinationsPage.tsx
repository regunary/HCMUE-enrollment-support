/**
 * English note: Combination import module page.
 */
import { combinationSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef } from '../imports/importEntity.types'

const COMBINATION_FIELDS: ImportFieldDef[] = [
  { key: 'code', label: 'Mã tổ hợp', kind: 'text' },
  { key: 'subjects', label: 'Danh sách môn', kind: 'text' },
  { key: 'weights', label: 'Trọng số', kind: 'text' },
]

export function CombinationsPage() {
  return (
    <ImportEntityPage
      title="Nhập tổ hợp xét tuyển"
      description="Quản lý mã tổ hợp, môn thành phần và trọng số từng môn."
      fields={COMBINATION_FIELDS}
      rowSchema={combinationSchema}
      getRows={enrollmentApi.getCombinations}
      sampleRows={[{ code: 'A00', subjects: 'toan,ly,hoa', weights: '1,1,1' }]}
    />
  )
}
