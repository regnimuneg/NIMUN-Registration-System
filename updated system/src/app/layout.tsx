import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JNIMUN\'25 System',
  description: 'Registration and tracking system for JNIMUN 2025',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <nav className="bg-blue-600 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold">
                    JNIMUN'25 System
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <a href="/" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                    Home
                  </a>
                  <div className="relative group">
                    <button className="hover:bg-blue-700 px-3 py-2 rounded-md flex items-center">
                      Admin
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="absolute right-0 w-48 bg-white text-gray-900 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <a href="/admin" className="block px-4 py-2 hover:bg-gray-100 rounded-t-md">🔧 Admin Dashboard</a>
                      <a href="/admin/dashboard" className="block px-4 py-2 hover:bg-gray-100">📱 QR Scanner</a>
                      <a href="/admin/register" className="block px-4 py-2 hover:bg-gray-100">👤 Register</a>
                      <a href="/admin/import" className="block px-4 py-2 hover:bg-gray-100">📊 Import</a>
                      <a href="/admin/participants" className="block px-4 py-2 hover:bg-gray-100 rounded-b-md">👥 Participants</a>
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="hover:bg-blue-700 px-3 py-2 rounded-md flex items-center">
                      Member
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="absolute right-0 w-48 bg-white text-gray-900 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <a href="/member" className="block px-4 py-2 hover:bg-gray-100 rounded-t-md">📱 Member Dashboard</a>
                      <a href="/member/scanner" className="block px-4 py-2 hover:bg-gray-100 rounded-b-md">🔍 QR Scanner</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
} 