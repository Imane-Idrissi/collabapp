import { useState } from 'react'
import { Modal } from '../../../shared/Modal'
import { api } from '../../../lib/api'

interface InviteMembersModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function InviteMembersModal({ isOpen, onClose, projectId }: InviteMembersModalProps) {
  const [inviteUrl, setInviteUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const data = await api.post<{ token: string }>(`/api/projects/${projectId}/invites`)
      setInviteUrl(`${window.location.origin}/invite/${data.token}`)
    } catch {
      // silently fail
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Members">
      {inviteUrl ? (
        <div>
          <p className="mb-2 text-sm text-text-secondary">Share this link with your team:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 rounded-lg border border-border-medium bg-surface-card px-3 py-2 text-sm text-text-primary"
            />
            <button
              onClick={handleCopy}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="mb-4 text-sm text-text-secondary">Generate an invite link for your team members.</p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Link'}
          </button>
        </div>
      )}
    </Modal>
  )
}
