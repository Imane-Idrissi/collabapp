import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'

const features = [
  {
    icon: '📋',
    title: 'Kanban Task Boards',
    description:
      'Organize your work with intuitive drag-and-drop Kanban boards. Create custom columns, move tasks between stages, set priorities, and track progress in real-time as your team works together.',
  },
  {
    icon: '💬',
    title: 'Real-Time Chat & Messaging',
    description:
      'Connect with your team through instant messaging powered by WebSocket technology. Share files, send messages, and stay connected with real-time updates synced instantly across all devices.',
  },
  {
    icon: '🤖',
    title: 'AI Task Extraction',
    description:
      'Powered by Google Gemini AI, the system analyzes your chat conversations and automatically suggests relevant tasks. Discuss your project naturally, and the AI identifies actionable items — turning conversations into organized workflows.',
  },
]

export function HomePage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-app to-surface-card">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-primary-100/30 bg-white/90 shadow-soft backdrop-blur-xl transition-all">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <Link to="/" className="flex items-center gap-3 transition-transform hover:-translate-y-0.5">
            <div className="flex h-11 w-11 animate-bounce items-center justify-center rounded-xl bg-primary-700 text-lg font-bold text-white shadow-md [animation-duration:6s]">
              C
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">CollabApp</h1>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary-800 hover:shadow-elevated"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg border-2 border-primary-700 px-6 py-2.5 text-sm font-medium text-primary-700 transition-all hover:-translate-y-0.5 hover:bg-primary-50 hover:shadow-elevated"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-primary-800 hover:shadow-elevated"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-8 pb-16 pt-32 text-center animate-[fadeInUp_1s_ease-out]">
        <h1 className="mb-8 text-5xl font-extrabold leading-tight tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
          The Future of Team{' '}
          <br />
          Collaboration is{' '}
          <span className="bg-gradient-to-r from-primary-600 via-success-500 to-warning-500 bg-[length:400%_400%] bg-clip-text text-transparent animate-[shimmer_4.5s_ease-in-out_infinite]">
            Here
          </span>
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-text-secondary">
          Enhance your team collaboration with Kanban boards and AI extraction tools.
          Discuss naturally with your team and let AI decide which tasks you need to perform.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-10 py-4 text-xl font-semibold text-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-1 hover:bg-primary-800 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary-700 px-10 py-4 text-xl font-semibold text-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-1 hover:bg-primary-800 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
              >
                Start Free Trial
              </Link>
              <Link
                to="/login"
                className="rounded-2xl border-2 border-primary-300 bg-white/90 px-10 py-4 text-xl font-semibold text-primary-700 shadow-soft backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary-700 hover:bg-primary-50 hover:shadow-elevated"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto -mt-2 mb-24 w-[calc(100vw-2rem)] max-w-none rounded-[4rem] border border-primary-900 bg-primary-900 px-8 py-16 shadow-[0_20px_80px_rgba(0,0,0,0.15)] sm:px-16">
        <h2 className="mb-16 text-center text-4xl font-extrabold tracking-tight text-primary-50">
          Powerful Features for Modern Teams
        </h2>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="rounded-[2rem] border-2 border-white/40 bg-white/90 p-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:border-white/60 hover:bg-white/95 hover:shadow-[0_25px_60px_rgba(0,0,0,0.2)]"
              style={{ animationDelay: `${0.2 + i * 0.2}s` }}
            >
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] border-2 border-primary-800 bg-white/80 text-4xl shadow-medium transition-transform hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="mb-4 text-2xl font-bold text-text-primary">{feature.title}</h3>
              <p className="text-lg leading-relaxed text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-light bg-gradient-to-br from-surface-app to-surface-card px-8 py-12 text-center">
        <p className="text-sm text-text-tertiary">
          &copy; {new Date().getFullYear()} CollabApp. Empowering teams to achieve more together.
        </p>
      </footer>
    </div>
  )
}
