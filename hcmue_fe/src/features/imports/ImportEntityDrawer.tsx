import { Button, Drawer, FormField, Input, NumberInput, Select, Textarea } from '../../components'
import type { Dispatch, SetStateAction } from 'react'
import type { ImportFieldDef, RowModel, DraftValues } from './importEntity.types'
import type { CombinationDraftMap, ScoreDraftRow } from './importEntity.helpers'
import {
  buildCombinationDraft,
  buildScoreJsonFromRows,
  formatDetailValue,
  parseScoreJsonForDetail,
  sumParsedWeights,
} from './importEntity.helpers'
import { CombinationSubjectsEditor } from './editors/CombinationSubjectsEditor'
import { ScoreJsonEditor } from './editors/ScoreJsonEditor'

type DrawerMode = 'create-form' | 'edit-view' | 'edit-form'

type ImportEntityDrawerProps = {
  open: boolean
  drawerTitle: string
  onClose: () => void
  drawerMode: DrawerMode
  fields: ImportFieldDef[]
  viewRow?: RowModel
  showDetail: boolean
  showForm: boolean
  draft: DraftValues | null
  formErrors: Record<string, string>
  selectOptionsByField?: Record<string, Array<{ label: string; value: string }>>
  combinationSubjectOptions?: Array<{ id: string; name: string }>
  combinationMap: CombinationDraftMap
  setCombinationMap: (nextMap: CombinationDraftMap) => void
  scoreRows: ScoreDraftRow[]
  setScoreRows: (rows: ScoreDraftRow[]) => void
  updateDraftField: (fieldKey: string, value: string) => void
  setDraft: Dispatch<SetStateAction<DraftValues | null>>
  startEditFromView: () => void
  cancelFormToView: () => void
  handleSave: () => Promise<void>
  saving: boolean
}

const SCORE_DETAIL_SECTIONS = [
  { key: 'thpt' as const, title: 'Bảng điểm THPT' },
  { key: 'hocBa' as const, title: 'Bảng điểm học bạ' },
  { key: 'dgnl' as const, title: 'Bảng điểm đánh giá năng lực' },
  { key: 'nangKhieu' as const, title: 'Bảng điểm năng khiếu' },
]

