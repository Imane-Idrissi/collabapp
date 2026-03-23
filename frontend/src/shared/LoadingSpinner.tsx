export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
      <span className="sr-only">Loading...</span>
    </div>
  )
}
