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
    navigate('/login')
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
    <div className="min-h-screen bg-surface-app">
      {/* Top bar */}
      <header className="border-b border-border-light bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-800 text-sm font-bold text-white">
              C
            </div>
            <span className="text-lg font-bold tracking-tight text-text-primary">CollabApp</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">Hi, {firstName}</span>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Email verification banner */}
        {currentUser && !currentUser.email_verified && (
          <EmailVerificationBanner user={currentUser} onUserUpdate={handleUserUpdate} />
        )}

        {/* Section heading */}
        <h2 className="mb-5 text-xl font-semibold text-text-primary">My Projects</h2>

        {/* Search + Create */}
        <div className="mb-6 flex items-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="flex-1 rounded-lg border border-border-medium px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:shadow-focus"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="whitespace-nowrap rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
          >
            + New Project
          </button>
        </div>

        {/* Project list */}
        {isLoading ? (
          <LoadingSpinner />
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border-medium py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-2xl">
              📋
            </div>
            <p className="mb-1 text-sm font-medium text-text-primary">
              {isSearching ? 'No projects found' : 'No projects yet'}
            </p>
            <p className="text-sm text-text-tertiary">
              {isSearching
                ? 'Try a different search term.'
                : 'Create your first project to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
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
