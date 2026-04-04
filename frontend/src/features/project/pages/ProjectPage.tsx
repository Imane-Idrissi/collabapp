import { useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ProjectProvider, useProject } from '../context/ProjectContext'
import { Board } from '../../board/components/Board'
import { ChatPanel } from '../../chat/components/ChatPanel'
import { EditProjectModal } from '../components/EditProjectModal'
import { InviteMembersModal } from '../components/InviteMembersModal'
import { Avatar } from '../../../shared/Avatar'
import { LoadingSpinner } from '../../../shared/LoadingSpinner'
import type { Message, Task } from '../../../types'

function ProjectPageInner() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { project, setProject, columns, setColumns, messages, setMessages, members, isLoading } = useProject()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [chatWidth, setChatWidth] = useState(320)
  const isResizing = useRef(false)

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

  function handleResizeStart() {
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function onMouseMove(e: MouseEvent) {
      if (!isResizing.current) return
      const newWidth = Math.min(Math.max(e.clientX, 280), 600)
      setChatWidth(newWidth)
    }

    function onMouseUp() {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  if (isLoading || !project) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex h-screen flex-col bg-[hsl(60,100%,99%)]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border-medium bg-white/95 px-6 py-3 shadow-soft backdrop-blur-[12px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-all duration-150"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
            <div className="h-5 w-px bg-border-medium" />
            <button onClick={() => setShowEditModal(true)} className="text-lg font-semibold text-text-primary hover:text-primary-500 transition-colors duration-150">
              {project.name}
            </button>
            <div className="flex items-center gap-0.5">
              <div className="flex -space-x-2">
                {members.slice(0, 5).map((m) => (
                  <Avatar key={m.id} name={m.name} color={m.avatar_color} size="sm" />
                ))}
              </div>
              {members.length > 5 && (
                <span className="ml-1 text-sm font-medium text-text-tertiary">+{members.length - 5}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors duration-150"
          >
            Invite Members
          </button>
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: chat */}
        <div
          className="relative flex flex-shrink-0 flex-col bg-white shadow-subtle"
          style={{ borderRight: '2px solid hsl(172, 22%, 20%)', width: chatCollapsed ? 60 : chatWidth }}
        >
          {/* Collapse toggle */}
          <button
            onClick={() => setChatCollapsed(!chatCollapsed)}
            className="absolute top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:scale-110 transition-all duration-150"
            style={{ right: chatCollapsed ? 'auto' : '16px', left: chatCollapsed ? '50%' : 'auto', transform: chatCollapsed ? 'translateX(-50%)' : 'none' }}
            title={chatCollapsed ? 'Expand chat' : 'Collapse chat'}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {chatCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
          {!chatCollapsed && (
            <ChatPanel
              projectId={projectId!}
              messages={messages}
              columns={columns}
              onNewMessages={handleNewMessages}
              onMessageSent={handleMessageSent}
              onTasksAdded={handleTasksAdded}
            />
          )}
        </div>

        {/* Resize handle */}
        {!chatCollapsed && (
          <div
            onMouseDown={handleResizeStart}
            className="w-1 flex-shrink-0 cursor-col-resize bg-transparent hover:bg-primary-300 active:bg-primary-400 transition-colors duration-150"
          />
        )}

        {/* Right panel: board */}
        <div className="flex-1 overflow-x-auto bg-[hsl(60,100%,99%)]">
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
