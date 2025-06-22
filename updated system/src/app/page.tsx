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
        
        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-8 py-4 bg-purple-600 text-white text-lg font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
          >
            📱 Start QR Tracking
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="text-purple-600 text-4xl mb-4">📱</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">QR Code Scanning</h3>
          <p className="text-gray-600 mb-4">
            Real-time QR code scanning with camera support for instant participant identification and tracking.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Camera-based scanning</li>
            <li>• Manual input option</li>
            <li>• Instant participant lookup</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="text-green-600 text-4xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Attendance Tracking</h3>
          <p className="text-gray-600 mb-4">
            Track attendance for all sessions, conferences, and special events with real-time updates.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Session attendance</li>
            <li>• Conference tracking</li>
            <li>• Performance day events</li>
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

      {/* Admin Section */}
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          System Administration
        </h2>
        <p className="text-gray-600 mb-6">
          Access the full admin dashboard to manage participants, import data, and monitor all activities.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
        >
          🔧 Admin Dashboard
        </Link>
      </div>

      {/* Committee Information */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
  )
} 