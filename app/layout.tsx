import type { Metadata } from 'next'
import { Barlow_Condensed, Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-barlow',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

const space = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space',
})

export const metadata: Metadata = {
  title: 'SpeedConsole — Speed Multimarcas',
  description: 'Painel admin Speed Multimarcas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${inter.variable} ${space.variable} h-full`}>
      <body className="h-full bg-sp-base antialiased text-sp-primary">{children}</body>
    </html>
  )
}
