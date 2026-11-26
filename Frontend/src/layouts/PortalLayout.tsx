import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { Home, Smartphone, BarChart3, Users, LogOut, ClipboardList } from 'lucide-react'
import { tokenManager, api } from '../lib/api'

export default function PortalLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Get user role from token manager
  const userRole = tokenManager.getUserRole()
  const isAdmin = userRole === 'admin'
  const isMember = userRole === 'member'
  const isAnalyst = userRole === 'analyst'
  const me = tokenManager.getUser()
  const signedInAs = me ? [me.id, me.name && me.name !== me.id ? me.name : null].filter(Boolean).join(', ') : ''

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

  const isActive = (paths: string[]) => paths.includes(location.pathname)

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', short: 'Home', icon: Home, paths: ['/admin/dashboard', '/admin', '/dashboard'] },
    { href: '/analytics/scans', label: 'Live Board', short: 'Live', icon: BarChart3, paths: ['/analytics/scans'] },
    ...(tokenManager.canSeeCommitteeReport() ? [{ href: '/analytics/committees', label: 'Committees', icon: ClipboardList, paths: ['/analytics/committees'] }] : []),
    { href: '/admin/participants', label: 'Participants', short: 'People', icon: Users, paths: ['/admin/participants'] },
    { href: '/member/scanner', label: 'Scanner', icon: Smartphone, paths: ['/member/scanner', '/scan'] }
  ]

  // Scanning desks: scanner only
  const memberLinks = [
    { href: '/member/scanner', label: 'Scanner', icon: Smartphone, paths: ['/member/scanner', '/scan'] }
  ]

  // Every page this account can open, in one list: the desktop bar and the
  // phone tab bar both read it, so the two never disagree.
  const navLinks: { href: string; label: string; short?: string; icon: typeof Home; paths: string[] }[] = isAdmin ? adminLinks
    : isAnalyst ? [
      { href: '/analytics/scans', label: 'Live Board', short: 'Live', icon: BarChart3, paths: ['/analytics/scans'] },
      ...(tokenManager.canScan() ? [{ href: '/member/scanner', label: 'Scanner', icon: Smartphone, paths: ['/member/scanner', '/scan'] }] : []),
    ]
    : isMember ? memberLinks : []
  // Phones: a bottom tab bar when there is more than one page to switch between
  const showTabBar = isAuthenticated && navLinks.length > 1

  return (
    <div className="min-h-screen text-text-primary overflow-x-hidden">
      {/* Top Navbar */}
      <header className="w-full">
        <div className="fixed top-0 left-0 right-0 z-30">
          <nav className="oc-topbar bg-[var(--oc-blue)] border-b-2 border-[var(--oc-black)] px-4 sm:px-6 lg:px-10 py-2 md:py-4 transition-all duration-200" aria-label="Main">
            <div className="flex justify-between items-center">
              <a href={isAnalyst ? '/analytics/scans' : isMember ? '/member/scanner' : '/admin/dashboard'} className="flex items-center min-w-0">
                <img
                  src="/oc27/stamp-light.png"
                  alt="NIMUN'27 Setting the Standard"
                  className="w-10 h-10 md:w-14 md:h-14 object-contain mr-3"
                />
                <div className="flex flex-col">
                  <span className="oc-display text-lg sm:text-2xl font-extrabold text-[var(--oc-white)] hidden sm:block leading-none">
                    NIMUN&apos;27 <span className="font-mono font-normal text-sm tracking-[0.2em] align-middle opacity-80 md:hidden xl:inline">PORTAL</span>
                  </span>
                  <span className="oc-display text-base font-extrabold text-[var(--oc-white)] block sm:hidden">
                    NIMUN&apos;27
                  </span>
                </div>
              </a>
              <div className="hidden md:flex items-center gap-1 lg:gap-1.5">
                {navLinks.map(({ href, label, icon: Icon, paths }) => (
                  <a
                    key={href}
                    href={href}
                    title={label}
                    aria-label={label}
                    aria-current={isActive(paths) ? 'page' : undefined}
                    className={`nav-link oc-nav-link whitespace-nowrap flex items-center border-2 ${isActive(paths) ? 'is-current' : 'border-transparent'}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="ml-2 hidden lg:inline">{label}</span>
                  </a>
                ))}
                {isAuthenticated && (
                  <button
                    onClick={handleSignOut}
                    className="nav-link oc-nav-link whitespace-nowrap flex items-center border-2 border-white/80 ml-2"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="ml-2 hidden lg:inline">Sign out</span>
                  </button>
                )}
              </div>
              {isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  className="md:hidden oc-signout-mobile"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className={`pt-[4.1rem] sm:pt-24 md:pt-32 pb-4 sm:pb-8 px-2 sm:px-4 md:px-6 overflow-x-hidden w-full max-w-full${showTabBar ? ' oc-has-tabbar' : ''}`}>
        <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden">
          <Outlet />
          {isAuthenticated && (
            <footer className="oc-footer">
              <img src="/oc27/stamp-blue.png" alt="" aria-hidden="true" />
              <span className="oc-footer-text">
                <span><b>NIMUN&apos;27</b> · Setting the standard</span>
                <span>OC Conference Portal{signedInAs ? ` · Signed in as ${signedInAs}` : ''}</span>
              </span>
            </footer>
          )}
        </div>
      </main>

      {/* Phone tab bar: every page one tap away, labelled, thumb-reachable */}
      {showTabBar && (
        <nav className="oc-tabbar md:hidden" aria-label="Pages">
          {navLinks.map(({ href, label, short, icon: Icon, paths }) => (
            <a key={href} href={href} className="oc-tab" aria-label={label} aria-current={isActive(paths) ? 'page' : undefined}>
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span aria-hidden="true">{short ?? label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  )
}
