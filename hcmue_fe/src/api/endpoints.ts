/**
 * REST paths cho FE. Trùng với `hcmue_be/core/urls.py` + `candidates/urls` + `programs/urls`.
 *
 * `cutoffs` chưa có route trên BE — chỉ dùng mock / placeholder tương lai.
 */
export const enrollmentEndpoints = {
  candidates: '/api/v1/candidates/',
  candidatesImport: '/api/v1/candidates/import/',
  candidateScoresThptImport: '/api/v1/candidates/scores/thpt/import/',
  candidateScoresHocBaImport: '/api/v1/candidates/scores/hoc-ba/import/',
  candidateScoresNangLucImport: '/api/v1/candidates/scores/nang-luc/import/',
  candidateScoresNangKhieuImport: '/api/v1/candidates/scores/nang-khieu/import/',
  candidateRegions: '/api/v1/candidates/regions/',
  candidateRegionsImport: '/api/v1/candidates/regions/import/',
  candidatePriorityObjects: '/api/v1/candidates/priority-objects/',
  candidatePriorityObjectsImport: '/api/v1/candidates/priority-objects/import/',
  combinations: '/api/v1/combinations/',
  combinationsImport: '/api/v1/combinations/import/',
  subjects: '/api/v1/subjects/',
  subjectsImport: '/api/v1/subjects/import/',
  majors: '/api/v1/majors/',
  majorsImport: '/api/v1/majors/import/',
  wishes: '/api/v1/wishes/',
  wishesImport: '/api/v1/wishes/import/',
  exclusions: '/api/v1/exclusions/',
  exclusionsImport: '/api/v1/exclusions/import/',
  criteria: '/api/v1/criteria/',
  criteriaImport: '/api/v1/criteria/import/',
  cutoffs: '/api/v1/cutoffs/',
} as const

export const authEndpoints = {
  login: '/api/auth/login/',
  logout: '/api/auth/logout/',
  refresh: '/api/auth/refresh/',
  me: '/api/auth/me/',
  users: '/api/auth/users/',
} as const

export type EnrollmentEndpointKey = keyof typeof enrollmentEndpoints
