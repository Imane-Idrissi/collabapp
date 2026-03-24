import { http, HttpResponse } from 'msw'

const TEST_USER = {
  id: 1,
  name: 'Imane Idrissi',
  email: 'imane@example.com',
  email_verified: false,
  avatar_color: '#6366f1',
}

export const handlers = [
  http.post('/api/auth/signup', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.email === 'taken@example.com') {
      return HttpResponse.json(
        { email: ['A user with this email already exists.'] },
        { status: 400 },
      )
    }
    return HttpResponse.json(
      { token: 'fake-jwt-token', user: { ...TEST_USER, name: body.name, email: body.email } },
      { status: 201 },
    )
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.password === 'wrongpassword') {
      return HttpResponse.json(
        { detail: 'Invalid email or password.' },
        { status: 401 },
      )
    }
    return HttpResponse.json(
      { token: 'fake-jwt-token', user: TEST_USER },
      { status: 200 },
    )
  }),

  http.post('/api/auth/forgot-password', async () => {
    return HttpResponse.json(
      { message: 'A password reset link has been sent to your inbox.' },
      { status: 200 },
    )
  }),

  http.post('/api/auth/reset-password', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.token === 'expired-token') {
      return HttpResponse.json(
        { token: ['This reset link has expired.'] },
        { status: 400 },
      )
    }
    return HttpResponse.json(
      { message: 'Password reset successfully.' },
      { status: 200 },
    )
  }),

  http.patch('/api/auth/update-email', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.email === 'taken@example.com') {
      return HttpResponse.json(
        { email: ['Email already exists.'] },
        { status: 400 },
      )
    }
    return HttpResponse.json(
      { message: `Email updated. Verification email sent to ${body.email}.` },
      { status: 200 },
    )
  }),

  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const projects = [
      { id: 1, name: 'CollabApp', description: 'Team collaboration tool', member_count: 3, created_at: '2026-01-01T00:00:00Z' },
      { id: 2, name: 'Side Project', description: 'Weekend hack', member_count: 1, created_at: '2026-02-01T00:00:00Z' },
      { id: 3, name: 'Design System', description: '', member_count: 2, created_at: '2026-03-01T00:00:00Z' },
    ]
    if (search) {
      const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      return HttpResponse.json(filtered)
    }
    return HttpResponse.json(projects)
  }),

  http.post('/api/projects', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (!body.name?.trim()) {
      return HttpResponse.json({ name: ['This field is required.'] }, { status: 400 })
    }
    return HttpResponse.json(
      { id: 99, name: body.name, description: body.description || '', created_at: '2026-03-24T00:00:00Z' },
      { status: 201 },
    )
  }),
]
