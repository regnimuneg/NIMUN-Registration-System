import { Link } from 'react-router-dom'
import { Users, BarChart3, QrCode, LogIn, ArrowRight, Shield, Smartphone } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-3 sm:px-4 py-8 sm:py-12">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">NIMUN&apos;26 Registration System</h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            Manage participants, track attendance, monitor food distribution, and analyze event data
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Admin Access */}
          <Link
            to="/auth/login"
            className="bg-white rounded-xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500" />
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Admin Portal</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Access the admin dashboard to manage all system features
            </p>
            <div className="flex items-center gap-2 text-blue-600 font-medium text-sm sm:text-base">
              <LogIn className="w-4 h-4" />
              Login to Admin
            </div>
          </Link>

          {/* Member Access */}
          <Link
            to="/member"
            className="bg-white rounded-xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <Smartphone className="w-10 h-10 sm:w-12 sm:h-12 text-purple-500" />
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Member Portal</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Member dashboard for searching participants and scanning QR codes
            </p>
            <div className="flex items-center gap-2 text-purple-600 font-medium text-sm sm:text-base">
              <ArrowRight className="w-4 h-4" />
              Go to Member Portal
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center">Quick Access</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">

            <Link
              to="/scan"
              className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <QrCode className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">QR Scanner</p>
            </Link>
            <Link
              to="/register"
              className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-sm font-medium">Register</p>
            </Link>
            <Link
              to="/import"
              className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">Import CSV</p>
            </Link>
            <Link
              to="/analytics"
              className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-sm font-medium">Analytics</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
