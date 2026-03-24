import { useState, type FormEvent } from 'react'
import { Modal } from '../../../shared/Modal'
import { api } from '../../../lib/api'
import type { ApiError } from '../../../types'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (project: { id: number; name: string; description: string }) => void
}

export function CreateProjectModal({ isOpen, onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})

    if (!name.trim()) {
      setErrors({ name: 'Project name is required' })
      return
    }

    setIsSubmitting(true)
    try {
      const project = await api.post<{ id: number; name: string; description: string }>('/api/projects', { name, description })
      onCreated(project)
      setName('')
      setDescription('')
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: ApiError }
      if (apiErr.status === 400 && apiErr.data) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(apiErr.data)) {
          fieldErrors[field] = messages[0]
        }
        setErrors(fieldErrors)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="project-name" className="mb-1 block text-sm font-medium text-text-secondary">Name</label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:shadow-focus"
            placeholder="Project name"
          />
          {errors.name && <p className="mt-1 text-sm text-error-500">{errors.name}</p>}
        </div>

        <div className="mb-6">
          <label htmlFor="project-description" className="mb-1 block text-sm font-medium text-text-secondary">Description</label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:shadow-focus resize-none"
            placeholder="What's this project about? (optional)"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
