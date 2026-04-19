import { removeUser } from './auth'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function safeJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return { detail: 'Something went wrong' }
  }
}

interface RequestOptions {
  method: string
  headers: Record<string, string>
  body?: string
  credentials: RequestCredentials
}

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/token/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    return response.ok
  } catch {
    return false
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const options: RequestOptions = { method, headers, credentials: 'include' }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, options)

  if (response.status === 401) {
    const isAuthEndpoint = path.startsWith('/api/auth/')

    if (!isAuthEndpoint) {
      if (!refreshPromise) {
        refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null })
      }
      const refreshed = await refreshPromise

      if (refreshed) {
        const retryResponse = await fetch(`${BASE_URL}${path}`, { method, headers, body: options.body, credentials: 'include' })

        if (!retryResponse.ok) {
          if (retryResponse.status === 401) {
            removeUser()
            window.location.replace('/login')
            throw { status: 401, data: { detail: 'Session expired' } }
          }
          const error = await safeJson(retryResponse)
          throw { status: retryResponse.status, data: error }
        }

        if (retryResponse.status === 204) return undefined as T
        return retryResponse.json() as Promise<T>
      }

      removeUser()
      window.location.replace('/login')
      throw { status: 401, data: { detail: 'Session expired' } }
    }

    const error = await safeJson(response)
    throw { status: response.status, data: error }
  }

  if (!response.ok) {
    const error = await safeJson(response)
    throw { status: response.status, data: error }
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (response.status === 401) {
    const isAuthEndpoint = path.startsWith('/api/auth/')

    if (!isAuthEndpoint) {
      if (!refreshPromise) {
        refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null })
      }
      const refreshed = await refreshPromise

      if (refreshed) {
        const retryResponse = await fetch(`${BASE_URL}${path}`, { method: 'POST', body: formData, credentials: 'include' })

        if (!retryResponse.ok) {
          if (retryResponse.status === 401) {
            removeUser()
            window.location.replace('/login')
            throw { status: 401, data: { detail: 'Session expired' } }
          }
          const error = await safeJson(retryResponse)
          throw { status: retryResponse.status, data: error }
        }

        return retryResponse.json() as Promise<T>
      }

      removeUser()
      window.location.replace('/login')
      throw { status: 401, data: { detail: 'Session expired' } }
    }

    const error = await safeJson(response)
    throw { status: response.status, data: error }
  }

  if (!response.ok) {
    const error = await safeJson(response)
    throw { status: response.status, data: error }
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => upload<T>(path, formData),
}
