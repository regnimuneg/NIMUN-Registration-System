import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { Users, BarChart3, QrCode, LogIn, ArrowRight, Shield, Smartphone } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12 bg-[linear-gradient(rgba(255,253,246,.9),rgba(255,253,246,.9)),url('/doodles.png')] bg-[length:auto,680px_auto]">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-8 sm:mb-12 relative">
          <img src="/logo24.png" alt="JNIMUN'26" className="mx-auto w-20 h-20 object-contain mb-4 drop-shadow-lg" />
          <h1 className="jn-title inline-block">JNIMUN&apos;<span className="text-[var(--jn-pink)]">26</span> Registration System</h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2 mt-5">
            Manage participants, track attendance, monitor food distribution, and analyze event data
          </p>
          <img src="/element_05_x1163_y67_w148_h225.png" alt="" aria-hidden="true" className="hidden sm:block jn-sticker right-8 top-6 rotate-12" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Admin Access */}
          <Link
            to="/auth/login"
            className="jn-card p-6 sm:p-8"
            style={{ '--card-color': 'var(--jn-blue)' } as CSSProperties}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="jn-icon-tile"><Shield className="w-8 h-8" /></div>
              <ArrowRight className="w-6 h-6 text-[var(--jn-blue)]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black mb-2">Admin Portal</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Access the admin dashboard to manage all system features
            </p>
            <div className="flex items-center gap-2 text-[var(--jn-blue)] font-extrabold text-sm sm:text-base">
              <LogIn className="w-4 h-4" />
              Login to Admin
            </div>
            <img src="/sticker-handshake.png" alt="" aria-hidden="true" className="jn-sticker -right-6 bottom-3 w-20 rotate-12" />
          </Link>

          {/* Member Access */}
          <Link
            to="/member"
            className="jn-card p-6 sm:p-8"
            style={{ '--card-color': 'var(--jn-purple)' } as CSSProperties}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="jn-icon-tile"><Smartphone className="w-8 h-8" /></div>
              <ArrowRight className="w-6 h-6 text-[var(--jn-purple)]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black mb-2">Member Portal</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Member dashboard for searching participants and scanning QR codes
            </p>
            <div className="flex items-center gap-2 text-[var(--jn-purple)] font-extrabold text-sm sm:text-base">
              <ArrowRight className="w-4 h-4" />
              Go to Member Portal
            </div>
            <img src="/element_14_x560_y415_w221_h216.png" alt="" aria-hidden="true" className="jn-sticker -right-4 bottom-2 w-20 rotate-12" />
          </Link>
        </div>

        <div className="jn-card p-4 sm:p-6" style={{ '--card-color': 'var(--jn-green)' } as CSSProperties}>
          <h3 className="text-base sm:text-lg font-black mb-3 sm:mb-4 text-center">Quick Access</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">

            <Link
              to="/scan"
              className="text-center p-4 bg-white rounded-2xl border-2 border-green-200 hover:border-[var(--jn-green)] transition-colors"
            >
              <QrCode className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-extrabold">QR Scanner</p>
            </Link>
            <Link
              to="/register"
              className="text-center p-4 bg-white rounded-2xl border-2 border-purple-200 hover:border-[var(--jn-purple)] transition-colors"
            >
              <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-sm font-extrabold">Register</p>
            </Link>
            <Link
              to="/import"
              className="text-center p-4 bg-white rounded-2xl border-2 border-blue-200 hover:border-[var(--jn-blue)] transition-colors"
            >
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-extrabold">Import CSV</p>
            </Link>
            <Link
              to="/analytics"
              className="text-center p-4 bg-white rounded-2xl border-2 border-orange-200 hover:border-[var(--jn-orange)] transition-colors"
            >
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-sm font-extrabold">Analytics</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
