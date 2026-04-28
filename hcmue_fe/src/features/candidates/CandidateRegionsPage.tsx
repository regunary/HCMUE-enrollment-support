import { useEffect, useMemo, useState } from 'react'
import { Button, Card, DataTable, FormField, Input, NumberInput, Uploader } from '../../components'
import { enrollmentApi } from '../../services/enrollmentApi'
import { writeSheet } from '../../utils/excel'
import { useToast } from '../feedback/useToast'

type RegionRow = {
  id?: string
  code: string
  bonus_score: number
}

export function CandidateRegionsPage() {
  const { showToast } = useToast()
  const [rows, setRows] = useState<RegionRow[]>([])
  const [code, setCode] = useState('')
  const [bonusScore, setBonusScore] = useState<number | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const columns = useMemo(
    () => [
      { key: 'code' as const, label: 'Mã khu vực' },
      { key: 'bonus_score' as const, label: 'Điểm ưu tiên' },
    ],
    [],
  )

  const loadRows = async () => {
    if (!enrollmentApi.getCandidateRegions) {
      return
    }
    setLoading(true)
    try {
      const list = await enrollmentApi.getCandidateRegions()
      setRows(list as RegionRow[])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không tải được khu vực ưu tiên.'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRows()
  }, [])

  const createRegion = async () => {
    if (!enrollmentApi.createCandidateRegion) {
      return
    }
    if (!code.trim() || bonusScore === '') {
      showToast('Nhập đủ mã khu vực và điểm ưu tiên.', 'info')
      return
    }
    setLoading(true)
    try {
      await enrollmentApi.createCandidateRegion({ code: code.trim(), bonus_score: bonusScore })
      setCode('')
      setBonusScore('')
      await loadRows()
      showToast('Thêm khu vực ưu tiên thành công.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Thêm khu vực ưu tiên thất bại.'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const importRegions = async () => {
    if (!file || !enrollmentApi.importCandidateRegions) {
      return
    }
    setLoading(true)
    try {
      const summary = await enrollmentApi.importCandidateRegions(file)
      showToast(
        `Import xong: thêm ${summary.created}, cập nhật ${summary.updated}, bỏ qua ${summary.skipped}.`,
        summary.errors.length > 0 ? 'info' : 'success',
      )
      await loadRows()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import khu vực ưu tiên thất bại.'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="Khu vực ưu tiên">
      <p className="text-sm text-muted leading-relaxed">
        Quản lý danh mục khu vực ưu tiên để dùng cho nhập liệu và xét tuyển.
      </p>

      <div className="grid gap-3 my-4 md:grid-cols-[1fr_180px_auto]">
        <FormField label="Mã khu vực">
          <Input value={code} onChange={setCode} />
        </FormField>
        <FormField label="Điểm ưu tiên">
          <NumberInput value={bonusScore} onChange={setBonusScore} />
        </FormField>
        <div className="flex items-end">
          <Button type="button" onClick={() => void createRegion()}>
            {loading ? 'Đang lưu...' : 'Thêm khu vực'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Uploader onFileSelected={setFile} />
        <Button type="button" variant="secondary" onClick={() => void importRegions()}>
          {loading ? 'Đang import...' : 'Import file đã chọn'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            writeSheet(
              [
                { KV: 'KV1', DiemUT: 0.25 },
                { KV: 'KV2', DiemUT: 0.5 },
              ],
              'Khu-vuc-uu-tien-mau.xlsx',
            )
          }
        >
          Tải file mẫu .xlsx
        </Button>
        <Button type="button" variant="secondary" onClick={() => void loadRows()}>
          Tải lại dữ liệu
        </Button>
      </div>

      {rows.length > 0 ? <DataTable columns={columns} rows={rows} /> : <p className="text-sm text-muted">Chưa có dữ liệu.</p>}
    </Card>
  )
}
