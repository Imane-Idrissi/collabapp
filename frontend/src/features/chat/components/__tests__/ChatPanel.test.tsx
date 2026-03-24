import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/test-utils'
import { ChatPanel } from '../ChatPanel'
import type { Message } from '../../../../types'

const mockMessages: Message[] = [
  { id: 1, text: 'Hey team', sender: { id: 1, name: 'Imane', avatar_color: '#6366f1' }, attachments: [], created_at: '2026-03-24T10:00:00Z' },
  { id: 2, text: 'Let\'s plan the sprint', sender: { id: 2, name: 'Alex', avatar_color: '#10b981' }, attachments: [], created_at: '2026-03-24T10:01:00Z' },
]

const markerMessages: Message[] = [
  ...mockMessages,
  { id: 3, text: '──────── Tasks extracted ────────', sender: { id: 1, name: 'Imane', avatar_color: '#6366f1' }, attachments: [], created_at: '2026-03-24T10:02:00Z' },
  { id: 4, text: 'Back to discussion', sender: { id: 2, name: 'Alex', avatar_color: '#10b981' }, attachments: [], created_at: '2026-03-24T10:03:00Z' },
]

describe('ChatPanel', () => {
  it('displays messages with sender names', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByText('Hey team')).toBeInTheDocument()
    expect(screen.getByText('Imane')).toBeInTheDocument()
    expect(screen.getByText("Let's plan the sprint")).toBeInTheDocument()
    expect(screen.getByText('Alex')).toBeInTheDocument()
  })

  it('shows extraction markers as styled dividers', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={markerMessages} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByText('Tasks extracted')).toBeInTheDocument()
    expect(screen.getByText('Back to discussion')).toBeInTheDocument()
  })

  it('sends message on Enter key', async () => {
    const onMessageSent = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} onNewMessages={vi.fn()} onMessageSent={onMessageSent} />,
    )
    const input = screen.getByPlaceholderText('Type a message...')
    await user.type(input, 'Hello world{Enter}')
    await waitFor(() => {
      expect(onMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Hello world' }),
      )
    })
  })

  it('sends message on Send button click', async () => {
    const onMessageSent = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} onNewMessages={vi.fn()} onMessageSent={onMessageSent} />,
    )
    const input = screen.getByPlaceholderText('Type a message...')
    await user.type(input, 'Hello world')
    await user.click(screen.getByText('Send'))
    await waitFor(() => {
      expect(onMessageSent).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Hello world' }),
      )
    })
  })

  it('clears input after sending', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    const input = screen.getByPlaceholderText('Type a message...')
    await user.type(input, 'Hello{Enter}')
    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('disables Send button when input is empty', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByText('Send')).toBeDisabled()
  })

  it('shows empty state when no messages', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={[]} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })
})
