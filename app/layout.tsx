import type { Metadata } from 'next'
import { DuckDBProvider } from '@/contexts/DuckDBContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'HomeBench - Privacy-First SQL Workbench',
  description: 'Analyze your data locally with DuckDB-WASM. No data ever leaves your browser.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <DuckDBProvider>
          {children}
        </DuckDBProvider>
      </body>
    </html>
  )
}
