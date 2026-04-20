/**
 * English note: Single facade for domain list reads — mock or live via VITE_USE_MOCK.
 */
import { liveEnrollmentApi } from '../api/liveEnrollmentApi'
import { appEnv } from '../config/env'
import type { Candidate, Combination, Criteria, Cutoff, Exclusion, Major, Wish } from '../types/domain'
import { mockApi } from './mockApi'

export type EnrollmentDataApi = {
  getCandidates: () => Promise<Candidate[]>
  getCombinations: () => Promise<Combination[]>
  getMajors: () => Promise<Major[]>
  getWishes: () => Promise<Wish[]>
  getExclusions: () => Promise<Exclusion[]>
  getCriteria: () => Promise<Criteria[]>
  getCutoffs: () => Promise<Cutoff[]>
}

export const enrollmentApi: EnrollmentDataApi = appEnv.useMock ? mockApi : liveEnrollmentApi
