import { useState, type FormEvent } from 'react'
import { Modal } from '../../../shared/Modal'
import { api } from '../../../lib/api'
import type { Column, ApiError } from '../../../types'

interface AddColumnModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onCreated: (column: Column) => void
}

export function AddColumnModal({ isOpen, onClose, projectId, onCreated }: AddColumnModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Column name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const col = await api.post<Column>(`/api/projects/${projectId}/columns`, { name })
      onCreated({ ...col, tasks: [] })
      setName('')
      onClose()
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: ApiError }
      if (apiErr.status === 400 && apiErr.data) {
        const firstMsg = Object.values(apiErr.data)[0]
        setError(Array.isArray(firstMsg) ? firstMsg[0] : String(firstMsg))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Column">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <label htmlFor="column-name" className="mb-1 block text-sm font-medium text-text-secondary">Name</label>
          <input
            id="column-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus"
            placeholder="Column name"
          />
          {error && <p className="mt-1 text-sm text-error-500">{error}</p>}
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {isSubmitting ? 'Adding...' : 'Add Column'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
