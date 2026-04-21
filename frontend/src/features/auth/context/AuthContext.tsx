import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '../../../types'
import { api } from '../../../lib/api'
import * as authStorage from '../../../lib/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, confirm_password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthResponse {
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const cachedUser = authStorage.getUser()
    if (cachedUser) {
      setUser(cachedUser)
    }

    api.get<{ user: User }>('/api/auth/me')
      .then((data) => {
        setUser(data.user)
        authStorage.setUser(data.user)
      })
      .catch(() => {
        setUser(null)
        authStorage.removeUser()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string, confirm_password: string) => {
    const data = await api.post<AuthResponse>('/api/auth/signup', { name, email, password, confirm_password })
    authStorage.setUser(data.user)
    setUser(data.user)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/api/auth/login', { email, password })
    authStorage.setUser(data.user)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Clear local state even if server call fails
    }
    authStorage.removeUser()
    setUser(null)
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      authStorage.setUser(updated)
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
