import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext'
import { api } from '../../../lib/api'
import { LoadingSpinner } from '../../../shared/LoadingSpinner'

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    if (!authUser || !token) return

    async function joinProject() {
      setIsJoining(true)
      try {
        const data = await api.post<{ project: { id: number; name: string } }>('/api/projects/join', { token })
        navigate(`/projects/${data.project.id}`)
      } catch (err: unknown) {
        const apiErr = err as { data?: { token?: string[] } }
        setError(apiErr.data?.token?.[0] || 'Failed to join project.')
        setIsJoining(false)
      }
    }
    joinProject()
  }, [authUser, token, navigate])

  if (isJoining) {
    return <LoadingSpinner />
  }

  // Not logged in
  if (!authUser) {
    // Store invite token for after auth
    if (token) {
      localStorage.setItem('pending_invite', token)
    }

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-elevated text-center">
          <h1 className="mb-2 text-2xl font-bold text-text-primary">You've been invited!</h1>
          <p className="mb-6 text-sm text-text-secondary">Log in or sign up to join this project.</p>
          {error && (
            <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600">{error}</div>
          )}
          <div className="flex gap-3 justify-center">
            <Link to="/login" className="rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600">Log In</Link>
            <Link to="/signup" className="rounded-lg border border-border-medium px-6 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-elevated">Sign Up</Link>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-elevated text-center">
          <h1 className="mb-4 text-2xl font-bold text-text-primary">Could not join project</h1>
          <div className="mb-6 rounded-lg bg-error-50 p-3 text-sm text-error-600">{error}</div>
          <Link to="/dashboard" className="font-medium text-primary-500 hover:text-primary-600">Go to dashboard</Link>
        </div>
      </div>
    )
  }

  return <LoadingSpinner />
}
