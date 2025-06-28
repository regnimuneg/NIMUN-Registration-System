import Link from 'next/link'
import { Smartphone, BarChart3, Plus, Upload, Zap, Users, TrendingUp } from 'lucide-react'

export default function AdminPage() {
  const features = [
    {
      title: 'QR Code Scanner',
      description: 'Scan participant QR codes for real-time tracking',
      href: '/admin/dashboard',
      icon: <Smartphone className="w-12 h-12 text-white" />,
      color: 'bg-blue-500',
    },
    {
      title: 'Registration System',
      description: 'Register new participants with QR code generation',
      href: '/admin/register',
      icon: <Plus className="w-12 h-12 text-white" />,
      color: 'bg-green-500',
    },
    {
      title: 'Import from CSV',
      description: 'Bulk import participants from Excel/CSV files',
      href: '/admin/import',
      icon: <Upload className="w-12 h-12 text-white" />,
      color: 'bg-orange-500',
    },
    {
      title: 'Participants List',
      description: 'View and manage participant details',
      href: '/admin/participants',
      icon: <Users className="w-12 h-12 text-white" />,
      color: 'bg-purple-500',
    },
    {
      title: 'Analytics Dashboard',
      description: 'View detailed analytics and visualizations',
      href: '/admin/analytics',
      icon: <TrendingUp className="w-12 h-12 text-white" />,
      color: 'bg-indigo-500',
    },
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 hover:border-gray-300 overflow-hidden"
          >
            <div className={`${feature.color} p-6 text-center`}>
              <div className="mb-4 flex justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
              <p className="text-white/90 text-sm">{feature.description}</p>
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
              className="block w-full text-left px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start QR Scanning Session
            </Link>
            <Link
              href="/admin/register"
              className="block w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Quick Registration
            </Link>
            <Link
              href="/admin/import"
              className="block w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Participants
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 