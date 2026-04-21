import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../../../../test/test-utils'
import { InviteAcceptPage } from '../InviteAcceptPage'

function renderInvitePage() {
  return renderWithProviders(
    <Routes>
      <Route path="/invite/:token" element={<InviteAcceptPage />} />
    </Routes>
  )
}

describe('InviteAcceptPage', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/invite/test-token')
  })

  it('shows login/signup buttons when not logged in', () => {
    renderInvitePage()
    expect(screen.getByText("You've been invited!")).toBeInTheDocument()
    expect(screen.getByText('Log In')).toHaveAttribute('href', '/login')
    expect(screen.getByText('Sign Up')).toHaveAttribute('href', '/signup')
  })

  it('stores pending invite token in localStorage when not logged in', () => {
    renderInvitePage()
    expect(localStorage.getItem('pending_invite')).toBe('test-token')
  })

  it('auto-joins when logged in', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Imane', email: 'imane@example.com', email_verified: true, avatar_color: '#6366f1' }))
    renderInvitePage()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/projects/1')
    })
  })
})
