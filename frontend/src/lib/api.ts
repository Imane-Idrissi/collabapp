import { getToken, setToken, removeToken, getRefreshToken, setRefreshToken, removeRefreshToken, removeUser } from './auth'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

interface RequestOptions {
  method: string
  headers: Record<string, string>
  body?: string
}

let refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await fetch(`${BASE_URL}/api/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (!response.ok) return null

    const data = await response.json()
    setToken(data.access)
    if (data.refresh) {
      setRefreshToken(data.refresh)
    }
    return data.access
  } catch {
    return null
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options: RequestOptions = { method, headers }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, options)

  if (response.status === 401) {
    // Don't intercept 401s from auth endpoints — let them propagate normally
    const isAuthEndpoint = path.startsWith('/api/auth/')

    if (!isAuthEndpoint) {
      // Try refreshing the token once
      if (!refreshPromise) {
        refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null })
      }
      const newToken = await refreshPromise

      if (newToken) {
        // Retry the original request with the new token
        headers['Authorization'] = `Bearer ${newToken}`
        const retryResponse = await fetch(`${BASE_URL}${path}`, { method, headers, body: options.body })

        if (!retryResponse.ok) {
          if (retryResponse.status === 401) {
            removeToken()
            removeRefreshToken()
            removeUser()
            window.location.replace('/login')
            throw { status: 401, data: { detail: 'Session expired' } }
          }
          const error = await retryResponse.json()
          throw { status: retryResponse.status, data: error }
        }

        if (retryResponse.status === 204) return undefined as T
        return retryResponse.json() as Promise<T>
      }

      // Refresh failed — clear everything and redirect
      removeToken()
      removeRefreshToken()
      removeUser()
      window.location.replace('/login')
      throw { status: 401, data: { detail: 'Session expired' } }
    }

    // Auth endpoint 401 — just throw the original error
    const error = await response.json()
    throw { status: response.status, data: error }
  }

  if (!response.ok) {
    const error = await response.json()
    throw { status: response.status, data: error }
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
