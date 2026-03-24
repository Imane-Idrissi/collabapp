import { useState, useRef, useEffect, useCallback } from 'react'
import type { Message } from '../../../types'
import { EXTRACTION_MARKER } from '../../../types'
import { Avatar } from '../../../shared/Avatar'
import { api } from '../../../lib/api'

interface ChatPanelProps {
  projectId: string
  messages: Message[]
  onNewMessages: (messages: Message[]) => void
  onMessageSent: (message: Message) => void
}

export function ChatPanel({ projectId, messages, onNewMessages, onMessageSent }: ChatPanelProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)
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
    if (!trimmed || sending) return
    setSending(true)
    try {
      const message = await api.post<Message>(`/api/projects/${projectId}/messages`, { text: trimmed })
      onMessageSent(message)
      setText('')
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
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
