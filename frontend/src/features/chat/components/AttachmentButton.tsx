import { useRef } from 'react'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface AttachmentButtonProps {
  onFileSelected: (file: File) => void
  onError: (message: string) => void
}

export function AttachmentButton({ onFileSelected, onError }: AttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      onError('File must be under 10MB')
    } else {
      onFileSelected(file)
    }

    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        aria-label="Attach file"
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-border-medium px-3 py-2 text-sm text-text-secondary hover:bg-surface-elevated transition-colors"
      >
        📎
      </button>
    </>
  )
}
