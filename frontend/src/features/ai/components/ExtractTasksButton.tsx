import { useState } from 'react'
import { api } from '../../../lib/api'
import type { Suggestion } from '../../../types'

interface ExtractTasksButtonProps {
  projectId: string
  disabled: boolean
  onSuggestions: (suggestions: Suggestion[]) => void
}

export function ExtractTasksButton({ projectId, disabled, onSuggestions }: ExtractTasksButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.post<{ suggestions: Suggestion[] }>(
        `/api/projects/${projectId}/extract-tasks`,
      )
      onSuggestions(data.suggestions)
    } catch (err: unknown) {
      const e = err as { status: number; data: { detail: string } }
      setError(e.data?.detail || 'AI extraction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        aria-label={loading ? 'Analyzing...' : 'Extract Tasks'}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5"
        style={{
          background: loading
            ? 'linear-gradient(135deg, hsl(271,72%,47%) 0%, hsl(271,67%,42%) 100%)'
            : 'linear-gradient(135deg, hsl(271,81%,56%) 0%, hsl(271,72%,47%) 50%, hsl(271,67%,42%) 100%)',
          backgroundSize: '200% 200%',
          border: '2px solid hsl(271,81%,56%)',
        }}
      >
        <svg className="relative z-10 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        <span className="relative z-10">{loading ? 'Analyzing...' : 'Extract Tasks'}</span>
      </button>
      {error && (
        <p className="absolute left-0 top-full mt-1 text-xs text-error-500 whitespace-nowrap">{error}</p>
      )}
    </div>
  )
}
