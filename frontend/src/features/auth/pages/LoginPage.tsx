import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ApiError } from '../../../types'

export function LoginPage() {
  const { login, token } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (token) return <Navigate to="/dashboard" replace />

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = 'Email is required'
    if (!password) errs.password = 'Password is required'
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
      await login(email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: ApiError }
      if (apiErr.status === 401) {
        setGeneralError('Invalid email or password.')
      } else if (apiErr.status === 400 && apiErr.data) {
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
        <h1 className="mb-6 text-center text-2xl font-bold text-text-primary">Welcome back</h1>

        {generalError && (
          <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600" role="alert">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
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

          <div className="mb-2">
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-secondary">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:shadow-focus"
              placeholder="Your password"
            />
            {errors.password && <p className="mt-1 text-sm text-error-500">{errors.password}</p>}
          </div>

          <div className="mb-6 text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-primary-500 hover:text-primary-600">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary-500 hover:text-primary-600">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
