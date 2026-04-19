import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg-primary">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
            <p className="mt-2 text-sm text-text-secondary">An unexpected error occurred.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
