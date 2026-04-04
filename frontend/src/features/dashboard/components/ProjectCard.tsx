import { useNavigate } from 'react-router-dom'

interface ProjectCardProps {
  project: {
    id: number
    name: string
    description: string
    member_count: number
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}`)}
      className="flex w-full items-center justify-between rounded-lg border-2 border-primary-100 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary-800 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-text-primary">{project.name}</h3>
        {project.description && (
          <p className="mt-1 text-sm text-text-secondary line-clamp-1">{project.description}</p>
        )}
      </div>
      <span className="ml-4 shrink-0 text-xs font-medium text-text-tertiary">
        {project.member_count} {project.member_count === 1 ? 'member' : 'members'}
      </span>
    </button>
  )
}
