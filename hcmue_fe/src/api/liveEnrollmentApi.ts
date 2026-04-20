/**
 * English note: Live HTTP implementation — same contracts as mockApi; tune endpoints + schemas only.
 */
import type { ZodType } from 'zod'
import { apiGetJson } from './http'
import { enrollmentEndpoints } from './endpoints'
import { parseListWithSchema, unwrapListPayload } from './response'
import {
  candidateSchema,
  combinationSchema,
  criteriaSchema,
  cutoffSchema,
  exclusionSchema,
  majorSchema,
  wishSchema,
} from '../schemas/domain.schema'
import type { Candidate, Combination, Criteria, Cutoff, Exclusion, Major, Wish } from '../types/domain'

async function fetchList<T>(path: string, schema: ZodType<T>): Promise<T[]> {
  const raw = await apiGetJson<unknown>(path)
  const rows = unwrapListPayload(raw)
  return parseListWithSchema(rows, schema)
}

export const liveEnrollmentApi = {
  getCandidates: (): Promise<Candidate[]> => fetchList(enrollmentEndpoints.candidates, candidateSchema),
  getCombinations: (): Promise<Combination[]> =>
    fetchList(enrollmentEndpoints.combinations, combinationSchema),
  getMajors: (): Promise<Major[]> => fetchList(enrollmentEndpoints.majors, majorSchema),
  getWishes: (): Promise<Wish[]> => fetchList(enrollmentEndpoints.wishes, wishSchema),
  getExclusions: (): Promise<Exclusion[]> => fetchList(enrollmentEndpoints.exclusions, exclusionSchema),
  getCriteria: (): Promise<Criteria[]> => fetchList(enrollmentEndpoints.criteria, criteriaSchema),
  getCutoffs: (): Promise<Cutoff[]> => fetchList(enrollmentEndpoints.cutoffs, cutoffSchema),
}
