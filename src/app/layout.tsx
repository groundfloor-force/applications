import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/mona-sans'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rental Application — Ground Floor Property Management',
  description: 'Apply for a rental property with Ground Floor Property Management.',
  icons: { icon: 'https://www.groundfloorpm.com/images/favicon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
