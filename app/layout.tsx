import type { Metadata } from 'next'
import { DuckDBProvider } from '@/contexts/DuckDBContext'
import './globals.css'

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
      <body>
        <DuckDBProvider>
          {children}
        </DuckDBProvider>
      </body>
    </html>
  )
}
