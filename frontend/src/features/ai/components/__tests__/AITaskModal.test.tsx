import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../../../test/test-utils'
import { server } from '../../../../test/mocks/server'
import { AITaskModal } from '../AITaskModal'
import type { Suggestion, Column } from '../../../../types'

const suggestions: Suggestion[] = [
  { name: 'Set up CI', description: 'Configure GitHub Actions', priority: 'high' },
  { name: 'Write README', description: 'Add setup instructions', priority: 'low' },
]

const columns: Column[] = [
  { id: 1, name: 'To Do', position: 0, tasks: [] },
  { id: 2, name: 'In Progress', position: 1, tasks: [] },
  { id: 3, name: 'Done', position: 2, tasks: [] },
]

const defaultProps = {
  suggestions,
  columns,
  projectId: '1',
  onTasksAdded: vi.fn(),
  onClose: vi.fn(),
}

describe('AITaskModal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders suggested tasks with checkboxes, all checked by default', () => {
    renderWithProviders(<AITaskModal {...defaultProps} />)
    expect(screen.getByText('Suggested Tasks')).toBeInTheDocument()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })

  it('shows editable fields with correct defaults', () => {
    renderWithProviders(<AITaskModal {...defaultProps} />)
    expect(screen.getByDisplayValue('Set up CI')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Configure GitHub Actions')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Write README')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Add setup instructions')).toBeInTheDocument()
    // Priority dropdowns show AI-suggested values
    const prioritySelects = screen.getAllByDisplayValue('High')
    expect(prioritySelects.length).toBeGreaterThanOrEqual(1)
    // Column dropdowns default to first column
    const columnSelects = screen.getAllByDisplayValue('To Do')
    expect(columnSelects).toHaveLength(2)
  })

  it('allows unchecking tasks and editing fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AITaskModal {...defaultProps} />)
    // Uncheck first task
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    expect(checkboxes[0]).not.toBeChecked()
    // Edit second task name
    const nameInput = screen.getByDisplayValue('Write README')
    await user.clear(nameInput)
    await user.type(nameInput, 'Write docs')
    expect(nameInput).toHaveValue('Write docs')
  })

  it('disables Add to Board when no tasks are selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AITaskModal {...defaultProps} />)
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])
    expect(screen.getByRole('button', { name: /add.*to board/i })).toBeDisabled()
  })

  it('sends only selected tasks with edited values to batch API', async () => {
    const onTasksAdded = vi.fn()
    const user = userEvent.setup()
    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.post('/api/projects/:projectId/tasks/batch', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
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
      <AITaskModal {...defaultProps} onTasksAdded={onTasksAdded} />,
    )
    // Uncheck second task
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1])
    // Click Add to Board
    await user.click(screen.getByRole('button', { name: /add.*to board/i }))
    await waitFor(() => {
      expect(capturedBody).not.toBeNull()
    })
    const tasks = (capturedBody as Record<string, unknown>).tasks as Array<Record<string, unknown>>
    expect(tasks).toHaveLength(1)
    expect(tasks[0].name).toBe('Set up CI')
    expect(tasks[0].column_id).toBe(1)
  })

  it('shows loading state on Add to Board button', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/projects/:projectId/tasks/batch', async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ tasks: [] }, { status: 201 })
      }),
    )
    renderWithProviders(<AITaskModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /add.*to board/i }))
    expect(screen.getByText('Adding...')).toBeInTheDocument()
  })

  it('shows success message then closes after batch create', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onClose = vi.fn()
    const onTasksAdded = vi.fn()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    server.use(
      http.post('/api/projects/:projectId/tasks/batch', () => {
        return HttpResponse.json(
          {
            tasks: [
              { id: 1, name: 'Set up CI', description: 'Configure GitHub Actions', priority: 'high', position: 0, column_id: 1, creator_id: 1, is_ai_generated: true, version: 1, created_at: '2026-03-25T00:00:00Z' },
              { id: 2, name: 'Write README', description: 'Add setup instructions', priority: 'low', position: 1, column_id: 1, creator_id: 1, is_ai_generated: true, version: 1, created_at: '2026-03-25T00:00:00Z' },
            ],
          },
          { status: 201 },
        )
      }),
    )
    renderWithProviders(
      <AITaskModal {...defaultProps} onClose={onClose} onTasksAdded={onTasksAdded} />,
    )
    await user.click(screen.getByRole('button', { name: /add.*to board/i }))
    await waitFor(() => {
      expect(screen.getByText('2 tasks added to the board!')).toBeInTheDocument()
    })
    expect(onTasksAdded).toHaveBeenCalled()
    vi.advanceTimersByTime(1500)
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
    vi.useRealTimers()
  })

  it('shows error when batch create fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/projects/:projectId/tasks/batch', () => {
        return HttpResponse.json(
          { tasks: ['At least one task is required.'] },
          { status: 400 },
        )
      }),
    )
    renderWithProviders(<AITaskModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /add.*to board/i }))
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /add.*to board/i })).toBeEnabled()
  })

  it('shows empty state with Close button when no suggestions', () => {
    renderWithProviders(
      <AITaskModal {...defaultProps} suggestions={[]} />,
    )
    expect(screen.getByText('No tasks found in the recent discussion.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add.*to board/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <AITaskModal {...defaultProps} onClose={onClose} />,
    )
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
