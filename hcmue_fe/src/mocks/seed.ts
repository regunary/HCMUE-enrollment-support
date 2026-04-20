/**
 * English note: Parsed mock datasets loaded from JSON fixtures for the mock API layer.
 */
import candidatesJson from './candidates.json'
import combinationsJson from './combinations.json'
import criteriaJson from './criteria.json'
import cutoffsJson from './cutoffs.json'
import exclusionsJson from './exclusions.json'
import majorsJson from './majors.json'
import wishesJson from './wishes.json'
import {
  candidateSchema,
  combinationSchema,
  criteriaSchema,
  cutoffSchema,
  exclusionSchema,
  majorSchema,
  wishSchema,
} from '../schemas/domain.schema'

export const mockCandidates = candidatesJson.map((item) => candidateSchema.parse(item))
export const mockCombinations = combinationsJson.map((item) => combinationSchema.parse(item))
export const mockMajors = majorsJson.map((item) => majorSchema.parse(item))
export const mockWishes = wishesJson.map((item) => wishSchema.parse(item))
export const mockExclusions = exclusionsJson.map((item) => exclusionSchema.parse(item))
export const mockCriteria = criteriaJson.map((item) => criteriaSchema.parse(item))
export const mockCutoffs = cutoffsJson.map((item) => cutoffSchema.parse(item))
