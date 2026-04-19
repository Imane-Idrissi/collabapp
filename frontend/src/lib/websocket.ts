import type { Message, BoardEvent } from '../types'

interface WebSocketManagerOptions {
  projectId: string
  onChatMessage: (message: Message) => void
  onBoardEvent: (event: BoardEvent) => void
  onConnectionChange?: (connected: boolean) => void
}

const AUTH_FAILURE_CODES = [4401, 4403, 1008]
const MAX_RECONNECT_ATTEMPTS = 10

export class WebSocketManager {
  private ws: WebSocket | null = null
  private options: WebSocketManagerOptions
  private reconnectAttempts = 0
  private maxReconnectDelay = 30000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private closed = false

  constructor(options: WebSocketManagerOptions) {
    this.options = options
  }

  connect() {
    this.closed = false
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/ws/chat/${this.options.projectId}/`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.options.onConnectionChange?.(true)
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'board_event') {
          this.options.onBoardEvent(data as BoardEvent)
        } else if (data.id && data.sender) {
          this.options.onChatMessage(data as Message)
        }
      } catch {
        // Ignore malformed messages
      }
    }

    this.ws.onclose = (event) => {
      this.options.onConnectionChange?.(false)
      if (this.closed) return
      if (AUTH_FAILURE_CODES.includes(event.code)) return
      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  disconnect() {
    this.closed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
