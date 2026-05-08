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
  importMajors?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  importWishes?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  importExclusions?: (file: File) => Promise<{
    success: boolean
    created: number
    updated: number
    skipped: number
    errors: Array<Record<string, unknown>>
  }>
  importCriteria?: (file: File) => Promise<{
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
  createMajor?: (payload: Major) => Promise<Major>
  updateMajor?: (code: string, payload: Major) => Promise<Major>
  deleteMajor?: (code: string) => Promise<unknown>
  createWish?: (payload: Wish) => Promise<Wish>
  updateWish?: (pk: string, payload: Wish) => Promise<Wish>
  deleteWish?: (pk: string) => Promise<unknown>
  createExclusion?: (payload: Exclusion) => Promise<Exclusion>
  updateExclusion?: (pk: string, payload: Exclusion) => Promise<Exclusion>
  deleteExclusion?: (pk: string) => Promise<unknown>
  createCriteria?: (payload: Criteria) => Promise<Criteria>
  updateCriteria?: (pk: string, payload: Criteria) => Promise<Criteria>
  deleteCriteria?: (pk: string) => Promise<unknown>
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
  getMajors: () => liveEnrollmentApi.getMajors(),
  getWishes: () => liveEnrollmentApi.getWishes(),
  getExclusions: () => liveEnrollmentApi.getExclusions(),
  getCriteria: () => liveEnrollmentApi.getCriteria(),
  getCutoffs: () => mockApi.getCutoffs(),
  importCandidates: (file) => liveEnrollmentApi.importCandidates(file),
  importCombinations: (file) => liveEnrollmentApi.importCombinations(file),
  importSubjects: (file) => liveEnrollmentApi.importSubjects(file),
  importCandidateScoresThpt: (file) => liveEnrollmentApi.importCandidateScoresThpt(file),
  importCandidateScoresHocBa: (file) => liveEnrollmentApi.importCandidateScoresHocBa(file),
  importCandidateScoresNangLuc: (file) => liveEnrollmentApi.importCandidateScoresNangLuc(file),
  importCandidateScoresNangKhieu: (file) => liveEnrollmentApi.importCandidateScoresNangKhieu(file),
  importMajors: (file) => liveEnrollmentApi.importMajors(file),
  importWishes: (file) => liveEnrollmentApi.importWishes(file),
  importExclusions: (file) => liveEnrollmentApi.importExclusions(file),
  importCriteria: (file) => liveEnrollmentApi.importCriteria(file),
  createMajor: (payload) => liveEnrollmentApi.createMajor(payload),
  updateMajor: (code, payload) => liveEnrollmentApi.updateMajor(code, payload),
  deleteMajor: (code) => liveEnrollmentApi.deleteMajor(code),
  createWish: (payload) => liveEnrollmentApi.createWish(payload),
  updateWish: (pk, payload) => liveEnrollmentApi.updateWish(pk, payload),
  deleteWish: (pk) => liveEnrollmentApi.deleteWish(pk),
  createExclusion: (payload) => liveEnrollmentApi.createExclusion(payload),
  updateExclusion: (pk, payload) => liveEnrollmentApi.updateExclusion(pk, payload),
  deleteExclusion: (pk) => liveEnrollmentApi.deleteExclusion(pk),
  createCriteria: (payload) => liveEnrollmentApi.createCriteria(payload),
  updateCriteria: (pk, payload) => liveEnrollmentApi.updateCriteria(pk, payload),
  deleteCriteria: (pk) => liveEnrollmentApi.deleteCriteria(pk),
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
