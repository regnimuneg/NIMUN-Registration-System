'use client'
import { useState, useCallback } from 'react'

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false)
  const [mobileMemberOpen, setMobileMemberOpen] = useState(false)
  
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
    // Close submenus when main menu closes
    if (isMobileMenuOpen) {
      setMobileAdminOpen(false)
      setMobileMemberOpen(false)
    }
  }, [isMobileMenuOpen])

  return (
    <div className="fixed top-2 md:top-4 left-2 right-2 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-50 md:w-[95%] md:max-w-6xl">
      <nav className="rounded-full backdrop-blur-md bg-white/90 shadow-lg px-4 py-3 md:px-6 border border-white/20 transition-all duration-200 font-body">
        <div className="flex justify-between items-center">
          {/* Brand Logo */}
          <div className="flex items-center">
                         <img src="/NIMUN LOGO'25.png" alt="NIMUN Logo" className="w-8 h-8 object-contain mr-3" />
            <h1 className="text-lg font-heading text-[var(--primary)] hidden sm:block">
              JNIMUN'25 System
            </h1>
            <h1 className="text-base font-heading text-[var(--primary)] block sm:hidden">
              JNIMUN'25
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <a href="/" className="nav-link">
              <span className="text-sm">🏠</span>
              <span className="ml-1 hidden lg:inline">Home</span>
            </a>
            
            {/* Admin Dropdown */}
            <div className="relative group">
              <button className="nav-link flex items-center">
                <span className="text-sm">🔧</span>
                <span className="ml-1 hidden lg:inline">Admin</span>
                <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 w-48 bg-white/95 backdrop-blur-md text-gray-900 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-white/20 mt-2">
                <a href="/admin" className="block px-4 py-3 hover:bg-[var(--primary)]/5 rounded-t-2xl text-sm font-medium transition-colors">
                  🔧 Admin Dashboard
                </a>
                <a href="/admin/dashboard" className="block px-4 py-3 hover:bg-[var(--primary)]/5 text-sm font-medium transition-colors">
                  📱 QR Scanner
                </a>
                <a href="/admin/register" className="block px-4 py-3 hover:bg-[var(--primary)]/5 text-sm font-medium transition-colors">
                  👤 Register
                </a>
                <a href="/admin/import" className="block px-4 py-3 hover:bg-[var(--primary)]/5 text-sm font-medium transition-colors">
                  📊 Import
                </a>
                <a href="/admin/participants" className="block px-4 py-3 hover:bg-[var(--primary)]/5 rounded-b-2xl text-sm font-medium transition-colors">
                  👥 Participants
                </a>
              </div>
            </div>

            {/* Member Dropdown */}
            <div className="relative group">
              <button className="nav-link flex items-center">
                <span className="text-sm">📱</span>
                <span className="ml-1 hidden lg:inline">Member</span>
                <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 w-48 bg-white/95 backdrop-blur-md text-gray-900 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-white/20 mt-2">
                <a href="/member" className="block px-4 py-3 hover:bg-[var(--primary)]/5 rounded-t-2xl text-sm font-medium transition-colors">
                  📱 Member Dashboard
                </a>
                <a href="/member/scanner" className="block px-4 py-3 hover:bg-[var(--primary)]/5 rounded-b-2xl text-sm font-medium transition-colors">
                  🔍 QR Scanner
                </a>
              </div>
            </div>
          </div>

          {/* Mobile Hamburger Menu */}
          <div className="md:hidden">
            <button 
              className="nav-link mobile-menu-toggle" 
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200/50">
            <div className="flex flex-col space-y-2">
              <a 
                href="/" 
                className="nav-link justify-start text-left block" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🏠 Home
              </a>
              
              {/* Admin Section */}
              <div>
                <button 
                  className="nav-link justify-start w-full flex items-center justify-between text-left"
                  onClick={() => setMobileAdminOpen(!mobileAdminOpen)}
                >
                  <span>🔧 Admin</span>
                  <svg className={`h-4 w-4 transition-transform ${mobileAdminOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileAdminOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    <a href="/admin" className="block py-2 px-3 text-sm text-gray-600 hover:text-[var(--primary)] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</a>
                    <a href="/admin/register" className="block py-2 px-3 text-sm text-gray-600 hover:text-[var(--primary)] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Register</a>
                    <a href="/admin/import" className="block py-2 px-3 text-sm text-gray-600 hover:text-[var(--primary)] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Import</a>
                    <a href="/admin/participants" className="block py-2 px-3 text-sm text-gray-600 hover:text-[var(--primary)] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Participants</a>
                  </div>
                )}
              </div>
              
              {/* Member Section */}
              <div>
                <button 
                  className="nav-link justify-start w-full flex items-center justify-between text-left"
                  onClick={() => setMobileMemberOpen(!mobileMemberOpen)}
                >
                  <span>📱 Member</span>
                  <svg className={`h-4 w-4 transition-transform ${mobileMemberOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileMemberOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    <a href="/member" className="block py-2 px-3 text-sm text-gray-600 hover:text-[var(--primary)] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</a>
                    <a href="/member/scanner" className="block py-2 px-3 text-sm text-gray-600 hover:text-[var(--primary)] transition-colors" onClick={() => setIsMobileMenuOpen(false)}>QR Scanner</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  )
} 