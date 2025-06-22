import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JNIMUN\'25 Registration & Tracking System',
  description: 'Registration and tracking system for JNIMUN\'25 conference',
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
                  <a href="/admin" className="hover:bg-blue-700 px-3 py-2 rounded-md">
                    Admin
                  </a>
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