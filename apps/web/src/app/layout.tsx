import type { Metadata } from 'next'

import { Kumbh_Sans, Plus_Jakarta_Sans } from 'next/font/google'
import './main-layout.scss'
import Header from '@/app/components/Header/Header'
import React from 'react'
import { SettingsProvider } from '@/context/SettingsContext'
import SwRegister from '@/app/sw-register'

const kumbhSans = Kumbh_Sans({
  variable: '--font-kumbh-sans',
  subsets: ['latin-ext'],
  weight: 'variable'
})

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin-ext'],
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'ouija',
  description: 'i love cats :3'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${kumbhSans.variable} ${plusJakartaSans.variable}`}>
        <SettingsProvider>
          <SwRegister />
          <Header />
          <div className="container">{children}</div>
        </SettingsProvider>
      </body>
    </html>
  )
}
