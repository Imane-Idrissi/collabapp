import { useState, type FormEvent } from 'react'
import { Modal } from '../../../shared/Modal'
import { api } from '../../../lib/api'
import type { Task, ApiError } from '../../../types'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  columnId: number
  onCreated: (task: Task) => void
}

export function CreateTaskModal({ isOpen, onClose, projectId, columnId, onCreated }: CreateTaskModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})

    if (!name.trim()) {
      setErrors({ name: 'Task name is required' })
      return
    }

    setIsSubmitting(true)
    try {
      const task = await api.post<Task>(`/api/projects/${projectId}/tasks`, {
        name, description, priority, column_id: columnId,
      })
      onCreated(task)
      setName('')
      setDescription('')
      setPriority('')
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
    <Modal isOpen={isOpen} onClose={onClose} title="New Task">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="task-name" className="mb-1 block text-sm font-medium text-text-secondary">Name</label>
          <input
            id="task-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus"
            placeholder="Task name"
          />
          {errors.name && <p className="mt-1 text-sm text-error-500">{errors.name}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="task-description" className="mb-1 block text-sm font-medium text-text-secondary">Description</label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus resize-none"
            placeholder="Optional description"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="task-priority" className="mb-1 block text-sm font-medium text-text-secondary">Priority</label>
          <select
            id="task-priority"
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

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
