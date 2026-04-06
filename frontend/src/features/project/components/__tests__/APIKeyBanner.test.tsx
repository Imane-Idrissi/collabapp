import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../../test/mocks/server'
import { APIKeyBanner } from '../APIKeyBanner'

describe('APIKeyBanner', () => {
  it('renders prompt when no key is set', () => {
    render(<APIKeyBanner projectId="1" hasApiKey={false} maskedApiKey="" onKeySet={vi.fn()} />)
    expect(screen.getByText('To use AI task extraction, add your Gemini API key.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add API key' })).toBeInTheDocument()
  })

  it('shows input form when Add API key is clicked', async () => {
    const user = userEvent.setup()
    render(<APIKeyBanner projectId="1" hasApiKey={false} maskedApiKey="" onKeySet={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Add API key' }))
    expect(screen.getByPlaceholderText('Paste your Gemini API key')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('saves key and calls onKeySet', async () => {
    const onKeySet = vi.fn()
    const user = userEvent.setup()
    render(<APIKeyBanner projectId="1" hasApiKey={false} maskedApiKey="" onKeySet={onKeySet} />)
    await user.click(screen.getByRole('button', { name: 'Add API key' }))
    await user.type(screen.getByPlaceholderText('Paste your Gemini API key'), 'AIzaSyD-test-ABCD')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(onKeySet).toHaveBeenCalledWith(true, '····ABCD')
    })
  })

  it('renders compact button with masked key when key exists', () => {
    render(<APIKeyBanner projectId="1" hasApiKey={true} maskedApiKey="····ABCD" onKeySet={vi.fn()} />)
    expect(screen.getByText('····ABCD')).toBeInTheDocument()
    expect(screen.getByTitle('Manage Gemini API key')).toBeInTheDocument()
  })

  it('shows dropdown with change and remove on click', async () => {
    const user = userEvent.setup()
    render(<APIKeyBanner projectId="1" hasApiKey={true} maskedApiKey="····ABCD" onKeySet={vi.fn()} />)
    await user.click(screen.getByTitle('Manage Gemini API key'))
    expect(screen.getByPlaceholderText('Paste new API key')).toBeInTheDocument()
    expect(screen.getByText('Remove key')).toBeInTheDocument()
  })

  it('saves new key from dropdown and calls onKeySet', async () => {
    const onKeySet = vi.fn()
    const user = userEvent.setup()
    render(<APIKeyBanner projectId="1" hasApiKey={true} maskedApiKey="····ABCD" onKeySet={onKeySet} />)
    await user.click(screen.getByTitle('Manage Gemini API key'))
    await user.type(screen.getByPlaceholderText('Paste new API key'), 'new-key-WXYZ')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(onKeySet).toHaveBeenCalledWith(true, '····WXYZ')
    })
  })

  it('removes key and calls onKeySet', async () => {
    const onKeySet = vi.fn()
    const user = userEvent.setup()
    render(<APIKeyBanner projectId="1" hasApiKey={true} maskedApiKey="····ABCD" onKeySet={onKeySet} />)
    await user.click(screen.getByTitle('Manage Gemini API key'))
    await user.click(screen.getByText('Remove key'))
    await waitFor(() => {
      expect(onKeySet).toHaveBeenCalledWith(false, '')
    })
  })

  it('shows error on save failure', async () => {
    server.use(
      http.put('/api/projects/:projectId/api-key', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    render(<APIKeyBanner projectId="1" hasApiKey={false} maskedApiKey="" onKeySet={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Add API key' }))
    await user.type(screen.getByPlaceholderText('Paste your Gemini API key'), 'some-key')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(screen.getByText('Failed to save API key.')).toBeInTheDocument()
    })
  })

  it('shows error on remove failure', async () => {
    server.use(
      http.delete('/api/projects/:projectId/api-key', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    render(<APIKeyBanner projectId="1" hasApiKey={true} maskedApiKey="····ABCD" onKeySet={vi.fn()} />)
    await user.click(screen.getByTitle('Manage Gemini API key'))
    await user.click(screen.getByText('Remove key'))
    await waitFor(() => {
      expect(screen.getByText('Failed to remove API key.')).toBeInTheDocument()
    })
  })
})
