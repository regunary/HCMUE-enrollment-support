/**
 * English note: Live HTTP implementation — same contracts as mockApi; tune endpoints + schemas only.
 */
import { displayScoreKeyToParts, subjectScoreTypeToDisplayKey } from '../utils/scoreColumnKeys'
import { apiDeleteJson, apiGetJson, apiPatchJson, apiPostFormData, apiPostJson } from './http'
import { enrollmentEndpoints } from './endpoints'
import { unwrapListPayload, unwrapPaginatedPayload, type PageParams, type PaginatedResult } from './response'
import { candidateSchema, combinationSchema, criteriaSchema, exclusionSchema, majorSchema, subjectSchema, wishSchema } from '../schemas/domain.schema'
import type { Candidate, Combination, Criteria, Exclusion, Major, Subject, Wish } from '../types/domain'

type CandidateApiRow = {
  id?: string
  cccd: string
  graduation_year?: number | null
  academic_level?: string | null
  graduation_score?: number | null
  region_priority?: { region_code?: string | null; special_code?: string | null; bonus_score?: number | null } | null
  scores?: Array<{ score_type: string; subject_id: string; score: number | null }>
}

type CombinationApiRow = {
  id: string
  name?: string
  subjects?: Array<{ subject_id: string; weight: number }>
}

type SubjectApiRow = {
  id: string
  name: string
}

type MajorApiRow = {
  id: string
  name: string
  combinations?: Array<{ combination_id: string; min_score?: number | string; score_offset?: number | string; is_primary?: boolean }>
}

type MajorApiPayload = {
  id?: string
  name?: string
  combinations?: Array<{ combination_id: string; min_score: number; score_offset: number; is_primary: boolean }>
}

type WishApiRow = {
  cccd: string
  major_id: string
  rank: number
}

type ExclusionApiRow = {
  cccd: string
  reason: string
}

type CriteriaApiRow = {
  id?: number
  major_id?: string
  combination_id: string
  subject_id?: string | null
  min_subject_score?: number | string | null
  min_total_score?: number | string | null
  note?: string
  condition_json?: unknown
}

export type PercentileTableColumn = {
  key: string
  label: string
  combination_id: string
  major_combination_id?: number
  major_id?: string
}

export type PercentileTableRow = {
  percentile: number
  label: string
  values: Record<string, string | null>
}

export type PercentileDisplayTable = {
  title: string
  columns: PercentileTableColumn[]
  rows: PercentileTableRow[]
  major_id?: string
  major_name?: string
  combination_id?: string
  combination_name?: string
  rank?: number
}

export type PercentileTablesPayload = {
  round: number
  percentiles: number[]
  all: PercentileDisplayTable
  wishes: PercentileDisplayTable[]
  majors: PercentileDisplayTable[]
  combinations: PercentileDisplayTable[]
}

function mapMajorApiToRow(row: MajorApiRow): Major & { _pk?: string } {
  const combinations = row.combinations ?? []
  return {
    ...majorSchema.parse({
      code: row.id,
      name: row.name,
      combinations: combinations.map((item) => item.combination_id).join(','),
      minScores: combinations.map((item) => String(item.min_score ?? 0)).join(','),
      scoreOffsets: combinations.map((item) => String(item.score_offset ?? 0)).join(','),
      primaryCombination: combinations.find((item) => item.is_primary)?.combination_id ?? combinations[0]?.combination_id ?? '',
    }),
    _pk: row.id,
  }
}

function mapMajorFormToApiPayload(major: Major, includeId: boolean): MajorApiPayload {
  const combinations = major.combinations
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const minScores = major.minScores.split(',').map((item) => Number(item.trim()))
  const scoreOffsets = major.scoreOffsets.split(',').map((item) => Number(item.trim()))
  const primaryCombination = major.primaryCombination.trim()
  return {
    ...(includeId ? { id: major.code } : {}),
    name: major.name,
    combinations: combinations.map((combinationId, index) => ({
      combination_id: combinationId,
      min_score: minScores[index] ?? 0,
      score_offset: scoreOffsets[index] ?? 0,
      is_primary: combinationId === primaryCombination,
    })),
  }
}

function mapWishApiToRow(row: WishApiRow & { id?: number }): Wish & { _pk?: string } {
  return {
    ...wishSchema.parse({
      idNumber: row.cccd,
      majorCode: row.major_id,
      order: row.rank,
    }),
    _pk: row.id === undefined ? undefined : String(row.id),
  }
}

