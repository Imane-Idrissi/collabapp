import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { EmailVerificationBanner } from '../EmailVerificationBanner'

describe('EmailVerificationBanner', () => {
  it('renders banner for unverified user', () => {
    render(<EmailVerificationBanner />)
    expect(screen.getByText('Your email is not verified.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send verification email' })).toBeInTheDocument()
  })

  it('sends verification request and shows success', async () => {
    const user = userEvent.setup()
    render(<EmailVerificationBanner />)
    await user.click(screen.getByRole('button', { name: 'Send verification email' }))
    await waitFor(() => {
      expect(screen.getByText('Verification email sent! Check your inbox.')).toBeInTheDocument()
    })
  })
})
