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
      { token: 'fake-jwt-token', refresh_token: 'fake-refresh-token', user: { ...TEST_USER, name: body.name, email: body.email } },
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
      { token: 'fake-jwt-token', refresh_token: 'fake-refresh-token', user: TEST_USER },
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

  http.patch('/api/projects/:projectId', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    return HttpResponse.json(
      { id: 1, name: body.name || 'CollabApp', description: body.description || '', created_at: '2026-01-01T00:00:00Z' },
    )
  }),

  http.get('/api/projects/:projectId/board', () => {
    return HttpResponse.json({
      columns: [
        {
          id: 1, name: 'To Do', position: 0,
          tasks: [
            { id: 1, name: 'Setup project', description: 'Initialize repo', priority: 'high', position: 0, column_id: 1, creator_id: 1, is_ai_generated: false, version: 1, created_at: '2026-03-20T00:00:00Z' },
            { id: 2, name: 'AI generated task', description: '', priority: 'medium', position: 1, column_id: 1, creator_id: 1, is_ai_generated: true, version: 1, created_at: '2026-03-20T00:00:00Z' },
          ],
        },
        {
          id: 2, name: 'In Progress', position: 1,
          tasks: [
            { id: 3, name: 'Build frontend', description: 'React + Tailwind', priority: 'medium', position: 0, column_id: 2, creator_id: 1, is_ai_generated: false, version: 1, created_at: '2026-03-21T00:00:00Z' },
          ],
        },
        { id: 3, name: 'Done', position: 2, tasks: [] },
      ],
    })
  }),

  http.post('/api/projects/:projectId/columns', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    return HttpResponse.json({ id: 10, name: body.name, position: 3 }, { status: 201 })
  }),

  http.patch('/api/projects/:projectId/columns/:columnId', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    return HttpResponse.json({ id: 1, name: body.name, position: 0 })
  }),

  http.delete('/api/projects/:projectId/columns/:columnId', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/projects/:projectId/tasks', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      { id: 50, name: body.name, description: body.description || '', priority: body.priority || '', position: 0, column_id: body.column_id, creator_id: 1, is_ai_generated: false, version: 1, created_at: '2026-03-24T00:00:00Z' },
      { status: 201 },
    )
  }),

  http.patch('/api/projects/:projectId/tasks/:taskId', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    if (body.version === 999) {
      return HttpResponse.json({ detail: 'Someone else edited this task. Reload to see the latest version.' }, { status: 409 })
    }
    return HttpResponse.json(
      { id: 1, name: body.name || 'Setup project', description: body.description || '', priority: body.priority || 'high', position: 0, column_id: body.column_id || 1, creator_id: 1, is_ai_generated: false, version: ((body.version as number) || 1) + 1, created_at: '2026-03-20T00:00:00Z' },
    )
  }),

  http.delete('/api/projects/:projectId/tasks/:taskId', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/projects/:projectId/invites', () => {
    return HttpResponse.json({ token: 'invite-token-abc123' }, { status: 201 })
  }),

  http.post('/api/projects/join', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.token === 'invalid-token') {
      return HttpResponse.json({ token: ['Invalid invite token.'] }, { status: 400 })
    }
    return HttpResponse.json({ project: { id: 1, name: 'CollabApp' } })
  }),

  http.get('/api/projects/:projectId/messages', ({ request }) => {
    const url = new URL(request.url)
    const before = url.searchParams.get('before')
    const messages = [
      { id: 1, text: 'Hey team, let\'s plan the sprint', sender: { id: 1, name: 'Imane', avatar_color: '#6366f1' }, attachments: [], created_at: '2026-03-24T10:00:00Z' },
      { id: 2, text: 'I think we should focus on auth first', sender: { id: 2, name: 'Alex', avatar_color: '#10b981' }, attachments: [], created_at: '2026-03-24T10:01:00Z' },
      { id: 3, text: '──────── Tasks extracted ────────', sender: { id: 1, name: 'Imane', avatar_color: '#6366f1' }, attachments: [], created_at: '2026-03-24T10:02:00Z' },
      { id: 4, text: 'Sounds good, let me start on the login page', sender: { id: 2, name: 'Alex', avatar_color: '#10b981' }, attachments: [], created_at: '2026-03-24T10:03:00Z' },
    ]
    if (before) {
      const filtered = messages.filter(m => m.id < Number(before))
      return HttpResponse.json({ messages: filtered })
    }
    return HttpResponse.json({ messages })
  }),

  http.post('/api/projects/:projectId/messages', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const attachments = (body.attachments as Array<{ url: string; name: string; size: number; type: string }>) || []
    return HttpResponse.json(
      {
        id: 100,
        text: body.text || '',
        sender: { id: 1, name: 'Imane', avatar_color: '#6366f1' },
        attachments: attachments.map((a, i) => ({ id: 200 + i, ...a })),
        created_at: '2026-03-24T12:00:00Z',
      },
      { status: 201 },
    )
  }),

  http.post('/api/projects/:projectId/upload', async () => {
    return HttpResponse.json(
      { upload_url: 'https://s3.example.com/presigned-put', file_url: 'https://s3.example.com/uploads/file.png' },
      { status: 200 },
    )
  }),

  http.post('/api/projects/:projectId/extract-tasks', () => {
    return HttpResponse.json({
      suggestions: [
        { name: 'Set up CI pipeline', description: 'Configure GitHub Actions', priority: 'high' },
        { name: 'Write README', description: 'Add setup instructions', priority: 'low' },
      ],
    })
  }),

  http.post('/api/projects/:projectId/tasks/batch', async ({ request }) => {
    const body = await request.json() as { tasks: Array<{ name: string; description: string; priority: string; column_id: number }> }
    const tasks = body.tasks.map((t, i) => ({
      id: 300 + i,
      ...t,
      position: i,
      creator_id: 1,
      is_ai_generated: true,
      version: 1,
      created_at: '2026-03-25T00:00:00Z',
    }))
    return HttpResponse.json({ tasks }, { status: 201 })
  }),
]
