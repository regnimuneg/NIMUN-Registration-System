import { useState, useCallback, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { Home, Settings, Smartphone, User, BarChart3, Users, Menu, LogOut, X } from 'lucide-react'
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

  const isActive = (paths: string[]) => paths.includes(location.pathname)

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: Home, paths: ['/admin/dashboard', '/admin', '/dashboard'] },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, paths: ['/admin/analytics', '/analytics'] },
    { href: '/admin/register', label: 'Register', icon: User, paths: ['/admin/register', '/register'] },
    { href: '/admin/import', label: 'Import CSV', icon: BarChart3, paths: ['/admin/import', '/import'] },
    { href: '/admin/participants', label: 'Participants', icon: Users, paths: ['/admin/participants'] },
    { href: '/member/scanner', label: 'Scanner', icon: Smartphone, paths: ['/member/scanner', '/scan'] }
  ]

  const memberLinks = [
    { href: '/member/participants', label: 'Participants', icon: Users, paths: ['/member/participants'] },
    { href: '/member/scanner', label: 'Scanner', icon: Smartphone, paths: ['/member/scanner', '/scan'] }
  ]

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
    <div className="min-h-screen text-text-primary overflow-x-hidden">
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
        className={`mobile-sidebar fixed top-0 right-0 h-screen w-80 max-w-[85vw] bg-white shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-in-out overflow-hidden border-l-4 border-[var(--jn-pink)] ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-white/30 bg-[var(--jn-blue)] bg-[url('/doodles.png')] bg-[length:420px_auto] text-white">
            <div className="flex items-center">
              <img
                src="/element_01_x268_y31_w228_h189.png"
                alt="NIMUN'26 Logo"
                className="w-16 h-14 object-contain mr-3 drop-shadow"
              />
              <span className="text-lg font-black">JNIMUN&apos;26</span>
            </div>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false)
                setMobileAdminOpen(false)
                setMobileMemberOpen(false)
              }}
              className="p-2 rounded-xl hover:bg-white/15 transition-colors"
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
                    className="flex items-center px-4 py-3 rounded-2xl text-base font-extrabold text-[var(--jn-blue)] hover:bg-blue-50 transition-colors"
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
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-base font-extrabold text-[var(--jn-blue)] hover:bg-blue-50 transition-colors"
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
                        {adminLinks.map(({ href, label, icon: Icon, paths }) => (
                          <a
                            key={href}
                            href={href}
                            className={`flex items-center px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors ${isActive(paths) ? 'bg-[var(--jn-pink)] text-white' : 'text-gray-700 hover:bg-blue-50 hover:text-[var(--jn-blue)]'}`}
                            onClick={() => {
                              setIsMobileMenuOpen(false)
                              setMobileAdminOpen(false)
                            }}
                          >
                            <Icon className="w-4 h-4 mr-3" />
                            {label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {isMember && (
                <>
                  <a
                    href="/member/participants"
                    className="flex items-center px-4 py-3 rounded-2xl text-base font-extrabold text-[var(--jn-blue)] hover:bg-blue-50 transition-colors"
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
                    className="flex items-center px-4 py-3 rounded-2xl text-base font-extrabold text-[var(--jn-blue)] hover:bg-blue-50 transition-colors"
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
                className="w-full jn-sticker-button px-4 py-3"
                style={{ '--button-color': 'var(--jn-pink)' } as CSSProperties}
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
        <div className="fixed top-0 left-0 right-0 z-30">
          <nav className="bg-[var(--jn-blue)] bg-[url('/doodles.png')] bg-[length:720px_auto] px-4 sm:px-6 lg:px-10 py-3 md:py-4 shadow-[0_8px_24px_rgba(78,142,203,0.28)] transition-all duration-200">
            <div className="flex justify-between items-center">
              <a href="/admin/dashboard" className="flex items-center min-w-0">
                <img
                  src="/element_01_x268_y31_w228_h189.png"
                  alt="NIMUN'26 Logo"
                  className="w-16 h-14 md:w-20 md:h-16 object-contain mr-3 drop-shadow-lg"
                />
                <div className="flex flex-col">
                  <span className="text-lg sm:text-2xl font-black text-white hidden sm:block leading-none">
                    JNIMUN&apos;<span className="text-[var(--jn-pink)]">26</span> System
                  </span>
                  <span className="text-base font-black text-white block sm:hidden">
                    JNIMUN&apos;<span className="text-[var(--jn-pink)]">26</span>
                  </span>
                </div>
              </a>
              <div className="hidden md:flex items-center space-x-2">
                {isAdmin && (
                  <>
                    <a
                      href="/admin/dashboard"
                      className={`nav-link flex items-center border-2 border-white/80 ${isActive(['/admin/dashboard', '/admin', '/dashboard']) ? 'bg-[var(--jn-pink)] shadow-[0_4px_0_rgba(0,0,0,0.18)]' : 'bg-white/0'}`}
                    >
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
                      <div className="absolute right-0 w-60 bg-white/95 backdrop-blur-md text-gray-900 rounded-3xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border-2 border-[var(--jn-blue)] mt-3 overflow-hidden">
                        {adminLinks.map(({ href, label, icon: Icon, paths }) => (
                          <a
                            key={href}
                            href={href}
                            className={`flex items-center px-4 py-3 text-base font-extrabold transition-colors ${isActive(paths) ? 'bg-[var(--jn-pink)] text-white' : 'hover:bg-blue-50 text-gray-800'}`}
                          >
                            <Icon className="w-5 h-5 mr-3" />
                            {label}
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {isMember && (
                  memberLinks.map(({ href, label, icon: Icon, paths }) => (
                    <a key={href} href={href} className={`nav-link flex items-center border-2 border-white/80 ${isActive(paths) ? 'bg-[var(--jn-pink)] shadow-[0_4px_0_rgba(0,0,0,0.18)]' : ''}`}>
                      <Icon className="w-4 h-4" />
                      <span className="ml-2 hidden lg:inline text-base">{label}</span>
                    </a>
                  ))
                )}
                {isAuthenticated && (
                  <button
                    onClick={handleSignOut}
                    className="nav-link flex items-center border-2 border-white/80 ml-2"
                  >
                    <LogOut className="w-4 h-4 text-[var(--jn-pink)]" />
                    <span className="ml-2 hidden lg:inline text-base">Sign Out</span>
                  </button>
                )}
              </div>
              <div className="md:hidden flex items-center gap-2">
                {isAuthenticated && (
                  <button
                    onClick={handleSignOut}
                    className="nav-link border-2 border-white/70"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                )}
                <button
                  className="mobile-menu-toggle nav-link border-2 border-white/70"
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
      <main className="pt-24 sm:pt-28 md:pt-32 pb-4 sm:pb-8 px-2 sm:px-4 md:px-6 overflow-x-hidden w-full max-w-full">
        <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
