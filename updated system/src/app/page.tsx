import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[var(--background)] via-white to-[var(--accent-1)]/5">

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="w-full py-12 md:py-20">
          <div className="text-center">
            {/* Animated background elements */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-10 left-10 w-72 h-72 bg-[var(--primary)]/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
              <div className="absolute top-20 right-20 w-72 h-72 bg-[var(--accent-2)]/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-[var(--accent-3)]/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
            </div>

            <div className="relative">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent-1)]/10 rounded-full text-sm font-medium text-[var(--primary)] mb-8 border border-[var(--primary)]/20">
                <span className="mr-2">🎉</span>
                Welcome to JNIMUN'25 Registration System
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading text-gray-900 mb-6 leading-tight">
                <span className="text-gradient-brand">
                  Smart Event
                </span>
                <br />
                <span className="text-[var(--text-primary)]">Management</span>
              </h1>
              
              <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-12 max-w-4xl mx-auto leading-relaxed font-body">
                Complete participant management system with QR code generation, real-time tracking, 
                and comprehensive analytics for the ultimate conference experience.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link
                  href="/admin"
                  className="btn-primary group inline-flex items-center justify-center"
                >
                  <span className="mr-3 text-xl">🔧</span>
                  Admin Dashboard
                </Link>
                <Link
                  href="/member/scanner"
                  className="btn-accent-1 group inline-flex items-center justify-center"
                >
                  <span className="mr-3 text-xl">📱</span>
                  Quick Scanner
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Access Level Cards */}
      <section className="py-16 md:py-20">
        <div className="w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading text-gray-900 mb-4">Choose Your Access Level</h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] font-body">Select the appropriate access level for your role</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto">
            {/* Admin Access Card */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent-1)] rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative card-brand">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[var(--primary)] to-[var(--accent-1)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <span className="text-3xl">🔧</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-heading text-gray-900 mb-4">Admin Access</h3>
                  <p className="text-[var(--text-secondary)] mb-8 text-base md:text-lg font-body">
                    Full system control with participant management, data analytics, and administrative tools.
                  </p>
                  
                  <div className="space-y-3 mb-8 text-left">
                    <div className="flex items-center text-gray-700 font-body">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      Participant Registration & Management
                    </div>
                    <div className="flex items-center text-gray-700 font-body">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      Bulk CSV Import & Export
                    </div>
                    <div className="flex items-center text-gray-700 font-body">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      Advanced Analytics & Reports
                    </div>
                    <div className="flex items-center text-gray-700 font-body">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      System Administration
                    </div>
                  </div>
                  
                  <Link
                    href="/admin"
                    className="btn-primary w-full inline-flex items-center justify-center"
                  >
                    Enter Admin Dashboard
                    <span className="ml-2">→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Member Access Card */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent-3)] rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative card-accent-2">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[var(--accent-2)] to-[var(--accent-3)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <span className="text-3xl">📱</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-heading text-gray-900 mb-4">Member Access</h3>
                  <p className="text-[var(--text-secondary)] mb-8 text-base md:text-lg font-body">
                    QR scanning and activity tracking for event staff and volunteers.
                  </p>
                  
                  <div className="space-y-3 mb-8 text-left">
                    <div className="flex items-center text-gray-700 font-body">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      QR Code Scanning & Tracking
                    </div>
                    <div className="flex items-center text-gray-700 font-body">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      Attendance & Food Tracking
                    </div>
                    <div className="flex items-center text-gray-700 font-body">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      Games & Transportation
                    </div>
                    <div className="flex items-center text-gray-700 font-body">
                      <span className="text-green-500 mr-3 text-lg">✓</span>
                      Participant History View
                    </div>
                  </div>
                  
                  <Link
                    href="/member"
                    className="btn-accent-2 w-full inline-flex items-center justify-center"
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
      <section className="py-16 md:py-20 bg-white/50">
        <div className="w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] font-body">Everything you need for seamless event management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* QR Scanning */}
            <div className="card group hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent-1)] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl md:text-2xl font-heading text-gray-900 mb-4">QR Code Scanning</h3>
              <p className="text-[var(--text-secondary)] mb-4 font-body">
                Advanced camera-based scanning with manual input fallback for reliable participant identification.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)] font-body">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mr-2"></span>Real-time camera scanning</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mr-2"></span>Manual ID input option</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full mr-2"></span>Instant participant lookup</li>
              </ul>
            </div>

            {/* Attendance Tracking */}
            <div className="card group hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-xl md:text-2xl font-heading text-gray-900 mb-4">Smart Attendance</h3>
              <p className="text-[var(--text-secondary)] mb-4 font-body">
                Day-specific attendance tracking with timeline support and real-time updates.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)] font-body">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>Session-based tracking</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>Event participation logs</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>Timestamp recording</li>
              </ul>
            </div>

            {/* Food Distribution */}
            <div className="card group hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-3)] to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                <span className="text-2xl">🍽️</span>
              </div>
              <h3 className="text-xl md:text-2xl font-heading text-gray-900 mb-4">Food Management</h3>
              <p className="text-[var(--text-secondary)] mb-4 font-body">
                Comprehensive meal tracking with duplicate prevention and dietary monitoring.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)] font-body">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--accent-3)] rounded-full mr-2"></span>Breakfast & lunch tracking</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--accent-3)] rounded-full mr-2"></span>Snack distribution</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--accent-3)] rounded-full mr-2"></span>Duplicate prevention</li>
              </ul>
            </div>

            {/* Games & Activities */}
            <div className="card group hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-1)] to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                <span className="text-2xl">🎮</span>
              </div>
              <h3 className="text-xl md:text-2xl font-heading text-gray-900 mb-4">Activity Tracking</h3>
              <p className="text-[var(--text-secondary)] mb-4 font-body">
                Monitor game participation with join/leave timestamps and activity history.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)] font-body">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--accent-1)] rounded-full mr-2"></span>Game participation logs</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--accent-1)] rounded-full mr-2"></span>Time-based monitoring</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--accent-1)] rounded-full mr-2"></span>Activity analytics</li>
              </ul>
            </div>

            {/* Transportation */}
            <div className="card group hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                <span className="text-2xl">🚌</span>
              </div>
              <h3 className="text-xl md:text-2xl font-heading text-gray-900 mb-4">Transportation</h3>
              <p className="text-[var(--text-secondary)] mb-4 font-body">
                Bus tracking with arrival/departure monitoring for multiple routes and stops.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)] font-body">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>Multi-route support</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>Arrival & departure logs</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>Real-time tracking</li>
              </ul>
            </div>

            {/* Security & Management */}
            <div className="card group hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-2)] to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl md:text-2xl font-heading text-gray-900 mb-4">Security & Admin</h3>
              <p className="text-[var(--text-secondary)] mb-4 font-body">
                Role-based access control with secure authentication and data management.
              </p>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)] font-body">
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--accent-2)] rounded-full mr-2"></span>Multi-admin support</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--accent-2)] rounded-full mr-2"></span>Data clearing tools</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 bg-[var(--accent-2)] rounded-full mr-2"></span>Permission management</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Committee Structure */}
      <section className="py-16 md:py-20">
        <div className="w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading text-gray-900 mb-4">Committee Structure</h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] font-body">Organized participant management by committee</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-4xl mx-auto">
            {[
              { code: 'EX', name: 'Executive', color: 'from-[var(--primary)] to-[var(--accent-1)]' },
              { code: 'OP', name: 'Operations', color: 'from-green-500 to-green-600' },
              { code: 'RG', name: 'Registration', color: 'from-[var(--accent-2)] to-purple-600' },
              { code: 'PR', name: 'Public Relations', color: 'from-[var(--accent-3)] to-orange-600' },
              { code: 'MD', name: 'Media & Design', color: 'from-red-500 to-red-600' },
              { code: 'SO', name: 'Socials', color: 'from-yellow-500 to-[var(--accent-3)]' }
            ].map((committee) => (
              <div key={committee.code} className="group text-center">
                <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${committee.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <span className="text-lg md:text-2xl font-heading text-white">{committee.code}</span>
                </div>
                <h3 className="font-medium text-gray-900 text-sm md:text-base font-body">{committee.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 md:py-16">
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--accent-1)] rounded-lg flex items-center justify-center">
                  <span className="text-white font-heading text-lg">J</span>
                </div>
                <span className="text-xl font-heading">JNIMUN'25</span>
              </div>
              <p className="text-gray-400 font-body">
                Advanced registration and tracking system for Nile International Model United Nations 2025.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-heading mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400 font-body">
                <li><Link href="/admin" className="hover:text-white transition-colors">Admin Dashboard</Link></li>
                <li><Link href="/member" className="hover:text-white transition-colors">Member Dashboard</Link></li>
                <li><Link href="/member/scanner" className="hover:text-white transition-colors">QR Scanner</Link></li>
                <li><Link href="/admin/register" className="hover:text-white transition-colors">Register Participant</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-heading mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400 font-body">
                <li>QR Code Generation</li>
                <li>Real-time Tracking</li>
                <li>Food Distribution</li>
                <li>Transportation Management</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p className="font-body">&copy; 2025 JNIMUN. All rights reserved. Built with Next.js and Tailwind CSS.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 