import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">


      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Animated background elements */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-10 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
              <div className="absolute top-20 right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
            </div>

            <div className="relative">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm font-medium text-blue-800 mb-8">
                <span className="mr-2">🎉</span>
                Welcome to JNIMUN'25 Registration System
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Smart Event
                </span>
                <br />
                <span className="text-gray-900">Management</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                Complete participant management system with QR code generation, real-time tracking, 
                and comprehensive analytics for the ultimate conference experience.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link
                  href="/admin"
                  className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-semibold rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <span className="mr-3 text-2xl">🔧</span>
                  Admin Dashboard
                  <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                </Link>
                <Link
                  href="/member/scanner"
                  className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-lg font-semibold rounded-2xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <span className="mr-3 text-2xl">📱</span>
                  Quick Scanner
                  <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Access Level Cards */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Access Level</h2>
            <p className="text-xl text-gray-600">Select the appropriate access level for your role</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Admin Access Card */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white rounded-3xl p-8 shadow-xl">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🔧</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Admin Access</h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    Full system control with participant management, data analytics, and administrative tools.
                  </p>
                  
                  <div className="space-y-3 mb-8 text-left">
                    <div className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-3">✓</span>
                      Participant Registration & Management
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-3">✓</span>
                      Bulk CSV Import & Export
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-3">✓</span>
                      Advanced Analytics & Reports
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-3">✓</span>
                      System Administration
                    </div>
                  </div>
                  
                  <Link
                    href="/admin"
                    className="inline-flex items-center justify-center w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Enter Admin Dashboard
                    <span className="ml-2">→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Member Access Card */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-purple-400 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white rounded-3xl p-8 shadow-xl">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">📱</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Member Access</h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    QR scanning and activity tracking for event staff and volunteers.
                  </p>
                  
                  <div className="space-y-3 mb-8 text-left">
                    <div className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-3">✓</span>
                      QR Code Scanning & Tracking
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-3">✓</span>
                      Attendance & Food Tracking
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-3">✓</span>
                      Games & Transportation
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="text-green-500 mr-3">✓</span>
                      Participant History View
                    </div>
                  </div>
                  
                  <Link
                    href="/member"
                    className="inline-flex items-center justify-center w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Enter Member Dashboard
                    <span className="ml-2">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need for seamless event management</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* QR Scanning */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-200">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">QR Code Scanning</h3>
              <p className="text-gray-600 mb-4">
                Advanced camera-based scanning with manual input fallback for reliable participant identification.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>Real-time camera scanning</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>Manual ID input option</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>Instant participant lookup</li>
              </ul>
            </div>

            {/* Attendance Tracking */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Attendance</h3>
              <p className="text-gray-600 mb-4">
                Day-specific attendance tracking with timeline support and real-time updates.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>Session-based tracking</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>Event participation logs</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>Timestamp recording</li>
              </ul>
            </div>

            {/* Food Distribution */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🍽️</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Food Management</h3>
              <p className="text-gray-600 mb-4">
                Comprehensive meal tracking with duplicate prevention and dietary monitoring.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>Breakfast & lunch tracking</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>Snack distribution</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>Duplicate prevention</li>
              </ul>
            </div>

            {/* Games & Activities */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🎮</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Activity Tracking</h3>
              <p className="text-gray-600 mb-4">
                Monitor game participation with join/leave timestamps and activity history.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>Game participation logs</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>Time-based monitoring</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>Activity analytics</li>
              </ul>
            </div>

            {/* Transportation */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-200">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🚌</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Transportation</h3>
              <p className="text-gray-600 mb-4">
                Bus tracking with arrival/departure monitoring for multiple routes and stops.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>Multi-route support</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>Arrival & departure logs</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>Real-time tracking</li>
              </ul>
            </div>

            {/* Security & Management */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-yellow-200">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Security & Admin</h3>
              <p className="text-gray-600 mb-4">
                Role-based access control with secure authentication and data management.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2"></span>Multi-admin support</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2"></span>Data clearing tools</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2"></span>Permission management</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Committee Structure */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Committee Structure</h2>
            <p className="text-xl text-gray-600">Organized participant management by committee</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { code: 'EX', name: 'Executive', color: 'from-blue-500 to-blue-600' },
              { code: 'OP', name: 'Operations', color: 'from-green-500 to-green-600' },
              { code: 'RG', name: 'Registration', color: 'from-purple-500 to-purple-600' },
              { code: 'PR', name: 'Public Relations', color: 'from-orange-500 to-orange-600' },
              { code: 'MD', name: 'Media & Design', color: 'from-red-500 to-red-600' },
              { code: 'SO', name: 'Socials', color: 'from-yellow-500 to-yellow-600' }
            ].map((committee) => (
              <div key={committee.code} className="group text-center">
                <div className={`w-20 h-20 bg-gradient-to-br ${committee.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <span className="text-2xl font-bold text-white">{committee.code}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{committee.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">J</span>
                </div>
                <span className="text-xl font-bold">JNIMUN'25</span>
              </div>
              <p className="text-gray-400">
                Advanced registration and tracking system for Nile international International Model United Nations 2025 (NIMUN 2025).
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/admin" className="hover:text-white transition-colors">Admin Dashboard</Link></li>
                <li><Link href="/member" className="hover:text-white transition-colors">Member Dashboard</Link></li>
                <li><Link href="/member/scanner" className="hover:text-white transition-colors">QR Scanner</Link></li>
                <li><Link href="/admin/register" className="hover:text-white transition-colors">Register Participant</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>QR Code Generation</li>
                <li>Real-time Tracking</li>
                <li>Food Distribution</li>
                <li>Transportation Management</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 JNIMUN. All rights reserved. Built with Next.js and Tailwind CSS.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 