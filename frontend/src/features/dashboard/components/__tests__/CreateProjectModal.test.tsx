import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../test/mocks/server'
import { render } from '@testing-library/react'
import { CreateProjectModal } from '../CreateProjectModal'

describe('CreateProjectModal', () => {
  it('renders form when open', () => {
    render(<CreateProjectModal isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />)
    expect(screen.getByText('New Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument()
  })

  it('shows error for empty name', async () => {
    const user = userEvent.setup()
    render(<CreateProjectModal isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Create Project' }))
    expect(screen.getByText('Project name is required')).toBeInTheDocument()
  })

  it('calls onCreated with new project on success', async () => {
    const onCreated = vi.fn()
    const user = userEvent.setup()
    render(<CreateProjectModal isOpen={true} onClose={vi.fn()} onCreated={onCreated} />)
    await user.type(screen.getByLabelText('Name'), 'My Project')
    await user.click(screen.getByRole('button', { name: 'Create Project' }))
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ name: 'My Project' }))
    })
  })

  it('shows API field errors', async () => {
    server.use(
      http.post('/api/projects/', () =>
        HttpResponse.json({ name: ['Name too long.'] }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    render(<CreateProjectModal isOpen={true} onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.type(screen.getByLabelText('Name'), 'Test')
    await user.click(screen.getByRole('button', { name: 'Create Project' }))
    await waitFor(() => {
      expect(screen.getByText('Name too long.')).toBeInTheDocument()
    })
  })
})
