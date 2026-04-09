import { useState, useRef, useEffect, useCallback } from 'react'
import type { Message, Attachment, Column, Suggestion, Task } from '../../../types'
import { EXTRACTION_MARKER } from '../../../types'
import { useAuth } from '../../auth/context/AuthContext'
import { Avatar } from '../../../shared/Avatar'
import { api } from '../../../lib/api'
import { AttachmentButton } from './AttachmentButton'
import { MessageAttachments } from './MessageAttachments'
import { ExtractTasksButton } from '../../ai/components/ExtractTasksButton'
import { AITaskModal } from '../../ai/components/AITaskModal'

interface ChatPanelProps {
  projectId: string
  messages: Message[]
  columns: Column[]
  aiEnabled?: boolean
  onNewMessages: (messages: Message[]) => void
  onMessageSent: (message: Message) => void
  onTasksAdded?: (tasks: Task[]) => void
}

export function ChatPanel({ projectId, messages, columns, aiEnabled, onNewMessages, onMessageSent, onTasksAdded }: ChatPanelProps) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  function handleScroll() {
    const container = messagesContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50

    if (scrollTop === 0 && hasMore && !loadingOlder && messages.length > 0) {
      loadOlderMessages()
    }
  }

  async function loadOlderMessages() {
    const oldestId = messages[0]?.id
    if (!oldestId) return
    setLoadingOlder(true)
    try {
      const data = await api.get<{ messages: Message[] }>(`/api/projects/${projectId}/messages?limit=50&before=${oldestId}`)
      if (data.messages.length === 0) {
        setHasMore(false)
      } else {
        onNewMessages(data.messages)
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingOlder(false)
    }
  }

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && !pendingFile) return
    if (sending) return
    setSending(true)
    try {
      let attachments: Omit<Attachment, 'id'>[] = []
      if (pendingFile) {
        const formData = new FormData()
        formData.append('file', pendingFile)
        const upload = await api.upload<{ file_url: string }>(
          `/api/projects/${projectId}/upload`,
          formData,
        )
        attachments = [{ url: upload.file_url, name: pendingFile.name, size: pendingFile.size, type: pendingFile.type }]
      }
      const message = await api.post<Message>(`/api/projects/${projectId}/messages`, {
        text: trimmed,
        attachments,
      })
      onMessageSent(message)
      setText('')
      setPendingFile(null)
      isAtBottomRef.current = true
    } catch {
      // Silently fail
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="px-6 pb-4 pt-6" style={{ borderBottom: '1px solid hsl(172, 22%, 20%)' }}>
        <div className="mb-4 flex items-center gap-3">
          <svg className="h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <h3 className="text-lg font-semibold text-text-primary">Chat</h3>
        </div>
        {aiEnabled && (
          <ExtractTasksButton
            projectId={projectId}
            disabled={messages.length === 0}
            onSuggestions={(s) => setSuggestions(s)}
          />
        )}
      </div>

      {/* AI Task Modal */}
      {suggestions !== null && (
        <AITaskModal
          suggestions={suggestions}
          columns={columns}
          projectId={projectId}
          onTasksAdded={(tasks) => onTasksAdded?.(tasks)}
          onClose={() => setSuggestions(null)}
        />
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[hsl(60,100%,99%)]"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(220, 13%, 82%) hsl(220, 13%, 91%)' }}
      >
        {loadingOlder && (
          <p className="text-center text-xs text-text-tertiary">Loading older messages...</p>
        )}
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-text-placeholder">No messages yet. Start the conversation.</p>
          </div>
        )}
        {messages.map((msg) =>
          msg.text === EXTRACTION_MARKER ? (
            <div key={msg.id} className="flex items-center gap-2 py-2">
              <div className="flex-1 border-t border-purple-200" />
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-600">Tasks extracted</span>
              <div className="flex-1 border-t border-purple-200" />
            </div>
          ) : (
            (() => {
              const isOwn = msg.sender.id === user?.id
              return (
                <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <div className="shrink-0">
                    <Avatar name={msg.sender.name} color={msg.sender.avatar_color} size="sm" />
                  </div>
                  <div className={`min-w-0 max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                    <div className={`flex items-baseline gap-2 ${isOwn ? 'justify-end' : ''}`}>
                      <span className="text-sm font-medium text-text-primary">{msg.sender.name}</span>
                      <span className="text-xs text-text-placeholder">{formatTime(msg.created_at)}</span>
                    </div>
                    <div
                      className={`mt-1 rounded-xl px-3 py-2 shadow-subtle ${isOwn ? 'bg-primary-800 text-white' : 'bg-white'}`}
                      style={isOwn ? {} : { border: '1px solid hsl(220, 13%, 87%)' }}
                    >
                      <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed text-left ${isOwn ? 'text-white/90' : 'text-text-secondary'}`}>{msg.text}</p>
                      {msg.attachments.length > 0 && <MessageAttachments attachments={msg.attachments} isOwn={isOwn} />}
                    </div>
                  </div>
                </div>
              )
            })()
          ),
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending file indicator */}
      {pendingFile && (
        <div className="mx-5 mb-1 flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-1.5">
          <span className="text-xs text-primary-700 truncate flex-1">{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)} className="text-xs font-medium text-primary-600 hover:text-primary-800">Remove</button>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid hsl(172, 22%, 20%)', boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div
          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-subtle transition-all duration-150 focus-within:shadow-[0_0_0_4px_hsl(172,33%,90%)]"
          style={{ border: '2px solid hsl(172, 22%, 20%)' }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-w-0 flex-1 border-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-placeholder"
          />
          <AttachmentButton
            onFileSelected={(file) => setPendingFile(file)}
            onError={() => {}}
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !pendingFile) || sending}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
            style={{ border: '2px solid hsl(172, 22%, 20%)', background: 'white', color: 'hsl(172, 22%, 20%)' }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
