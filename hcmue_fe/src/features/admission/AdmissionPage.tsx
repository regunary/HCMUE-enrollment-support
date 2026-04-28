import { useMemo } from 'react'
import { Badge, Button, Card, DataTable } from '../../components'
import { mockCandidates, mockCombinations, mockCutoffs, mockMajors, mockWishes } from '../../mocks/seed'
import { generateAdmissionList, calcCombinationScore, enumerateCombinationsFor } from '../../utils/scoring'
import { writeSheet } from '../../utils/excel'

export function AdmissionPage() {
  const scoreByCandidateMajor = useMemo(() => {
    const map: Record<string, number> = {}
    mockCandidates.forEach((candidate) => {
      const combinations = enumerateCombinationsFor(candidate, mockCombinations)
      const bestScore = combinations.reduce(
        (currentMax, combination) => Math.max(currentMax, calcCombinationScore(candidate, combination)),
        0,
      )
      mockMajors.forEach((major) => {
        map[`${candidate.idNumber}-${major.code}`] = bestScore
      })
    })
    return map
  }, [])

  const rows = useMemo(
    () =>
      generateAdmissionList({
        candidates: mockCandidates,
        wishes: mockWishes,
        majors: mockMajors,
        cutoffs: mockCutoffs,
        scoreByCandidateMajor,
      }),
    [scoreByCandidateMajor],
  )

  return (
    <Card title="Danh sách trúng tuyển">
      <Badge>Tuyển sinh</Badge>
      <p className="text-sm text-muted leading-relaxed">
        Thí sinh trúng tuyển nguyện vọng cao nhất đạt điểm chuẩn sẽ được xuất ra Excel.
      </p>
      <p className="text-sm leading-relaxed mt-2 mb-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
        Đang dùng dữ liệu giả vì chưa có API.
      </p>
      <div className="flex flex-wrap items-center gap-3 my-4">
        <Button
          variant="secondary"
          onClick={() =>
            writeSheet(rows as Array<Record<string, unknown>>, 'danh-sach-trung-tuyen.xlsx')
          }
        >
          Xuất Excel kết quả
        </Button>
      </div>
      <DataTable
        columns={[
          { key: 'idNumber', label: 'CCCD' },
          { key: 'majorCode', label: 'Mã ngành' },
          { key: 'majorName', label: 'Tên ngành' },
          { key: 'wishOrder', label: 'NV trúng tuyển' },
          { key: 'score', label: 'Điểm xét' },
        ]}
        rows={rows}
      />
    </Card>
  )
}
