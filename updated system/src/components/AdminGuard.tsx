'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authenticateAdmin, type AuthResult } from '@/lib/adminAuth'

interface AdminGuardProps {
  children: React.ReactNode
}

interface AdminSession {
  username: string
  name: string
  role: 'super-admin' | 'admin'
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const router = useRouter()

  useEffect(() => {
    // Check if already authenticated in this session
    const adminData = sessionStorage.getItem('adminSession')
    if (adminData) {
      try {
        const session = JSON.parse(adminData) as AdminSession
        setAdminSession(session)
        setIsAuthenticated(true)
      } catch {
        sessionStorage.removeItem('adminSession')
        setIsAuthenticated(false)
      }
    } else {
      setIsAuthenticated(false)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    const authResult: AuthResult = authenticateAdmin(username, password)
    
    if (authResult.success && authResult.admin) {
      const session: AdminSession = {
        username: authResult.admin.username,
        name: authResult.admin.name,
        role: authResult.admin.role
      }
      
      sessionStorage.setItem('adminSession', JSON.stringify(session))
      setAdminSession(session)
      setIsAuthenticated(true)
      setError('')
      setAttempts(0)
      setUsername('')
      setPassword('')
    } else {
      setAttempts(prev => prev + 1)
      setError(`${authResult.error}. Attempt ${attempts + 1}/3`)
      setPassword('')
      
      // Block after 3 attempts
      if (attempts >= 2) {
        setError('Too many failed attempts. Redirecting to home page...')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminSession')
    setAdminSession(null)
    setIsAuthenticated(false)
    setUsername('')
    setPassword('')
    setError('')
    setAttempts(0)
  }

  // Show loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Access Required
            </h2>
            <p className="text-gray-600 mb-8">
              Please enter the admin password to access the administration panel.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter username"
                disabled={attempts >= 3}
                autoFocus
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter password"
                disabled={attempts >= 3}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={!username.trim() || !password.trim() || attempts >= 3}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {attempts >= 3 ? 'Blocked' : 'Access Admin Panel'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Back to Home
              </button>
            </div>
          </form>

          <div className="text-center">
            <button
              onClick={() => router.push('/member')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Access Member Dashboard Instead
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="text-sm text-blue-800">
              <strong>Admin Credentials:</strong>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <div><strong>Super Admin:</strong> jnimun.admin / JNIMUN2025@Admin</div>
              <div><strong>Tech Team:</strong> tech.admin / TechTeam@2025</div>
              <div><strong>Event Mgmt:</strong> event.admin / EventMgmt@2025</div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-800">
              <strong>Note:</strong> Only authorized administrators should access this area. 
              For QR scanning and tracking, please use the Member Dashboard.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show authenticated content with logout option
  return (
    <div>
      {/* Admin Header with Logout */}
      <div className="bg-blue-700 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-sm">🔑 Admin Mode</span>
            {adminSession && (
              <div className="text-sm">
                <span className="opacity-75">Welcome,</span> <strong>{adminSession.name}</strong>
                <span className="ml-2 px-2 py-1 bg-blue-800 rounded text-xs">
                  {adminSession.role === 'super-admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </div>
      {children}
    </div>
  )
} 