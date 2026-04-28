import { Button, Input, NumberInput, Select } from '../../../components'
import type { ScoreDraftRow } from '../importEntity.helpers'

type ScoreJsonEditorProps = {
  rows: ScoreDraftRow[]
  onRowsChange: (rows: ScoreDraftRow[]) => void
}

export function ScoreJsonEditor({ rows, onRowsChange }: ScoreJsonEditorProps) {
  return (
    <div className="grid gap-2">
      <div className="hidden md:grid md:grid-cols-[1fr_150px_120px_auto] md:gap-2">
        <p className="text-xs font-semibold text-muted m-0">Mã môn</p>
        <p className="text-xs font-semibold text-muted m-0">Loại điểm</p>
        <p className="text-xs font-semibold text-muted m-0">Điểm</p>
        <p className="text-xs font-semibold text-muted m-0">Thao tác</p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted m-0">Chưa có dòng điểm. Bấm "Thêm môn" để nhập.</p> : null}
      {rows.map((row, index) => (
        <div key={`score-row-${index}`} className="grid gap-2 md:grid-cols-[1fr_150px_120px_auto]">
          <Input
            value={row.subjectId}
            placeholder="VD: TO"
            onChange={(next) => {
              const nextRows = rows.map((item, itemIndex) =>
                itemIndex === index ? { ...item, subjectId: next.toUpperCase() } : item,
              )
              onRowsChange(nextRows)
            }}
          />
          <Select
            value={row.scoreType}
            onChange={(next) => {
              const nextRows = rows.map((item, itemIndex) => (itemIndex === index ? { ...item, scoreType: next } : item))
              onRowsChange(nextRows)
            }}
            options={[
              { value: 'THPT', label: 'THPT' },
              { value: 'HOCBA', label: 'Học bạ' },
              { value: 'DGNL', label: 'Đánh giá năng lực' },
              { value: 'NK', label: 'Năng khiếu' },
            ]}
          />
          <NumberInput
            value={row.score === '' ? '' : Number(row.score)}
            placeholder="0 - 10"
            onChange={(next) => {
              const nextRows = rows.map((item, itemIndex) =>
                itemIndex === index ? { ...item, score: next === '' ? '' : String(next) } : item,
              )
              onRowsChange(nextRows)
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const nextRows = rows.filter((_, itemIndex) => itemIndex !== index)
              onRowsChange(nextRows)
            }}
          >
            Xóa
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            onRowsChange([...rows, { subjectId: '', scoreType: 'THPT', score: '' }])
          }}
        >
          Thêm môn
        </Button>
      </div>
      <p className="text-xs text-muted m-0">
        JSON dùng đúng tên cột như file import: THPT → <span className="font-mono">TO</span>, <span className="font-mono">VA</span>…; ĐGNL
        → <span className="font-mono">TO_NL</span>…; học bạ → <span className="font-mono">TO_HB</span>…; năng khiếu →{' '}
        <span className="font-mono">NK2</span>…
      </p>
    </div>
  )
}
