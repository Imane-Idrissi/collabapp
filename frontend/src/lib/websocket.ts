import type { Message, BoardEvent } from '../types'

interface WebSocketManagerOptions {
  projectId: string
  token: string
  onChatMessage: (message: Message) => void
  onBoardEvent: (event: BoardEvent) => void
  onConnectionChange?: (connected: boolean) => void
}

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
    const url = `${protocol}//${host}/ws/chat/${this.options.projectId}/?token=${this.options.token}`

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

    this.ws.onclose = () => {
      this.options.onConnectionChange?.(false)
      if (!this.closed) {
        this.scheduleReconnect()
      }
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
