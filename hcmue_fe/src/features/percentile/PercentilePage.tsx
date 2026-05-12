import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, DataTable, Tabs } from '../../components'
import type { DataColumn } from '../../components'
import { enrollmentApi } from '../../services/enrollmentApi'
import type { PercentileDisplayTable, PercentileTablesPayload } from '../../api/liveEnrollmentApi'

type PercentileMode = 'all' | 'wish' | 'major' | 'combination'
type PercentileRow = Record<string, string | number>

const DEFAULT_PERCENTILES = [10, 25, 50, 75, 90]
const DEFAULT_ROUND = 1

function toDataTable(table: PercentileDisplayTable): {
  columns: DataColumn<PercentileRow>[]
  rows: PercentileRow[]
} {
  return {
    columns: [
      { key: 'percentile', label: 'Mốc' },
      ...table.columns.map((column) => ({
        key: column.key,
        label: column.label,
      })),
    ],
    rows: table.rows.map((row) => ({
      percentile: row.label,
      ...Object.fromEntries(table.columns.map((column) => [column.key, row.values[column.key] ?? '-'])),
    })),
  }
}

function PercentileTable(props: { table: PercentileDisplayTable; heading?: string }) {
  const data = useMemo(() => toDataTable(props.table), [props.table])
  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-primary">{props.heading ?? props.table.title}</h3>
        <span className="text-xs text-muted">{props.table.columns.length} tổ hợp</span>
      </div>
      <DataTable columns={data.columns} rows={data.rows} />
    </section>
  )
}

function tablesForMode(payload: PercentileTablesPayload | null, mode: PercentileMode): PercentileDisplayTable[] {
  if (!payload) {
    return []
  }
  if (mode === 'all') {
    return [payload.all]
  }
  if (mode === 'wish') {
    return payload.wishes
  }
  if (mode === 'major') {
    return payload.majors
  }
  return payload.combinations
}

export function PercentilePage() {
  const [mode, setMode] = useState<PercentileMode>('all')
  const [payload, setPayload] = useState<PercentileTablesPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [recomputing, setRecomputing] = useState(false)
  const [error, setError] = useState('')

  const loadPercentiles = useCallback(async () => {
    const getPercentileTables = enrollmentApi.getPercentileTables
    if (!getPercentileTables) {
      setError('API bách phân vị chưa được cấu hình.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await getPercentileTables({
        round: DEFAULT_ROUND,
        percentiles: DEFAULT_PERCENTILES,
      })
      setPayload(data)
    } catch (err) {
      setPayload(null)
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu bách phân vị.')
    } finally {
      setLoading(false)
    }
  }, [])

  const recomputePercentiles = useCallback(async () => {
    const recompute = enrollmentApi.recomputePercentileTables
    if (!recompute) {
      setError('API tính lại bách phân vị chưa được cấu hình.')
      return
    }
    setRecomputing(true)
    setError('')
    try {
      await recompute({
        round: DEFAULT_ROUND,
        percentiles: DEFAULT_PERCENTILES,
      })
      await loadPercentiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tính lại được dữ liệu bách phân vị.')
    } finally {
      setRecomputing(false)
    }
  }, [loadPercentiles])

  useEffect(() => {
    // Existing data pages in this app load on mount; keep the same route behavior here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPercentiles()
  }, [loadPercentiles])

  const visibleTables = useMemo(() => tablesForMode(payload, mode), [payload, mode])

  return (
    <Card title="Bách phân vị">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge>Module tính toán</Badge>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={loadPercentiles} disabled={loading || recomputing}>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </Button>
          <Button onClick={recomputePercentiles} disabled={loading || recomputing}>
            {recomputing ? 'Đang tính...' : 'Tính lại'}
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted leading-relaxed mt-3">
        Dữ liệu được lấy từ API bách phân vị theo snapshot của đợt xét tuyển hiện tại. Tab nguyện vọng tính theo thứ tự NV,
        tab ngành hiển thị từng ngành, tab tổ hợp hiển thị từng tổ hợp.
      </p>
      <Tabs
        value={mode}
        onChange={(value) => setMode(value as PercentileMode)}
        tabs={[
          { key: 'all', label: 'Toàn bộ' },
          { key: 'wish', label: 'Theo nguyện vọng' },
          { key: 'major', label: 'Theo ngành' },
          { key: 'combination', label: 'Theo tổ hợp' },
        ]}
      />
      {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
      {!error && loading ? <p className="mt-4 text-sm text-muted">Đang tải dữ liệu...</p> : null}
      {!error && !loading && visibleTables.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Chưa có dữ liệu bách phân vị.</p>
      ) : null}
      {!error && !loading
        ? visibleTables.map((table) => (
            <PercentileTable
              key={table.major_id ?? table.combination_id ?? table.rank ?? table.title}
              table={table}
            />
          ))
        : null}
    </Card>
  )
}
