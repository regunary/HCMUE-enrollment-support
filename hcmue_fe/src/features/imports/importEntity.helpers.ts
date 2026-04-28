import { displayScoreKeyToParts, subjectScoreTypeToDisplayKey } from '../../utils/scoreColumnKeys'
import type { DraftValues, RowModel } from './importEntity.types'

export type ScoreDraftRow = { subjectId: string; scoreType: string; score: string }
export type CombinationDraftMap = Record<string, string>
export type ScoreDetailRow = { subjectId: string; score: number; displayKey: string }
export type ScoreDetailGroups = {
  thpt: ScoreDetailRow[]
  hocBa: ScoreDetailRow[]
  dgnl: ScoreDetailRow[]
  nangKhieu: ScoreDetailRow[]
}

export function draftFromRow(row: RowModel, fields: Array<{ key: string }>): DraftValues {
  const output: DraftValues = {}
  for (const field of fields) {
    const value = row[field.key]
    output[field.key] = value === undefined || value === null ? '' : String(value)
  }
  return output
}

export function emptyDraft(fields: Array<{ key: string }>): DraftValues {
  return fields.reduce<DraftValues>((acc, field) => {
    acc[field.key] = ''
    return acc
  }, {})
}

export function draftToPayload(
  draft: DraftValues,
  fields: Array<{ key: string; kind: 'text' | 'number' | 'textarea' }>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {}
  for (const field of fields) {
    const source = draft[field.key] ?? ''
    if (field.kind === 'number') {
      if (source.trim() === '') {
        output[field.key] = undefined
      } else {
        const parsed = Number(source)
        output[field.key] = Number.isFinite(parsed) ? parsed : Number.NaN
      }
    } else {
      output[field.key] = source
    }
  }
  return output
}

export function formatDetailValue(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '—'
  }
  return String(value)
}

export function parseScoreJsonRows(value: string): ScoreDraftRow[] {
  if (!value.trim()) {
    return []
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return Object.entries(parsed)
      .filter(([, rowScore]) => typeof rowScore === 'number')
      .map(([key, rowScore]) => {
        const parts = displayScoreKeyToParts(key)
        if (parts) {
          return {
            subjectId: parts.subjectId,
            scoreType: parts.scoreType,
            score: String(rowScore),
          }
        }
        const [subjectId, ...rest] = key.split('_')
        const scoreType = rest.join('_') || 'THPT'
        return {
          subjectId: subjectId || '',
          scoreType: scoreType.toUpperCase(),
          score: String(rowScore),
        }
      })
  } catch {
    return []
  }
}

export function buildScoreJsonFromRows(rows: ScoreDraftRow[]): string {
  const output: Record<string, number> = {}
  for (const row of rows) {
    const subjectId = row.subjectId.trim().toUpperCase()
    const scoreType = row.scoreType.trim().toUpperCase()
    const score = Number(row.score)
    if (!subjectId || !scoreType || !Number.isFinite(score)) {
      continue
    }
    output[subjectScoreTypeToDisplayKey(subjectId, scoreType)] = score
  }
  return JSON.stringify(output)
}

export function parseCombinationDraft(subjects: string, weights: string): CombinationDraftMap {
  const subjectItems = subjects
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const weightItems = weights.split(',').map((item) => item.trim())
  const result: CombinationDraftMap = {}
  subjectItems.forEach((subjectId, index) => {
    result[subjectId] = weightItems[index] ?? '1'
  })
  return result
}

export function buildCombinationDraft(
  map: CombinationDraftMap,
  options: Array<{ id: string; name: string }>,
): { subjects: string; weights: string } {
  const order = options.map((item) => item.id)
  const selected = order.filter((id) => Object.prototype.hasOwnProperty.call(map, id))
  return {
    subjects: selected.join(','),
    weights: selected.map((id) => map[id]).join(','),
  }
}

export function sumParsedWeights(weights: string | number | undefined): number | null {
  const parts = String(weights ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return null
  }
  const nums = parts.map((part) => Number(part))
  if (nums.some((value) => !Number.isFinite(value))) {
    return null
  }
  return nums.reduce((acc, value) => acc + value, 0)
}

export function normalizeScoreType(rawType: string, subjectId: string): keyof ScoreDetailGroups {
  const normalized = rawType.trim().toUpperCase()
  if (normalized === 'THPT') {
    return 'thpt'
  }
  if (normalized === 'HOCBA' || normalized === 'HB') {
    return 'hocBa'
  }
  if (normalized === 'DGNL' || normalized === 'NL') {
    return 'dgnl'
  }
  if (normalized === 'CB' || normalized === 'NANGKHIEU' || normalized === 'NK') {
    return 'nangKhieu'
  }
  if (subjectId.toUpperCase().startsWith('NK')) {
    return 'nangKhieu'
  }
  return 'thpt'
}

export function parseScoreJsonForDetail(value: string | number | undefined): ScoreDetailGroups {
  const groups: ScoreDetailGroups = {
    thpt: [],
    hocBa: [],
    dgnl: [],
    nangKhieu: [],
  }
  if (typeof value !== 'string' || !value.trim()) {
    return groups
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    Object.entries(parsed).forEach(([key, score]) => {
      if (typeof score !== 'number' || !Number.isFinite(score)) {
        return
      }
      const parts = displayScoreKeyToParts(key)
      if (parts) {
        const scoreGroup = normalizeScoreType(parts.scoreType, parts.subjectId)
        groups[scoreGroup].push({
          subjectId: parts.subjectId,
          score,
          displayKey: subjectScoreTypeToDisplayKey(parts.subjectId, parts.scoreType),
        })
        return
      }
      const [subjectPart, typePart] = key.split('_')
      const subjectId = (subjectPart || '').trim().toUpperCase()
      if (!subjectId) {
        return
      }
      const scoreGroup = normalizeScoreType(typePart || '', subjectId)
      groups[scoreGroup].push({ subjectId, score, displayKey: key.trim() })
    })
  } catch {
    return groups
  }
  return groups
}
