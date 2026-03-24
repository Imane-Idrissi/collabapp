import type { Attachment } from '../../../types'

interface MessageAttachmentsProps {
  attachments: Attachment[]
}

function formatSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
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
            className="inline-flex items-center gap-1 text-sm text-primary-500 hover:underline"
          >
            {att.name} <span className="text-text-tertiary">({formatSize(att.size)})</span>
          </a>
        ),
      )}
    </div>
  )
}
