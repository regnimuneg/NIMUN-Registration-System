import { Routes, Route, Navigate } from 'react-router-dom'
import PortalLayout from '../layouts/PortalLayout'
import LoginPage from '../features/auth/LoginPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import ScanPage from '../features/dashboard/ScanPage'
import MemberDashboardPage from '../features/member/MemberDashboardPage'
import MemberParticipantsPage from '../features/member/MemberParticipantsPage'
import ParticipantsPage from '../features/participants/ParticipantsPage'
import ScanAnalyticsPage from '../features/analytics/ScanAnalyticsPage'
import CommitteeAttendancePage from '../features/analytics/CommitteeAttendancePage'
import { tokenManager } from '../lib/api'

// Protected Route Component
// Roles: admin (full access), member (scanning desk: scanner page only), analyst (scan analytics only;
// analysts with canScan, the OC team heads, may also open the scanner).
// The backend enforces the same rules; this only decides which pages to show.
function ProtectedRoute({ children, requireAdmin = false, allow, scanner = false }: { children: React.ReactNode, requireAdmin?: boolean, allow?: string[], scanner?: boolean }) {
  const token = tokenManager.getToken()
  const userRole = tokenManager.getUserRole()

  if (!token || !tokenManager.isTokenValid()) {
    return <Navigate to="/auth/login" replace />
  }

  const allowed = allow ?? (requireAdmin ? ['admin'] : ['admin', 'member'])
  if (!userRole || !(allowed.includes(userRole) || (scanner && tokenManager.canScan()))) {
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
        <Route path="/admin/participants" element={<ProtectedRoute requireAdmin><ParticipantsPage /></ProtectedRoute>} />

        {/* Scan analytics: full-access accounts and analysts */}
        <Route path="/analytics/scans" element={<ProtectedRoute allow={['admin', 'analyst']}><ScanAnalyticsPage /></ProtectedRoute>} />

        {/* Committee attendance: OC-REG and OC-HB only (server enforces it too) */}
        <Route path="/analytics/committees" element={<ProtectedRoute requireAdmin>{tokenManager.canSeeCommitteeReport() ? <CommitteeAttendancePage /> : <Navigate to="/admin/dashboard" replace />}</ProtectedRoute>} />

        {/* Member routes */}
        <Route path="/member" element={<ProtectedRoute requireAdmin><MemberDashboardPage /></ProtectedRoute>} />
        <Route path="/member/participants" element={<ProtectedRoute requireAdmin><MemberParticipantsPage /></ProtectedRoute>} />
        <Route path="/member/scanner" element={<ProtectedRoute scanner><ScanPage /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute scanner><ScanPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}

