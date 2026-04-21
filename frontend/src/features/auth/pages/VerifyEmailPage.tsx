import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../../lib/api'
import { useAuth } from '../context/AuthContext'
import type { MessageResponse } from '../../../types'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { updateUser } = useAuth()

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Invalid verification link.')
      return
    }

    api.get<MessageResponse>(`/api/auth/verify-email?token=${token}`)
      .then(() => {
        updateUser({ email_verified: true })
        setStatus('success')
      })
      .catch((err: unknown) => {
        const apiErr = err as { data?: { detail?: string } }
        setErrorMessage(apiErr.data?.detail || 'This verification link is invalid or has expired.')
        setStatus('error')
      })
  }, [token, updateUser])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-elevated text-center">
        {status === 'verifying' && (
          <>
            <h1 className="mb-4 text-2xl font-bold text-text-primary">Verifying your email...</h1>
            <p className="text-sm text-text-secondary">Please wait.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="mb-4 text-2xl font-bold text-text-primary">Email verified!</h1>
            <p className="mb-6 text-sm text-text-secondary">Your email has been verified successfully.</p>
            <Link
              to="/dashboard"
              className="inline-block rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Go to dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="mb-4 text-2xl font-bold text-text-primary">Verification failed</h1>
            <p className="mb-6 text-sm text-text-secondary">{errorMessage}</p>
            <Link
              to="/dashboard"
              className="font-medium text-primary-500 hover:text-primary-600"
            >
              Back to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
