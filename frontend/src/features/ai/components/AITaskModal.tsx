import { useState } from 'react'
import { Modal } from '../../../shared/Modal'
import { api } from '../../../lib/api'
import type { Suggestion, Column, Task } from '../../../types'

interface EditableSuggestion extends Suggestion {
  selected: boolean
  column_id: number
}

interface AITaskModalProps {
  suggestions: Suggestion[]
  columns: Column[]
  projectId: string
  onTasksAdded: (tasks: Task[]) => void
  onClose: () => void
}

export function AITaskModal({ suggestions, columns, projectId, onTasksAdded, onClose }: AITaskModalProps) {
  const defaultColumnId = columns[0]?.id ?? 0
  const [tasks, setTasks] = useState<EditableSuggestion[]>(
    suggestions.map((s) => ({ ...s, selected: true, column_id: defaultColumnId })),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  const selectedCount = tasks.filter((t) => t.selected).length

  function updateTask(index: number, updates: Partial<EditableSuggestion>) {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, ...updates } : t)))
  }

  async function handleSubmit() {
    if (submitting || selectedCount === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const selected = tasks.filter((t) => t.selected)
      const data = await api.post<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks/batch`, {
        tasks: selected.map((t) => ({
          name: t.name,
          description: t.description,
          priority: t.priority,
          column_id: t.column_id,
        })),
      })
      onTasksAdded(data.tasks)
      setSuccessCount(data.tasks.length)
      setTimeout(() => onClose(), 1500)
    } catch {
      setError('Failed to add tasks. Please try again.')
      setSubmitting(false)
    }
  }

  if (suggestions.length === 0) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Suggested Tasks">
        <p className="text-sm text-text-secondary">No tasks found in the recent discussion.</p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Suggested Tasks">
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {tasks.map((task, i) => (
          <div key={i} className="flex gap-2 rounded-lg border border-border-light p-3">
            <input
              type="checkbox"
              checked={task.selected}
              onChange={(e) => updateTask(i, { selected: e.target.checked })}
              className="mt-1 shrink-0"
            />
            <div className="flex-1 space-y-2">
              <input
                value={task.name}
                onChange={(e) => updateTask(i, { name: e.target.value })}
                className="w-full rounded border border-border-medium px-2 py-1 text-sm"
              />
              <input
                value={task.description}
                onChange={(e) => updateTask(i, { description: e.target.value })}
                className="w-full rounded border border-border-medium px-2 py-1 text-sm text-text-secondary"
              />
              <div className="flex gap-2">
                <select
                  value={task.priority}
                  onChange={(e) => updateTask(i, { priority: e.target.value as Suggestion['priority'] })}
                  className="rounded border border-border-medium px-2 py-1 text-xs"
                >
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
                <select
                  value={task.column_id}
                  onChange={(e) => updateTask(i, { column_id: Number(e.target.value) })}
                  className="rounded border border-border-medium px-2 py-1 text-xs"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {successCount !== null && (
        <p className="mt-3 text-sm font-medium text-success-500">{successCount} tasks added!</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-error-500">{error}</p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={selectedCount === 0 || submitting || successCount !== null}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Adding...' : 'Add to Board'}
        </button>
      </div>
    </Modal>
  )
}
