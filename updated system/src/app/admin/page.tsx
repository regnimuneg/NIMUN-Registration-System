import Link from 'next/link'

export default function AdminPage() {
  const features = [
    {
      title: 'QR Tracking Dashboard',
      description: 'Scan participant QR codes to track attendance, food consumption, game activities, and bus transportation in real-time',
      href: '/admin/dashboard',
      icon: '📱',
      color: 'bg-purple-500'
    },
    {
      title: 'Register Participant',
      description: 'Register a single participant and generate their unique ID and QR code for tracking',
      href: '/admin/register',
      icon: '👤',
      color: 'bg-blue-500'
    },
    {
      title: 'Bulk Import',
      description: 'Import multiple participants from CSV file with automatic ID generation and QR code creation',
      href: '/admin/import',
      icon: '📊',
      color: 'bg-green-500'
    },
    {
      title: 'View All Participants',
      description: 'Browse and manage all registered participants with search and filter capabilities',
      href: '/admin/participants',
      icon: '👥',
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Manage JNIMUN'25 participants, tracking, and system administration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 hover:border-gray-300"
          >
            <div className="flex items-start space-x-4">
              <div className={`${feature.color} rounded-lg p-3 text-white text-2xl`}>
                {feature.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            System Status
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Google Sheets Connection</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">QR Code Generation</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Active
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Camera Scanner</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Available
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/admin/dashboard"
              className="block w-full text-left px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              🚀 Start QR Scanning Session
            </Link>
            <Link
              href="/admin/register"
              className="block w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              ➕ Quick Registration
            </Link>
            <Link
              href="/admin/import"
              className="block w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              📥 Import Participants
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 