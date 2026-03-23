import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../lib/api'
import type { ApiError, MessageResponse } from '../../../types'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = 'Email is required'
    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    setGeneralError('')

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const data = await api.post<MessageResponse>('/api/auth/forgot-password', { email })
      setSuccessMessage(data.message)
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: ApiError }
      if (apiErr.status === 400 && apiErr.data) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(apiErr.data)) {
          fieldErrors[field] = messages[0]
        }
        setErrors(fieldErrors)
      } else {
        setGeneralError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-elevated">
        <h1 className="mb-2 text-center text-2xl font-bold text-text-primary">Reset your password</h1>
        <p className="mb-6 text-center text-sm text-text-secondary">
          Enter your email and we'll send you a reset link.
        </p>

        {successMessage ? (
          <div>
            <div className="mb-6 rounded-lg bg-success-50 p-4 text-sm text-success-700" role="status">
              {successMessage}
            </div>
            <Link
              to="/login"
              className="block w-full rounded-lg bg-primary-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <>
            {generalError && (
              <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600" role="alert">
                {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-6">
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-secondary">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:shadow-focus"
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-error-500">{errors.email}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              <Link to="/login" className="font-medium text-primary-500 hover:text-primary-600">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
