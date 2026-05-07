import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-archivo',
})

export const metadata: Metadata = {
  title: 'pm',
  description: 'gestor de proyectos personal',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${archivo.variable} font-archivo min-h-screen`}
        style={{ background: 'var(--bg-outer)' }}
      >
        <div className="flex justify-center min-h-screen" style={{ background: 'var(--bg-outer)' }}>
          <div
            className="w-full max-w-mobile min-h-screen relative flex flex-col"
            style={{ background: 'var(--bg)' }}
          >
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
