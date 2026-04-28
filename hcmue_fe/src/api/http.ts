/**
 * English note: Thin JSON fetch wrapper; extend with auth headers when backend issues tokens.
 */
import { appEnv } from '../config/env'
import { authEndpoints } from './endpoints'
import { joinBaseAndPath } from './joinBaseAndPath'
import { clearStoredSession, getStoredAccessToken, getStoredRefreshToken, setStoredAccessToken } from '../features/auth/authStorage'
import { emitGlobalToast } from '../features/feedback/toastEvents'

export class ApiHttpError extends Error {
  readonly status: number
  readonly bodySnippet: string

  constructor(status: number, bodySnippet: string) {
    super(status === 0 ? bodySnippet : `HTTP ${status}: ${bodySnippet}`)
    this.name = 'ApiHttpError'
    this.status = status
    this.bodySnippet = bodySnippet
  }
}

type RequestOptions = {
  method: 'GET' | 'POST' | 'PATCH'
  path: string
  payload?: unknown
  formData?: FormData
}

let refreshInFlight: Promise<string | null> | null = null

function buildAuthHeaders(accessToken: string | null, includeJson: boolean): Record<string, string> {
  return {
    Accept: 'application/json',
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight
  }
  refreshInFlight = (async () => {
    try {
      const refreshToken = getStoredRefreshToken()
      if (!refreshToken) {
        return null
      }
      const url = joinBaseAndPath(appEnv.apiBaseUrl, authEndpoints.refresh)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
        credentials: 'include',
      })
      if (!response.ok) {
        clearStoredSession()
        emitGlobalToast({
          message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
          kind: 'error',
        })
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
        return null
      }
      const data = (await response.json()) as { access?: unknown; refresh?: unknown }
      if (typeof data.access !== 'string' || !data.access) {
        clearStoredSession()
        emitGlobalToast({
          message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
          kind: 'error',
        })
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
        return null
      }
      setStoredAccessToken(data.access, typeof data.refresh === 'string' ? data.refresh : undefined)
      return data.access
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

type FormDataRetrySource = { formDataSource: FormData }

/**
 * Copy every File in FormData into a new in-memory File so each fetch() uses a fresh body.
 * File.slice() can still share storage with the original; after the first upload the same
 * user-selected File often fails on the second request with "Failed to fetch".
 */
async function cloneFormDataWithIndependentFiles(source: FormData): Promise<FormData> {
  const next = new FormData()
  for (const [key, value] of source.entries()) {
    if (value instanceof File) {
      const buffer = await value.arrayBuffer()
      next.append(
        key,
        new File([buffer], value.name, {
          type: value.type || 'application/octet-stream',
          lastModified: value.lastModified,
        }),
      )
    } else {
      next.append(key, value)
    }
  }
  return next
}

async function requestWithAutoRefresh(
  path: string,
  init: RequestInit,
  formRetry?: FormDataRetrySource,
): Promise<Response> {
  const response = await fetch(joinBaseAndPath(appEnv.apiBaseUrl, path), {
    ...init,
    credentials: 'include',
  })
  if (response.status !== 401) {
    return response
  }
  const nextAccessToken = await refreshAccessTokenOnce()
  if (!nextAccessToken) {
    return response
  }
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${nextAccessToken}`)
  let retryBody = init.body
  if (init.body instanceof FormData && formRetry?.formDataSource) {
    retryBody = await cloneFormDataWithIndependentFiles(formRetry.formDataSource)
  }
  return fetch(joinBaseAndPath(appEnv.apiBaseUrl, path), {
    ...init,
    headers,
    body: retryBody,
    credentials: 'include',
  })
}

async function requestJson<T>(options: RequestOptions): Promise<T> {
  const accessToken = getStoredAccessToken()
  const hasForm = Boolean(options.formData)
  let body: BodyInit | undefined
  if (options.formData) {
    body = await cloneFormDataWithIndependentFiles(options.formData)
  } else if (options.payload !== undefined) {
    body = JSON.stringify(options.payload)
  }
  let response: Response
  try {
    response = await requestWithAutoRefresh(
      options.path,
      {
        method: options.method,
        headers: buildAuthHeaders(accessToken, !hasForm),
        ...(body !== undefined ? { body } : {}),
      },
      options.formData ? { formDataSource: options.formData } : undefined,
    )
  } catch (error) {
    const isNetworkFailure =
      error instanceof TypeError &&
      (String((error as Error).message).includes('fetch') || String((error as Error).message).includes('Failed to fetch'))
    if (isNetworkFailure) {
      throw new ApiHttpError(
        0,
        'Không kết nối được máy chủ (Failed to fetch). Kiểm tra: máy chủ có chạy không, VITE_API_BASE_URL có đúng không (tránh /api/api/... khi base đã kết thúc bằng /api), CORS, và mạng.',
      )
    }
    throw error
  }
  let text: string
  try {
    text = await response.text()
  } catch (error) {
    const isNetworkFailure =
      error instanceof TypeError &&
      (String((error as Error).message).includes('fetch') || String((error as Error).message).includes('Failed to fetch'))
    if (isNetworkFailure) {
      throw new ApiHttpError(
        0,
        'Không đọc được phản hồi từ máy chủ (Failed to fetch). Kiểm tra kết nối và cấu hình API.',
      )
    }
    throw error
  }
  if (!response.ok) {
    let detail = text.slice(0, 240)
    try {
      const parsed = JSON.parse(text) as { detail?: unknown }
      if (typeof parsed.detail === 'string') {
        detail = parsed.detail
      }
    } catch {
      // keep raw snippet
    }
    throw new ApiHttpError(response.status, detail)
  }
  if (!text) {
    return undefined as T
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiHttpError(
      response.status,
      `Phản hồi không phải JSON (HTTP ${response.status}). Có thể là trang lỗi proxy/nginx. Đầu nội dung: ${text.slice(0, 160).replace(/\s+/g, ' ')}`,
    )
  }
}

export async function apiGetJson<T>(path: string): Promise<T> {
  return requestJson<T>({ method: 'GET', path })
}

export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  return requestJson<T>({ method: 'POST', path, formData })
}

export async function apiPostJson<T>(path: string, payload: unknown): Promise<T> {
  return requestJson<T>({ method: 'POST', path, payload })
}

export async function apiPatchJson<T>(path: string, payload: unknown): Promise<T> {
  return requestJson<T>({ method: 'PATCH', path, payload })
}
