import type { Task } from '../../../types'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

const priorityStyles = {
  low: 'bg-success-50 text-success-700',
  medium: 'bg-warning-50 text-warning-700',
  high: 'bg-error-50 text-error-700',
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg bg-white p-3 shadow-subtle hover:shadow-soft transition-shadow border border-border-light"
    >
      <p className="text-sm font-medium text-text-primary line-clamp-2">{task.name}</p>
      {task.description && (
        <p className="mt-1 text-xs text-text-tertiary line-clamp-2">{task.description}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {task.priority && (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${priorityStyles[task.priority] || ''}`}>
            {task.priority}
          </span>
        )}
        {task.is_ai_generated && (
          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700">
            AI
          </span>
        )}
      </div>
    </button>
  )
}
