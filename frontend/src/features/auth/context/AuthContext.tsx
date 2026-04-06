import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { User, AuthResponse } from '../../../types'
import { api } from '../../../lib/api'
import * as authStorage from '../../../lib/auth'

function getTokenExpiry(jwt: string): number | null {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, confirm_password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const REFRESH_MARGIN_MS = 60_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const expiry = getTokenExpiry(accessToken)
    if (!expiry) return
    const delay = Math.max(expiry - Date.now() - REFRESH_MARGIN_MS, 0)
    refreshTimerRef.current = setTimeout(async () => {
      const refreshToken = authStorage.getRefreshToken()
      if (!refreshToken) return
      try {
        const BASE_URL = import.meta.env.VITE_API_URL ?? ''
        const res = await fetch(`${BASE_URL}/api/auth/token/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        })
        if (!res.ok) return
        const data = await res.json()
        authStorage.setToken(data.access)
        if (data.refresh) authStorage.setRefreshToken(data.refresh)
        setToken(data.access)
        scheduleRefresh(data.access)
      } catch {
        // Refresh failed silently — reactive refresh in api.ts will handle next request
      }
    }, delay)
  }, [])

  useEffect(() => {
    const storedToken = authStorage.getToken()
    const storedUser = authStorage.getUser()
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(storedUser)
      scheduleRefresh(storedToken)
    }
    setIsLoading(false)
  }, [scheduleRefresh])

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string, confirm_password: string) => {
    const data = await api.post<AuthResponse>('/api/auth/signup', { name, email, password, confirm_password })
    authStorage.setToken(data.token)
    authStorage.setRefreshToken(data.refresh_token)
    authStorage.setUser(data.user)
    setToken(data.token)
    setUser(data.user)
    scheduleRefresh(data.token)
  }, [scheduleRefresh])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/api/auth/login', { email, password })
    authStorage.setToken(data.token)
    authStorage.setRefreshToken(data.refresh_token)
    authStorage.setUser(data.user)
    setToken(data.token)
    setUser(data.user)
    scheduleRefresh(data.token)
  }, [scheduleRefresh])

  const logout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
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
