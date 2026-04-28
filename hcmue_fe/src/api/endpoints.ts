/**
 * REST paths cho FE. Trùng với `hcmue_be/core/urls.py` + `candidates/urls` + `programs/urls`.
 *
 * Các key `majors` … `cutoffs` chưa có route trên BE — chỉ dùng mock / placeholder tương lai;
 * `liveEnrollmentApi` không gọi các URL này (tránh 404 khi VITE_USE_MOCK=false).
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
  combinations: '/api/v1/combinations/',
  combinationsImport: '/api/v1/combinations/import/',
  subjects: '/api/v1/subjects/',
  subjectsImport: '/api/v1/subjects/import/',
  /** Chưa mount trên BE — mockApi / tính năng offline */
  majors: '/api/v1/majors/',
  wishes: '/api/v1/wishes/',
  exclusions: '/api/v1/exclusions/',
  criteria: '/api/v1/criteria/',
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
