import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { api } from '../api'
import { setUser, getUser } from '../auth'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('location', { ...window.location, replace: vi.fn() })
})

describe('api client', () => {
  it('sends requests with credentials include', async () => {
    server.use(
      http.get('/api/test', () => {
        return HttpResponse.json({ ok: true })
      }),
    )
    const data = await api.get<{ ok: boolean }>('/api/test')
    expect(data.ok).toBe(true)
  })

  it('clears session on 401 response when refresh fails', async () => {
    setUser({ id: 1, name: 'Test', email: 'test@test.com', email_verified: false, avatar_color: '#000' })
    server.use(
      http.get('/api/test', () => HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 })),
      http.post('/api/auth/token/refresh', () => HttpResponse.json({ detail: 'Token is invalid' }, { status: 401 })),
    )
    await expect(api.get('/api/test')).rejects.toEqual({
      status: 401,
      data: { detail: 'Session expired' },
    })
    expect(getUser()).toBeNull()
  })

  it('sends POST body as JSON', async () => {
    server.use(
      http.post('/api/test', async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json(body)
      }),
    )
    const data = await api.post<{ name: string }>('/api/test', { name: 'Imane' })
    expect(data.name).toBe('Imane')
  })

  it('throws error object on non-ok response', async () => {
    server.use(
      http.post('/api/test', () => HttpResponse.json({ email: ['Invalid'] }, { status: 400 })),
    )
    await expect(api.post('/api/test', {})).rejects.toEqual({
      status: 400,
      data: { email: ['Invalid'] },
    })
  })
})
