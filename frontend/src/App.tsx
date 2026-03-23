import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ProtectedRoute } from './shared/ProtectedRoute'
import { SignupPage } from './features/auth/pages/SignupPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage'

function DashboardPlaceholder() {
  return <div>Dashboard (Phase F2)</div>
}

function ProjectPlaceholder() {
  return <div>Project (Phase F3)</div>
}

function InvitePlaceholder() {
  return <div>Invite Accept (Phase F3)</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPlaceholder /></ProtectedRoute>} />
          <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectPlaceholder /></ProtectedRoute>} />
          <Route path="/invite/:token" element={<InvitePlaceholder />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
