import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'eCFR Analyzer',
  description: 'Analyze the Electronic Code of Federal Regulations',
  metadataBase: new URL('https://ecfr.vercel.app'),
  openGraph: {
    title: 'eCFR Analyzer',
    description: 'Analyze the Electronic Code of Federal Regulations',
    url: 'https://ecfr.vercel.app',
    siteName: 'eCFR Analyzer',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eCFR Analyzer',
    description: 'Analyze the Electronic Code of Federal Regulations',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}