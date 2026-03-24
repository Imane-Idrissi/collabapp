import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import { AttachmentButton } from '../AttachmentButton'

describe('AttachmentButton', () => {
  it('renders a file picker button', () => {
    renderWithProviders(
      <AttachmentButton onFileSelected={vi.fn()} onError={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /attach/i })).toBeInTheDocument()
  })

  it('calls onFileSelected when a file is chosen', async () => {
    const onFileSelected = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <AttachmentButton onFileSelected={onFileSelected} onError={vi.fn()} />,
    )

    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(onFileSelected).toHaveBeenCalledWith(file)
  })

  it('rejects files larger than 10MB with error callback', async () => {
    const onError = vi.fn()
    const onFileSelected = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <AttachmentButton onFileSelected={onFileSelected} onError={onError} />,
    )

    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.zip', { type: 'application/zip' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, largeFile)

    expect(onError).toHaveBeenCalledWith('File must be under 10MB')
    expect(onFileSelected).not.toHaveBeenCalled()
  })

  it('accepts files at exactly 10MB', async () => {
    const onFileSelected = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <AttachmentButton onFileSelected={onFileSelected} onError={vi.fn()} />,
    )

    const file = new File(['x'.repeat(10 * 1024 * 1024)], 'exact.zip', { type: 'application/zip' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    expect(onFileSelected).toHaveBeenCalledWith(file)
  })
})
