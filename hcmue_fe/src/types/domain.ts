/**
 * English note: Shared domain models for enrollment workflows.
 */
export type Candidate = {
  idNumber: string
  priorityRegion: string
  priorityBonus: number
  priorityGroup: string
  graduationYear: number
  academicLevel: string
  graduationScore: number
  scoreJson: string
}

export type Combination = {
  code: string
  subjects: string
  weights: string
}

export type Subject = {
  id: string
  name: string
}

export type Major = {
  code: string
  name: string
  combinations: string
}

export type Wish = {
  idNumber: string
  majorCode: string
  order: number
}

export type Exclusion = {
  idNumber: string
  reason: string
}

export type Criteria = {
  combinationCode: string
  rule: string
}

export type Cutoff = {
  majorCode: string
  score: number
}

export type ScoreBin = {
  label: string
  value: number
}
