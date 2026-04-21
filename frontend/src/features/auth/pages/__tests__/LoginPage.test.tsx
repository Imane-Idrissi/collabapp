import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../test/mocks/server'
import { renderWithProviders } from '../../../../test/test-utils'
import { LoginPage } from '../LoginPage'

const TEST_USER = { id: 1, name: 'Test', email: 'test@test.com', email_verified: false, avatar_color: '#000' }

describe('LoginPage', () => {
  it('renders login form', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument()
  })

  it('shows client-side errors for empty fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('navigates to /dashboard on successful login', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'imane@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPass1')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard')
    })
  })

  it('shows error on invalid credentials (401)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'imane@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument()
    })
  })

  it('shows generic error on network failure', async () => {
    server.use(
      http.post('/api/auth/login', () => HttpResponse.error()),
    )
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.type(screen.getByLabelText('Email'), 'imane@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPass1')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })
  })

  it('has link to forgot password page', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Forgot password?')).toHaveAttribute('href', '/forgot-password')
  })

  it('has link to signup page', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Sign up')).toHaveAttribute('href', '/signup')
  })

  it('redirects to /dashboard if already logged in', () => {
    localStorage.setItem('user', JSON.stringify(TEST_USER))
    renderWithProviders(<LoginPage />)
    expect(window.location.pathname).toBe('/dashboard')
  })
})
