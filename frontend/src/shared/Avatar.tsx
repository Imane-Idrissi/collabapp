interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (parts[0]?.[0] ?? '').toUpperCase()
}

export function Avatar({ name, color, size = 'md' }: AvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}
