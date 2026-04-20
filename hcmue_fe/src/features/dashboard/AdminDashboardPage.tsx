import { Badge, Card, ToastDemo } from '../../components'
import { mockCandidates, mockCombinations, mockMajors, mockWishes } from '../../mocks/seed'

export function AdminDashboardPage() {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
      <Card title="Tổng thí sinh">
        <Badge>KPI</Badge>
        <p className="text-3xl font-bold text-primary m-0">{mockCandidates.length}</p>
        <p className="text-sm text-muted mt-1">hồ sơ đã import</p>
      </Card>
      <Card title="Tổng tổ hợp">
        <Badge>KPI</Badge>
        <p className="text-3xl font-bold text-primary m-0">{mockCombinations.length}</p>
        <p className="text-sm text-muted mt-1">tổ hợp xét tuyển</p>
      </Card>
      <Card title="Tổng ngành">
        <Badge>KPI</Badge>
        <p className="text-3xl font-bold text-primary m-0">{mockMajors.length}</p>
        <p className="text-sm text-muted mt-1">ngành xét tuyển</p>
      </Card>
      <Card title="Tổng nguyện vọng">
        <Badge>KPI</Badge>
        <p className="text-3xl font-bold text-primary m-0">{mockWishes.length}</p>
        <p className="text-sm text-muted mt-1">nguyện vọng đã đăng ký</p>
      </Card>
      <Card title="Trạng thái import">
        <Badge>Hệ thống</Badge>
        <p className="text-sm text-muted">Lần đồng bộ gần nhất: 5 phút trước.</p>
        <ToastDemo />
      </Card>
    </div>
  )
}
