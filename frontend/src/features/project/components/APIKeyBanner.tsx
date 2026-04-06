import { useState } from 'react'
import { api } from '../../../lib/api'

interface APIKeyBannerProps {
  projectId: string
  hasApiKey: boolean
  maskedApiKey: string
  onKeySet: (hasKey: boolean, maskedKey: string) => void
}

export function APIKeyBanner({ projectId, hasApiKey, maskedApiKey, onKeySet }: APIKeyBannerProps) {
  const [showForm, setShowForm] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!apiKey.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await api.put<{ has_key: boolean; masked_key: string }>(
        `/api/projects/${projectId}/api-key`,
        { api_key: apiKey },
      )
      onKeySet(res.has_key, res.masked_key)
      setApiKey('')
      setShowForm(false)
    } catch {
      setError('Failed to save API key.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    try {
      await api.delete(`/api/projects/${projectId}/api-key`)
      onKeySet(false, '')
    } catch {
      setError('Failed to remove API key.')
    }
  }

  // Compact inline view for the header when key exists
  if (hasApiKey) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg border border-border-medium px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors duration-150"
          title="Manage Gemini API key"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          <span className="font-mono text-xs text-text-tertiary">{maskedApiKey}</span>
        </button>

        {showForm && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border-medium bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-medium text-text-secondary">Update Gemini API key</p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste new API key"
                className="min-w-0 flex-1 rounded-lg border border-border-medium px-2.5 py-1.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus"
              />
              <button
                onClick={handleSave}
                disabled={saving || !apiKey.trim()}
                className="rounded-lg bg-primary-500 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              >
                Save
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-border-light pt-2">
              <span className="text-xs text-text-tertiary">Encrypted at rest</span>
              <button
                onClick={handleRemove}
                className="text-xs font-medium text-error-500 hover:text-error-600"
              >
                Remove key
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-error-500">{error}</p>}
          </div>
        )}
      </div>
    )
  }

  // Full warning banner when no key is set
  return (
    <div className="border-b border-warning-200 bg-warning-50 px-6 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-warning-800">
          To use AI task extraction, add your Gemini API key.
        </p>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-warning-100 px-3 py-1 text-sm font-medium text-warning-800 hover:bg-warning-200 transition-colors duration-150"
          >
            Add API key
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Gemini API key"
              className="rounded-lg border border-border-medium bg-white px-3 py-1.5 text-sm outline-none focus:border-primary-500 focus:shadow-focus"
            />
            <button
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
              className="rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  )
}
