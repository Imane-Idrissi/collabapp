import { Modal } from '../../../shared/Modal'

interface LogoutConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function LogoutConfirmationModal({ isOpen, onClose, onConfirm }: LogoutConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log out">
      <p className="mb-6 text-sm text-text-secondary">Are you sure you want to log out?</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-error-500 px-4 py-2 text-sm font-semibold text-white hover:bg-error-600 transition-colors"
        >
          Log Out
        </button>
      </div>
    </Modal>
  )
}
