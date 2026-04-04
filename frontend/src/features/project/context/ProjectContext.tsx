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
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const { token } = useAuth()
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
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
      if (!projectId || !token) return
      try {
        const [projects, board, chat, membersRes] = await Promise.all([
          api.get<ProjectInfo[]>('/api/projects'),
          api.get<{ columns: Column[] }>(`/api/projects/${projectId}/board`),
          api.get<{ messages: Message[] }>(`/api/projects/${projectId}/messages`),
          api.get<{ members: ProjectMember[] }>(`/api/projects/${projectId}/members`),
        ])
        const proj = projects.find((p) => p.id === Number(projectId))
        if (proj) setProject(proj)
        setColumns(board.columns)
        setMessages(chat.messages)
        setMembers(membersRes.members)
      } catch {
        // Error handled by caller
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [projectId, token])

  // WebSocket connection
  useEffect(() => {
    if (!projectId || !token) return

    const ws = new WebSocketManager({
      projectId,
      token,
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
  }, [projectId, token, handleChatMessage, handleBoardEvent])

  return (
    <ProjectContext.Provider value={{ project, setProject, columns, setColumns, messages, setMessages, members, isLoading, wsConnected }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}
