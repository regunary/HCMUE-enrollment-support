/**
 * English note: Candidate import module page.
 */
import { candidateSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef } from '../imports/importEntity.types'

const CANDIDATE_FIELDS: ImportFieldDef[] = [
  { key: 'idNumber', label: 'Số CCCD', kind: 'text' },
  { key: 'priorityRegion', label: 'Khu vực ưu tiên', kind: 'text' },
  { key: 'priorityGroup', label: 'Đối tượng ưu tiên', kind: 'text' },
  { key: 'graduationYear', label: 'Năm tốt nghiệp', kind: 'number' },
  { key: 'scoreJson', label: 'Điểm môn (JSON)', kind: 'textarea' },
]

export function CandidatesPage() {
  return (
    <ImportEntityPage
      title="Nhập dữ liệu thí sinh"
      description="Import Excel, cập nhật thủ công và đồng bộ dữ liệu thí sinh."
      fields={CANDIDATE_FIELDS}
      rowSchema={candidateSchema}
      getRows={enrollmentApi.getCandidates}
      sampleRows={[
        {
          idNumber: '079300000000',
          priorityRegion: 'KV1',
          priorityGroup: 'UT1',
          graduationYear: 2025,
          scoreJson: '{"toan":8.5,"ly":7.5,"hoa":7.2}',
        },
      ]}
    />
  )
}
