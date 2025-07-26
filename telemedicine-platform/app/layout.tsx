import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from './providers/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Telemedicine Platform',
  description: 'Healthcare made accessible with agent referral system',
  keywords: 'telemedicine, healthcare, doctors, appointments, referral',
  authors: [{ name: 'Telemedicine Platform' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <div id="root">
            {children}
          </div>
          <div id="modal-root"></div>
        </SessionProvider>
      </body>
    </html>
  )
}