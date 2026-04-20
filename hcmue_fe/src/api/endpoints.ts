/**
 * English note: Single map of REST paths — adjust here when backend routes are finalized.
 * Django REST Framework often uses trailing slashes; keep them explicit.
 */
export const enrollmentEndpoints = {
  candidates: '/api/candidates/',
  combinations: '/api/combinations/',
  majors: '/api/majors/',
  wishes: '/api/wishes/',
  exclusions: '/api/exclusions/',
  criteria: '/api/criteria/',
  cutoffs: '/api/cutoffs/',
} as const

export type EnrollmentEndpointKey = keyof typeof enrollmentEndpoints
