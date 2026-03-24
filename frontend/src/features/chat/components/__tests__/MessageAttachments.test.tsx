import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../test/test-utils'
import { MessageAttachments } from '../MessageAttachments'
import type { Attachment } from '../../../../types'

const imageAttachment: Attachment = {
  id: 1,
  url: 'https://s3.example.com/photo.png',
  name: 'photo.png',
  size: 204800,
  type: 'image/png',
}

const fileAttachment: Attachment = {
  id: 2,
  url: 'https://s3.example.com/report.pdf',
  name: 'report.pdf',
  size: 1048576,
  type: 'application/pdf',
}

describe('MessageAttachments', () => {
  it('renders image attachment as <img> with src', () => {
    renderWithProviders(<MessageAttachments attachments={[imageAttachment]} />)
    const img = screen.getByRole('img', { name: 'photo.png' })
    expect(img).toHaveAttribute('src', 'https://s3.example.com/photo.png')
  })

  it('renders non-image attachment as download link with filename and size', () => {
    renderWithProviders(<MessageAttachments attachments={[fileAttachment]} />)
    const link = screen.getByRole('link', { name: /report\.pdf/i })
    expect(link).toHaveAttribute('href', 'https://s3.example.com/report.pdf')
    expect(link).toHaveAttribute('download')
    expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument()
  })

  it('renders multiple attachments', () => {
    renderWithProviders(
      <MessageAttachments attachments={[imageAttachment, fileAttachment]} />,
    )
    expect(screen.getByRole('img', { name: 'photo.png' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /report\.pdf/i })).toBeInTheDocument()
  })

  it('formats file size from bytes to KB', () => {
    const smallFile: Attachment = { id: 3, url: '#', name: 'notes.txt', size: 2048, type: 'text/plain' }
    renderWithProviders(<MessageAttachments attachments={[smallFile]} />)
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument()
  })

  it('formats file size from bytes to MB', () => {
    renderWithProviders(<MessageAttachments attachments={[fileAttachment]} />)
    expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument()
  })

  it('renders nothing when attachments array is empty', () => {
    const { container } = renderWithProviders(<MessageAttachments attachments={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
