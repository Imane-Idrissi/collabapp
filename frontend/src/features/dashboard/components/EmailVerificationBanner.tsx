import { useState } from 'react'
import { api } from '../../../lib/api'
import type { User, MessageResponse, ApiError } from '../../../types'

interface EmailVerificationBannerProps {
  user: User
  onUserUpdate: (user: User) => void
}

export function EmailVerificationBanner({ user, onUserUpdate }: EmailVerificationBannerProps) {
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [newEmail, setNewEmail] = useState(user.email)
  const [updateError, setUpdateError] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleSend() {
    setSendStatus('sending')
    try {
      await api.post<MessageResponse>('/api/auth/forgot-password', { email: user.email })
      setSendStatus('sent')
    } catch {
      setSendStatus('idle')
    }
  }

  async function handleUpdateEmail() {
    setUpdateError('')
    setIsUpdating(true)
    try {
      await api.patch<MessageResponse>('/api/auth/update-email', { email: newEmail })
      setUpdateSuccess(true)
      onUserUpdate({ ...user, email: newEmail })
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: ApiError & { detail?: string } }
      if (apiErr.status === 403) {
        setUpdateError('Email is already verified.')
      } else if (apiErr.status === 400 && apiErr.data) {
        const firstField = Object.values(apiErr.data)[0]
        setUpdateError(Array.isArray(firstField) ? firstField[0] : String(firstField))
      } else {
        setUpdateError('Something went wrong.')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-warning-200 bg-warning-50 p-4">
      <p className="text-sm font-medium text-warning-800">Your email is not verified.</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {sendStatus === 'sent' ? (
          <span className="text-sm text-success-600">Verification email sent! Check your inbox.</span>
        ) : (
          <button
            onClick={handleSend}
            disabled={sendStatus === 'sending'}
            className="text-sm font-medium text-primary-500 underline underline-offset-2 hover:text-primary-600 disabled:opacity-50"
          >
            Send verification email
          </button>
        )}
        <span className="text-text-placeholder">·</span>
        <button
          onClick={() => setShowUpdateForm(!showUpdateForm)}
          className="text-sm font-medium text-primary-500 underline underline-offset-2 hover:text-primary-600"
        >
          Wrong email? Update it
        </button>
      </div>

      {showUpdateForm && !updateSuccess && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="rounded-lg border border-border-medium px-3 py-1.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus"
          />
          <button
            onClick={handleUpdateEmail}
            disabled={isUpdating}
            className="rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            Update
          </button>
        </div>
      )}
      {updateSuccess && (
        <p className="mt-2 text-sm text-success-600">Email updated!</p>
      )}
      {updateError && (
        <p className="mt-2 text-sm text-error-500">{updateError}</p>
      )}
    </div>
  )
}
