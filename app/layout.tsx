import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { DuckDBProvider } from '@/contexts/DuckDBContext'
import './critical.css'
import './globals.css'

// Configure font with next/font for optimal loading
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'HomeBench',
  description: 'A privacy-by-design in-browser SQL workbench powered by DuckDB-WASM. Analyze your data locally without ever sending it to a server.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <DuckDBProvider>
          {children}
        </DuckDBProvider>
      </body>
    </html>
  )
}
