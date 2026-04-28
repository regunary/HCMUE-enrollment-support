/**
 * English note: Combination import module page.
 */
import { useEffect, useState } from 'react'
import { combinationSchema } from '../../schemas/domain.schema'
import { enrollmentApi } from '../../services/enrollmentApi'
import { ImportEntityPage } from '../imports/ImportEntityPage'
import type { ImportFieldDef, RowModel } from '../imports/importEntity.types'
import type { Combination } from '../../types/domain'

const COMBINATION_FIELDS: ImportFieldDef[] = [
  { key: 'code', label: 'Mã tổ hợp', kind: 'text' },
  { key: 'subjects', label: 'Danh sách môn', kind: 'text' },
  { key: 'weights', label: 'Trọng số', kind: 'text' },
]

export function CombinationsPage() {
  const [subjectOptions, setSubjectOptions] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    let active = true
    void enrollmentApi
      .getSubjects()
      .then((subjects) => {
        if (!active) {
          return
        }
        setSubjectOptions(subjects)
      })
      .catch(() => {
        if (!active) {
          return
        }
        setSubjectOptions([])
      })
    return () => {
      active = false
    }
  }, [])

  const saveCombination = async (
    payload: RowModel,
    selectedRowIndex: number | null,
    rows: RowModel[],
  ): Promise<RowModel[]> => {
    const combination = payload as Combination
    if (selectedRowIndex !== null && enrollmentApi.updateCombination) {
      const currentCode = String(rows[selectedRowIndex]?.code ?? '')
      const updated = await enrollmentApi.updateCombination(currentCode, combination)
      return rows.map((row, index) => (index === selectedRowIndex ? (updated as RowModel) : row))
    }
    if (enrollmentApi.createCombination) {
      const created = await enrollmentApi.createCombination(combination)
      return [created as RowModel, ...rows]
    }
    if (selectedRowIndex === null) {
      return [payload, ...rows]
    }
    return rows.map((row, index) => (index === selectedRowIndex ? payload : row))
  }

  return (
    <ImportEntityPage
      title="Nhập tổ hợp xét tuyển"
      description="Theo hồ sơ: mỗi tổ hợp có đúng 3 môn (M1–M3) và 3 trọng số; tổng trọng số phải bằng 1."
      fields={COMBINATION_FIELDS}
      rowSchema={combinationSchema}
      getRows={enrollmentApi.getCombinations}
      importFile={enrollmentApi.importCombinations}
      saveRow={saveCombination}
      combinationSubjectOptions={subjectOptions}
      sampleRows={[
        {
          MaTH: 'A00',
          Mon1: 'TO',
          Mon2: 'LI',
          Mon3: 'HO',
          TrongSo1: 0.34,
          TrongSo2: 0.33,
          TrongSo3: 0.33,
        },
      ]}
    />
  )
}
