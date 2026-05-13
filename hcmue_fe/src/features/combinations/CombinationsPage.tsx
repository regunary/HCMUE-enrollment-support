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
      .getSubjects({ page: 1, pageSize: 500 })
      .then((result) => {
        if (!active) {
          return
        }
        const subjects = Array.isArray(result) ? result : result.rows
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

  const deleteCombinations = async (selectedRows: RowModel[], rows: RowModel[]): Promise<RowModel[]> => {
    await Promise.all(selectedRows.map((row) => enrollmentApi.deleteCombination?.(String(row.code))))
    const selected = new Set(selectedRows)
    return rows.filter((row) => !selected.has(row))
  }

  return (
    <ImportEntityPage
      title="Nhập tổ hợp xét tuyển"
      description="Theo hồ sơ: mỗi tổ hợp có đúng 3 môn (M1–M3) và 3 trọng số; điểm tổ hợp là tổng điểm môn nhân hệ số."
      fields={COMBINATION_FIELDS}
      rowSchema={combinationSchema}
      getRows={enrollmentApi.getCombinations}
      importFile={enrollmentApi.importCombinations}
      saveRow={saveCombination}
      deleteRows={enrollmentApi.deleteCombination ? deleteCombinations : undefined}
      combinationSubjectOptions={subjectOptions}
      sampleRows={[
        {
          MaTH: 'A00',
          Mon1: 'TO',
          Mon2: 'LI',
          Mon3: 'HO',
          TrongSo1: 1,
          TrongSo2: 1,
          TrongSo3: 1,
        },
      ]}
    />
  )
}
