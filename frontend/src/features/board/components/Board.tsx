import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { Task, Column } from '../../../types'
import { BoardColumn } from './BoardColumn'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailsModal } from './TaskDetailsModal'
import { AddColumnModal } from './AddColumnModal'
import { TaskCardOverlay } from './TaskCard'
import { api } from '../../../lib/api'

interface BoardProps {
  columns: Column[]
  projectId: string
  onColumnsChange: (columns: Column[]) => void
}

export function Board({ columns, projectId, onColumnsChange }: BoardProps) {
  const [createTaskColumnId, setCreateTaskColumnId] = useState<number | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [dndError, setDndError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  function findTaskColumn(taskId: number): Column | undefined {
    return columns.find((col) => col.tasks.some((t) => t.id === taskId))
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined
    if (task) setActiveTask(task)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null)
      const { active, over } = event
      if (!over) return

      const taskId = active.id as number
      const sourceCol = findTaskColumn(taskId)
      if (!sourceCol) return

      const task = sourceCol.tasks.find((t) => t.id === taskId)
      if (!task) return

      // Determine target column
      let targetCol: Column | undefined
      let targetPosition: number

      if (String(over.id).startsWith('column-')) {
        // Dropped on column droppable (empty area)
        const colId = Number(String(over.id).replace('column-', ''))
        targetCol = columns.find((c) => c.id === colId)
        targetPosition = targetCol ? targetCol.tasks.filter((t) => t.id !== taskId).length : 0
      } else {
        // Dropped on another task
        const overTaskId = over.id as number
        targetCol = findTaskColumn(overTaskId)
        if (targetCol) {
          const tasksWithoutActive = targetCol.tasks.filter((t) => t.id !== taskId)
          const overIndex = tasksWithoutActive.findIndex((t) => t.id === overTaskId)
          targetPosition = overIndex >= 0 ? overIndex : tasksWithoutActive.length
        } else {
          return
        }
      }

      if (!targetCol) return

      // No-op: same position
      if (sourceCol.id === targetCol.id) {
        const currentIndex = sourceCol.tasks.findIndex((t) => t.id === taskId)
        if (currentIndex === targetPosition) return
      }

      // Optimistic update
      const prevColumns = columns
      const newColumns = columns.map((col) => {
        if (col.id === sourceCol.id && col.id === targetCol!.id) {
          // Reorder within same column
          const tasks = col.tasks.filter((t) => t.id !== taskId)
          tasks.splice(targetPosition, 0, task)
          return { ...col, tasks: tasks.map((t, i) => ({ ...t, position: i })) }
        }
        if (col.id === sourceCol.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId).map((t, i) => ({ ...t, position: i })) }
        }
        if (col.id === targetCol!.id) {
          const tasks = [...col.tasks]
          tasks.splice(targetPosition, 0, { ...task, column_id: targetCol!.id })
          return { ...col, tasks: tasks.map((t, i) => ({ ...t, position: i })) }
        }
        return col
      })
      onColumnsChange(newColumns)

      // API call
      const patchBody: Record<string, unknown> = { position: targetPosition, version: task.version }
      if (sourceCol.id !== targetCol.id) {
        patchBody.column_id = targetCol.id
      }

      try {
        const updated = await api.patch<Task>(`/api/projects/${projectId}/tasks/${taskId}`, patchBody)
        // Update version from response
        const versionUpdated = newColumns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === updated.id ? { ...t, version: updated.version } : t)),
        }))
        onColumnsChange(versionUpdated)
      } catch (err: unknown) {
        // Revert on error
        onColumnsChange(prevColumns)
        const apiErr = err as { status?: number; data?: { detail?: string } }
        if (apiErr.status === 409) {
          setDndError(apiErr.data?.detail || 'Version conflict. Please reload.')
        } else {
          setDndError('Failed to move task. Please try again.')
        }
        setTimeout(() => setDndError(''), 4000)
      }
    },
    [columns, projectId, onColumnsChange],
  )

  function handleTaskCreated(task: Task) {
    const updated = columns.map((col) =>
      col.id === task.column_id ? { ...col, tasks: [...col.tasks, task] } : col,
    )
    onColumnsChange(updated)
  }

  function handleTaskUpdated(updatedTask: Task) {
    const updated = columns.map((col) => ({
      ...col,
      tasks: col.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
    }))
    onColumnsChange(updated)
  }

  function handleTaskDeleted(taskId: number) {
    const updated = columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.id !== taskId),
    }))
    onColumnsChange(updated)
  }

  function handleColumnCreated(column: Column) {
    onColumnsChange([...columns, column])
  }

  function handleColumnRenamed(renamedCol: Column) {
    const updated = columns.map((col) => (col.id === renamedCol.id ? { ...col, name: renamedCol.name } : col))
    onColumnsChange(updated)
  }

  function handleColumnDeleted(columnId: number) {
    onColumnsChange(columns.filter((col) => col.id !== columnId))
  }

  return (
    <>
      {dndError && (
        <div className="mx-6 mt-3 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm font-medium text-error-600">
          {dndError}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto p-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {columns
            .sort((a, b) => a.position - b.position)
            .map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                projectId={projectId}
                onTaskClick={setSelectedTask}
                onAddTask={setCreateTaskColumnId}
                onColumnRenamed={handleColumnRenamed}
                onColumnDeleted={handleColumnDeleted}
              />
            ))}

          <button
            onClick={() => setShowAddColumn(true)}
            className="flex h-fit w-80 min-w-[320px] flex-shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-border-strong py-10 text-sm text-text-tertiary transition-all duration-200 hover:border-primary-400 hover:text-primary-700 hover:-translate-y-px hover:shadow-medium"
            style={{ background: 'linear-gradient(135deg, hsl(220,20%,98.5%) 0%, white 100%)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, hsl(172,33%,97%) 0%, hsl(172,30%,92%) 100%)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, hsl(220,20%,98.5%) 0%, white 100%)' }}
          >
            + Add Column
          </button>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {createTaskColumnId !== null && (
        <CreateTaskModal
          isOpen={true}
          onClose={() => setCreateTaskColumnId(null)}
          projectId={projectId}
          columnId={createTaskColumnId}
          onCreated={handleTaskCreated}
        />
      )}

      {selectedTask && (
        <TaskDetailsModal
          isOpen={true}
          onClose={() => setSelectedTask(null)}
          projectId={projectId}
          task={selectedTask}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}

      <AddColumnModal
        isOpen={showAddColumn}
        onClose={() => setShowAddColumn(false)}
        projectId={projectId}
        onCreated={handleColumnCreated}
      />
    </>
  )
}
