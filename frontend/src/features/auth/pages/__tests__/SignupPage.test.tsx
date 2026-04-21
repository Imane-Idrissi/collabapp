import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../test/mocks/server'
import { renderWithProviders } from '../../../../test/test-utils'
import { SignupPage } from '../SignupPage'

const TEST_USER = { id: 1, name: 'Test', email: 'test@test.com', email_verified: false, avatar_color: '#000' }

describe('SignupPage', () => {
  it('renders signup form', () => {
    renderWithProviders(<SignupPage />)
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
  })

  it('shows client-side errors for empty fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />)
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument()
  })

  it('shows error when password too short', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />)
    await user.type(screen.getByLabelText('Name'), 'Imane')
    await user.type(screen.getByLabelText('Email'), 'imane@example.com')
    await user.type(screen.getByLabelText('Password'), 'Ab1')
    await user.type(screen.getByLabelText('Confirm Password'), 'Ab1')
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />)
    await user.type(screen.getByLabelText('Name'), 'Imane')
    await user.type(screen.getByLabelText('Email'), 'imane@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPass1')
    await user.type(screen.getByLabelText('Confirm Password'), 'Different1')
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('navigates to /dashboard on successful signup', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />)
    await user.type(screen.getByLabelText('Name'), 'Imane Idrissi')
    await user.type(screen.getByLabelText('Email'), 'imane@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPass1')
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongPass1')
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard')
    })
  })

  it('displays API field errors', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />)
    await user.type(screen.getByLabelText('Name'), 'Imane')
    await user.type(screen.getByLabelText('Email'), 'taken@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPass1')
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongPass1')
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    await waitFor(() => {
      expect(screen.getByText('A user with this email already exists.')).toBeInTheDocument()
    })
  })

  it('shows generic error on network failure', async () => {
    server.use(
      http.post('/api/auth/signup', () => HttpResponse.error()),
    )
    const user = userEvent.setup()
    renderWithProviders(<SignupPage />)
    await user.type(screen.getByLabelText('Name'), 'Imane')
    await user.type(screen.getByLabelText('Email'), 'imane@example.com')
    await user.type(screen.getByLabelText('Password'), 'StrongPass1')
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongPass1')
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))
    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })
  })

  it('has link to login page', () => {
    renderWithProviders(<SignupPage />)
    const link = screen.getByText('Log in')
    expect(link).toHaveAttribute('href', '/login')
  })

  it('redirects to /dashboard if already logged in', () => {
    localStorage.setItem('user', JSON.stringify(TEST_USER))
    renderWithProviders(<SignupPage />)
    expect(window.location.pathname).toBe('/dashboard')
  })
})
