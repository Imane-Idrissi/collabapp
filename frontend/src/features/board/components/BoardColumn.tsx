import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task, Column } from '../../../types'
import { TaskCard } from './TaskCard'
import { api } from '../../../lib/api'

interface BoardColumnProps {
  column: Column
  projectId: string
  onTaskClick: (task: Task) => void
  onAddTask: (columnId: number) => void
  onColumnRenamed: (column: Column) => void
  onColumnDeleted: (columnId: number) => void
}

export function BoardColumn({ column, projectId, onTaskClick, onAddTask, onColumnRenamed, onColumnDeleted }: BoardColumnProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(column.name)
  const [deleteError, setDeleteError] = useState('')

  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: { column },
  })

  const taskIds = column.tasks.map((t) => t.id)

  async function handleRename() {
    if (!editName.trim() || editName === column.name) {
      setIsEditing(false)
      setEditName(column.name)
      return
    }
    try {
      const updated = await api.patch<Column>(`/api/projects/${projectId}/columns/${column.id}`, { name: editName })
      onColumnRenamed({ ...column, name: updated.name })
    } catch {
      setEditName(column.name)
    }
    setIsEditing(false)
  }

  async function handleDelete() {
    setDeleteError('')
    try {
      await api.delete(`/api/projects/${projectId}/columns/${column.id}`)
      onColumnDeleted(column.id)
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: { detail?: string } }
      if (apiErr.status === 400 && apiErr.data?.detail) {
        setDeleteError(apiErr.data.detail)
      } else {
        setDeleteError('Failed to delete column.')
      }
    }
  }

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-surface-card p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        {isEditing ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename() }}
            className="flex-1 rounded border border-primary-500 px-2 py-1 text-sm font-semibold outline-none"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm font-semibold text-text-primary hover:text-primary-500"
            title="Click to rename"
          >
            {column.name}
          </button>
        )}
        <button
          onClick={handleDelete}
          className="ml-2 rounded p-1 text-text-tertiary hover:bg-surface-elevated hover:text-error-500"
          title="Delete column"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {deleteError && (
        <p className="mb-2 text-xs text-error-500">{deleteError}</p>
      )}

      {/* Tasks */}
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 overflow-y-auto min-h-[40px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>

      {/* Add task */}
      <button
        onClick={() => onAddTask(column.id)}
        className="mt-3 rounded-lg border border-dashed border-border-medium py-2 text-sm text-text-tertiary hover:border-primary-500 hover:text-primary-500 transition-colors"
      >
        + Add Task
      </button>
    </div>
  )
}
