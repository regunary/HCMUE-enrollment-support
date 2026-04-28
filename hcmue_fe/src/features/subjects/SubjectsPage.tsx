/**
 * English note: Subject import module page.
 */
import { subjectSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef, RowModel } from '../imports/importEntity.types'
import type { Subject } from '../../types/domain'

const SUBJECT_FIELDS: ImportFieldDef[] = [
  { key: 'id', label: 'Mã môn', kind: 'text' },
  { key: 'name', label: 'Tên môn', kind: 'text' },
]

export function SubjectsPage() {
  const saveSubject = async (
    payload: RowModel,
    selectedRowIndex: number | null,
    rows: RowModel[],
  ): Promise<RowModel[]> => {
    const subject = payload as Subject
    if (selectedRowIndex !== null && enrollmentApi.updateSubject) {
      const id = String(rows[selectedRowIndex]?.id ?? '')
      const updated = await enrollmentApi.updateSubject(id, subject)
      return rows.map((row, index) => (index === selectedRowIndex ? (updated as RowModel) : row))
    }
    if (enrollmentApi.createSubject) {
      const created = await enrollmentApi.createSubject(subject)
      return [created as RowModel, ...rows]
    }
    if (selectedRowIndex === null) {
      return [payload, ...rows]
    }
    return rows.map((row, index) => (index === selectedRowIndex ? payload : row))
  }

  return (
    <ImportEntityPage
      title="Nhập môn học"
      description="Quản lý danh mục môn học để dùng cho import điểm và tổ hợp."
      fields={SUBJECT_FIELDS}
      rowSchema={subjectSchema}
      getRows={enrollmentApi.getSubjects}
      importFile={enrollmentApi.importSubjects}
      saveRow={saveSubject}
      sampleRows={[
        { MaMon: 'TO', TenMon: 'Toán' },
        { MaMon: 'VA', TenMon: 'Ngữ văn' },
      ]}
    />
  )
}
