import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../test/mocks/server'
import { renderWithProviders } from '../../../../test/test-utils'
import { DashboardPage } from '../DashboardPage'

function loginAs(overrides = {}) {
  const user = { id: 1, name: 'Imane Idrissi', email: 'imane@example.com', email_verified: false, avatar_color: '#6366f1', ...overrides }
  localStorage.setItem('token', 'fake-jwt-token')
  localStorage.setItem('user', JSON.stringify(user))
}

describe('DashboardPage', () => {
  beforeEach(() => loginAs())

  it('shows greeting with first name', async () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Hi, Imane')).toBeInTheDocument()
  })

  it('loads and displays projects', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('CollabApp')).toBeInTheDocument()
    })
    expect(screen.getByText('Side Project')).toBeInTheDocument()
    expect(screen.getByText('Design System')).toBeInTheDocument()
  })

  it('shows email verification banner when unverified', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Your email is not verified.')).toBeInTheDocument()
  })

  it('hides email verification banner when verified', () => {
    loginAs({ email_verified: true })
    renderWithProviders(<DashboardPage />)
    expect(screen.queryByText('Your email is not verified.')).not.toBeInTheDocument()
  })

  it('searches projects', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('CollabApp')).toBeInTheDocument()
    })
    await user.type(screen.getByPlaceholderText('Search projects...'), 'collab')
    await waitFor(() => {
      expect(screen.getByText('CollabApp')).toBeInTheDocument()
      expect(screen.queryByText('Side Project')).not.toBeInTheDocument()
    })
  })

  it('shows empty state when no projects', async () => {
    server.use(
      http.get('/api/projects', () => HttpResponse.json([])),
    )
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('No projects yet. Create your first project to get started.')).toBeInTheDocument()
    })
  })

  it('shows no results message on empty search', async () => {
    server.use(
      http.get('/api/projects', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('search')) return HttpResponse.json([])
        return HttpResponse.json([{ id: 1, name: 'Test', description: '', member_count: 1, created_at: '2026-01-01T00:00:00Z' }])
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument()
    })
    await user.type(screen.getByPlaceholderText('Search projects...'), 'zzzzz')
    await waitFor(() => {
      expect(screen.getByText('No projects match your search.')).toBeInTheDocument()
    })
  })

  it('opens logout modal and logs out', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DashboardPage />)
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(screen.getByText('Are you sure you want to log out?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log Out' }))
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login')
    })
  })

  it('opens create project modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DashboardPage />)
    await user.click(screen.getByRole('button', { name: '+ New Project' }))
    expect(screen.getByText('New Project')).toBeInTheDocument()
  })
})
