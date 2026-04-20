import { useMemo, useState } from 'react'
import { Badge, Card, LineChart, Tabs } from '../../components'
import { mockCandidates, mockCombinations } from '../../mocks/seed'
import { buildPercentileSeries, calcCombinationScore, enumerateCombinationsFor } from '../../utils/scoring'

export function PercentilePage() {
  const [mode, setMode] = useState('all')
  const values = useMemo(() => {
    return mockCandidates.flatMap((candidate) =>
      enumerateCombinationsFor(candidate, mockCombinations).map((combination) =>
        calcCombinationScore(candidate, combination),
      ),
    )
  }, [])
  const points = useMemo(() => buildPercentileSeries(values), [values])

  return (
    <Card title="Bách phân vị">
      <Badge>Module tính toán</Badge>
      <p className="text-sm text-muted leading-relaxed">
        Bách phân vị được tính dựa trên điểm tổ hợp của nhóm lọc hiện tại.
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
      <LineChart points={points} />
    </Card>
  )
}
