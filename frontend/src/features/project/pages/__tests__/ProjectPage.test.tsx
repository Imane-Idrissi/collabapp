import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../../../../test/test-utils'
import { ProjectPage } from '../ProjectPage'

function loginAs() {
  localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Imane', email: 'imane@example.com', email_verified: true, avatar_color: '#6366f1' }))
}

function renderProjectPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:projectId" element={<ProjectPage />} />
    </Routes>
  )
}

describe('ProjectPage', () => {
  beforeEach(() => {
    loginAs()
    window.history.pushState({}, '', '/projects/1')
  })

  it('loads and displays board with columns', async () => {
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getByText('To Do')).toBeInTheDocument()
    })
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('displays project name in top bar', async () => {
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getByText('CollabApp')).toBeInTheDocument()
    })
  })

  it('shows task cards', async () => {
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getByText('Setup project')).toBeInTheDocument()
    })
    expect(screen.getByText('Build frontend')).toBeInTheDocument()
  })

  it('shows chat panel with messages', async () => {
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('opens edit project modal on name click', async () => {
    const user = userEvent.setup()
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getByText('CollabApp')).toBeInTheDocument()
    })
    await user.click(screen.getByText('CollabApp'))
    expect(screen.getByText('Edit Project')).toBeInTheDocument()
  })

  it('opens invite modal', async () => {
    const user = userEvent.setup()
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getByText('Invite')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Invite'))
    expect(screen.getByText('Generate Link')).toBeInTheDocument()
  })

  it('displays member avatars in header', async () => {
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getAllByTitle('Imane').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByTitle('Alex').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTitle('Sara')).toBeInTheDocument()
  })

  it('shows overflow count when many members', async () => {
    const { http, HttpResponse } = await import('msw')
    const { server } = await import('../../../../test/mocks/server')
    const manyMembers = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      name: `Member ${i + 1}`,
      avatar_color: '#6366f1',
      joined_at: '2026-01-01T00:00:00Z',
    }))
    server.use(
      http.get('/api/projects/:projectId/members', () => {
        return HttpResponse.json({ members: manyMembers })
      }),
    )
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getByText('+2')).toBeInTheDocument()
    })
  })

  it('generates invite link', async () => {
    const user = userEvent.setup()
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getByText('Invite')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Invite'))
    await user.click(screen.getByText('Generate Link'))
    await waitFor(() => {
      expect(screen.getByDisplayValue(/invite-token-abc123/)).toBeInTheDocument()
    })
  })
})
