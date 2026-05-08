import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Card, DataTable, Uploader } from '../../components'
import { Trash2 } from 'lucide-react'
import { writeSheet } from '../../utils/excel'
import { useToast } from '../feedback/useToast'
import { ImportEntityDrawer } from './ImportEntityDrawer'
import {
  draftFromRow,
  draftToPayload,
  emptyDraft,
  parseCombinationDraft,
  parseScoreJsonRows,
  type CombinationDraftMap,
  type ScoreDraftRow,
} from './importEntity.helpers'
import type { DraftValues, ImportEntityPageProps, RowModel } from './importEntity.types'
import { formatImportResultForToast } from './importResultFormat'

/** create-form: new row; edit-view: read-only; edit-form: editing existing row */
type DrawerMode = 'create-form' | 'edit-view' | 'edit-form'

export function ImportEntityPage(props: ImportEntityPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [open, setOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create-form')
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [rows, setRows] = useState<RowModel[]>([])
  const [draft, setDraft] = useState<DraftValues | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [scoreRows, setScoreRows] = useState<ScoreDraftRow[]>([])
  const [combinationMap, setCombinationMap] = useState<CombinationDraftMap>({})
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [totalRows, setTotalRows] = useState(0)
  const listRefreshTokenRef = useRef<number | undefined>(undefined)
  const showForm = draft !== null && (drawerMode === 'create-form' || drawerMode === 'edit-form')
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))

  const loadRows = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true)
    setError('')
    try {
      const result = await props.getRows({ page: nextPage, pageSize: nextPageSize })
      if (Array.isArray(result)) {
        setRows(result)
        setTotalRows(result.length)
      } else {
        setRows(result.rows)
        setTotalRows(result.count)
        setPage(result.page)
        setPageSize(result.pageSize)
      }
      setSelectedRowIndices(new Set())
      return true
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Tải dữ liệu thất bại.'
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  const reloadRows = async () => {
    await loadRows()
  }

  useEffect(() => {
    let active = true
    void loadRows().then((ok) => {
      if (!active || !ok) {
        return
      }
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (error) {
      showToast(error, 'error')
    }
  }, [error, showToast])

  useEffect(() => {
    const token = props.listRefreshToken
    if (token === undefined) {
      return
    }
    if (listRefreshTokenRef.current === undefined) {
      listRefreshTokenRef.current = token
      return
    }
    if (token === listRefreshTokenRef.current) {
      return
    }
    listRefreshTokenRef.current = token
    void loadRows()
  }, [props.listRefreshToken])

  const columns = useMemo(
    () =>
      props.fields
        .filter((f) => !(props.hiddenTableFieldKeys ?? []).includes(f.key))
        .map((f) => ({
          key: f.key as keyof RowModel,
          label: f.label,
        })),
    [props.fields, props.hiddenTableFieldKeys],
  )

  const viewRow = selectedRowIndex !== null ? rows[selectedRowIndex] : undefined

  const updateDraftField = (fieldKey: string, value: string) => {
    setDraft((current) => {
      if (!current) {
        return current
      }
      const nextDraft = { ...current, [fieldKey]: value }
      return props.onDraftChange ? props.onDraftChange(nextDraft, fieldKey) : nextDraft
    })
  }

  const openCreateDrawer = () => {
    const nextDraft = emptyDraft(props.fields)
    setSelectedRowIndex(null)
    setDrawerMode('create-form')
    setDraft(nextDraft)
    setScoreRows(parseScoreJsonRows(nextDraft.scoreJson ?? ''))
    setCombinationMap(parseCombinationDraft(nextDraft.subjects ?? '', nextDraft.weights ?? ''))
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
    setScoreRows([])
    setCombinationMap({})
  }

  const toggleRowSelected = (rowIndex: number, checked: boolean) => {
    setSelectedRowIndices((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(rowIndex)
      } else {
        next.delete(rowIndex)
      }
      return next
    })
  }

  const toggleAllRowsSelected = (checked: boolean) => {
    setSelectedRowIndices(checked ? new Set(rows.map((_row, index) => index)) : new Set())
  }

  const startEditFromView = () => {
    if (selectedRowIndex === null || viewRow === undefined) {
      return
    }
    const nextDraft = draftFromRow(viewRow, props.fields)
    setDraft(nextDraft)
    setScoreRows(parseScoreJsonRows(nextDraft.scoreJson ?? ''))
    setCombinationMap(parseCombinationDraft(nextDraft.subjects ?? '', nextDraft.weights ?? ''))
    setDrawerMode('edit-form')
    setFormErrors({})
  }

  const cancelFormToView = () => {
    setDraft(null)
    setFormErrors({})
    setDrawerMode('edit-view')
  }

  const handleSave = async () => {
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
    const data = parsed.data as RowModel
    if (props.saveRow) {
      setSaving(true)
      try {
        await props.saveRow(data, selectedRowIndex, rows)
        await reloadRows()
        showToast('Lưu dữ liệu thành công.', 'success')
        closeDrawer()
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : 'Lưu dữ liệu thất bại.'
        showToast(message, 'error')
      } finally {
        setSaving(false)
      }
      return
    }
    if (selectedRowIndex === null) {
      setRows((current) => [data, ...current])
    } else {
      setRows((current) => current.map((row, index) => (index === selectedRowIndex ? data : row)))
    }
    await reloadRows()
    showToast('Lưu dữ liệu thành công.', 'success')
    closeDrawer()
  }

  const deleteSelectedRows = async (indices: number[]) => {
    if (!props.deleteRows || indices.length === 0) {
      return
    }
    const selectedRows = indices.map((index) => rows[index]).filter(Boolean)
    setDeleting(true)
    try {
      const nextRows = await props.deleteRows(selectedRows, rows)
      setRows(nextRows)
      setSelectedRowIndices(new Set())
      setSelectedRowIndex(null)
      closeDrawer()
      showToast(indices.length === 1 ? 'Đã xóa bản ghi.' : `Đã xóa ${indices.length} bản ghi.`, 'success')
      await reloadRows()
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Xóa dữ liệu thất bại.'
      showToast(message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCurrent = async () => {
    if (selectedRowIndex === null) {
      return
    }
    if (!window.confirm('Xóa bản ghi này?')) {
      return
    }
    await deleteSelectedRows([selectedRowIndex])
  }

  const handleDeleteBulk = async () => {
    const indices = Array.from(selectedRowIndices).sort((a, b) => a - b)
    if (indices.length === 0) {
      return
    }
    if (!window.confirm(`Xóa ${indices.length} bản ghi đã chọn?`)) {
      return
    }
    await deleteSelectedRows(indices)
  }

  const goToPage = async (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), totalPages)
    setPage(boundedPage)
    await loadRows(boundedPage, pageSize)
  }

  const changePageSize = async (nextPageSize: number) => {
    setPage(1)
    setPageSize(nextPageSize)
    await loadRows(1, nextPageSize)
  }

  const handleImport = async () => {
    if (!selectedFile || !props.importFile) {
      return
    }
    setImporting(true)
    try {
      const summary = await props.importFile(selectedFile)
      const { message, kind } = formatImportResultForToast(props.title, summary)
      showToast(message, kind)
      await reloadRows()
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : 'Import thất bại.'
      showToast(message, 'error')
    } finally {
      setImporting(false)
    }
  }

  const drawerTitle =
    drawerMode === 'create-form'
      ? 'Thêm dữ liệu mới'
      : drawerMode === 'edit-view'
        ? 'Chi tiết bản ghi'
        : 'Chỉnh sửa dữ liệu'

  const showDetail = drawerMode === 'edit-view' && viewRow !== undefined

  return (
    <Card title={props.title}>
      <Badge>Module nhập liệu</Badge>
      <p className="text-sm text-muted leading-relaxed">{props.description}</p>
      {props.mockNotice ? (
        <p className="text-sm leading-relaxed mt-2 mb-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
          {props.mockNotice}
        </p>
      ) : null}
      {props.importHint ? <p className="text-sm text-muted leading-relaxed mt-2 mb-0">{props.importHint}</p> : null}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 my-4">
        <Uploader onFileSelected={setSelectedFile} placeholder={props.uploaderPlaceholder} />
        {props.importFile ? (
          <Button variant="secondary" onClick={() => void handleImport()} type="button">
            {importing ? 'Đang import...' : props.importButtonLabel || 'Import file đã chọn'}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => writeSheet(props.sampleRows as Array<Record<string, unknown>>, `${props.title}.xlsx`)}
        >
          Tải file mẫu .xlsx
        </Button>
        <Button variant="secondary" onClick={openCreateDrawer}>
          Thêm mới thủ công
        </Button>
        {props.deleteRows ? (
          <Button
            variant="secondary"
            onClick={() => void handleDeleteBulk()}
            disabled={selectedRowIndices.size === 0 || deleting}
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 size={16} aria-hidden />
              {deleting ? 'Đang xóa...' : `Xóa đã chọn${selectedRowIndices.size ? ` (${selectedRowIndices.size})` : ''}`}
            </span>
          </Button>
        ) : null}
      </div>

      {selectedFile ? (
        <p className="text-sm text-muted mt-1">
          Đã chọn: <span className="font-medium text-primary">{selectedFile.name}</span>
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 mt-3 text-sm text-muted">
          <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
          Đang tải dữ liệu…
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-10 border border-dashed border-border rounded-xl text-center">
          <p className="text-muted text-sm leading-relaxed max-w-xs">
            Chưa có dữ liệu.
          </p>
          <Button variant="secondary" onClick={openCreateDrawer}>
            Thêm bản ghi đầu tiên
          </Button>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            selectedRowIndex={selectedRowIndex}
            selectedRowIndices={selectedRowIndices}
            onToggleRowSelected={props.deleteRows ? toggleRowSelected : undefined}
            onToggleAllRowsSelected={props.deleteRows ? toggleAllRowsSelected : undefined}
            onRowClick={(row, rowIndex) => {
              openEditDrawer(row, rowIndex)
            }}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>
              Trang {page}/{totalPages} · {totalRows.toLocaleString('vi-VN')} bản ghi
            </span>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-border bg-white px-2 text-sm text-primary"
                value={pageSize}
                onChange={(event) => void changePageSize(Number(event.target.value))}
              >
                {[50, 100, 200, 500].map((value) => (
                  <option key={value} value={value}>
                    {value}/trang
                  </option>
                ))}
              </select>
              <Button variant="secondary" type="button" disabled={page <= 1 || loading} onClick={() => void goToPage(page - 1)}>
                Trước
              </Button>
              <Button variant="secondary" type="button" disabled={page >= totalPages || loading} onClick={() => void goToPage(page + 1)}>
                Sau
              </Button>
            </div>
          </div>
        </>
      ) : null}

      <ImportEntityDrawer
        open={open}
        drawerTitle={drawerTitle}
        onClose={closeDrawer}
        drawerMode={drawerMode}
        fields={props.fields}
        viewRow={viewRow}
        showDetail={showDetail}
        showForm={showForm}
        draft={draft}
        formErrors={formErrors}
        selectOptionsByField={props.selectOptionsByField}
        combinationSubjectOptions={props.combinationSubjectOptions}
        combinationMap={combinationMap}
        setCombinationMap={setCombinationMap}
        scoreRows={scoreRows}
        setScoreRows={setScoreRows}
        updateDraftField={updateDraftField}
        setDraft={setDraft}
        startEditFromView={startEditFromView}
        cancelFormToView={cancelFormToView}
        handleSave={handleSave}
        handleDeleteCurrent={props.deleteRows && showDetail ? handleDeleteCurrent : undefined}
        saving={saving}
        deleting={deleting}
      />
    </Card>
  )
}
