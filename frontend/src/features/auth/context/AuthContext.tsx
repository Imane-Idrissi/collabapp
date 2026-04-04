import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User, AuthResponse } from '../../../types'
import { api } from '../../../lib/api'
import * as authStorage from '../../../lib/auth'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, confirm_password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = authStorage.getToken()
    const storedUser = authStorage.getUser()
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(storedUser)
    }
    setIsLoading(false)
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string, confirm_password: string) => {
    const data = await api.post<AuthResponse>('/api/auth/signup', { name, email, password, confirm_password })
    authStorage.setToken(data.token)
    authStorage.setRefreshToken(data.refresh_token)
    authStorage.setUser(data.user)
    setToken(data.token)
    setUser(data.user)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/api/auth/login', { email, password })
    authStorage.setToken(data.token)
    authStorage.setRefreshToken(data.refresh_token)
    authStorage.setUser(data.user)
    setToken(data.token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    authStorage.removeToken()
    authStorage.removeRefreshToken()
    authStorage.removeUser()
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
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
