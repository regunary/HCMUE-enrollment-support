/**
 * English note: FE auth API client for Django JWT endpoints.
 */
import { joinBaseAndPath } from '../api/joinBaseAndPath'
import { appEnv } from '../config/env'
import { authEndpoints } from '../api/endpoints'
import type { UserRole } from '../types/role'

type LoginResponse = {
  access: string
  refresh: string
  user: {
    id: string
    username: string
    fullname: string
    email: string | null
    role: UserRole
  }
}

type MeResponse = {
  id: string
  username: string
  fullname: string
  email: string | null
  employee_id: string | null
  role: UserRole
  is_active: boolean
}

type UserRow = {
  id: string
  username: string
  fullname: string
  email: string | null
  employee_id: string | null
  role: UserRole
  is_active: boolean
}

function makeUrl(path: string): string {
  return joinBaseAndPath(appEnv.apiBaseUrl, path)
}

function isNetworkFetchFailure(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    /failed to fetch|networkerror|load failed/i.test(String((error as Error).message))
  )
}

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, { ...init, credentials: 'include' })
  } catch (error) {
    if (isNetworkFetchFailure(error)) {
      throw new Error(
        'Không kết nối được máy chủ (Failed to fetch). Kiểm tra: máy chủ có chạy không, VITE_API_BASE_URL có đúng không (tránh /api/api/... khi base đã kết thúc bằng /api), CORS, và mạng.',
      )
    }
    throw error
  }
}

async function parseApiError(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) {
    return `Lỗi ${response.status}.`
  }
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const detail = parsed.detail
    if (typeof detail === 'string') {
      return detail
    }
  } catch {
    // ignore JSON parse errors and fallback to raw text
  }
  return text
}

export const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await authFetch(makeUrl(authEndpoints.login), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!response.ok) {
      throw new Error(await parseApiError(response))
    }
    return (await response.json()) as LoginResponse
  },

  async me(accessToken: string): Promise<MeResponse> {
    const response = await authFetch(makeUrl(authEndpoints.me), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) {
      throw new Error(await parseApiError(response))
    }
    return (await response.json()) as MeResponse
  },

  async refresh(refreshToken: string): Promise<{ access: string }> {
    const response = await authFetch(makeUrl(authEndpoints.refresh), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })
    if (!response.ok) {
      throw new Error(await parseApiError(response))
    }
    return (await response.json()) as { access: string }
  },

  async logout(refreshToken: string, accessToken: string): Promise<void> {
    const response = await authFetch(makeUrl(authEndpoints.logout), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refresh: refreshToken }),
    })
    if (!response.ok && response.status !== 204) {
      throw new Error(await parseApiError(response))
    }
  },

  async listUsers(accessToken: string): Promise<UserRow[]> {
    const response = await authFetch(makeUrl(authEndpoints.users), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) {
      throw new Error(await parseApiError(response))
    }
    const raw = (await response.json()) as { results?: UserRow[] } | UserRow[]
    if (Array.isArray(raw)) {
      return raw
    }
    return Array.isArray(raw.results) ? raw.results : []
  },

  async createUser(accessToken: string, payload: Record<string, unknown>): Promise<UserRow> {
    const response = await authFetch(makeUrl(authEndpoints.users), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(await parseApiError(response))
    }
    return (await response.json()) as UserRow
  },

  async getUser(accessToken: string, userId: string): Promise<UserRow> {
    const response = await authFetch(makeUrl(`${authEndpoints.users}${userId}/`), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) {
      throw new Error(await parseApiError(response))
    }
    return (await response.json()) as UserRow
  },

  async updateUser(accessToken: string, userId: string, payload: Record<string, unknown>): Promise<UserRow> {
    const response = await authFetch(makeUrl(`${authEndpoints.users}${userId}/`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(await parseApiError(response))
    }
    return (await response.json()) as UserRow
  },
}
