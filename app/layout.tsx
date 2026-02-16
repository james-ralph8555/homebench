import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { DuckDBProvider } from '@/contexts/DuckDBContext'
import { PRELOAD_ASSETS } from '@/lib/duckdbConfig'
import './critical.css'
import './globals.css'

// Configure fonts with next/font for optimal loading
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-jetbrains-mono'
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
      <head>
        {/* Preload critical WASM assets for faster loading */}
        <link rel="preload" href={PRELOAD_ASSETS.WASM} as="fetch" type="application/wasm" crossOrigin="anonymous" />
        <link rel="preload" href={PRELOAD_ASSETS.WORKER} as="script" crossOrigin="anonymous" />
        
        {/* Note: rely on CDN edge compression; no prefetch of .br/.gz variants */}
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans pb-10`}>
        <DuckDBProvider>
          {children}
        </DuckDBProvider>
      </body>
    </html>
  )
}
