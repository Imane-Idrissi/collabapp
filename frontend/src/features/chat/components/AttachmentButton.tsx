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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150 hover:-translate-y-0.5"
        style={{ border: '2px solid hsl(172, 22%, 20%)', background: 'white', color: 'hsl(172, 22%, 20%)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(105, 67%, 95%)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'white' }}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
      </button>
    </>
  )
}
