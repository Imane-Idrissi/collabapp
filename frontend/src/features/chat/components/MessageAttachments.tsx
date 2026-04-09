import type { Attachment } from '../../../types'

interface MessageAttachmentsProps {
  attachments: Attachment[]
  isOwn?: boolean
}

function formatSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export function MessageAttachments({ attachments, isOwn }: MessageAttachmentsProps) {
  if (attachments.length === 0) return null

  return (
    <div className="mt-1 flex flex-col gap-1">
      {attachments.map((att) =>
        att.type.startsWith('image/') ? (
          <img
            key={att.id}
            src={att.url}
            alt={att.name}
            className="max-w-xs rounded-lg"
          />
        ) : (
          <a
            key={att.id}
            href={att.url}
            download
            className={`inline-flex items-center gap-1.5 text-sm hover:underline ${isOwn ? 'text-white/80 hover:text-white' : 'text-primary-500'}`}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="truncate max-w-[200px]">{att.name}</span>
            <span className={`shrink-0 ${isOwn ? 'text-white/50' : 'text-text-tertiary'}`}>({formatSize(att.size)})</span>
          </a>
        ),
      )}
    </div>
  )
}
