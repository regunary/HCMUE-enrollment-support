import { useMemo, useState } from 'react'
import { Badge, Card, HistogramChart, Tabs } from '../../components'
import { mockCandidates, mockCombinations } from '../../mocks/seed'
import { buildScoreBins, calcCombinationScore, enumerateCombinationsFor } from '../../utils/scoring'

export function DistributionPage() {
  const [mode, setMode] = useState('all')
  const values = useMemo(() => {
    return mockCandidates.flatMap((candidate) =>
      enumerateCombinationsFor(candidate, mockCombinations).map((combination) =>
        calcCombinationScore(candidate, combination),
      ),
    )
  }, [])
  const bins = useMemo(() => buildScoreBins(values), [values])

  return (
    <Card title="Phổ điểm">
      <Badge>Module tính toán</Badge>
      <p className="text-sm text-muted leading-relaxed">
        Hiển thị phổ điểm theo chế độ lọc: toàn bộ, theo nguyện vọng, theo ngành, theo tổ hợp.
      </p>
      <Tabs
        value={mode}
        onChange={setMode}
        tabs={[
          { key: 'all', label: 'Toàn bộ' },
          { key: 'wish', label: 'Theo nguyện vọng' },
          { key: 'major', label: 'Theo ngành' },
          { key: 'combination', label: 'Theo tổ hợp' },
        ]}
      />
      <HistogramChart bins={bins} />
    </Card>
  )
}