export function ImportEntityDrawer(props: ImportEntityDrawerProps) {
  const hasCombinationDetailFields =
    props.fields.some((field) => field.key === 'subjects') &&
    props.fields.some((field) => field.key === 'weights')

  const hasScoreJsonField = props.fields.some((field) => field.key === 'scoreJson')
  const scoreGroups =
    props.showDetail && props.viewRow && hasScoreJsonField ? parseScoreJsonForDetail(props.viewRow.scoreJson) : null

  const combinationSubjectsCsv =
    props.showDetail && props.viewRow && hasCombinationDetailFields ? String(props.viewRow.subjects ?? '') : ''
  const combinationWeightsCsv =
    props.showDetail && props.viewRow && hasCombinationDetailFields ? String(props.viewRow.weights ?? '') : ''

  const combinationSubjectTokens = combinationSubjectsCsv
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const combinationWeightTokens = combinationWeightsCsv.split(',').map((part) => part.trim())

  const combinationSlots = [0, 1, 2].map((index) => ({
    header: index === 0 ? 'Môn 1' : index === 1 ? 'Môn 2' : 'Môn 3',
    subjectId: combinationSubjectTokens[index] ?? '',
    weight: combinationWeightTokens[index] ?? '',
  }))

  const resolveSubjectName = (subjectId: string): string => {
    if (!subjectId || !props.combinationSubjectOptions?.length) {
      return ''
    }
    const hit = props.combinationSubjectOptions.find(
      (item) => item.id.toUpperCase() === subjectId.toUpperCase() || item.id === subjectId,
    )
    return hit?.name ?? ''
  }

  const combinationWeightSum = hasCombinationDetailFields ? sumParsedWeights(combinationWeightsCsv) : null

  const totalScoreRows =
    scoreGroups !== null
      ? SCORE_DETAIL_SECTIONS.reduce((acc, section) => acc + scoreGroups[section.key].length, 0)
      : 0

  const sectionsWithData =
    scoreGroups !== null ? SCORE_DETAIL_SECTIONS.filter((section) => scoreGroups[section.key].length > 0) : []

  return (
    <Drawer open={props.open} title={props.drawerTitle} onClose={props.onClose}>
      {props.showDetail && props.viewRow ? (
        <>
          <dl className="grid gap-3">
            {props.fields
              .filter((field) => field.key !== 'scoreJson')
              .filter(
                (field) =>
                  !(hasCombinationDetailFields && (field.key === 'subjects' || field.key === 'weights')),
              )
              .map((field) => (
                <div key={field.key} className="grid gap-1">
                  <dt className="text-xs font-semibold text-muted uppercase tracking-wide">{field.label}</dt>
                  <dd className="text-[15px] leading-relaxed break-words m-0">{formatDetailValue(props.viewRow?.[field.key])}</dd>
                </div>
              ))}
          </dl>
          {hasCombinationDetailFields && props.viewRow ? (
            <div className="mt-4 rounded-md border border-border overflow-hidden">
              <div className="px-3 py-2 bg-surface-subtle text-sm font-semibold">Thành phần tổ hợp</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[320px]">
                  <thead>
                    <tr className="bg-surface-subtle">
                      <th className="text-left px-3 py-2 border-t border-border font-semibold">Mã môn</th>
                      <th className="text-left px-3 py-2 border-t border-border font-semibold">Tên môn</th>
                      <th className="text-right px-3 py-2 border-t border-border font-semibold tabular-nums w-[120px]">
                        Trọng số
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinationSlots.map((slot) => {
                      const name = resolveSubjectName(slot.subjectId)
                      return (
                        <tr key={slot.header} className="border-t border-border">
                          <td className="px-3 py-2 align-middle font-medium">
                            {slot.subjectId ? slot.subjectId.toUpperCase() : '—'}
                          </td>
                          <td className="px-3 py-2 align-middle text-muted">{name || '—'}</td>
                          <td className="px-3 py-2 align-middle text-right tabular-nums">
                            {slot.weight !== '' ? slot.weight : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 border-t border-border text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  Tổng trọng số:
                  <span className="font-medium text-primary ml-1 tabular-nums">
                    {combinationWeightSum !== null ? combinationWeightSum.toFixed(4) : '—'}
                  </span>
                  {combinationWeightSum !== null && Math.abs(combinationWeightSum - 1) > 1e-6 ? (
                    <span className="text-amber-700 ml-2">(theo hồ sơ nên = 1)</span>
                  ) : null}
                </span>
              </div>
            </div>
          ) : null}
          {scoreGroups ? (
            totalScoreRows === 0 ? (
              <p className="text-sm text-muted leading-relaxed m-0 mt-4">
                Chưa có điểm môn trên hồ sơ này.
              </p>
            ) : (
              <div className="grid gap-3 mt-4">
                {sectionsWithData.map((section) => {
                  const sectionRows = scoreGroups[section.key]
                  return (
                    <div key={section.key} className="rounded-md border border-border overflow-hidden">
                      <div className="px-3 py-2 bg-surface-subtle text-sm font-semibold">{section.title}</div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-surface-subtle">
                            <th className="text-left px-3 py-2 border-t border-border">Mã môn</th>
                            <th className="text-left px-3 py-2 border-t border-border">Điểm</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionRows.map((item) => (
                            <tr key={`${section.key}-${item.displayKey}-${item.subjectId}`} className="border-t border-border">
                              <td className="px-3 py-2 font-mono text-sm">{item.displayKey}</td>
                              <td className="px-3 py-2 tabular-nums">{item.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            )
          ) : null}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button type="button" onClick={props.startEditFromView}>
              Chỉnh sửa
            </Button>
          </div>
        </>
      ) : null}

      {props.showForm && props.draft ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void props.handleSave()
          }}
        >
          {props.fields.map((field) => {
            const err = props.formErrors[field.key]
            const value = props.draft?.[field.key] ?? ''
            const hasCombinationEditor =
              field.key === 'subjects' &&
              Array.isArray(props.combinationSubjectOptions) &&
              props.combinationSubjectOptions.length > 0 &&
              Object.prototype.hasOwnProperty.call(props.draft, 'weights')
            if (
              field.key === 'weights' &&
              Array.isArray(props.combinationSubjectOptions) &&
              props.combinationSubjectOptions.length > 0
            ) {
              return null
            }
            if (hasCombinationEditor) {
              return (
                <FormField key={field.key} label="Danh sách môn + trọng số" error={err || props.formErrors.weights}>
                  <CombinationSubjectsEditor
                    options={props.combinationSubjectOptions ?? []}
                    map={props.combinationMap}
                    onMapChange={(nextMap) => {
                      props.setCombinationMap(nextMap)
                      const nextDraftPair = buildCombinationDraft(nextMap, props.combinationSubjectOptions ?? [])
                      props.updateDraftField('subjects', nextDraftPair.subjects)
                      props.updateDraftField('weights', nextDraftPair.weights)
                    }}
                  />
                </FormField>
              )
            }
            const selectOptions = props.selectOptionsByField?.[field.key]
            if (selectOptions && selectOptions.length > 0) {
              return (
                <FormField key={field.key} label={field.label} error={err}>
                  <Select value={value} onChange={(next) => props.updateDraftField(field.key, next)} options={selectOptions} />
                </FormField>
              )
            }
            if (field.kind === 'textarea') {
              if (field.key === 'scoreJson') {
                return (
                  <FormField key={field.key} label={field.label} error={err}>
                    <ScoreJsonEditor
                      rows={props.scoreRows}
                      onRowsChange={(nextRows) => {
                        props.setScoreRows(nextRows)
                        props.setDraft((draftCurrent) =>
                          draftCurrent ? { ...draftCurrent, scoreJson: buildScoreJsonFromRows(nextRows) } : draftCurrent,
                        )
                      }}
                    />
                  </FormField>
                )
              }
              return (
                <FormField key={field.key} label={field.label} error={err}>
                  <Textarea value={value} onChange={(next) => props.updateDraftField(field.key, next)} />
                </FormField>
              )
            }
            if (field.kind === 'number') {
              const displayValue: number | '' = value.trim() === '' ? '' : Number.isFinite(Number(value)) ? Number(value) : ''
              return (
                <FormField key={field.key} label={field.label} error={err}>
                  <NumberInput
                    value={displayValue}
                    onChange={(next) => props.updateDraftField(field.key, next === '' ? '' : String(next))}
                  />
                </FormField>
              )
            }
            return (
              <FormField key={field.key} label={field.label} error={err}>
                <Input value={value} onChange={(next) => props.updateDraftField(field.key, next)} />
              </FormField>
            )
          })}
          <div className="flex flex-wrap gap-3 mt-2">
            <Button type="submit">{props.saving ? 'Đang lưu...' : 'Lưu dữ liệu'}</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (props.drawerMode === 'edit-form') {
                  props.cancelFormToView()
                } else {
                  props.onClose()
                }
              }}
            >
              {props.drawerMode === 'edit-form' ? 'Quay lại chi tiết' : 'Hủy'}
            </Button>
          </div>
        </form>
      ) : null}
    </Drawer>
  )
}
