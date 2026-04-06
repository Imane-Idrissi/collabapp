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

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-error-50 text-error-600 border-error-200',
  medium: 'bg-warning-50 text-warning-700 border-warning-200',
  low: 'bg-primary-50 text-primary-600 border-primary-200',
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
      <Modal isOpen={true} onClose={onClose} title="Suggested Tasks" size="lg">
        <p className="text-sm text-text-secondary">No tasks found in the recent discussion.</p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Suggested Tasks" size="lg">
      {/* Header info */}
      <p className="mb-4 text-sm text-text-tertiary">
        {tasks.length} tasks extracted from your conversation. Deselect, edit, or change columns before adding.
      </p>

      {/* Task list */}
      <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {tasks.map((task, i) => (
          <div
            key={i}
            className={`rounded-xl border-2 p-4 transition-all duration-150 ${
              task.selected
                ? 'border-primary-200 bg-white shadow-subtle'
                : 'border-border-light bg-surface-elevated/50 opacity-60'
            }`}
          >
            {/* Top row: checkbox + name */}
            <div className="flex items-start gap-3">
              <label className="relative mt-0.5 flex shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.selected}
                  onChange={(e) => updateTask(i, { selected: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-border-medium transition-colors peer-checked:border-primary-500 peer-checked:bg-primary-500">
                  {task.selected && (
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
              </label>
              <input
                value={task.name}
                onChange={(e) => updateTask(i, { name: e.target.value })}
                className="min-w-0 flex-1 border-none bg-transparent text-sm font-semibold text-text-primary outline-none placeholder:text-text-placeholder focus:ring-0"
                placeholder="Task name"
              />
            </div>

            {/* Description */}
            {task.selected && (
              <div className="mt-2 pl-8">
                <textarea
                  value={task.description}
                  onChange={(e) => updateTask(i, { description: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border-light bg-surface-elevated/50 px-3 py-2 text-xs text-text-secondary outline-none focus:border-primary-300 focus:bg-white transition-colors"
                  placeholder="Description (optional)"
                />

                {/* Priority + Column */}
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={task.priority}
                    onChange={(e) => updateTask(i, { priority: e.target.value as Suggestion['priority'] })}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium outline-none ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low}`}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <svg className="h-3 w-3 text-text-placeholder" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  <select
                    value={task.column_id}
                    onChange={(e) => updateTask(i, { column_id: Number(e.target.value) })}
                    className="rounded-full border border-border-medium bg-white px-2.5 py-0.5 text-xs font-medium text-text-secondary outline-none"
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Success message */}
      {successCount !== null && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2">
          <svg className="h-4 w-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span className="text-sm font-medium text-success-700">{successCount} tasks added to the board!</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2">
          <svg className="h-4 w-4 shrink-0 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-sm text-error-700">{error}</span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border-light pt-4">
        <span className="text-xs text-text-tertiary">
          {selectedCount} of {tasks.length} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedCount === 0 || submitting || successCount !== null}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Adding...' : `Add ${selectedCount} to Board`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