function mapWishFormToApiPayload(wish: Wish): Record<string, unknown> {
  return {
    cccd: wish.idNumber,
    major_id: wish.majorCode,
    rank: wish.order,
  }
}

function mapExclusionApiToRow(row: ExclusionApiRow & { id?: number }): Exclusion & { _pk?: string } {
  return {
    ...exclusionSchema.parse({
      idNumber: row.cccd,
      reason: row.reason,
    }),
    _pk: row.id === undefined ? undefined : String(row.id),
  }
}

function mapExclusionFormToApiPayload(exclusion: Exclusion): Record<string, unknown> {
  return {
    cccd: exclusion.idNumber,
    reason: exclusion.reason,
  }
}

type ImportSummary = {
  success: boolean
  created: number
  updated: number
  skipped: number
  errors: Array<Record<string, unknown>>
}

type ImportJobStatus = {
  id: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  row_count: number
  created: number
  updated: number
  skipped: number
  errors: Array<Record<string, unknown>>
}

type CandidateRegionApiRow = {
  id?: string
  code: string
  bonus_score: number
}

type CandidatePriorityObjectApiRow = {
  id?: string
  code: string
  bonus_score: number
}

function unwrapDataPayload<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
    return (raw as { data: T }).data
  }
  return raw as T
}

function withPageParams(path: string, params?: PageParams): string {
  if (!params) {
    return path
  }
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
  })
  return `${path}?${query.toString()}`
}

function mapAcademicLevelToLabel(value: string | null | undefined): string {
  if (value === '1') {
    return 'Giỏi'
  }
  if (value === '0') {
    return 'Khá'
  }
  return value ?? 'Khá'
}

function mapAcademicLevelToApiValue(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'giỏi' || normalized === 'gioi' || normalized === '1') {
    return '1'
  }
  if (normalized === 'khá' || normalized === 'kha' || normalized === '0') {
    return '0'
  }
  return value
}

function mapCandidateApiToRow(row: CandidateApiRow): Candidate & { _pk?: string } {
  const scoreMap: Record<string, number> = {}
  for (const item of row.scores ?? []) {
    if (typeof item.score === 'number' && typeof item.subject_id === 'string' && typeof item.score_type === 'string') {
      scoreMap[subjectScoreTypeToDisplayKey(item.subject_id, item.score_type)] = item.score
    }
  }
  return {
    ...candidateSchema.parse({
      idNumber: row.cccd,
      priorityRegion: row.region_priority?.region_code ?? '',
      priorityBonus: row.region_priority?.bonus_score ?? 0,
      priorityGroup: row.region_priority?.special_code ?? '',
      graduationYear: row.graduation_year ?? 2025,
      academicLevel: mapAcademicLevelToLabel(row.academic_level),
      graduationScore: row.graduation_score ?? 0,
      scoreJson: JSON.stringify(scoreMap),
    }),
    _pk: row.id,
  }
}

function mapCandidateFormToApiPayload(candidate: Candidate): Record<string, unknown> {
  const scoreJson = candidate.scoreJson.trim()
  let scoreEntries: Array<{ score_type: string; subject_id: string; score: number | null }> = []
  if (scoreJson) {
    try {
      const parsed = JSON.parse(scoreJson) as Record<string, unknown>
      scoreEntries = Object.entries(parsed)
        .filter(([, value]) => typeof value === 'number')
        .map(([key, value]) => {
          const parts = displayScoreKeyToParts(key)
          if (parts) {
            return {
              subject_id: parts.subjectId,
              score_type: parts.scoreType,
              score: value as number,
            }
          }
          const [subject, ...rest] = key.split('_')
          const scoreTypeRaw = rest.join('_') || 'THPT'
          return {
            subject_id: subject,
            score_type: scoreTypeRaw,
            score: value as number,
          }
        })
    } catch {
      scoreEntries = []
    }
  }
  return {
    cccd: candidate.idNumber,
    graduation_year: candidate.graduationYear,
    academic_level: mapAcademicLevelToApiValue(candidate.academicLevel),
    graduation_score: candidate.graduationScore,
    region_priority: {
      region_code: candidate.priorityRegion || null,
      special_code: candidate.priorityGroup || null,
    },
    scores: scoreEntries,
  }
}

