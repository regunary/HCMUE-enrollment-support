import { useEffect, useMemo, useState } from 'react'
import { Button, Card, DataTable, FormField, Input, NumberInput, Uploader } from '../../components'
import { enrollmentApi } from '../../services/enrollmentApi'
import { writeSheet } from '../../utils/excel'
import { useToast } from '../feedback/useToast'

type PriorityObjectRow = {
  id?: string
  code: string
  bonus_score: number
}

export function CandidatePriorityObjectsPage() {
  const { showToast } = useToast()
  const [rows, setRows] = useState<PriorityObjectRow[]>([])
  const [code, setCode] = useState('')
  const [bonusScore, setBonusScore] = useState<number | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const columns = useMemo(
    () => [
      { key: 'code' as const, label: 'Mã đối tượng' },
      { key: 'bonus_score' as const, label: 'Điểm ưu tiên' },
    ],
    [],
  )

  const loadRows = async () => {
    if (!enrollmentApi.getCandidatePriorityObjects) {
      return
    }
    setLoading(true)
    try {
      const list = await enrollmentApi.getCandidatePriorityObjects()
      setRows(list as PriorityObjectRow[])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không tải được đối tượng ưu tiên.'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRows()
  }, [])

  const createPriorityObject = async () => {
    if (!enrollmentApi.createCandidatePriorityObject) {
      return
    }
    if (!code.trim() || bonusScore === '') {
      showToast('Nhập đủ mã đối tượng và điểm ưu tiên.', 'info')
      return
    }
    setLoading(true)
    try {
      await enrollmentApi.createCandidatePriorityObject({ code: code.trim(), bonus_score: bonusScore })
      setCode('')
      setBonusScore('')
      await loadRows()
      showToast('Thêm đối tượng ưu tiên thành công.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Thêm đối tượng ưu tiên thất bại.'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const importPriorityObjects = async () => {
    if (!file || !enrollmentApi.importCandidatePriorityObjects) {
      return
    }
    setLoading(true)
    try {
      const summary = await enrollmentApi.importCandidatePriorityObjects(file)
      showToast(
        `Import xong: thêm ${summary.created}, cập nhật ${summary.updated}, bỏ qua ${summary.skipped}.`,
        summary.errors.length > 0 ? 'info' : 'success',
      )
      await loadRows()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import đối tượng ưu tiên thất bại.'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="Đối tượng ưu tiên">
      <p className="text-sm text-muted leading-relaxed">
        Quản lý danh mục đối tượng ưu tiên để dùng cho nhập liệu và xét tuyển.
      </p>

      <div className="grid gap-3 my-4 md:grid-cols-[1fr_180px_auto]">
        <FormField label="Mã đối tượng">
          <Input value={code} onChange={setCode} />
        </FormField>
        <FormField label="Điểm ưu tiên">
          <NumberInput value={bonusScore} onChange={setBonusScore} />
        </FormField>
        <div className="flex items-end">
          <Button type="button" onClick={() => void createPriorityObject()}>
            {loading ? 'Đang lưu...' : 'Thêm đối tượng'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Uploader onFileSelected={setFile} />
        <Button type="button" variant="secondary" onClick={() => void importPriorityObjects()}>
          {loading ? 'Đang import...' : 'Import file đã chọn'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            writeSheet(
              [
                { DT: 'UT1', DiemUT: 2.0 },
                { DT: 'UT2', DiemUT: 1.0 },
              ],
              'Doi-tuong-uu-tien-mau.xlsx',
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
