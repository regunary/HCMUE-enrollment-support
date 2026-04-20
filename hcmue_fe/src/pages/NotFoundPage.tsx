import { Link } from 'react-router-dom'
import { Card } from '../components'

export function NotFoundPage() {
  return (
    <Card title="Không tìm thấy trang">
      <p className="text-sm text-muted leading-relaxed">
        Đường dẫn bạn truy cập không tồn tại trong hệ thống.
      </p>
      <p className="mt-2">
        <Link to="/" className="text-primary font-medium hover:underline">
          Quay về trang chính
        </Link>
      </p>
    </Card>
  )
}