async function fetchCandidatesFromBackend(params?: PageParams): Promise<PaginatedResult<Candidate & { _pk?: string }>> {
  const raw = await apiGetJson<unknown>(withPageParams(enrollmentEndpoints.candidates, params))
  const page = unwrapPaginatedPayload<CandidateApiRow>(raw)
  return { ...page, rows: page.rows.map(mapCandidateApiToRow) }
}

async function fetchCombinationsFromBackend(params?: PageParams): Promise<PaginatedResult<Combination>> {
  const raw = await apiGetJson<unknown>(withPageParams(enrollmentEndpoints.combinations, params))
  const page = unwrapPaginatedPayload<CombinationApiRow>(raw)
  return {
    ...page,
    rows: page.rows.map((row) =>
      combinationSchema.parse({
        code: row.id,
        subjects: (row.subjects ?? []).map((item) => item.subject_id).join(','),
        weights: (row.subjects ?? []).map((item) => String(item.weight)).join(','),
      }),
    ),
  }
}

function mapCombinationFormToApiPayload(combination: Combination): Record<string, unknown> {
  const subjects = combination.subjects
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const rawWeights = combination.weights
    .split(',')
    .map((item) => Number(item.trim()))
  const weights = rawWeights.map((value) => (Number.isFinite(value) ? value : Number.NaN))
  return {
    id: combination.code,
    name: combination.code,
    subjects: subjects.map((subject, index) => ({
      subject_id: subject,
      score_type: 'THPT',
      weight: weights[index],
    })),
  }
}

async function fetchSubjectsFromBackend(params?: PageParams): Promise<PaginatedResult<Subject>> {
  const raw = await apiGetJson<unknown>(withPageParams(enrollmentEndpoints.subjects, params))
  const page = unwrapPaginatedPayload<SubjectApiRow>(raw)
  return { ...page, rows: page.rows.map((row) => subjectSchema.parse(row)) }
}

async function fetchMajorsFromBackend(params?: PageParams): Promise<PaginatedResult<Major>> {
  const raw = await apiGetJson<unknown>(withPageParams(enrollmentEndpoints.majors, params))
  const page = unwrapPaginatedPayload<MajorApiRow>(raw)
  return { ...page, rows: page.rows.map(mapMajorApiToRow) }
}

async function fetchWishesFromBackend(params?: PageParams): Promise<PaginatedResult<Wish>> {
  const raw = await apiGetJson<unknown>(withPageParams(enrollmentEndpoints.wishes, params))
  const page = unwrapPaginatedPayload<WishApiRow & { id?: number }>(raw)
  return { ...page, rows: page.rows.map(mapWishApiToRow) }
}

async function fetchExclusionsFromBackend(params?: PageParams): Promise<PaginatedResult<Exclusion>> {
  const raw = await apiGetJson<unknown>(withPageParams(enrollmentEndpoints.exclusions, params))
  const page = unwrapPaginatedPayload<ExclusionApiRow & { id?: number }>(raw)
  return { ...page, rows: page.rows.map(mapExclusionApiToRow) }
}

function formatCriteriaRule(row: CriteriaApiRow): string {
  const parts = [
    row.subject_id ? `Môn ${row.subject_id}` : '',
    row.min_subject_score !== null && row.min_subject_score !== undefined ? `điểm môn >= ${row.min_subject_score}` : '',
    row.min_total_score !== null && row.min_total_score !== undefined ? `tổng >= ${row.min_total_score}` : '',
    row.note ?? '',
    row.condition_json ? JSON.stringify(row.condition_json) : '',
  ].filter(Boolean)
  return parts.join('; ') || 'Điều kiện xét tuyển'
}

async function fetchCriteriaFromBackend(params?: PageParams): Promise<PaginatedResult<Criteria>> {
  const raw = await apiGetJson<unknown>(withPageParams(enrollmentEndpoints.criteria, params))
  const page = unwrapPaginatedPayload<CriteriaApiRow>(raw)
  return {
    ...page,
    rows: page.rows.map((row) => ({
      ...criteriaSchema.parse({
        majorCode: row.major_id ?? '',
        combinationCode: row.combination_id,
        rule: formatCriteriaRule(row),
      }),
      _pk: row.id === undefined ? undefined : String(row.id),
    })),
  }
}

