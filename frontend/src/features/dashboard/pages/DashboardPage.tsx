import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext'
import { api } from '../../../lib/api'
import { useDebounce } from '../../../hooks/useDebounce'
import { EmailVerificationBanner } from '../components/EmailVerificationBanner'
import { LogoutConfirmationModal } from '../components/LogoutConfirmationModal'
import { CreateProjectModal } from '../components/CreateProjectModal'
import { ProjectCard } from '../components/ProjectCard'
import { LoadingSpinner } from '../../../shared/LoadingSpinner'
import type { User } from '../../../types'
import * as authStorage from '../../../lib/auth'

interface ProjectSummary {
  id: number
  name: string
  description: string
  member_count: number
  created_at: string
}

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentUser, setCurrentUser] = useState(user)

  useEffect(() => {
    if (user) setCurrentUser(user)
  }, [user])

  const fetchProjects = useCallback(async (query: string) => {
    setIsLoading(true)
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : ''
      const data = await api.get<ProjectSummary[]>(`/api/projects${params}`)
      setProjects(data)
    } catch {
      // silently fail — empty list shown
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects(debouncedSearch)
  }, [debouncedSearch, fetchProjects])

  function handleLogout() {
    logout()
    window.location.href = '/'
  }

  function handleUserUpdate(updatedUser: User) {
    setCurrentUser(updatedUser)
    authStorage.setUser(updatedUser)
  }

  function handleProjectCreated(project: { id: number; name: string; description: string }) {
    setShowCreateModal(false)
    navigate(`/projects/${project.id}`)
  }

  const firstName = (currentUser?.name ?? '').split(' ')[0]
  const isSearching = search.trim().length > 0

  return (
    <div className="min-h-screen bg-[hsl(60,100%,99%)]">
      {/* Top bar */}
      <header className="border-b-2 border-primary-800 bg-white/95 px-6 py-4 shadow-[0_1px_20px_rgba(0,0,0,0.03)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-800 text-sm font-bold text-white">
              C
            </div>
            <span className="text-lg font-bold tracking-tight text-primary-800">CollabApp</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ backgroundColor: currentUser?.avatar_color ?? '#64748b' }}>
                {(currentUser?.name ?? '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <span className="text-sm font-medium text-text-primary">{firstName}</span>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-10">
        {/* Welcome section */}
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-primary-800">
          Welcome back, {firstName}
        </h1>

        {/* Email verification banner */}
        {currentUser && !currentUser.email_verified && (
          <EmailVerificationBanner user={currentUser} onUserUpdate={handleUserUpdate} />
        )}

        {/* Projects card */}
        <div className="rounded-2xl border-2 border-primary-800 bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-text-primary">My Projects</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="whitespace-nowrap rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-0.5 hover:bg-primary-900 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
            >
              + New Project
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-lg border-2 border-border-medium bg-[hsl(60,100%,99%)] px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-800 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.05)]"
            />
          </div>

          {/* Project list */}
          {isLoading ? (
            <LoadingSpinner />
          ) : projects.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-base text-primary-600">
                {isSearching
                  ? 'No projects match your search.'
                  : 'No projects yet. Click "+ New Project" to get started.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </main>

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  )
}
