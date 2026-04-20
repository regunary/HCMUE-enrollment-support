import { useEffect, useMemo, useState } from 'react'
import type { ZodType } from 'zod'
import {
  Badge,
  Button,
  Card,
  DataTable,
  Drawer,
  FormField,
  Input,
  NumberInput,
  Textarea,
  Uploader,
} from '../../components'
import { useAsync } from '../../hooks/useAsync'
import { writeSheet } from '../../utils/excel'
import type { ImportFieldDef, RowModel } from './importEntity.types'

type DraftValues = Record<string, string>

/** create-form: new row; edit-view: read-only; edit-form: editing existing row */
type DrawerMode = 'create-form' | 'edit-view' | 'edit-form'

type ImportEntityPageProps = {
  title: string
  description: string
  getRows: () => Promise<RowModel[]>
  sampleRows: RowModel[]
  fields: ImportFieldDef[]
  rowSchema: ZodType<RowModel>
}

function draftFromRow(row: RowModel, fields: ImportFieldDef[]): DraftValues {
  const o: DraftValues = {}
  for (const f of fields) {
    const v = row[f.key]
    o[f.key] = v === undefined || v === null ? '' : String(v)
  }
  return o
}

function emptyDraft(fields: ImportFieldDef[]): DraftValues {
  return fields.reduce<DraftValues>((acc, f) => {
    acc[f.key] = ''
    return acc
  }, {})
}

function draftToPayload(draft: DraftValues, fields: ImportFieldDef[]): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (const f of fields) {
    const s = draft[f.key] ?? ''
    if (f.kind === 'number') {
      if (s.trim() === '') {
        o[f.key] = undefined
      } else {
        const n = Number(s)
        o[f.key] = Number.isFinite(n) ? n : Number.NaN
      }
    } else {
      o[f.key] = s
    }
  }
  return o
}

function formatDetailValue(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '—'
  }
  return String(value)
}

