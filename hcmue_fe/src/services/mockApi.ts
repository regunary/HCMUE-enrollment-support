/**
 * English note: Promise-based service wrappers around in-memory mock datasets.
 */
import {
  mockCandidates,
  mockCombinations,
  mockCriteria,
  mockCutoffs,
  mockExclusions,
  mockMajors,
  mockWishes,
} from '../mocks/seed'
import {
  candidateSchema,
  combinationSchema,
  criteriaSchema,
  cutoffSchema,
  exclusionSchema,
  majorSchema,
  subjectSchema,
  wishSchema,
} from '../schemas/domain.schema'

const delay = <T,>(value: T) =>
  new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(value), 250)
  })

/** In-memory implementation; kept separate from enrollmentApi wiring. */
export const mockApi = {
  getCandidates: async () => delay(mockCandidates.map((item) => candidateSchema.parse(item))),
  getCombinations: async () => delay(mockCombinations.map((item) => combinationSchema.parse(item))),
  getSubjects: async () => delay([subjectSchema.parse({ id: 'TO', name: 'Toán' }), subjectSchema.parse({ id: 'VA', name: 'Ngữ văn' })]),
  getMajors: async () => delay(mockMajors.map((item) => majorSchema.parse(item))),
  getWishes: async () => delay(mockWishes.map((item) => wishSchema.parse(item))),
  getExclusions: async () => delay(mockExclusions.map((item) => exclusionSchema.parse(item))),
  getCriteria: async () => delay(mockCriteria.map((item) => criteriaSchema.parse(item))),
  getCutoffs: async () => delay(mockCutoffs.map((item) => cutoffSchema.parse(item))),
}
