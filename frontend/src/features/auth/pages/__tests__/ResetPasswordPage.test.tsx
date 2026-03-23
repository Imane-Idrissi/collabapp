import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import { ResetPasswordPage } from '../ResetPasswordPage'

function setUrlToken(token: string) {
  window.history.pushState({}, '', `/reset-password?token=${token}`)
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/reset-password')
  })

  it('shows error when no token in URL', () => {
    renderWithProviders(<ResetPasswordPage />)
    expect(screen.getByText('Invalid reset link')).toBeInTheDocument()
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument()
  })

  it('renders form when token exists in URL', () => {
    setUrlToken('valid-token')
    renderWithProviders(<ResetPasswordPage />)
    expect(screen.getByText('Set new password')).toBeInTheDocument()
    expect(screen.getByLabelText('New Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument()
  })

  it('shows client-side error for empty passwords', async () => {
    setUrlToken('valid-token')
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />)
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    setUrlToken('valid-token')
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />)
    await user.type(screen.getByLabelText('New Password'), 'StrongPass1')
    await user.type(screen.getByLabelText('Confirm New Password'), 'Different1')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('shows error when password too short', async () => {
    setUrlToken('valid-token')
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />)
    await user.type(screen.getByLabelText('New Password'), 'Ab1')
    await user.type(screen.getByLabelText('Confirm New Password'), 'Ab1')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('shows success message after valid reset', async () => {
    setUrlToken('valid-token')
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />)
    await user.type(screen.getByLabelText('New Password'), 'NewStrong1')
    await user.type(screen.getByLabelText('Confirm New Password'), 'NewStrong1')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))
    await waitFor(() => {
      expect(screen.getByText('Password reset successfully.')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument()
    expect(screen.getByText('Back to login')).toHaveAttribute('href', '/login')
  })

  it('shows error for expired token', async () => {
    setUrlToken('expired-token')
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />)
    await user.type(screen.getByLabelText('New Password'), 'NewStrong1')
    await user.type(screen.getByLabelText('Confirm New Password'), 'NewStrong1')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))
    await waitFor(() => {
      expect(screen.getByText('This reset link has expired.')).toBeInTheDocument()
    })
  })
})
