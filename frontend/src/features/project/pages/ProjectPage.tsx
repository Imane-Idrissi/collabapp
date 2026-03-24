import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../../lib/api'
import { Board } from '../../board/components/Board'
import { EditProjectModal } from '../components/EditProjectModal'
import { InviteMembersModal } from '../components/InviteMembersModal'
import { LoadingSpinner } from '../../../shared/LoadingSpinner'
import type { Column } from '../../../types'

interface ProjectInfo {
  id: number
  name: string
  description: string
  member_count: number
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    async function load() {
      if (!projectId) return
      try {
        const [projects, board] = await Promise.all([
          api.get<ProjectInfo[]>('/api/projects'),
          api.get<{ columns: Column[] }>(`/api/projects/${projectId}/board`),
        ])
        const proj = projects.find((p) => p.id === Number(projectId))
        if (!proj) {
          navigate('/dashboard')
          return
        }
        setProject(proj)
        setColumns(board.columns)
      } catch {
        navigate('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId, navigate])

  if (isLoading || !project) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex h-screen flex-col bg-surface-app">
      {/* Top bar */}
      <header className="border-b border-border-light bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-sm text-text-tertiary hover:text-text-primary">&larr; Back</button>
            <button onClick={() => setShowEditModal(true)} className="text-lg font-semibold text-text-primary hover:text-primary-500">
              {project.name}
            </button>
            <span className="text-sm text-text-tertiary">{project.member_count} {project.member_count === 1 ? 'member' : 'members'}</span>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
          >
            Invite Members
          </button>
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: chat placeholder */}
        <div className="flex w-80 flex-shrink-0 items-center justify-center border-r border-border-light bg-surface-card">
          <p className="text-sm text-text-placeholder">Chat coming in Phase F5</p>
        </div>

        {/* Right panel: board */}
        <div className="flex-1 overflow-x-auto">
          <Board columns={columns} projectId={projectId!} onColumnsChange={setColumns} />
        </div>
      </div>

      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        projectId={projectId!}
        currentName={project.name}
        currentDescription={project.description}
        onUpdated={(updated) => setProject({ ...project, ...updated })}
      />

      <InviteMembersModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={projectId!}
      />
    </div>
  )
}
