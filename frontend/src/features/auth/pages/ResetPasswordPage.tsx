import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../../lib/api'
import type { ApiError, MessageResponse } from '../../../types'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-elevated text-center">
          <h1 className="mb-4 text-2xl font-bold text-text-primary">Invalid reset link</h1>
          <p className="mb-6 text-sm text-text-secondary">This password reset link is invalid or has expired.</p>
          <Link
            to="/forgot-password"
            className="font-medium text-primary-500 hover:text-primary-600"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!password) errs.password = 'Password is required'
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (!confirmPassword) errs.confirm_password = 'Please confirm your password'
    else if (password !== confirmPassword) errs.confirm_password = 'Passwords do not match'
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
      const data = await api.post<MessageResponse>('/api/auth/reset-password', {
        token,
        password,
        confirm_password: confirmPassword,
      })
      setSuccessMessage(data.message)
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: ApiError }
      if (apiErr.status === 400 && apiErr.data) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(apiErr.data)) {
          if (field === 'token') {
            setGeneralError(messages[0])
          } else {
            fieldErrors[field] = messages[0]
          }
        }
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors)
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
        <h1 className="mb-6 text-center text-2xl font-bold text-text-primary">Set new password</h1>

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
              <div className="mb-4">
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-secondary">New Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:shadow-focus"
                  placeholder="At least 8 characters"
                />
                {errors.password && <p className="mt-1 text-sm text-error-500">{errors.password}</p>}
              </div>

              <div className="mb-6">
                <label htmlFor="confirm_password" className="mb-1 block text-sm font-medium text-text-secondary">Confirm New Password</label>
                <input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:shadow-focus"
                  placeholder="Repeat your password"
                />
                {errors.confirm_password && <p className="mt-1 text-sm text-error-500">{errors.confirm_password}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