export function ImportEntityPage(props: ImportEntityPageProps) {
  const [fileName, setFileName] = useState('')
  const [open, setOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create-form')
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [rows, setRows] = useState<RowModel[]>([])
  const [draft, setDraft] = useState<DraftValues | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { loading, error, execute } = useAsync(props.getRows)

  useEffect(() => {
    let active = true
    void execute().then((result) => {
      if (active && result) {
        setRows(result)
      }
    })
    return () => {
      active = false
    }
  }, [execute])

  const columns = useMemo(
    () =>
      props.fields.map((f) => ({
        key: f.key as keyof RowModel,
        label: f.label,
      })),
    [props.fields],
  )

  const viewRow = selectedRowIndex !== null ? rows[selectedRowIndex] : undefined

  const openCreateDrawer = () => {
    setSelectedRowIndex(null)
    setDrawerMode('create-form')
    setDraft(emptyDraft(props.fields))
    setFormErrors({})
    setOpen(true)
  }

  const openEditDrawer = (_row: RowModel, rowIndex: number) => {
    setSelectedRowIndex(rowIndex)
    setDrawerMode('edit-view')
    setDraft(null)
    setFormErrors({})
    setOpen(true)
  }

  const closeDrawer = () => {
    setOpen(false)
    setFormErrors({})
    setDraft(null)
  }

  const startEditFromView = () => {
    if (selectedRowIndex === null || viewRow === undefined) {
      return
    }
    setDraft(draftFromRow(viewRow, props.fields))
    setDrawerMode('edit-form')
    setFormErrors({})
  }

  const cancelFormToView = () => {
    setDraft(null)
    setFormErrors({})
    setDrawerMode('edit-view')
  }

  const handleSave = () => {
    if (!draft) {
      return
    }
    const payload = draftToPayload(draft, props.fields)
    const parsed = props.rowSchema.safeParse(payload)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const iss of parsed.error.issues) {
        const key = iss.path[0]
        if (typeof key === 'string' && !next[key]) {
          next[key] = iss.message
        }
      }
      setFormErrors(next)
      return
    }
    const data = parsed.data
    if (selectedRowIndex === null) {
      setRows((current) => [data, ...current])
    } else {
      setRows((current) => current.map((row, index) => (index === selectedRowIndex ? data : row)))
    }
    closeDrawer()
  }

  const drawerTitle =
    drawerMode === 'create-form'
      ? 'Thêm dữ liệu mới'
      : drawerMode === 'edit-view'
        ? 'Chi tiết bản ghi'
        : 'Chỉnh sửa dữ liệu'

  const showForm = draft !== null && (drawerMode === 'create-form' || drawerMode === 'edit-form')
  const showDetail = drawerMode === 'edit-view' && viewRow !== undefined

  return (
    <Card title={props.title}>
      <Badge>Module nhập liệu</Badge>
      <p className="text-sm text-muted leading-relaxed">{props.description}</p>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 my-4">
        <Uploader onFileSelected={setFileName} />
        <Button
          variant="secondary"
          onClick={() => writeSheet(props.sampleRows as Array<Record<string, unknown>>, `${props.title}.xlsx`)}
        >
          Tải file mẫu .xlsx
        </Button>
        <Button variant="secondary" onClick={openCreateDrawer}>
          Thêm mới thủ công
        </Button>
      </div>

      {fileName ? (
        <p className="text-sm text-muted mt-1">
          Đã chọn: <span className="font-medium text-primary">{fileName}</span>
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 mt-3 text-sm text-muted">
          <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
          Đang tải dữ liệu…
        </div>
      ) : null}

      {error ? <p className="text-accent text-sm mt-2">{error}</p> : null}

      {!loading && rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-10 border border-dashed border-border rounded-xl text-center">
          <p className="text-muted text-sm leading-relaxed max-w-xs">
            Chưa có dữ liệu. Dùng các nút phía trên (thêm thủ công / chọn file / tải mẫu) hoặc
            import qua API khi đã tích hợp.
          </p>
          <Button variant="secondary" onClick={openCreateDrawer}>
            Thêm bản ghi đầu tiên
          </Button>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <DataTable
          columns={columns}
          rows={rows}
          selectedRowIndex={selectedRowIndex}
          onRowClick={(row, rowIndex) => {
            openEditDrawer(row, rowIndex)
          }}
        />
      ) : null}

      <Drawer open={open} title={drawerTitle} onClose={closeDrawer}>
        {showDetail ? (
          <>
            <dl className="grid gap-3">
              {props.fields.map((field) => (
                <div key={field.key} className="grid gap-1">
                  <dt className="text-xs font-semibold text-muted uppercase tracking-wide">
                    {field.label}
                  </dt>
                  <dd className="text-[15px] leading-relaxed break-words m-0">
                    {formatDetailValue(viewRow[field.key])}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-3 mt-4">
              <Button type="button" onClick={startEditFromView}>
                Chỉnh sửa
              </Button>
            </div>
          </>
        ) : null}

        {showForm && draft ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              handleSave()
            }}
          >
            {props.fields.map((field) => {
              const err = formErrors[field.key]
              const value = draft[field.key] ?? ''
              if (field.kind === 'textarea') {
                return (
                  <FormField key={field.key} label={field.label} error={err}>
                    <Textarea
                      value={value}
                      onChange={(next) =>
                        setDraft((current) => (current ? { ...current, [field.key]: next } : current))
                      }
                    />
                  </FormField>
                )
              }
              if (field.kind === 'number') {
                const displayValue: number | '' =
                  value.trim() === '' ? '' : Number.isFinite(Number(value)) ? Number(value) : ''
                return (
                  <FormField key={field.key} label={field.label} error={err}>
                    <NumberInput
                      value={displayValue}
                      onChange={(next) =>
                        setDraft((current) =>
                          current ? { ...current, [field.key]: next === '' ? '' : String(next) } : current,
                        )
                      }
                    />
                  </FormField>
                )
              }
              return (
                <FormField key={field.key} label={field.label} error={err}>
                  <Input
                    value={value}
                    onChange={(next) =>
                      setDraft((current) => (current ? { ...current, [field.key]: next } : current))
                    }
                  />
                </FormField>
              )
            })}
            <div className="flex flex-wrap gap-3 mt-2">
              <Button type="submit">Lưu dữ liệu</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (drawerMode === 'edit-form') {
                    cancelFormToView()
                  } else {
                    closeDrawer()
                  }
                }}
              >
                {drawerMode === 'edit-form' ? 'Quay lại chi tiết' : 'Hủy'}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </Card>
  )
}
