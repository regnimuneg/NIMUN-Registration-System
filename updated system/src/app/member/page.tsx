import Link from 'next/link'

export default function MemberPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          JNIMUN'25 Member Dashboard
        </h1>
        <p className="text-gray-600">
          Scan QR codes and track participant activities during the event
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Scanner - Primary Feature */}
        <Link
          href="/member/scanner"
          className="block p-8 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-2xl font-bold mb-3">
              QR Scanner
            </h3>
            <p className="text-purple-100 text-lg">
              Scan participant QR codes to track attendance, food, games, and transportation
            </p>
          </div>
        </Link>

        {/* Quick Info Card */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Available Features
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-green-500 text-xl">✅</span>
              <span className="text-gray-700">Attendance Tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-500 text-xl">🍽️</span>
              <span className="text-gray-700">Food Distribution</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-500 text-xl">🎮</span>
              <span className="text-gray-700">Games & Activities</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-500 text-xl">🚌</span>
              <span className="text-gray-700">Bus Transportation</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-500 text-xl">📋</span>
              <span className="text-gray-700">Participant History</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Instructions */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">
          How to Use the Scanner
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-800">
          <div>
            <h3 className="font-medium mb-2">📱 Camera Scanning</h3>
            <ol className="text-sm space-y-1">
              <li>1. Click "QR Scanner" above</li>
              <li>2. Allow camera access when prompted</li>
              <li>3. Point camera at participant QR code</li>
              <li>4. Wait for automatic recognition</li>
            </ol>
          </div>
          <div>
            <h3 className="font-medium mb-2">⌨️ Manual Input</h3>
            <ol className="text-sm space-y-1">
              <li>1. Use "Manual Input" option</li>
              <li>2. Type participant ID (e.g., EX-01)</li>
              <li>3. Press Enter or click Submit</li>
              <li>4. Start tracking activities</li>
            </ol>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Camera Scanner</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Available
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Tracking System</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Active
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Data Sync</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-900 mb-3">
          ℹ️ Need Help?
        </h2>
        <p className="text-yellow-800 mb-4">
          If you encounter any issues with scanning or tracking, contact the admin team or technical support.
        </p>
        <div className="text-sm text-yellow-700">
          <strong>Tips:</strong> Ensure good lighting for QR scanning, hold the camera steady, and make sure QR codes are clearly visible.
        </div>
      </div>
    </div>
  )
} 