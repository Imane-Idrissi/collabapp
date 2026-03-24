import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../test/mocks/server'
import { renderWithProviders } from '../../../../test/test-utils'
import { Board } from '../Board'
import type { Column } from '../../../../types'

const mockColumns: Column[] = [
  {
    id: 1, name: 'To Do', position: 0,
    tasks: [
      { id: 1, name: 'Setup project', description: 'Init repo', priority: 'high', position: 0, column_id: 1, creator_id: 1, is_ai_generated: false, version: 1, assignees: [], created_at: '2026-03-20T00:00:00Z' },
      { id: 2, name: 'AI task', description: '', priority: 'medium', position: 1, column_id: 1, creator_id: 1, is_ai_generated: true, version: 1, assignees: [], created_at: '2026-03-20T00:00:00Z' },
    ],
  },
  { id: 2, name: 'Done', position: 1, tasks: [] },
]

describe('Board', () => {
  it('renders columns and tasks', () => {
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={vi.fn()} />)
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Setup project')).toBeInTheDocument()
    expect(screen.getByText('AI task')).toBeInTheDocument()
  })

  it('shows priority badge on task', () => {
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={vi.fn()} />)
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('shows AI badge on AI-generated task', () => {
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={vi.fn()} />)
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('opens create task modal on + Add Task click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={vi.fn()} />)
    const addButtons = screen.getAllByText('+ Add Task')
    await user.click(addButtons[0])
    expect(screen.getByText('New Task')).toBeInTheDocument()
  })

  it('opens task details modal on task click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={vi.fn()} />)
    await user.click(screen.getByText('Setup project'))
    expect(screen.getByText('Task Details')).toBeInTheDocument()
  })

  it('opens add column modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={vi.fn()} />)
    await user.click(screen.getByText('+ Add Column'))
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('creates a task and updates columns', async () => {
    const onColumnsChange = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={onColumnsChange} />)
    const addButtons = screen.getAllByText('+ Add Task')
    await user.click(addButtons[0])
    await user.type(screen.getByLabelText('Name'), 'New task')
    await user.click(screen.getByRole('button', { name: 'Create Task' }))
    await waitFor(() => {
      expect(onColumnsChange).toHaveBeenCalled()
    })
  })

  it('shows version conflict error on 409', async () => {
    server.use(
      http.patch('/api/projects/:projectId/tasks/:taskId', () =>
        HttpResponse.json({ detail: 'Someone else edited this task. Reload to see the latest version.' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={vi.fn()} />)
    await user.click(screen.getByText('Setup project'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(screen.getByText('Someone else edited this task. Reload to see the latest version.')).toBeInTheDocument()
    })
  })

  it('deletes a task', async () => {
    const onColumnsChange = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={onColumnsChange} />)
    await user.click(screen.getByText('Setup project'))
    await user.click(screen.getByText('Delete'))
    await user.click(screen.getByText('Yes, delete'))
    await waitFor(() => {
      expect(onColumnsChange).toHaveBeenCalled()
    })
  })

  it('shows error when deleting non-empty column', async () => {
    server.use(
      http.delete('/api/projects/:projectId/columns/:columnId', () =>
        HttpResponse.json({ detail: 'Column is not empty.' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<Board columns={mockColumns} projectId="1" onColumnsChange={vi.fn()} />)
    const deleteButtons = screen.getAllByTitle('Delete column')
    await user.click(deleteButtons[0])
    await waitFor(() => {
      expect(screen.getByText('Column is not empty.')).toBeInTheDocument()
    })
  })
})
