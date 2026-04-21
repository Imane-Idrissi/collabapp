import { describe, it, expect, beforeEach } from 'vitest'
import { getUser, setUser, removeUser } from '../auth'
import type { User } from '../../types'

const testUser: User = {
  id: 1,
  name: 'Imane Idrissi',
  email: 'imane@example.com',
  email_verified: false,
  avatar_color: '#6366f1',
}

beforeEach(() => localStorage.clear())

describe('user helpers', () => {
  it('getUser returns null when empty', () => {
    expect(getUser()).toBeNull()
  })

  it('setUser and getUser round-trip', () => {
    setUser(testUser)
    expect(getUser()).toEqual(testUser)
  })

  it('removeUser clears user', () => {
    setUser(testUser)
    removeUser()
    expect(getUser()).toBeNull()
  })

  it('getUser returns null for invalid JSON', () => {
    localStorage.setItem('user', 'not-json')
    expect(getUser()).toBeNull()
  })
})
