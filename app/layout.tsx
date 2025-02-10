import './globals.css'
import { Inter } from 'next/font/google'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ChatCFR',
  description: 'Chat with the Code of Federal Regulations',
  metadataBase: new URL('https://ecfr.vercel.app'),
  openGraph: {
    title: 'ChatCFR',
    description: 'Chat with the Code of Federal Regulations',
    url: 'https://ecfr.vercel.app',
    siteName: 'ChatCFR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChatCFR',
    description: 'Chat with the Code of Federal Regulations',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
              <Link href="/">
                <Button variant="ghost" className="font-semibold">
                  ChatCFR
                </Button>
              </Link>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}