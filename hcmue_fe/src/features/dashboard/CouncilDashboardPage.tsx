import { Badge, Card, HistogramChart } from '../../components'
import { buildScoreBins, calcCombinationScore, enumerateCombinationsFor } from '../../utils/scoring'
import { mockCandidates, mockCombinations } from '../../mocks/seed'

export function CouncilDashboardPage() {
  const scoreValues = mockCandidates.flatMap((candidate) =>
    enumerateCombinationsFor(candidate, mockCombinations).map((combination) =>
      calcCombinationScore(candidate, combination),
    ),
  )
  const bins = buildScoreBins(scoreValues)

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
      <Card title="Phổ điểm toàn trường">
        <Badge>Hội đồng</Badge>
        <HistogramChart bins={bins} />
      </Card>
      <Card title="Tình trạng nhập điểm chuẩn">
        <Badge>Hội đồng</Badge>
        <p className="text-sm text-muted">Đã có 3/3 ngành có điểm chuẩn mô phỏng.</p>
      </Card>
    </div>
  )
}
