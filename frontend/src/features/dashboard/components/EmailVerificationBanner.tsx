import { useState } from 'react'
import { api } from '../../../lib/api'
import type { MessageResponse } from '../../../types'

export function EmailVerificationBanner() {
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleSend() {
    setSendStatus('sending')
    try {
      await api.post<MessageResponse>('/api/auth/send-verification-email', {})
      setSendStatus('sent')
      setTimeout(() => setSendStatus('idle'), 5000)
    } catch {
      setSendStatus('idle')
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-warning-200 bg-warning-50 p-4">
      <p className="text-sm font-medium text-warning-800">Your email is not verified.</p>
      <div className="mt-2">
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
      </div>
    </div>
  )
}
