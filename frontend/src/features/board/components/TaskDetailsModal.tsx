import { useState, type FormEvent } from 'react'
import { Modal } from '../../../shared/Modal'
import { api } from '../../../lib/api'
import type { Task, ApiError } from '../../../types'

interface TaskDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  task: Task
  onUpdated: (task: Task) => void
  onDeleted: (taskId: number) => void
}

export function TaskDetailsModal({ isOpen, onClose, projectId, task, onUpdated, onDeleted }: TaskDetailsModalProps) {
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description)
  const [priority, setPriority] = useState<string>(task.priority || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    setGeneralError('')

    if (!name.trim()) {
      setErrors({ name: 'Task name is required' })
      return
    }

    setIsSubmitting(true)
    try {
      const updated = await api.patch<Task>(`/api/projects/${projectId}/tasks/${task.id}`, {
        name, description, priority, version: task.version,
      })
      onUpdated(updated)
      onClose()
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: { detail?: string } & ApiError }
      if (apiErr.status === 409) {
        setGeneralError('Someone else edited this task. Reload to see the latest version.')
      } else if (apiErr.status === 400 && apiErr.data) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(apiErr.data)) {
          if (Array.isArray(messages)) fieldErrors[field] = messages[0]
        }
        setErrors(fieldErrors)
      } else {
        setGeneralError('Something went wrong.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/api/projects/${projectId}/tasks/${task.id}`)
      onDeleted(task.id)
      onClose()
    } catch {
      setGeneralError('Failed to delete task.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Details">
      {generalError && (
        <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600" role="alert">{generalError}</div>
      )}

      <form onSubmit={handleSave} noValidate>
        <div className="mb-4">
          <label htmlFor="detail-name" className="mb-1 block text-sm font-medium text-text-secondary">Name</label>
          <input
            id="detail-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus"
          />
          {errors.name && <p className="mt-1 text-sm text-error-500">{errors.name}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="detail-description" className="mb-1 block text-sm font-medium text-text-secondary">Description</label>
          <textarea
            id="detail-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus resize-none"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="detail-priority" className="mb-1 block text-sm font-medium text-text-secondary">Priority</label>
          <select
            id="detail-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus"
          >
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Delete this task?</span>
              <button type="button" onClick={handleDelete} className="rounded-lg bg-error-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-error-600">Yes, delete</button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-border-medium px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-elevated">Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-sm font-medium text-error-500 hover:text-error-600">Delete</button>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
