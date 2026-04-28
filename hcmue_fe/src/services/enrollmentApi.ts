/**
 * English note: Single facade for domain list reads — mock or live via VITE_USE_MOCK.
 */
import { liveEnrollmentApi } from '../api/liveEnrollmentApi'
import { appEnv } from '../config/env'
import type { Candidate, Combination, Criteria, Cutoff, Exclusion, Major, Subject, Wish } from '../types/domain'
import { mockApi } from './mockApi'

export type EnrollmentDataApi = {
  getCandidates: () => Promise<Candidate[]>
  getCombinations: () => Promise<Combination[]>
  getSubjects: () => Promise<Subject[]>
  getMajors: () => Promise<Major[]>
  getWishes: () => Promise<Wish[]>
  getExclusions: () => Promise<Exclusion[]>
  getCriteria: () => Promise<Criteria[]>
  getCutoffs: () => Promise<Cutoff[]>
  importCandidates?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  importCombinations?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  importSubjects?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  importCandidateScoresThpt?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  importCandidateScoresHocBa?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  importCandidateScoresNangLuc?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  importCandidateScoresNangKhieu?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  createCandidate?: (candidate: Candidate) => Promise<Candidate>
  updateCandidate?: (pk: string, candidate: Candidate) => Promise<Candidate>
  createCombination?: (combination: Combination) => Promise<Combination>
  updateCombination?: (code: string, combination: Combination) => Promise<Combination>
  createSubject?: (payload: Subject) => Promise<Subject>
  updateSubject?: (id: string, payload: Subject) => Promise<Subject>
  getCandidateRegions?: () => Promise<Array<{ id?: string; code: string; bonus_score: number }>>
  createCandidateRegion?: (payload: { code: string; bonus_score: number }) => Promise<{ id?: string; code: string; bonus_score: number }>
  importCandidateRegions?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  getCandidatePriorityObjects?: () => Promise<Array<{ id?: string; code: string; bonus_score: number }>>
  createCandidatePriorityObject?: (payload: { code: string; bonus_score: number }) => Promise<{ id?: string; code: string; bonus_score: number }>
  importCandidatePriorityObjects?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
}

const mixedApi: EnrollmentDataApi = {
  getCandidates: () => liveEnrollmentApi.getCandidates(),
  getCombinations: () => liveEnrollmentApi.getCombinations(),
  getSubjects: () => liveEnrollmentApi.getSubjects(),
  /** BE chưa có route — luôn mock (xem enrollmentEndpoints + core/urls.py). */
  getMajors: () => mockApi.getMajors(),
  getWishes: () => mockApi.getWishes(),
  getExclusions: () => mockApi.getExclusions(),
  getCriteria: () => mockApi.getCriteria(),
  getCutoffs: () => mockApi.getCutoffs(),
  importCandidates: (file) => liveEnrollmentApi.importCandidates(file),
  importCombinations: (file) => liveEnrollmentApi.importCombinations(file),
  importSubjects: (file) => liveEnrollmentApi.importSubjects(file),
  importCandidateScoresThpt: (file) => liveEnrollmentApi.importCandidateScoresThpt(file),
  importCandidateScoresHocBa: (file) => liveEnrollmentApi.importCandidateScoresHocBa(file),
  importCandidateScoresNangLuc: (file) => liveEnrollmentApi.importCandidateScoresNangLuc(file),
  importCandidateScoresNangKhieu: (file) => liveEnrollmentApi.importCandidateScoresNangKhieu(file),
  createCandidate: (candidate) => liveEnrollmentApi.createCandidate(candidate),
  updateCandidate: (pk, candidate) => liveEnrollmentApi.updateCandidate(pk, candidate),
  createCombination: (combination) => liveEnrollmentApi.createCombination(combination),
  updateCombination: (code, combination) => liveEnrollmentApi.updateCombination(code, combination),
  createSubject: (payload) => liveEnrollmentApi.createSubject(payload),
  updateSubject: (id, payload) => liveEnrollmentApi.updateSubject(id, payload),
  getCandidateRegions: () => liveEnrollmentApi.getCandidateRegions(),
  createCandidateRegion: (payload) => liveEnrollmentApi.createCandidateRegion(payload),
  importCandidateRegions: (file) => liveEnrollmentApi.importCandidateRegions(file),
  getCandidatePriorityObjects: () => liveEnrollmentApi.getCandidatePriorityObjects(),
  createCandidatePriorityObject: (payload) => liveEnrollmentApi.createCandidatePriorityObject(payload),
  importCandidatePriorityObjects: (file) => liveEnrollmentApi.importCandidatePriorityObjects(file),
}

export const enrollmentApi: EnrollmentDataApi = appEnv.useMock ? mockApi : mixedApi
