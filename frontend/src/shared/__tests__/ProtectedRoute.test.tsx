import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { ProtectedRoute } from '../ProtectedRoute'

describe('ProtectedRoute', () => {
  it('redirects to /login when no token', () => {
    renderWithProviders(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>,
    )
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('renders children when token exists', () => {
    localStorage.setItem('token', 'jwt123')
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test', email: 'test@test.com', email_verified: false, avatar_color: '#000' }))
    renderWithProviders(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>,
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
