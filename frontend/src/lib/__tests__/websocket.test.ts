import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebSocketManager } from '../websocket'

let mockInstances: MockWS[] = []

class MockWS {
  url: string
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    mockInstances.push(this)
  }

  close() {
    this.onclose?.()
  }

  send() {}

  // Test helpers
  simulateOpen() {
    this.onopen?.()
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  simulateClose(code = 1000) {
    this.onclose?.({ code } as CloseEvent)
  }
}

describe('WebSocketManager', () => {
  beforeEach(() => {
    mockInstances = []
    vi.stubGlobal('WebSocket', MockWS)
    vi.useFakeTimers()
  })

  it('connects to correct URL without token in query string', () => {
    const ws = new WebSocketManager({
      projectId: '42',
      onChatMessage: vi.fn(),
      onBoardEvent: vi.fn(),
    })
    ws.connect()
    expect(mockInstances).toHaveLength(1)
    expect(mockInstances[0].url).toContain('/ws/chat/42/')
    expect(mockInstances[0].url).not.toContain('token=')
    ws.disconnect()
  })

  it('calls onChatMessage for chat messages', () => {
    const onChatMessage = vi.fn()
    const ws = new WebSocketManager({
      projectId: '1',
      onChatMessage,
      onBoardEvent: vi.fn(),
    })
    ws.connect()
    mockInstances[0].simulateMessage({
      id: 1,
      text: 'hello',
      sender: { id: 1, name: 'Imane', avatar_color: '#fff' },
      attachments: [],
      created_at: '2026-03-24T10:00:00Z',
    })
    expect(onChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, text: 'hello' }),
    )
    ws.disconnect()
  })

  it('calls onBoardEvent for board events', () => {
    const onBoardEvent = vi.fn()
    const ws = new WebSocketManager({
      projectId: '1',
      onChatMessage: vi.fn(),
      onBoardEvent,
    })
    ws.connect()
    mockInstances[0].simulateMessage({
      type: 'board_event',
      event: 'task:created',
      payload: { id: 1, name: 'New task' },
    })
    expect(onBoardEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'board_event', event: 'task:created' }),
    )
    ws.disconnect()
  })

  it('reconnects on close with exponential backoff', () => {
    const ws = new WebSocketManager({
      projectId: '1',
      onChatMessage: vi.fn(),
      onBoardEvent: vi.fn(),
    })
    ws.connect()
    expect(mockInstances).toHaveLength(1)

    // Simulate unexpected close
    mockInstances[0].simulateClose()

    // First reconnect after 1s
    vi.advanceTimersByTime(1000)
    expect(mockInstances).toHaveLength(2)

    // Close again
    mockInstances[1].simulateClose()

    // Second reconnect after 2s
    vi.advanceTimersByTime(2000)
    expect(mockInstances).toHaveLength(3)

    ws.disconnect()
  })

  it('does not reconnect after disconnect()', () => {
    const ws = new WebSocketManager({
      projectId: '1',
      onChatMessage: vi.fn(),
      onBoardEvent: vi.fn(),
    })
    ws.connect()
    ws.disconnect()

    vi.advanceTimersByTime(5000)
    expect(mockInstances).toHaveLength(1) // No reconnect attempts
  })

  it('calls onConnectionChange on connect and disconnect', () => {
    const onConnectionChange = vi.fn()
    const ws = new WebSocketManager({
      projectId: '1',
      onChatMessage: vi.fn(),
      onBoardEvent: vi.fn(),
      onConnectionChange,
    })
    ws.connect()
    mockInstances[0].simulateOpen()
    expect(onConnectionChange).toHaveBeenCalledWith(true)

    mockInstances[0].simulateClose()
    expect(onConnectionChange).toHaveBeenCalledWith(false)

    ws.disconnect()
  })
})
