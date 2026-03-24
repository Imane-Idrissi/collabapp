import { useState, type FormEvent } from 'react'
import { Modal } from '../../../shared/Modal'
import { api } from '../../../lib/api'
import type { ApiError } from '../../../types'

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentName: string
  currentDescription: string
  onUpdated: (project: { name: string; description: string }) => void
}

export function EditProjectModal({ isOpen, onClose, projectId, currentName, currentDescription, onUpdated }: EditProjectModalProps) {
  const [name, setName] = useState(currentName)
  const [description, setDescription] = useState(currentDescription)
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
      const updated = await api.patch<{ name: string; description: string }>(`/api/projects/${projectId}`, { name, description })
      onUpdated(updated)
      onClose()
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
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Project">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="edit-name" className="mb-1 block text-sm font-medium text-text-secondary">Name</label>
          <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus" />
          {errors.name && <p className="mt-1 text-sm text-error-500">{errors.name}</p>}
        </div>
        <div className="mb-6">
          <label htmlFor="edit-description" className="mb-1 block text-sm font-medium text-text-secondary">Description</label>
          <textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus resize-none" />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
