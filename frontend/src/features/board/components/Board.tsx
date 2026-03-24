import { useState } from 'react'
import type { Task, Column } from '../../../types'
import { BoardColumn } from './BoardColumn'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailsModal } from './TaskDetailsModal'
import { AddColumnModal } from './AddColumnModal'

interface BoardProps {
  columns: Column[]
  projectId: string
  onColumnsChange: (columns: Column[]) => void
}

export function Board({ columns, projectId, onColumnsChange }: BoardProps) {
  const [createTaskColumnId, setCreateTaskColumnId] = useState<number | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showAddColumn, setShowAddColumn] = useState(false)

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
    <div className="flex gap-4 overflow-x-auto p-4">
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
        className="flex h-fit w-72 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border-medium py-8 text-sm font-medium text-text-tertiary hover:border-primary-500 hover:text-primary-500 transition-colors"
      >
        + Add Column
      </button>

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
    </div>
  )
}
