import { Badge, Card } from '../components'

type PlaceholderPageProps = {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Card title={title}>
      <Badge>Đang thiết lập</Badge>
      <p className="text-sm text-muted leading-relaxed">
        Chức năng đang ở giai đoạn dựng khung. Nội dung chi tiết sẽ được triển khai ở các phase
        tiếp theo.
      </p>
    </Card>
  )
}
