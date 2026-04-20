/**
 * English note: Shared domain models for enrollment workflows.
 */
export type Candidate = {
  idNumber: string
  priorityRegion: string
  priorityGroup: string
  graduationYear: number
  scoreJson: string
}

export type Combination = {
  code: string
  subjects: string
  weights: string
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
