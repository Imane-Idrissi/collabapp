import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../../../types'

interface TaskCardProps {
  task: Task
  onClick: () => void
}

const priorityBadge = {
  low: 'bg-primary-50 text-primary-600 border border-primary-200',
  medium: 'bg-warning-50 text-warning-600 border border-warning-200',
  high: 'bg-error-50 text-error-600 border border-error-200',
}

const priorityBorderColor = {
  low: 'hsl(217, 91%, 60%)',
  medium: 'hsl(38, 92%, 50%)',
  high: 'hsl(0, 84%, 60%)',
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    borderLeft: `4px solid ${priorityBorderColor[task.priority] || 'hsl(220, 13%, 87%)'}`,
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="w-full cursor-pointer text-left rounded-xl border-2 border-border-medium bg-white p-6 shadow-subtle transition-all duration-200 hover:border-primary-300 hover:shadow-elevated hover:-translate-y-0.5"
    >
      <p className="text-sm font-semibold text-[#1a202c] leading-snug line-clamp-2">{task.name}</p>
      {task.description && (
        <p className="mt-2 text-[13px] text-[#6b7280] line-clamp-2 leading-relaxed">{task.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.priority && (
          <span className={`rounded-xl px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${priorityBadge[task.priority] || ''}`}>
            {task.priority}
          </span>
        )}
        {task.is_ai_generated && (
          <span className="rounded-xl border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
            AI
          </span>
        )}
      </div>
    </button>
  )
}

export function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div
      className="w-80 rounded-xl border-2 border-primary-300 bg-white p-6 shadow-floating rotate-2"
      style={{ borderLeft: `4px solid ${priorityBorderColor[task.priority] || 'hsl(220, 13%, 87%)'}` }}
    >
      <p className="text-sm font-semibold text-[#1a202c] line-clamp-2">{task.name}</p>
      {task.description && (
        <p className="mt-2 text-[13px] text-[#6b7280] line-clamp-2">{task.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.priority && (
          <span className={`rounded-xl px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${priorityBadge[task.priority] || ''}`}>
            {task.priority}
          </span>
        )}
        {task.is_ai_generated && (
          <span className="rounded-xl border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-purple-600">
            AI
          </span>
        )}
      </div>
    </div>
  )
}
