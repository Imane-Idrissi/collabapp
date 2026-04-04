import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'

const steps = [
  {
    number: '01',
    title: 'Discuss Freely',
    description:
      'Your team talks about the project without worrying about structure. Ideas, questions, tangents. Just think out loud.',
  },
  {
    number: '02',
    title: 'AI Drafts the Tasks',
    description:
      'One click. AI reads what was said and gives you a list of tasks to start from. Not perfect, but not zero either.',
  },
  {
    number: '03',
    title: 'Review and Go',
    description:
      'Look at what the AI suggested, change what needs changing, and add the tasks to your board. You skip the hardest part: starting from a blank page.',
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
          Talk First.{' '}
          <br />
          Organize{' '}
          <span className="bg-[linear-gradient(135deg,#1d4ed8,#10b981,#f97316,#10b981,#1d4ed8)] bg-[length:400%_400%] bg-clip-text text-transparent animate-[shimmer_4.5s_ease-in-out_infinite]">
            Later
          </span>
        </h1>
        <p className="relative mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-[#334155]" style={{ fontWeight: 450 }}>
          Your team discusses a project freely. When the conversation is done,
          AI reads it and drafts the tasks for you. You review, adjust, and add them
          to your board. You never have to think about tasks from scratch.
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

      {/* Workflow — animated gradient border */}
      <div className="mx-4 mb-24 rounded-[4rem] bg-[linear-gradient(135deg,#1d4ed8,#10b981,#f97316,#10b981,#1d4ed8)] bg-[length:400%_400%] p-[2px] shadow-[0_20px_80px_rgba(0,0,0,0.15)] animate-[shimmer_4.5s_ease-in-out_infinite] sm:mx-6">
        <section className="relative rounded-[calc(4rem-2px)] bg-[hsl(172,22%,20%)] px-8 py-20 sm:px-16">
          <h2 className="mb-4 text-center text-4xl font-extrabold tracking-tight text-[hsl(60,100%,96%)]">
            From Messy Discussion to Clear Action
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-lg text-white/60">
            Structure comes after thinking, not during it.
          </p>

          <div className="mx-auto max-w-5xl">
            {/* Connecting line (desktop) */}
            <div className="pointer-events-none absolute left-1/2 top-[13.5rem] hidden h-[2px] w-[55%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent md:block" />

            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {steps.map((step, i) => (
                <div
                  key={step.number}
                  className="relative rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-sm transition-all duration-300 animate-[fadeInUp_1s_ease-out_both] hover:-translate-y-2 hover:border-white/20 hover:bg-white/10"
                  style={{ animationDelay: `${0.2 + i * 0.2}s` }}
                >
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d4ed8,#10b981,#f97316,#10b981,#1d4ed8)] bg-[length:400%_400%] text-xl font-bold text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] animate-[shimmer_4.5s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.5}s` }}>
                    {step.number}
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-white">{step.title}</h3>
                  <p className="text-base leading-relaxed text-white/70">{step.description}</p>
                </div>
              ))}
            </div>
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
