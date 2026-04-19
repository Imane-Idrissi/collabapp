import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { Column, Message, ProjectMember, Task, BoardEvent } from '../../../types'
import { useAuth } from '../../auth/context/AuthContext'
import { api } from '../../../lib/api'
import { WebSocketManager } from '../../../lib/websocket'

interface ProjectInfo {
  id: number
  name: string
  description: string
  member_count: number
}

interface ProjectContextValue {
  project: ProjectInfo | null
  setProject: React.Dispatch<React.SetStateAction<ProjectInfo | null>>
  columns: Column[]
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  members: ProjectMember[]
  isLoading: boolean
  wsConnected: boolean
  aiEnabled: boolean
  setAiEnabled: React.Dispatch<React.SetStateAction<boolean>>
  hasApiKey: boolean
  setHasApiKey: React.Dispatch<React.SetStateAction<boolean>>
  maskedApiKey: string
  setMaskedApiKey: React.Dispatch<React.SetStateAction<string>>
  isCreator: boolean
  error: string | null
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const { user } = useAuth()
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [maskedApiKey, setMaskedApiKey] = useState('')
  const [isCreator, setIsCreator] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocketManager | null>(null)
  const messageIdsRef = useRef<Set<number>>(new Set())

  // Track message IDs for deduplication
  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id))
  }, [messages])

  const handleBoardEvent = useCallback((event: BoardEvent) => {
    const { event: eventType, payload } = event

    setColumns((prev) => {
      switch (eventType) {
        case 'task:created': {
          const task = payload as unknown as Task
          return prev.map((col) =>
            col.id === task.column_id ? { ...col, tasks: [...col.tasks, task] } : col,
          )
        }
        case 'task:updated': {
          const task = payload as unknown as Task
          return prev.map((col) => ({
            ...col,
            tasks: col.tasks.map((t) => (t.id === task.id ? task : t)),
          }))
        }
        case 'task:moved': {
          const task = payload as unknown as Task
          return prev.map((col) => {
            const withoutTask = col.tasks.filter((t) => t.id !== task.id)
            if (col.id === task.column_id) {
              const tasks = [...withoutTask]
              tasks.splice(task.position, 0, task)
              return { ...col, tasks }
            }
            return { ...col, tasks: withoutTask }
          })
        }
        case 'task:deleted': {
          const { id } = payload as { id: number }
          return prev.map((col) => ({
            ...col,
            tasks: col.tasks.filter((t) => t.id !== id),
          }))
        }
        case 'column:created': {
          const col = payload as unknown as Column
          return [...prev, { ...col, tasks: [] }]
        }
        case 'column:renamed': {
          const { id, name } = payload as { id: number; name: string }
          return prev.map((col) => (col.id === id ? { ...col, name } : col))
        }
        case 'column:deleted': {
          const { id } = payload as { id: number }
          return prev.filter((col) => col.id !== id)
        }
        default:
          return prev
      }
    })
  }, [])

  const handleChatMessage = useCallback((message: Message) => {
    if (messageIdsRef.current.has(message.id)) return
    setMessages((prev) => [...prev, message])
  }, [])

  // Load initial data
  useEffect(() => {
    async function load() {
      if (!projectId || !user) return
      try {
        const [projects, board, chat, membersRes] = await Promise.all([
          api.get<ProjectInfo[]>('/api/projects/'),
          api.get<{ columns: Column[]; ai_enabled: boolean; has_api_key: boolean; masked_api_key: string; is_creator: boolean }>(`/api/projects/${projectId}/board`),
          api.get<{ messages: Message[] }>(`/api/projects/${projectId}/messages`),
          api.get<{ members: ProjectMember[] }>(`/api/projects/${projectId}/members`),
        ])
        const proj = projects.find((p) => p.id === Number(projectId))
        if (proj) setProject(proj)
        setColumns(board.columns)
        setAiEnabled(board.ai_enabled)
        setHasApiKey(board.has_api_key)
        setMaskedApiKey(board.masked_api_key)
        setIsCreator(board.is_creator)
        setMessages(chat.messages)
        setMembers(membersRes.members)
      } catch {
        setError('Failed to load project')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId, user])

  // WebSocket connection
  useEffect(() => {
    if (!projectId) return

    const ws = new WebSocketManager({
      projectId,
      onChatMessage: handleChatMessage,
      onBoardEvent: handleBoardEvent,
      onConnectionChange: setWsConnected,
    })
    ws.connect()
    wsRef.current = ws

    return () => {
      ws.disconnect()
      wsRef.current = null
    }
  }, [projectId, handleChatMessage, handleBoardEvent])

  return (
    <ProjectContext.Provider value={{ project, setProject, columns, setColumns, messages, setMessages, members, isLoading, wsConnected, aiEnabled, setAiEnabled, hasApiKey, setHasApiKey, maskedApiKey, setMaskedApiKey, isCreator, error }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}
