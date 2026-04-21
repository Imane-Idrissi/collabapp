import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { ProtectedRoute } from '../ProtectedRoute'

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', async () => {
    renderWithProviders(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>,
    )
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login')
    })
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test', email: 'test@test.com', email_verified: false, avatar_color: '#000' }))
    renderWithProviders(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>,
    )
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })
})
