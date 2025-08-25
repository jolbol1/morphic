import type { Metadata, Viewport } from 'next'
import { Inter as FontSans } from 'next/font/google'

import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from '@vercel/analytics/next'

import { cn } from '@/lib/utils'

import { SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'

import AppSidebar from '@/components/app-sidebar'
import ArtifactRoot from '@/components/artifact/artifact-root'
import Header from '@/components/header'
import { ThemeProvider } from '@/components/theme-provider'

import { ConvexClientProvider } from '@/components/providers/convex'
import './globals.css'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
})

const title = 'Morphic'
const description =
  'A fully open-source AI-powered answer engine with a generative UI.'

export const metadata: Metadata = {
  metadataBase: new URL('https://morphic.sh'),
  title,
  description,
  openGraph: {
    title,
    description
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
    creator: '@miiura'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ConvexClientProvider>
      <ClerkProvider>
        <html lang="en" suppressHydrationWarning>
          <body
            className={cn(
              'min-h-screen flex flex-col font-sans antialiased',
              fontSans.variable
            )}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <SidebarProvider defaultOpen>
                <AppSidebar />
                <div className="flex flex-col flex-1">
                  <Header />
                  <main className="flex flex-1 min-h-0">
                    <ArtifactRoot>{children}</ArtifactRoot>
                  </main>
                </div>
              </SidebarProvider>
              <Toaster />
              <Analytics />
            </ThemeProvider>
          </body>
        </html>
      </ClerkProvider>
    </ConvexClientProvider>
  )
}
