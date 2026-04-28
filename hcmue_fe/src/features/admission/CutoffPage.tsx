import { Badge, Button, Card, DataTable, Uploader } from '../../components'
import { mockCutoffs } from '../../mocks/seed'
import { writeSheet } from '../../utils/excel'

export function CutoffPage() {
  return (
    <Card title="Nhập điểm chuẩn">
      <Badge>Tuyển sinh</Badge>
      <p className="text-sm text-muted leading-relaxed">
        Nhập điểm chuẩn theo ngành bằng file Excel hoặc cập nhật tay.
      </p>
      <p className="text-sm leading-relaxed mt-2 mb-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
        Đang dùng dữ liệu giả vì chưa có API.
      </p>
      <div className="flex flex-wrap items-center gap-3 my-4">
        <Uploader onFileSelected={() => undefined} />
        <Button
          variant="secondary"
          onClick={() =>
            writeSheet(mockCutoffs as Array<Record<string, unknown>>, 'mau-diem-chuan.xlsx')
          }
        >
          Tải file mẫu điểm chuẩn
        </Button>
      </div>
      <DataTable
        columns={[
          { key: 'majorCode', label: 'Mã ngành' },
          { key: 'score', label: 'Điểm chuẩn' },
        ]}
        rows={mockCutoffs}
      />
    </Card>
  )
}
