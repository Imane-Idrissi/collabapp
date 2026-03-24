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
      className="w-full text-left rounded-xl bg-white p-5 shadow-soft hover:shadow-medium transition-shadow border border-border-light"
    >
      <h3 className="text-base font-semibold text-text-primary">{project.name}</h3>
      {project.description && (
        <p className="mt-1 text-sm text-text-secondary line-clamp-2">{project.description}</p>
      )}
      <p className="mt-3 text-xs text-text-tertiary">
        {project.member_count} {project.member_count === 1 ? 'member' : 'members'}
      </p>
    </button>
  )
}
