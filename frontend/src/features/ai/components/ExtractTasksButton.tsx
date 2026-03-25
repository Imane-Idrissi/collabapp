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
        aria-label={loading ? 'Analyzing conversation...' : 'Extract Tasks'}
        className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Analyzing conversation...' : 'Extract Tasks'}
      </button>
      {disabled && !loading && (
        <span className="absolute left-0 top-full mt-1 hidden group-hover:block text-xs text-text-tertiary whitespace-nowrap">
          No chat messages yet
        </span>
      )}
      {error && (
        <p className="mt-1 text-xs text-error-500">{error}</p>
      )}
    </div>
  )
}
