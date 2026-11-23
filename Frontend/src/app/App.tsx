import { Routes, Route, Navigate } from 'react-router-dom'
import PortalLayout from '../layouts/PortalLayout'
import LoginPage from '../features/auth/LoginPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import ScanPage from '../features/dashboard/ScanPage'
import RegisterPage from '../features/registration/RegisterPage'
import ImportPage from '../features/registration/ImportPage'
import AnalyticsPage from '../features/analytics/AnalyticsPage'
import MemberDashboardPage from '../features/member/MemberDashboardPage'
import MemberParticipantsPage from '../features/member/MemberParticipantsPage'
import ParticipantsPage from '../features/participants/ParticipantsPage'
import ScanAnalyticsPage from '../features/analytics/ScanAnalyticsPage'
import { tokenManager } from '../lib/api'

// Protected Route Component
// Roles: admin (full access), member (scanner), analyst (scan analytics only).
// The backend enforces the same rules; this only decides which pages to show.
function ProtectedRoute({ children, requireAdmin = false, allow }: { children: React.ReactNode, requireAdmin?: boolean, allow?: string[] }) {
  const token = tokenManager.getToken()
  const userRole = tokenManager.getUserRole()

  if (!token || !tokenManager.isTokenValid()) {
    return <Navigate to="/auth/login" replace />
  }

  const allowed = allow ?? (requireAdmin ? ['admin'] : ['admin', 'member'])
  if (!userRole || !allowed.includes(userRole)) {
    return <Navigate to={userRole === 'analyst' ? '/analytics/scans' : '/member/scanner'} replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public route - only login */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/auth/login" replace />} />

      {/* All other routes are protected and require authentication */}
      <Route element={<PortalLayout />}>

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requireAdmin><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin/register" element={<ProtectedRoute requireAdmin><RegisterPage /></ProtectedRoute>} />
        <Route path="/register" element={<ProtectedRoute requireAdmin><RegisterPage /></ProtectedRoute>} />
        <Route path="/admin/import" element={<ProtectedRoute requireAdmin><ImportPage /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute requireAdmin><ImportPage /></ProtectedRoute>} />
        <Route path="/admin/participants" element={<ProtectedRoute requireAdmin><ParticipantsPage /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute requireAdmin><AnalyticsPage /></ProtectedRoute>} />

        {/* Scan analytics: full-access accounts and analysts */}
        <Route path="/analytics/scans" element={<ProtectedRoute allow={['admin', 'analyst']}><ScanAnalyticsPage /></ProtectedRoute>} />

        {/* Member routes */}
        <Route path="/member" element={<ProtectedRoute><MemberDashboardPage /></ProtectedRoute>} />
        <Route path="/member/participants" element={<ProtectedRoute><MemberParticipantsPage /></ProtectedRoute>} />
        <Route path="/member/scanner" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}