async function fetchPercentileTablesFromBackend(params?: {
  round?: number
  percentiles?: number[]
}): Promise<PercentileTablesPayload> {
  const query = new URLSearchParams()
  if (params?.round !== undefined) {
    query.set('round', String(params.round))
  }
  if (params?.percentiles?.length) {
    query.set('percentiles', params.percentiles.join(','))
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const raw = await apiGetJson<unknown>(`${enrollmentEndpoints.percentileTables}${suffix}`)
  return unwrapDataPayload<PercentileTablesPayload>(raw)
}

async function recomputePercentileTablesOnBackend(params?: {
  round?: number
  percentiles?: number[]
}): Promise<unknown> {
  const raw = await apiPostJson<unknown>(enrollmentEndpoints.percentileRecompute, {
    round: params?.round ?? 1,
    percentiles: params?.percentiles ?? [10, 25, 50, 75, 90],
  })
  return unwrapDataPayload<unknown>(raw)
}

function mapCriteriaFormToApiPayload(criteria: Criteria): Record<string, unknown> {
  return {
    major_id: criteria.majorCode,
    combination_id: criteria.combinationCode,
    note: criteria.rule,
  }
}

function mapCriteriaApiToRow(row: CriteriaApiRow): Criteria & { _pk?: string } {
  return {
    ...criteriaSchema.parse({
      majorCode: row.major_id ?? '',
      combinationCode: row.combination_id,
      rule: formatCriteriaRule(row),
    }),
    _pk: row.id === undefined ? undefined : String(row.id),
  }
}

async function fetchCandidateRegionsFromBackend(): Promise<CandidateRegionApiRow[]> {
  const raw = await apiGetJson<unknown>(enrollmentEndpoints.candidateRegions)
  const rows = unwrapListPayload(raw) as CandidateRegionApiRow[]
  return rows
}

async function fetchCandidatePriorityObjectsFromBackend(): Promise<CandidatePriorityObjectApiRow[]> {
  const raw = await apiGetJson<unknown>(enrollmentEndpoints.candidatePriorityObjects)
  const rows = unwrapListPayload(raw) as CandidatePriorityObjectApiRow[]
  return rows
}

/** FormData được api/http.ts sao chép bytes (arrayBuffer) trước khi fetch — import lại cùng file vẫn ổn. */
async function uploadImportFile(path: string, file: File): Promise<ImportSummary> {
  const form = new FormData()
  form.append('file', file)
  const raw = await apiPostFormData<unknown>(path, form)
  if (raw && typeof raw === 'object' && 'job_id' in (raw as Record<string, unknown>)) {
    const jobId = String((raw as { job_id: string }).job_id)
    const finalStatus = await waitImportJobDone(jobId)
    return {
      success: finalStatus.status === 'done',
      created: finalStatus.created ?? 0,
      updated: finalStatus.updated ?? 0,
      skipped: finalStatus.skipped ?? 0,
      errors: Array.isArray(finalStatus.errors) ? finalStatus.errors : [],
    }
  }
  const data = (raw ?? {}) as Partial<ImportSummary>
  return {
    success: data.success ?? true,
    created: data.created ?? 0,
    updated: data.updated ?? 0,
    skipped: data.skipped ?? 0,
    errors: Array.isArray(data.errors) ? data.errors : [],
  }
}

async function waitImportJobDone(jobId: string): Promise<ImportJobStatus> {
  const maxAttempts = 300
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const raw = await apiGetJson<unknown>(`${enrollmentEndpoints.candidateImportBatchStatus}${jobId}/`)
    const payload = unwrapDataPayload<ImportJobStatus>(raw)
    if (payload.status === 'done' || payload.status === 'failed') {
      return payload
    }
    // Poll every second; imports are heavy and can run for minutes.
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('Import chạy quá lâu, vui lòng kiểm tra lại trạng thái job.')
}

/** Chỉ các route đã mount trong Django `core/urls.py`. */
export const liveEnrollmentApi = {
  getCandidates: (params?: PageParams): Promise<PaginatedResult<Candidate>> => fetchCandidatesFromBackend(params),
  getCombinations: (params?: PageParams): Promise<PaginatedResult<Combination>> => fetchCombinationsFromBackend(params),
  getSubjects: (params?: PageParams): Promise<PaginatedResult<Subject>> => fetchSubjectsFromBackend(params),
  getMajors: (params?: PageParams): Promise<PaginatedResult<Major>> => fetchMajorsFromBackend(params),
  getWishes: (params?: PageParams): Promise<PaginatedResult<Wish>> => fetchWishesFromBackend(params),
  getExclusions: (params?: PageParams): Promise<PaginatedResult<Exclusion>> => fetchExclusionsFromBackend(params),
  getCriteria: (params?: PageParams): Promise<PaginatedResult<Criteria>> => fetchCriteriaFromBackend(params),
  getPercentileTables: (params?: { round?: number; percentiles?: number[] }): Promise<PercentileTablesPayload> =>
    fetchPercentileTablesFromBackend(params),
  recomputePercentileTables: (params?: { round?: number; percentiles?: number[] }): Promise<unknown> =>
    recomputePercentileTablesOnBackend(params),
  importCandidates: (file: File): Promise<ImportSummary> => uploadImportFile(enrollmentEndpoints.candidatesImportAsync, file),
  importCandidateScoresThpt: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateScoresThptImportAsync, file),
  importCandidateScoresHocBa: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateScoresHocBaImportAsync, file),
  importCandidateScoresNangLuc: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateScoresNangLucImportAsync, file),
  importCandidateScoresNangKhieu: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateScoresNangKhieuImportAsync, file),
  createCandidate: async (candidate: Candidate): Promise<Candidate & { _pk?: string }> => {
    const raw = await apiPostJson<unknown>(enrollmentEndpoints.candidates, mapCandidateFormToApiPayload(candidate))
    return mapCandidateApiToRow(unwrapDataPayload<CandidateApiRow>(raw))
  },
  updateCandidate: async (pk: string, candidate: Candidate): Promise<Candidate & { _pk?: string }> => {
    const raw = await apiPatchJson<unknown>(`${enrollmentEndpoints.candidates}${pk}/`, mapCandidateFormToApiPayload(candidate))
    return mapCandidateApiToRow(unwrapDataPayload<CandidateApiRow>(raw))
  },
  deleteCandidate: (pk: string): Promise<unknown> => apiDeleteJson<unknown>(`${enrollmentEndpoints.candidates}${pk}/`),
  getCandidateRegions: (): Promise<CandidateRegionApiRow[]> => fetchCandidateRegionsFromBackend(),
  createCandidateRegion: (payload: { code: string; bonus_score: number }): Promise<CandidateRegionApiRow> =>
    apiPostJson<unknown>(enrollmentEndpoints.candidateRegions, payload).then((raw) =>
      unwrapDataPayload<CandidateRegionApiRow>(raw),
    ),
  importCandidateRegions: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateRegionsImportAsync, file),
  getCandidatePriorityObjects: (): Promise<CandidatePriorityObjectApiRow[]> => fetchCandidatePriorityObjectsFromBackend(),
  createCandidatePriorityObject: (payload: { code: string; bonus_score: number }): Promise<CandidatePriorityObjectApiRow> =>
    apiPostJson<unknown>(enrollmentEndpoints.candidatePriorityObjects, payload).then((raw) =>
      unwrapDataPayload<CandidatePriorityObjectApiRow>(raw),
    ),
  importCandidatePriorityObjects: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidatePriorityObjectsImportAsync, file),
  importCombinations: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.combinationsImportAsync, file),
  importSubjects: (file: File): Promise<ImportSummary> => uploadImportFile(enrollmentEndpoints.subjectsImportAsync, file),
  importMajors: (file: File): Promise<ImportSummary> => uploadImportFile(enrollmentEndpoints.majorsImportAsync, file),
  importWishes: (file: File): Promise<ImportSummary> => uploadImportFile(enrollmentEndpoints.wishesImportAsync, file),
  importExclusions: (file: File): Promise<ImportSummary> => uploadImportFile(enrollmentEndpoints.exclusionsImportAsync, file),
  importCriteria: (file: File): Promise<ImportSummary> => uploadImportFile(enrollmentEndpoints.criteriaImportAsync, file),
  createMajor: async (major: Major): Promise<Major & { _pk?: string }> => {
    const raw = await apiPostJson<unknown>(enrollmentEndpoints.majors, mapMajorFormToApiPayload(major, true))
    return mapMajorApiToRow(unwrapDataPayload<MajorApiRow>(raw))
  },
  updateMajor: async (code: string, major: Major): Promise<Major & { _pk?: string }> => {
    const raw = await apiPatchJson<unknown>(`${enrollmentEndpoints.majors}${code}/`, mapMajorFormToApiPayload(major, false))
    return mapMajorApiToRow(unwrapDataPayload<MajorApiRow>(raw))
  },
  deleteMajor: (code: string): Promise<unknown> => apiDeleteJson<unknown>(`${enrollmentEndpoints.majors}${code}/`),
  createWish: async (wish: Wish): Promise<Wish & { _pk?: string }> => {
    const raw = await apiPostJson<unknown>(enrollmentEndpoints.wishes, mapWishFormToApiPayload(wish))
    return mapWishApiToRow(unwrapDataPayload<WishApiRow & { id?: number }>(raw))
  },
  updateWish: async (pk: string, wish: Wish): Promise<Wish & { _pk?: string }> => {
    const raw = await apiPatchJson<unknown>(`${enrollmentEndpoints.wishes}${pk}/`, mapWishFormToApiPayload(wish))
    return mapWishApiToRow(unwrapDataPayload<WishApiRow & { id?: number }>(raw))
  },
  deleteWish: (pk: string): Promise<unknown> => apiDeleteJson<unknown>(`${enrollmentEndpoints.wishes}${pk}/`),
  createExclusion: async (exclusion: Exclusion): Promise<Exclusion & { _pk?: string }> => {
    const raw = await apiPostJson<unknown>(enrollmentEndpoints.exclusions, mapExclusionFormToApiPayload(exclusion))
    return mapExclusionApiToRow(unwrapDataPayload<ExclusionApiRow & { id?: number }>(raw))
  },
  updateExclusion: async (pk: string, exclusion: Exclusion): Promise<Exclusion & { _pk?: string }> => {
    const raw = await apiPatchJson<unknown>(`${enrollmentEndpoints.exclusions}${pk}/`, mapExclusionFormToApiPayload(exclusion))
    return mapExclusionApiToRow(unwrapDataPayload<ExclusionApiRow & { id?: number }>(raw))
  },
  deleteExclusion: (pk: string): Promise<unknown> => apiDeleteJson<unknown>(`${enrollmentEndpoints.exclusions}${pk}/`),
  createCriteria: async (criteria: Criteria): Promise<Criteria & { _pk?: string }> => {
    const raw = await apiPostJson<unknown>(enrollmentEndpoints.criteria, mapCriteriaFormToApiPayload(criteria))
    return mapCriteriaApiToRow(unwrapDataPayload<CriteriaApiRow>(raw))
  },
  updateCriteria: async (pk: string, criteria: Criteria): Promise<Criteria & { _pk?: string }> => {
    const raw = await apiPatchJson<unknown>(`${enrollmentEndpoints.criteria}${pk}/`, mapCriteriaFormToApiPayload(criteria))
    return mapCriteriaApiToRow(unwrapDataPayload<CriteriaApiRow>(raw))
  },
  deleteCriteria: (pk: string): Promise<unknown> => apiDeleteJson<unknown>(`${enrollmentEndpoints.criteria}${pk}/`),
  createSubject: (payload: Subject): Promise<Subject> =>
    apiPostJson<unknown>(enrollmentEndpoints.subjects, payload).then((raw) => unwrapDataPayload<Subject>(raw)),
  updateSubject: (id: string, payload: Subject): Promise<Subject> =>
    apiPatchJson<unknown>(`${enrollmentEndpoints.subjects}${id}/`, payload).then((raw) => unwrapDataPayload<Subject>(raw)),
  deleteSubject: (id: string): Promise<unknown> => apiDeleteJson<unknown>(`${enrollmentEndpoints.subjects}${id}/`),
  createCombination: async (combination: Combination): Promise<Combination> => {
    const raw = await apiPostJson<unknown>(
      enrollmentEndpoints.combinations,
      mapCombinationFormToApiPayload(combination),
    )
    const data = unwrapDataPayload<CombinationApiRow>(raw)
    return combinationSchema.parse({
      code: data.id,
      subjects: (data.subjects ?? []).map((item) => item.subject_id).join(','),
      weights: (data.subjects ?? []).map((item) => String(item.weight)).join(','),
    })
  },
  updateCombination: async (code: string, combination: Combination): Promise<Combination> => {
    const raw = await apiPatchJson<unknown>(
      `${enrollmentEndpoints.combinations}${code}/`,
      mapCombinationFormToApiPayload(combination),
    )
    const data = unwrapDataPayload<CombinationApiRow>(raw)
    return combinationSchema.parse({
      code: data.id,
      subjects: (data.subjects ?? []).map((item) => item.subject_id).join(','),
      weights: (data.subjects ?? []).map((item) => String(item.weight)).join(','),
    })
  },
  deleteCombination: (code: string): Promise<unknown> => apiDeleteJson<unknown>(`${enrollmentEndpoints.combinations}${code}/`),
}
