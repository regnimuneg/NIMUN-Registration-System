import { useState, useCallback, useEffect } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { Home, Settings, Smartphone, Search, User, BarChart3, Users, Menu, LogOut, X } from 'lucide-react'
import { tokenManager, api } from '../lib/api'

export default function PortalLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false)
  const [mobileMemberOpen, setMobileMemberOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Get user role from token manager
  const userRole = tokenManager.getUserRole()
  const isAdmin = userRole === 'admin'
  const isMember = userRole === 'member'

  // Determine if user is on member routes (hide admin links)
  const isMemberRoute = location.pathname.startsWith('/member') || location.pathname === '/scan'

  // Check authentication status and redirect if not authenticated
  useEffect(() => {
    const checkAuth = () => {
      if (tokenManager.isTokenValid()) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
        tokenManager.clearToken()
        // Redirect to login if not authenticated
        if (location.pathname !== '/auth/login') {
          navigate('/auth/login', { replace: true })
        }
      }
    }

    checkAuth()
    // Check every minute
    const interval = setInterval(checkAuth, 60000)
    return () => clearInterval(interval)
  }, [location.pathname, navigate])

  const handleSignOut = async () => {
    try {
      await api.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      tokenManager.clearToken()
      setIsAuthenticated(false)
      navigate('/auth/login')
    }
  }

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
    if (isMobileMenuOpen) {
      setMobileAdminOpen(false)
      setMobileMemberOpen(false)
    }
  }, [isMobileMenuOpen])

  // Close sidebar when clicking outside
  useEffect(() => {
    if (isMobileMenuOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (!target.closest('.mobile-sidebar') && !target.closest('.mobile-menu-toggle')) {
          setIsMobileMenuOpen(false)
          setMobileAdminOpen(false)
          setMobileMemberOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden' // Prevent body scroll when sidebar is open
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.body.style.overflow = ''
      }
    } else {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <div className="min-h-screen bg-background-main text-text-primary overflow-x-hidden">
      {/* Backdrop overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => {
            setIsMobileMenuOpen(false)
            setMobileAdminOpen(false)
            setMobileMemberOpen(false)
          }}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`mobile-sidebar fixed top-0 right-0 h-screen w-80 max-w-[85vw] bg-white shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-in-out overflow-hidden ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center">
              <img
                src="/logo24.png"
                alt="NIMUN'26 Logo"
                className="w-10 h-10 object-contain mr-3"
              />
              <span className="text-lg font-semibold text-black">NIMUN'26</span>
            </div>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false)
                setMobileAdminOpen(false)
                setMobileMemberOpen(false)
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
            <div className="flex flex-col space-y-1 px-2 min-w-0">
              {isAdmin && (
                <>
                  <a
                    href="/admin/dashboard"
                    className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setMobileAdminOpen(false)
                    }}
                  >
                    <Home className="w-5 h-5 mr-3" />
                    Dashboard
                  </a>

                  <div>
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      onClick={() => setMobileAdminOpen(!mobileAdminOpen)}
                    >
                      <div className="flex items-center">
                        <Settings className="w-5 h-5 mr-3" />
                        Admin
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${mobileAdminOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {mobileAdminOpen && (
                      <div className="ml-4 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        <a
                          href="/admin/dashboard"
                          className="flex items-center px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setMobileAdminOpen(false)
                          }}
                        >
                          <Home className="w-4 h-4 mr-3" />
                          Dashboard
                        </a>
                        <a
                          href="/admin/analytics"
                          className="flex items-center px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setMobileAdminOpen(false)
                          }}
                        >
                          <BarChart3 className="w-4 h-4 mr-3" />
                          Analytics
                        </a>
                        <a
                          href="/admin/register"
                          className="flex items-center px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setMobileAdminOpen(false)
                          }}
                        >
                          <User className="w-4 h-4 mr-3" />
                          Register
                        </a>
                        <a
                          href="/admin/import"
                          className="flex items-center px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setMobileAdminOpen(false)
                          }}
                        >
                          <BarChart3 className="w-4 h-4 mr-3" />
                          Import CSV
                        </a>
                        <a
                          href="/admin/participants"
                          className="flex items-center px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setMobileAdminOpen(false)
                          }}
                        >
                          <Users className="w-4 h-4 mr-3" />
                          Participants
                        </a>
                        <a
                          href="/member/scanner"
                          className="flex items-center px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setMobileAdminOpen(false)
                          }}
                        >
                          <Smartphone className="w-4 h-4 mr-3" />
                          Scanner
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}

              {isMember && (
                <>
                  <a
                    href="/member/participants"
                    className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setMobileMemberOpen(false)
                    }}
                  >
                    <Users className="w-5 h-5 mr-3" />
                    Participants
                  </a>
                  <a
                    href="/member/scanner"
                    className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setMobileMemberOpen(false)
                    }}
                  >
                    <Smartphone className="w-5 h-5 mr-3" />
                    Scanner
                  </a>
                </>
              )}
            </div>
          </nav>

          {/* Sidebar Footer */}
          {isAuthenticated && (
            <div className="border-t border-gray-200 p-4">
              <button
                onClick={() => {
                  handleSignOut()
                  setIsMobileMenuOpen(false)
                  setMobileAdminOpen(false)
                  setMobileMemberOpen(false)
                }}
                className="w-full flex items-center justify-center px-4 py-3 rounded-lg text-base font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Top Navbar */}
      <header className="w-full">
        <div className="fixed top-2 md:top-4 left-2 right-2 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-30 md:w-[95%] md:max-w-6xl">
          <nav className="rounded-full backdrop-blur-md bg-white shadow-lg px-4 py-2 md:px-6 border border-border transition-all duration-200">
            <div className="flex justify-between items-center">
              <a href="/admin/dashboard" className="flex items-center">
                <img
                  src="/logo24.png"
                  alt="NIMUN'26 Logo"
                  className="w-10 h-10 md:w-12 md:h-12 object-contain mr-3"
                />
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-black hidden sm:block">
                    NIMUN'26 System
                  </span>
                  <span className="text-base font-semibold text-black block sm:hidden">
                    NIMUN'26
                  </span>
                </div>
              </a>
              <div className="hidden md:flex items-center space-x-2">
                {isAdmin && (
                  <>
                    <a href="/admin/dashboard" className="nav-link flex items-center">
                      <Home className="w-4 h-4" />
                      <span className="ml-2 hidden lg:inline text-base">Dashboard</span>
                    </a>
                    <div className="relative group">
                      <button className="nav-link flex items-center">
                        <Settings className="w-4 h-4" />
                        <span className="ml-2 hidden lg:inline text-base">Admin</span>
                        <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="absolute right-0 w-56 bg-white/95 backdrop-blur-md text-gray-900 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-white/20 mt-2">
                        <a href="/admin/dashboard" className="flex items-center px-4 py-3 hover:bg-gray-100 rounded-t-2xl text-base font-medium transition-colors">
                          <Settings className="w-5 h-5 mr-3" />
                          Admin Dashboard
                        </a>
                        <a href="/admin/analytics" className="flex items-center px-4 py-3 hover:bg-gray-100 text-base font-medium transition-colors">
                          <BarChart3 className="w-5 h-5 mr-3" />
                          Analytics
                        </a>
                        <a href="/admin/register" className="flex items-center px-4 py-3 hover:bg-gray-100 text-base font-medium transition-colors">
                          <User className="w-5 h-5 mr-3" />
                          Register
                        </a>
                        <a href="/admin/import" className="flex items-center px-4 py-3 hover:bg-gray-100 text-base font-medium transition-colors">
                          <BarChart3 className="w-5 h-5 mr-3" />
                          Import CSV
                        </a>
                        <a href="/admin/participants" className="flex items-center px-4 py-3 hover:bg-gray-100 text-base font-medium transition-colors">
                          <Users className="w-5 h-5 mr-3" />
                          Participants
                        </a>
                        <a href="/member/scanner" className="flex items-center px-4 py-3 hover:bg-gray-100 rounded-b-2xl text-base font-medium transition-colors">
                          <Smartphone className="w-5 h-5 mr-3" />
                          Scanner
                        </a>
                      </div>
                    </div>
                  </>
                )}
                {isMember && (
                  <>
                    <a href="/member/participants" className="nav-link flex items-center">
                      <Users className="w-4 h-4" />
                      <span className="ml-2 hidden lg:inline text-base">Participants</span>
                    </a>
                    <a href="/member/scanner" className="nav-link flex items-center">
                      <Smartphone className="w-4 h-4" />
                      <span className="ml-2 hidden lg:inline text-base">Scanner</span>
                    </a>
                  </>
                )}
                {isAuthenticated && (
                  <button
                    onClick={handleSignOut}
                    className="nav-link flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="ml-2 hidden lg:inline text-base">Sign Out</span>
                  </button>
                )}
              </div>
              <div className="md:hidden flex items-center gap-2">
                {isAuthenticated && (
                  <button
                    onClick={handleSignOut}
                    className="nav-link text-red-600"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                )}
                <button
                  className="mobile-menu-toggle nav-link"
                  onClick={toggleMobileMenu}
                  aria-label="Toggle mobile menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>
            </div>
          </nav>
        </div>
      </header>
      <main className="pt-16 sm:pt-20 md:pt-24 pb-4 sm:pb-8 px-2 sm:px-4 md:px-6 overflow-x-hidden w-full max-w-full">
        <div className="mx-auto w-full max-w-6xl min-w-0 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
