import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../../../../test/test-utils'
import { ProjectPage } from '../ProjectPage'

function loginAs() {
  localStorage.setItem('token', 'fake-jwt-token')
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
    expect(screen.getByText('Send')).toBeInTheDocument()
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
      expect(screen.getByText('Invite Members')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Invite Members'))
    expect(screen.getByText('Generate Link')).toBeInTheDocument()
  })

  it('generates invite link', async () => {
    const user = userEvent.setup()
    renderProjectPage()
    await waitFor(() => {
      expect(screen.getByText('Invite Members')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Invite Members'))
    await user.click(screen.getByText('Generate Link'))
    await waitFor(() => {
      expect(screen.getByDisplayValue(/invite-token-abc123/)).toBeInTheDocument()
    })
  })
})
