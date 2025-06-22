import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          JNIMUN'25 Registration & Tracking System
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Complete participant management system with QR code generation, real-time attendance tracking, 
          food distribution monitoring, game activity tracking, and bus transportation management.
        </p>
        
        {/* Role Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Choose Your Access Level</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Admin Access */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="text-center">
                <div className="text-6xl mb-4">🔧</div>
                <h3 className="text-2xl font-bold mb-3">Admin Access</h3>
                <p className="text-blue-100 mb-6">
                  Full system access for administrators. Manage participants, import data, and access all features.
                </p>
                <Link
                  href="/admin"
                  className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Enter Admin Dashboard
                </Link>
              </div>
            </div>

            {/* Member Access */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="text-center">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-2xl font-bold mb-3">Member Access</h3>
                <p className="text-purple-100 mb-6">
                  QR scanning and tracking access for event members. Scan codes and track activities.
                </p>
                <Link
                  href="/member"
                  className="inline-block px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
                >
                  Enter Member Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/member/scanner"
            className="inline-flex items-center px-8 py-4 bg-purple-600 text-white text-lg font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
          >
            📱 Quick QR Scanner
          </Link>
          <Link
            href="/admin/register"
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            👤 Register Participant
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="text-purple-600 text-4xl mb-4">📱</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">QR Code Scanning</h3>
          <p className="text-gray-600 mb-4">
            Advanced QR code scanning with camera support and manual input options for reliable participant identification.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Camera-based scanning</li>
            <li>• Manual ID input</li>
            <li>• Instant participant lookup</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="text-green-600 text-4xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Attendance Tracking</h3>
          <p className="text-gray-600 mb-4">
            Track participant attendance across multiple sessions, events, and activities with real-time updates.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Session attendance</li>
            <li>• Event participation</li>
            <li>• Real-time updates</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="text-orange-600 text-4xl mb-4">🍽️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Food Distribution</h3>
          <p className="text-gray-600 mb-4">
            Monitor food distribution for meals and snacks with duplicate prevention system.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Breakfast & lunch tracking</li>
            <li>• Snack distribution</li>
            <li>• Duplicate prevention</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="text-blue-600 text-4xl mb-4">🎮</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Games & Activities</h3>
          <p className="text-gray-600 mb-4">
            Track participation in games and activities with join/leave timestamps for accurate monitoring.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Game participation tracking</li>
            <li>• Time-based monitoring</li>
            <li>• Activity history</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="text-indigo-600 text-4xl mb-4">🚌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Bus Transportation</h3>
          <p className="text-gray-600 mb-4">
            Monitor bus transportation with arrival and departure tracking for multiple stops.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Arrival & departure tracking</li>
            <li>• Custom bus stops</li>
            <li>• Real-time monitoring</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="text-yellow-600 text-4xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">ID Management</h3>
          <p className="text-gray-600 mb-4">
            Automatic ID generation with committee prefixes and transparent QR code generation.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Committee-based IDs</li>
            <li>• Transparent QR codes</li>
            <li>• Bulk generation support</li>
          </ul>
        </div>
      </div>

      {/* Access Level Comparison */}
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Access Level Comparison
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Admin Features */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-xl font-semibold text-blue-600 mb-4">🔧 Admin Features</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>QR Code Scanning & Tracking</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Participant Registration</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Bulk CSV Import</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>View All Participants</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Delete Participants</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Participant History</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>System Administration</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Data Management</li>
            </ul>
          </div>

          {/* Member Features */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-xl font-semibold text-purple-600 mb-4">📱 Member Features</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>QR Code Scanning & Tracking</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Attendance Tracking</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Food Distribution</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Games & Activities</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Bus Transportation</li>
              <li className="flex items-center"><span className="text-green-500 mr-2">✓</span>Participant History</li>
              <li className="flex items-center"><span className="text-red-500 mr-2">✗</span>Participant Management</li>
              <li className="flex items-center"><span className="text-red-500 mr-2">✗</span>System Administration</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Committee Information */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Committee Structure</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-white rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">EX</div>
            <div className="text-sm text-gray-600">Executive</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">OP</div>
            <div className="text-sm text-gray-600">Operations</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow border">
            <div className="text-2xl font-bold text-purple-600">RG</div>
            <div className="text-sm text-gray-600">Registration</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow border">
            <div className="text-2xl font-bold text-orange-600">PR</div>
            <div className="text-sm text-gray-600">Public Relations</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow border">
            <div className="text-2xl font-bold text-red-600">MD</div>
            <div className="text-sm text-gray-600">Media & Design</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow border">
            <div className="text-2xl font-bold text-yellow-600">SO</div>
            <div className="text-sm text-gray-600">Socials</div>
          </div>
        </div>
      </div>
    </div>
  )
} 