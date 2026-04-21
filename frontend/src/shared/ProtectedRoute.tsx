import { Navigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'
import { LoadingSpinner } from './LoadingSpinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
