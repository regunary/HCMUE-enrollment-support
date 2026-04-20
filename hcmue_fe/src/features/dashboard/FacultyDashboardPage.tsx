import { Badge, Card, DataTable } from '../../components'
import { mockCutoffs, mockMajors } from '../../mocks/seed'

export function FacultyDashboardPage() {
  const rows = mockMajors.map((major) => {
    const cutoff = mockCutoffs.find((item) => item.majorCode === major.code)?.score ?? 0
    return { majorCode: major.code, majorName: major.name, cutoff }
  })

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
      <Card title="Theo dõi theo ngành">
        <Badge>Khoa</Badge>
        <DataTable
          columns={[
            { key: 'majorCode', label: 'Mã ngành' },
            { key: 'majorName', label: 'Tên ngành' },
            { key: 'cutoff', label: 'Điểm chuẩn' },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  )
}
