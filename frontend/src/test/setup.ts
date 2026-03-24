import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { server } from './mocks/server'

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock WebSocket for tests (jsdom doesn't have a real implementation)
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  readyState = MockWebSocket.OPEN
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  close() { this.readyState = MockWebSocket.CLOSED; this.onclose?.() }
  send() {}
  constructor() { setTimeout(() => this.onopen?.(), 0) }
}
vi.stubGlobal('WebSocket', MockWebSocket)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())
