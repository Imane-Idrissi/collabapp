import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../test/mocks/server'
import { render } from '@testing-library/react'
import { EmailVerificationBanner } from '../EmailVerificationBanner'
import type { User } from '../../../../types'

const unverifiedUser: User = {
  id: 1,
  name: 'Imane Idrissi',
  email: 'imane@example.com',
  email_verified: false,
  avatar_color: '#6366f1',
}

describe('EmailVerificationBanner', () => {
  it('renders banner for unverified user', () => {
    render(<EmailVerificationBanner user={unverifiedUser} onUserUpdate={vi.fn()} />)
    expect(screen.getByText('Your email is not verified.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument()
    expect(screen.getByText('Wrong email? Update it')).toBeInTheDocument()
  })

  it('sends resend request and shows success', async () => {
    const user = userEvent.setup()
    render(<EmailVerificationBanner user={unverifiedUser} onUserUpdate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }))
    await waitFor(() => {
      expect(screen.getByText('Verification email sent!')).toBeInTheDocument()
    })
  })

  it('shows update email form on click', async () => {
    const user = userEvent.setup()
    render(<EmailVerificationBanner user={unverifiedUser} onUserUpdate={vi.fn()} />)
    await user.click(screen.getByText('Wrong email? Update it'))
    expect(screen.getByDisplayValue('imane@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
  })

  it('updates email successfully', async () => {
    const onUserUpdate = vi.fn()
    const user = userEvent.setup()
    render(<EmailVerificationBanner user={unverifiedUser} onUserUpdate={onUserUpdate} />)
    await user.click(screen.getByText('Wrong email? Update it'))
    const input = screen.getByDisplayValue('imane@example.com')
    await user.clear(input)
    await user.type(input, 'new@example.com')
    await user.click(screen.getByRole('button', { name: 'Update' }))
    await waitFor(() => {
      expect(screen.getByText('Email updated!')).toBeInTheDocument()
    })
    expect(onUserUpdate).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }))
  })

  it('shows error for taken email', async () => {
    const user = userEvent.setup()
    render(<EmailVerificationBanner user={unverifiedUser} onUserUpdate={vi.fn()} />)
    await user.click(screen.getByText('Wrong email? Update it'))
    const input = screen.getByDisplayValue('imane@example.com')
    await user.clear(input)
    await user.type(input, 'taken@example.com')
    await user.click(screen.getByRole('button', { name: 'Update' }))
    await waitFor(() => {
      expect(screen.getByText('Email already exists.')).toBeInTheDocument()
    })
  })

  it('shows error when email already verified (403)', async () => {
    server.use(
      http.patch('/api/auth/update-email', () =>
        HttpResponse.json({ detail: 'Email can only be updated while unverified.' }, { status: 403 }),
      ),
    )
    const user = userEvent.setup()
    render(<EmailVerificationBanner user={unverifiedUser} onUserUpdate={vi.fn()} />)
    await user.click(screen.getByText('Wrong email? Update it'))
    await user.click(screen.getByRole('button', { name: 'Update' }))
    await waitFor(() => {
      expect(screen.getByText('Email is already verified.')).toBeInTheDocument()
    })
  })
})
