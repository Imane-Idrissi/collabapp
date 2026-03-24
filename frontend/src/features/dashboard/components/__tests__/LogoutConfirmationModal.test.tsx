import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { LogoutConfirmationModal } from '../LogoutConfirmationModal'

describe('LogoutConfirmationModal', () => {
  it('renders when open', () => {
    render(<LogoutConfirmationModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByText('Are you sure you want to log out?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log Out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<LogoutConfirmationModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.queryByText('Are you sure you want to log out?')).not.toBeInTheDocument()
  })

  it('calls onConfirm when Log Out clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<LogoutConfirmationModal isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />)
    await user.click(screen.getByRole('button', { name: 'Log Out' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onClose when Cancel clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<LogoutConfirmationModal isOpen={true} onClose={onClose} onConfirm={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
