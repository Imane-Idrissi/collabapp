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
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-white via-[#f8fafc] to-[#f1f5f9]">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[rgba(59,130,246,0.1)] bg-white/90 shadow-[0_4px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all hover:bg-white/95 hover:shadow-[0_8px_40px_rgba(0,0,0,0.1)]">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <Link to="/" className="flex items-center gap-3 transition-transform hover:-translate-y-0.5">
            <div className="flex h-11 w-11 animate-bounce items-center justify-center rounded-xl bg-[hsl(172,22%,20%)] text-lg font-bold text-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] [animation-duration:6s]">
              C
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(172,22%,20%)]">CollabApp</h1>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-[hsl(172,22%,20%)] px-6 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-[hsl(172,22%,15%)] hover:shadow-elevated"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg border-2 border-[hsl(172,22%,20%)] px-6 py-2.5 text-sm font-medium text-[hsl(172,22%,20%)] transition-all hover:-translate-y-0.5 hover:bg-[hsl(172,22%,95%)] hover:shadow-elevated"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-[hsl(172,22%,20%)] px-6 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-[hsl(172,22%,15%)] hover:shadow-elevated"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-8 pb-20 pt-32 text-center animate-[fadeInUp_1s_ease-out]">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.12)_0%,transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-40 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(29,78,216,0.1)_0%,transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/2 h-[350px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.08)_0%,transparent_70%)] blur-3xl" />

        <h1 className="relative mb-8 text-5xl font-extrabold leading-tight tracking-tight text-[hsl(172,22%,20%)] sm:text-6xl lg:text-7xl" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          The Future of Team{' '}
          <br />
          Collaboration is{' '}
          <span className="bg-[linear-gradient(135deg,#1d4ed8,#10b981,#f97316,#10b981,#1d4ed8)] bg-[length:400%_400%] bg-clip-text text-transparent animate-[shimmer_4.5s_ease-in-out_infinite]">
            Here
          </span>
        </h1>
        <p className="relative mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-[#334155]" style={{ fontWeight: 450 }}>
          Enhance your team collaboration with Kanban boards and AI extraction tools.
          Discuss naturally with your team and let AI decide which tasks you need to perform.
        </p>
        <div className="relative mb-12 flex flex-wrap items-center justify-center gap-5">
          {user ? (
            <Link
              to="/dashboard"
              className="relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-[hsl(172,22%,20%)] px-12 py-4 text-xl font-semibold text-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-1 hover:bg-[hsl(172,22%,15%)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-[hsl(172,22%,20%)] px-12 py-4 text-xl font-semibold text-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-1 hover:bg-[hsl(172,22%,15%)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
              >
                Start Free Trial
              </Link>
              <Link
                to="/login"
                className="rounded-2xl border-2 border-[hsl(172,22%,60%)] bg-white/90 px-12 py-4 text-xl font-semibold text-[hsl(172,22%,20%)] shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-[hsl(172,22%,20%)] hover:bg-[hsl(172,22%,95%)] hover:text-[hsl(172,22%,15%)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features — animated gradient border */}
      <div className="mx-4 mb-24 rounded-[4rem] bg-[linear-gradient(135deg,#1d4ed8,#10b981,#f97316,#10b981,#1d4ed8)] bg-[length:400%_400%] p-[2px] shadow-[0_20px_80px_rgba(0,0,0,0.15)] animate-[shimmer_4.5s_ease-in-out_infinite] sm:mx-6">
        <section className="relative rounded-[calc(4rem-2px)] bg-[hsl(172,22%,20%)] px-8 py-20 sm:px-16">
          <h2 className="mb-16 text-center text-4xl font-extrabold tracking-tight text-[hsl(60,100%,96%)]">
            Powerful Features for Modern Teams
          </h2>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="rounded-[2rem] border-2 border-white/40 bg-white/90 p-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-all duration-300 animate-[fadeInUp_1s_ease-out_both] hover:-translate-y-2 hover:border-white/60 hover:bg-white/95 hover:shadow-[0_25px_60px_rgba(0,0,0,0.2)]"
                style={{ animationDelay: `${0.2 + i * 0.2}s` }}
              >
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] border-2 border-[hsl(172,22%,20%)] bg-white/80 text-4xl shadow-medium animate-[pulse_4s_ease-in-out_infinite] transition-transform hover:scale-110 hover:bg-white/95 hover:shadow-[0_12px_48px_rgba(0,0,0,0.15)]" style={{ animationDelay: `${1 + i}s` }}>
                  {feature.icon}
                </div>
                <h3 className="mb-4 text-2xl font-bold text-[#1e293b]">{feature.title}</h3>
                <p className="text-lg leading-relaxed text-[#374151]">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[rgba(148,163,184,0.2)] bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] px-8 py-12 text-center">
        <p className="text-sm text-[#64748b]">
          &copy; {new Date().getFullYear()} CollabApp. Empowering teams to achieve more together.
        </p>
      </footer>
    </div>
  )
}
