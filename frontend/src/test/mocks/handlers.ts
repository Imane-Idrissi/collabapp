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
]
