import { useMemo } from 'react'
import { Badge, Button, Card, DataTable } from '../../components'
import { mockCandidates, mockCombinations, mockMajors } from '../../mocks/seed'
import { calcCombinationScore, enumerateCombinationsFor } from '../../utils/scoring'

type ScoringRow = {
  idNumber: string
  majorCode: string
  combination: string
  score: number
}

export function ScoringPage() {
  const rows = useMemo<ScoringRow[]>(() => {
    return mockCandidates.flatMap((candidate) => {
      const availableCombinations = enumerateCombinationsFor(candidate, mockCombinations)
      return availableCombinations.map((combination) => ({
        idNumber: candidate.idNumber,
        majorCode: mockMajors[0]?.code ?? '',
        combination: combination.code,
        score: calcCombinationScore(candidate, combination),
      }))
    })
  }, [])

  return (
    <Card title="Tính điểm thí sinh">
      <Badge>Module tính toán</Badge>
      <p className="text-sm text-muted leading-relaxed">
        Điểm theo từng tổ hợp được tính từ dữ liệu điểm môn đã import.
      </p>
      <div className="flex flex-wrap items-center gap-3 my-4">
        <Button variant="secondary">Tính lại điểm</Button>
      </div>
      <DataTable
        columns={[
          { key: 'idNumber', label: 'CCCD' },
          { key: 'majorCode', label: 'Mã ngành' },
          { key: 'combination', label: 'Tổ hợp' },
          { key: 'score', label: 'Điểm' },
        ]}
        rows={rows}
      />
    </Card>
  )
}
