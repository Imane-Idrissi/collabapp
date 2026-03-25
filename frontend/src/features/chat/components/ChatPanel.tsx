import { useState, useRef, useEffect, useCallback } from 'react'
import type { Message, Attachment, Column, Suggestion, Task } from '../../../types'
import { EXTRACTION_MARKER } from '../../../types'
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
  onNewMessages: (messages: Message[]) => void
  onMessageSent: (message: Message) => void
  onTasksAdded?: (tasks: Task[]) => void
}

export function ChatPanel({ projectId, messages, columns, onNewMessages, onMessageSent, onTasksAdded }: ChatPanelProps) {
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
        const upload = await api.post<{ upload_url: string; file_url: string }>(
          `/api/projects/${projectId}/upload`,
          { filename: pendingFile.name, content_type: pendingFile.type, size: pendingFile.size },
        )
        await fetch(upload.upload_url, { method: 'PUT', body: pendingFile })
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
      {/* Extract Tasks */}
      <div className="border-b border-border-light px-4 py-2">
        <ExtractTasksButton
          projectId={projectId}
          disabled={messages.length === 0}
          onSuggestions={(s) => setSuggestions(s)}
        />
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
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {loadingOlder && (
          <p className="text-center text-xs text-text-tertiary">Loading older messages...</p>
        )}
        {messages.map((msg) =>
          msg.text === EXTRACTION_MARKER ? (
            <div key={msg.id} className="flex items-center gap-2 py-2">
              <div className="flex-1 border-t border-purple-300" />
              <span className="text-xs font-medium text-purple-500">Tasks extracted</span>
              <div className="flex-1 border-t border-purple-300" />
            </div>
          ) : (
            <div key={msg.id} className="flex gap-2">
              <Avatar name={msg.sender.name} color={msg.sender.avatar_color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-text-primary">{msg.sender.name}</span>
                  <span className="text-xs text-text-tertiary">{formatTime(msg.created_at)}</span>
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">{msg.text}</p>
                {msg.attachments.length > 0 && <MessageAttachments attachments={msg.attachments} />}
              </div>
            </div>
          ),
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border-light px-4 py-3">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-border-medium px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          <AttachmentButton
            onFileSelected={(file) => setPendingFile(file)}
            onError={() => {}}
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !pendingFile) || sending}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
