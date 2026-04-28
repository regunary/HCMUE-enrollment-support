/**
 * English note: Scoring and admission helper functions for enrollment workflows.
 */
import { thptScoreForCombinationSubject } from './scoreColumnKeys'
import type { Candidate, Combination, Cutoff, Major, Wish } from '../types/domain'

type ScoreObject = Record<string, number>

function parseScoreJson(scoreJson: string): ScoreObject {
  try {
    return JSON.parse(scoreJson) as ScoreObject
  } catch {
    return {}
  }
}

export function calcCombinationScore(candidate: Candidate, combination: Combination) {
  const subjects = combination.subjects.split(',').map((item) => item.trim())
  const weights = combination.weights.split(',').map((item) => Number(item.trim()))
  const scoreMap = parseScoreJson(candidate.scoreJson)
  const numerator = subjects.reduce((sum, subject, index) => {
    const value = thptScoreForCombinationSubject(scoreMap, subject)
    const weight = weights[index] ?? 1
    return sum + value * weight
  }, 0)
  const denominator = weights.reduce((sum, weight) => sum + (Number.isFinite(weight) ? weight : 1), 0) || 1
  return Number((numerator / denominator).toFixed(2))
}

export function enumerateCombinationsFor(candidate: Candidate, combinations: Combination[]) {
  const scoreMap = parseScoreJson(candidate.scoreJson)
  const availableSubjects = new Set(Object.keys(scoreMap))
  return combinations.filter((combination) =>
    combination.subjects
      .split(',')
      .map((item) => item.trim())
      .every((subject) => {
        const s = subject.trim().toUpperCase()
        return availableSubjects.has(s) || availableSubjects.has(`${s}_THPT`)
      }),
  )
}

export function buildScoreBins(values: number[]) {
  const bins = [
    { label: '0-10', value: 0 },
    { label: '10-15', value: 0 },
    { label: '15-20', value: 0 },
    { label: '20-25', value: 0 },
    { label: '25-30', value: 0 },
  ]
  values.forEach((value) => {
    if (value < 10) bins[0].value += 1
    else if (value < 15) bins[1].value += 1
    else if (value < 20) bins[2].value += 1
    else if (value < 25) bins[3].value += 1
    else bins[4].value += 1
  })
  return bins
}

export function buildPercentileSeries(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return Array.from({ length: 10 }, (_, index) => {
    const percentile = (index + 1) * 10
    const position = Math.floor((percentile / 100) * (sorted.length - 1))
    return { label: `P${percentile}`, value: sorted[position] ?? 0 }
  })
}

export function generateAdmissionList(params: {
  candidates: Candidate[]
  wishes: Wish[]
  majors: Major[]
  cutoffs: Cutoff[]
  scoreByCandidateMajor: Record<string, number>
}) {
  const cutoffMap = new Map(params.cutoffs.map((item) => [item.majorCode, item.score]))
  const majorMap = new Map(params.majors.map((item) => [item.code, item.name]))
  const wishGroups = new Map<string, Wish[]>()
  params.wishes.forEach((wish) => {
    const list = wishGroups.get(wish.idNumber) ?? []
    list.push(wish)
    wishGroups.set(wish.idNumber, list)
  })
  return params.candidates.flatMap((candidate) => {
    const sortedWishes = (wishGroups.get(candidate.idNumber) ?? []).sort((a, b) => a.order - b.order)
    const matchedWish = sortedWishes.find((wish) => {
      const score = params.scoreByCandidateMajor[`${candidate.idNumber}-${wish.majorCode}`] ?? 0
      const cutoff = cutoffMap.get(wish.majorCode) ?? Number.POSITIVE_INFINITY
      return score >= cutoff
    })
    if (!matchedWish) {
      return []
    }
    const score = params.scoreByCandidateMajor[`${candidate.idNumber}-${matchedWish.majorCode}`] ?? 0
    return [
      {
        idNumber: candidate.idNumber,
        majorCode: matchedWish.majorCode,
        majorName: majorMap.get(matchedWish.majorCode) ?? '',
        wishOrder: matchedWish.order,
        score,
      },
    ]
  })
}
