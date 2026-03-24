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
          <h1 className="text-lg font-semibold text-text-primary">Hi, {firstName}</h1>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="rounded-lg border border-border-medium px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-6">
        {/* Email verification banner */}
        {currentUser && !currentUser.email_verified && (
          <EmailVerificationBanner user={currentUser} onUserUpdate={handleUserUpdate} />
        )}

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
          <div className="py-12 text-center text-sm text-text-secondary">
            {isSearching
              ? 'No projects match your search.'
              : 'No projects yet. Create your first project to get started.'}
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
