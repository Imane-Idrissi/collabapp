import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../test/mocks/server'
import { renderWithProviders } from '../../../../test/test-utils'
import { ForgotPasswordPage } from '../ForgotPasswordPage'

describe('ForgotPasswordPage', () => {
  it('renders the form', () => {
    renderWithProviders(<ForgotPasswordPage />)
    expect(screen.getByText('Reset your password')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument()
  })

  it('shows client-side error for empty email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('shows success message after submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText('Email'), 'imane@example.com')
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    await waitFor(() => {
      expect(screen.getByText('A password reset link has been sent to your inbox.')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('shows generic error on network failure', async () => {
    server.use(
      http.post('/api/auth/forgot-password', () => HttpResponse.error()),
    )
    const user = userEvent.setup()
    renderWithProviders(<ForgotPasswordPage />)
    await user.type(screen.getByLabelText('Email'), 'imane@example.com')
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))
    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })
  })

  it('has link back to login', () => {
    renderWithProviders(<ForgotPasswordPage />)
    expect(screen.getByText('Back to login')).toHaveAttribute('href', '/login')
  })
})
