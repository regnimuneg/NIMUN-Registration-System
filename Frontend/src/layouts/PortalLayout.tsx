import { useState, useCallback, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { Home, Smartphone, User, BarChart3, Users, Menu, LogOut, X, ClipboardList } from 'lucide-react'
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
  const isAnalyst = userRole === 'analyst'

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
    { href: '/analytics/scans', label: 'Live Board', icon: BarChart3, paths: ['/analytics/scans'] },
    ...(tokenManager.canSeeCommitteeReport() ? [{ href: '/analytics/committees', label: 'Committees', icon: ClipboardList, paths: ['/analytics/committees'] }] : []),
    { href: '/admin/participants', label: 'Participants', icon: Users, paths: ['/admin/participants'] },
    { href: '/member/scanner', label: 'Scanner', icon: Smartphone, paths: ['/member/scanner', '/scan'] }
  ]

  // Scanning desks: scanner only
  const memberLinks = [
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
          <div className="flex items-center justify-between p-4 border-b-2 border-[var(--oc-black)] bg-[var(--oc-blue)] text-[var(--oc-white)]">
            <div className="flex items-center">
              <img
                src="/oc27/stamp-light.png"
                alt="NIMUN'27 Setting the Standard"
                className="w-12 h-12 object-contain mr-3"
              />
              <span className="oc-display text-base font-extrabold uppercase">NIMUN&apos;27</span>
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
              {isAdmin && adminLinks.map(({ href, label, icon: Icon, paths }) => (
                <a
                  key={href}
                  href={href}
                  className={`flex items-center px-4 py-3 text-base font-extrabold transition-colors ${isActive(paths) ? 'bg-[var(--oc-blue)] text-[var(--oc-white)]' : 'text-[var(--jn-blue)] hover:bg-blue-50'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {label}
                </a>
              ))}

              {isAnalyst && (
                <a
                  href="/analytics/scans"
                  className="flex items-center px-4 py-3 rounded-2xl text-base font-extrabold text-[var(--jn-blue)] hover:bg-blue-50 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  Live Board
                </a>
              )}

              {isAnalyst && tokenManager.canScan() && (
                <a
                  href="/member/scanner"
                  className="flex items-center px-4 py-3 rounded-2xl text-base font-extrabold text-[var(--jn-blue)] hover:bg-blue-50 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Smartphone className="w-5 h-5 mr-3" />
                  Scanner
                </a>
              )}

              {isMember && (
                <>
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
          <nav className="bg-[var(--oc-blue)] border-b-2 border-[var(--oc-black)] px-4 sm:px-6 lg:px-10 py-3 md:py-4 transition-all duration-200">
            <div className="flex justify-between items-center">
              <a href={isAnalyst ? '/analytics/scans' : isMember ? '/member/scanner' : '/admin/dashboard'} className="flex items-center min-w-0">
                <img
                  src="/oc27/stamp-light.png"
                  alt="NIMUN'27 Setting the Standard"
                  className="w-12 h-12 md:w-14 md:h-14 object-contain mr-3"
                />
                <div className="flex flex-col">
                  <span className="oc-display text-lg sm:text-2xl font-extrabold text-[var(--oc-white)] hidden sm:block leading-none">
                    NIMUN&apos;27 <span className="font-mono font-normal text-sm tracking-[0.2em] align-middle opacity-80">PORTAL</span>
                  </span>
                  <span className="oc-display text-base font-extrabold text-[var(--oc-white)] block sm:hidden">
                    NIMUN&apos;27
                  </span>
                </div>
              </a>
              <div className="hidden md:flex items-center space-x-2">
                {isAdmin && adminLinks.map(({ href, label, icon: Icon, paths }) => (
                  <a
                    key={href}
                    href={href}
                    title={label}
                    className={`nav-link !px-3 whitespace-nowrap flex items-center border-2 ${isActive(paths) ? 'border-white/80 bg-[var(--oc-white)] !text-[var(--oc-blue)]' : 'border-transparent'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="ml-2 hidden xl:inline text-sm">{label}</span>
                  </a>
                ))}
                {isAnalyst && (
                  <a href="/analytics/scans" className={`nav-link flex items-center border-2 border-white/80 ${isActive(['/analytics/scans']) ? 'bg-[var(--oc-white)] !text-[var(--oc-blue)]' : ''}`}>
                    <BarChart3 className="w-4 h-4" />
                    <span className="ml-2 hidden lg:inline text-sm">Live Board</span>
                  </a>
                )}
                {isAnalyst && tokenManager.canScan() && (
                  <a href="/member/scanner" className={`nav-link flex items-center border-2 border-white/80 ${isActive(['/member/scanner', '/scan']) ? 'bg-[var(--oc-white)] !text-[var(--oc-blue)]' : ''}`}>
                    <Smartphone className="w-4 h-4" />
                    <span className="ml-2 hidden lg:inline text-sm">Scanner</span>
                  </a>
                )}
                {isMember && (
                  memberLinks.map(({ href, label, icon: Icon, paths }) => (
                    <a key={href} href={href} className={`nav-link flex items-center border-2 border-white/80 ${isActive(paths) ? 'bg-[var(--oc-white)] !text-[var(--oc-blue)]' : ''}`}>
                      <Icon className="w-4 h-4" />
                      <span className="ml-2 hidden lg:inline text-sm">{label}</span>
                    </a>
                  ))
                )}
                {isAuthenticated && (
                  <button
                    onClick={handleSignOut}
                    className="nav-link !px-3 whitespace-nowrap flex items-center border-2 border-white/80 ml-2"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="ml-2 hidden lg:inline text-sm">Sign Out</span>
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
