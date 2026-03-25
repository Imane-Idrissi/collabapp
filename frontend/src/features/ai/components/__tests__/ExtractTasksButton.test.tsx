import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../../../test/test-utils'
import { server } from '../../../../test/mocks/server'
import { ExtractTasksButton } from '../ExtractTasksButton'

describe('ExtractTasksButton', () => {
  it('renders Extract Tasks button', () => {
    renderWithProviders(
      <ExtractTasksButton projectId="1" disabled={false} onSuggestions={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /extract tasks/i })).toBeInTheDocument()
  })

  it('is disabled with tooltip when disabled prop is true', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ExtractTasksButton projectId="1" disabled={true} onSuggestions={vi.fn()} />,
    )
    const button = screen.getByRole('button', { name: /extract tasks/i })
    expect(button).toBeDisabled()
    await user.hover(button)
    expect(screen.getByText('No chat messages yet')).toBeInTheDocument()
  })

  it('shows loading state on click and prevents double-click', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/projects/:projectId/extract-tasks', async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ suggestions: [] })
      }),
    )
    renderWithProviders(
      <ExtractTasksButton projectId="1" disabled={false} onSuggestions={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: /extract tasks/i }))
    expect(screen.getByText('Analyzing conversation...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled()
  })

  it('calls onSuggestions with suggestions on success', async () => {
    const onSuggestions = vi.fn()
    const user = userEvent.setup()
    const suggestions = [
      { name: 'Set up CI', description: 'Configure GitHub Actions', priority: 'high' },
      { name: 'Write README', description: 'Add setup instructions', priority: 'low' },
    ]
    server.use(
      http.post('/api/projects/:projectId/extract-tasks', () => {
        return HttpResponse.json({ suggestions })
      }),
    )
    renderWithProviders(
      <ExtractTasksButton projectId="1" disabled={false} onSuggestions={onSuggestions} />,
    )
    await user.click(screen.getByRole('button', { name: /extract tasks/i }))
    await waitFor(() => {
      expect(onSuggestions).toHaveBeenCalledWith(suggestions)
    })
  })

  it('shows error on 409', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/projects/:projectId/extract-tasks', () => {
        return HttpResponse.json(
          { detail: 'Extraction already in progress.' },
          { status: 409 },
        )
      }),
    )
    renderWithProviders(
      <ExtractTasksButton projectId="1" disabled={false} onSuggestions={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: /extract tasks/i }))
    await waitFor(() => {
      expect(screen.getByText('Extraction already in progress.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /extract tasks/i })).toBeEnabled()
  })

  it('shows error on 500', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/projects/:projectId/extract-tasks', () => {
        return HttpResponse.json(
          { detail: 'AI extraction failed. Please try again.' },
          { status: 500 },
        )
      }),
    )
    renderWithProviders(
      <ExtractTasksButton projectId="1" disabled={false} onSuggestions={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: /extract tasks/i }))
    await waitFor(() => {
      expect(screen.getByText('AI extraction failed. Please try again.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /extract tasks/i })).toBeEnabled()
  })
})
