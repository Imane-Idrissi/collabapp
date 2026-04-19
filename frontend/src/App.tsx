import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ProtectedRoute } from './shared/ProtectedRoute'
import { ErrorBoundary } from './shared/ErrorBoundary'
import { SignupPage } from './features/auth/pages/SignupPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from './features/auth/pages/VerifyEmailPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { ProjectPage } from './features/project/pages/ProjectPage'
import { InviteAcceptPage } from './features/project/pages/InviteAcceptPage'
import { HomePage } from './pages/HomePage'

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
          <Route path="/invite/:token" element={<InviteAcceptPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
