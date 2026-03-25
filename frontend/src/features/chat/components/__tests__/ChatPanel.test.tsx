import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../../../test/test-utils'
import { server } from '../../../../test/mocks/server'
import { ChatPanel } from '../ChatPanel'
import type { Message, Column } from '../../../../types'

const mockMessages: Message[] = [
  { id: 1, text: 'Hey team', sender: { id: 1, name: 'Imane', avatar_color: '#6366f1' }, attachments: [], created_at: '2026-03-24T10:00:00Z' },
  { id: 2, text: 'Let\'s plan the sprint', sender: { id: 2, name: 'Alex', avatar_color: '#10b981' }, attachments: [], created_at: '2026-03-24T10:01:00Z' },
]

const mockColumns: Column[] = [
  { id: 1, name: 'To Do', position: 0, tasks: [] },
  { id: 2, name: 'In Progress', position: 1, tasks: [] },
]

const markerMessages: Message[] = [
  ...mockMessages,
  { id: 3, text: '──────── Tasks extracted ────────', sender: { id: 1, name: 'Imane', avatar_color: '#6366f1' }, attachments: [], created_at: '2026-03-24T10:02:00Z' },
  { id: 4, text: 'Back to discussion', sender: { id: 2, name: 'Alex', avatar_color: '#10b981' }, attachments: [], created_at: '2026-03-24T10:03:00Z' },
]

describe('ChatPanel', () => {
  it('displays messages with sender names', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByText('Hey team')).toBeInTheDocument()
    expect(screen.getByText('Imane')).toBeInTheDocument()
    expect(screen.getByText("Let's plan the sprint")).toBeInTheDocument()
    expect(screen.getByText('Alex')).toBeInTheDocument()
  })

  it('shows extraction markers as styled dividers', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={markerMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByText('Tasks extracted')).toBeInTheDocument()
    expect(screen.getByText('Back to discussion')).toBeInTheDocument()
  })

  it('sends message on Enter key', async () => {
    const onMessageSent = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={onMessageSent} />,
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
      <ChatPanel projectId="1" messages={mockMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={onMessageSent} />,
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
      <ChatPanel projectId="1" messages={mockMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    const input = screen.getByPlaceholderText('Type a message...')
    await user.type(input, 'Hello{Enter}')
    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('disables Send button when input is empty', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByText('Send')).toBeDisabled()
  })

  it('shows empty state when no messages', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={[]} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })

  it('shows attachment button in input area', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /attach/i })).toBeInTheDocument()
  })

  it('displays image attachments inline in messages', () => {
    const messagesWithImage: Message[] = [
      {
        id: 10,
        text: 'Check this screenshot',
        sender: { id: 1, name: 'Imane', avatar_color: '#6366f1' },
        attachments: [{ id: 1, url: 'https://s3.example.com/screenshot.png', name: 'screenshot.png', size: 204800, type: 'image/png' }],
        created_at: '2026-03-24T10:00:00Z',
      },
    ]
    renderWithProviders(
      <ChatPanel projectId="1" messages={messagesWithImage} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByText('Check this screenshot')).toBeInTheDocument()
    const img = screen.getByRole('img', { name: 'screenshot.png' })
    expect(img).toHaveAttribute('src', 'https://s3.example.com/screenshot.png')
  })

  it('displays file attachments as download links in messages', () => {
    const messagesWithFile: Message[] = [
      {
        id: 11,
        text: 'Here is the report',
        sender: { id: 1, name: 'Imane', avatar_color: '#6366f1' },
        attachments: [{ id: 2, url: 'https://s3.example.com/report.pdf', name: 'report.pdf', size: 1048576, type: 'application/pdf' }],
        created_at: '2026-03-24T10:00:00Z',
      },
    ]
    renderWithProviders(
      <ChatPanel projectId="1" messages={messagesWithFile} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByText('Here is the report')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /report\.pdf/i })
    expect(link).toHaveAttribute('href', 'https://s3.example.com/report.pdf')
    expect(link).toHaveAttribute('download')
  })

  it('shows Extract Tasks button at top of chat panel', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /extract tasks/i })).toBeInTheDocument()
  })

  it('disables Extract Tasks button when messages are empty', () => {
    renderWithProviders(
      <ChatPanel projectId="1" messages={[]} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /extract tasks/i })).toBeDisabled()
  })

  it('opens AI task modal after successful extraction', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/projects/:projectId/extract-tasks', () => {
        return HttpResponse.json({
          suggestions: [
            { name: 'Set up CI', description: 'Configure GitHub Actions', priority: 'high' },
          ],
        })
      }),
    )
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: /extract tasks/i }))
    await waitFor(() => {
      expect(screen.getByText('Suggested Tasks')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('Set up CI')).toBeInTheDocument()
  })

  it('completes full extraction flow: extract → select → add to board → modal closes', async () => {
    const onTasksAdded = vi.fn()
    const user = userEvent.setup()
    server.use(
      http.post('/api/projects/:projectId/extract-tasks', () => {
        return HttpResponse.json({
          suggestions: [
            { name: 'Set up CI', description: 'Configure GitHub Actions', priority: 'high' },
            { name: 'Write README', description: 'Add setup instructions', priority: 'low' },
          ],
        })
      }),
      http.post('/api/projects/:projectId/tasks/batch', () => {
        return HttpResponse.json(
          {
            tasks: [
              { id: 1, name: 'Set up CI', description: 'Configure GitHub Actions', priority: 'high', position: 0, column_id: 1, creator_id: 1, is_ai_generated: true, version: 1, created_at: '2026-03-25T00:00:00Z' },
            ],
          },
          { status: 201 },
        )
      }),
    )
    renderWithProviders(
      <ChatPanel projectId="1" messages={mockMessages} columns={mockColumns} onNewMessages={vi.fn()} onMessageSent={vi.fn()} onTasksAdded={onTasksAdded} />,
    )
    // Extract
    await user.click(screen.getByRole('button', { name: /extract tasks/i }))
    await waitFor(() => {
      expect(screen.getByText('Suggested Tasks')).toBeInTheDocument()
    })
    // Uncheck second task
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1])
    // Add to board
    await user.click(screen.getByRole('button', { name: /add to board/i }))
    await waitFor(() => {
      expect(screen.getByText('1 tasks added!')).toBeInTheDocument()
    })
  })
})
