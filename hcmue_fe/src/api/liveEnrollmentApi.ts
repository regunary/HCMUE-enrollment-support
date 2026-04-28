/**
 * English note: Live HTTP implementation — same contracts as mockApi; tune endpoints + schemas only.
 */
import { displayScoreKeyToParts, subjectScoreTypeToDisplayKey } from '../utils/scoreColumnKeys'
import { apiGetJson, apiPatchJson, apiPostFormData, apiPostJson } from './http'
import { enrollmentEndpoints } from './endpoints'
import { unwrapListPayload } from './response'
import { candidateSchema, combinationSchema, subjectSchema } from '../schemas/domain.schema'
import type { Candidate, Combination, Subject } from '../types/domain'

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

type ImportSummary = {
  success: boolean
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

function unwrapDataPayload<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
    return (raw as { data: T }).data
  }
  return raw as T
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

async function fetchCandidatesFromBackend(): Promise<Array<Candidate & { _pk?: string }>> {
  const raw = await apiGetJson<unknown>(enrollmentEndpoints.candidates)
  const rows = unwrapListPayload(raw) as CandidateApiRow[]
  return rows.map(mapCandidateApiToRow)
}

async function fetchCombinationsFromBackend(): Promise<Combination[]> {
  const raw = await apiGetJson<unknown>(enrollmentEndpoints.combinations)
  const rows = unwrapListPayload(raw) as CombinationApiRow[]
  return rows.map((row) =>
    combinationSchema.parse({
      code: row.id,
      subjects: (row.subjects ?? []).map((item) => item.subject_id).join(','),
      weights: (row.subjects ?? []).map((item) => String(item.weight)).join(','),
    }),
  )
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

async function fetchSubjectsFromBackend(): Promise<Subject[]> {
  const raw = await apiGetJson<unknown>(enrollmentEndpoints.subjects)
  const rows = unwrapListPayload(raw) as SubjectApiRow[]
  return rows.map((row) => subjectSchema.parse(row))
}

async function fetchCandidateRegionsFromBackend(): Promise<CandidateRegionApiRow[]> {
  const raw = await apiGetJson<unknown>(enrollmentEndpoints.candidateRegions)
  const rows = unwrapListPayload(raw) as CandidateRegionApiRow[]
  return rows
}

/** FormData được api/http.ts sao chép bytes (arrayBuffer) trước khi fetch — import lại cùng file vẫn ổn. */
async function uploadImportFile(path: string, file: File): Promise<ImportSummary> {
  const form = new FormData()
  form.append('file', file)
  const raw = await apiPostFormData<unknown>(path, form)
  const data = (raw ?? {}) as Partial<ImportSummary>
  return {
    success: data.success ?? true,
    created: data.created ?? 0,
    updated: data.updated ?? 0,
    skipped: data.skipped ?? 0,
    errors: Array.isArray(data.errors) ? data.errors : [],
  }
}

/** Chỉ các route đã mount trong Django `core/urls.py` (candidates, combinations, subjects, auth). */
export const liveEnrollmentApi = {
  getCandidates: (): Promise<Candidate[]> => fetchCandidatesFromBackend(),
  getCombinations: (): Promise<Combination[]> => fetchCombinationsFromBackend(),
  getSubjects: (): Promise<Subject[]> => fetchSubjectsFromBackend(),
  importCandidates: (file: File): Promise<ImportSummary> => uploadImportFile(enrollmentEndpoints.candidatesImport, file),
  importCandidateScoresThpt: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateScoresThptImport, file),
  importCandidateScoresHocBa: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateScoresHocBaImport, file),
  importCandidateScoresNangLuc: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateScoresNangLucImport, file),
  importCandidateScoresNangKhieu: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateScoresNangKhieuImport, file),
  createCandidate: async (candidate: Candidate): Promise<Candidate & { _pk?: string }> => {
    const raw = await apiPostJson<unknown>(enrollmentEndpoints.candidates, mapCandidateFormToApiPayload(candidate))
    return mapCandidateApiToRow(unwrapDataPayload<CandidateApiRow>(raw))
  },
  updateCandidate: async (pk: string, candidate: Candidate): Promise<Candidate & { _pk?: string }> => {
    const raw = await apiPatchJson<unknown>(`${enrollmentEndpoints.candidates}${pk}/`, mapCandidateFormToApiPayload(candidate))
    return mapCandidateApiToRow(unwrapDataPayload<CandidateApiRow>(raw))
  },
  getCandidateRegions: (): Promise<CandidateRegionApiRow[]> => fetchCandidateRegionsFromBackend(),
  createCandidateRegion: (payload: { code: string; bonus_score: number }): Promise<CandidateRegionApiRow> =>
    apiPostJson<unknown>(enrollmentEndpoints.candidateRegions, payload).then((raw) =>
      unwrapDataPayload<CandidateRegionApiRow>(raw),
    ),
  importCandidateRegions: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.candidateRegionsImport, file),
  importCombinations: (file: File): Promise<ImportSummary> =>
    uploadImportFile(enrollmentEndpoints.combinationsImport, file),
  importSubjects: (file: File): Promise<ImportSummary> => uploadImportFile(enrollmentEndpoints.subjectsImport, file),
  createSubject: (payload: Subject): Promise<Subject> =>
    apiPostJson<unknown>(enrollmentEndpoints.subjects, payload).then((raw) => unwrapDataPayload<Subject>(raw)),
  updateSubject: (id: string, payload: Subject): Promise<Subject> =>
    apiPatchJson<unknown>(`${enrollmentEndpoints.subjects}${id}/`, payload).then((raw) => unwrapDataPayload<Subject>(raw)),
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
}
