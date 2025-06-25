import './globals.css'
import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'JNIMUN\'25 System',
  description: 'Registration and tracking system for JNIMUN 2025',
  icons: {
    icon: '/icon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/Heavitas.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-body">
        <div className="min-h-screen w-full bg-[var(--background)] text-[var(--text-primary)]">
          {/* Pill-shaped Navbar */}
          <Navbar />

          {/* Main Content with top padding for fixed navbar */}
          <main className="w-full pt-20 md:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </main>

        </div>
      </body>
    </html>
  )
} 