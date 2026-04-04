import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ProjectProvider, useProject } from '../context/ProjectContext'
import { Board } from '../../board/components/Board'
import { ChatPanel } from '../../chat/components/ChatPanel'
import { EditProjectModal } from '../components/EditProjectModal'
import { InviteMembersModal } from '../components/InviteMembersModal'
import { LoadingSpinner } from '../../../shared/LoadingSpinner'
import type { Message, Task } from '../../../types'

function ProjectPageInner() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { project, setProject, columns, setColumns, messages, setMessages, isLoading } = useProject()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const handleNewMessages = useCallback((older: Message[]) => {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id))
      const unique = older.filter((m) => !existingIds.has(m.id))
      return [...unique, ...prev]
    })
  }, [setMessages])

  const handleMessageSent = useCallback((message: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
  }, [setMessages])

  const handleTasksAdded = useCallback((tasks: Task[]) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: [...col.tasks, ...tasks.filter((t) => t.column_id === col.id)],
      })),
    )
  }, [setColumns])

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
        {/* Left panel: chat */}
        <div className="flex w-80 flex-shrink-0 flex-col border-r border-border-light bg-surface-card">
          <ChatPanel
            projectId={projectId!}
            messages={messages}
            columns={columns}
            onNewMessages={handleNewMessages}
            onMessageSent={handleMessageSent}
            onTasksAdded={handleTasksAdded}
          />
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
        onUpdated={(updated) => setProject((prev) => prev ? { ...prev, ...updated } : prev)}
      />

      <InviteMembersModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={projectId!}
      />
    </div>
  )
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()

  if (!projectId) return <LoadingSpinner />

  return (
    <ProjectProvider projectId={projectId}>
      <ProjectPageInner />
    </ProjectProvider>
  )
}
