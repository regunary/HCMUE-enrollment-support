/**
 * REST paths cho FE. Trùng với `hcmue_be/core/urls.py` + `candidates/urls` + `programs/urls`.
 *
 * `cutoffs` chưa có route trên BE — chỉ dùng mock / placeholder tương lai.
 */
export const enrollmentEndpoints = {
  candidates: '/api/v1/candidates/',
  candidatesImport: '/api/v1/candidates/import/',
  candidatesImportAsync: '/api/v1/candidates/import-async/',
  candidateScoresThptImport: '/api/v1/candidates/scores/thpt/import/',
  candidateScoresThptImportAsync: '/api/v1/candidates/scores/thpt/import-async/',
  candidateScoresHocBaImport: '/api/v1/candidates/scores/hoc-ba/import/',
  candidateScoresHocBaImportAsync: '/api/v1/candidates/scores/hoc-ba/import-async/',
  candidateScoresNangLucImport: '/api/v1/candidates/scores/nang-luc/import/',
  candidateScoresNangLucImportAsync: '/api/v1/candidates/scores/nang-luc/import-async/',
  candidateScoresNangKhieuImport: '/api/v1/candidates/scores/nang-khieu/import/',
  candidateScoresNangKhieuImportAsync: '/api/v1/candidates/scores/nang-khieu/import-async/',
  candidateImportBatchStatus: '/api/v1/candidates/import-batches/',
  candidateRegions: '/api/v1/candidates/regions/',
  candidateRegionsImport: '/api/v1/candidates/regions/import/',
  candidateRegionsImportAsync: '/api/v1/candidates/regions/import-async/',
  candidatePriorityObjects: '/api/v1/candidates/priority-objects/',
  candidatePriorityObjectsImport: '/api/v1/candidates/priority-objects/import/',
  candidatePriorityObjectsImportAsync: '/api/v1/candidates/priority-objects/import-async/',
  combinations: '/api/v1/combinations/',
  combinationsImport: '/api/v1/combinations/import/',
  combinationsImportAsync: '/api/v1/combinations/import-async/',
  subjects: '/api/v1/subjects/',
  subjectsImport: '/api/v1/subjects/import/',
  subjectsImportAsync: '/api/v1/subjects/import-async/',
  majors: '/api/v1/majors/',
  majorsImport: '/api/v1/majors/import/',
  majorsImportAsync: '/api/v1/majors/import-async/',
  wishes: '/api/v1/wishes/',
  wishesImport: '/api/v1/wishes/import/',
  wishesImportAsync: '/api/v1/wishes/import-async/',
  exclusions: '/api/v1/exclusions/',
  exclusionsImport: '/api/v1/exclusions/import/',
  exclusionsImportAsync: '/api/v1/exclusions/import-async/',
  criteria: '/api/v1/criteria/',
  criteriaImport: '/api/v1/criteria/import/',
  criteriaImportAsync: '/api/v1/criteria/import-async/',
  percentileTables: '/api/v1/analytics/percentiles/tables/',
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
