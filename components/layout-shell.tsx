'use client'
import { useState, useEffect } from 'react'
import Nav from './nav'

type Props = {
  children: React.ReactNode
  title: string
  actions?: React.ReactNode
}

export default function LayoutShell({ children, title, actions }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sb-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed(c => {
      localStorage.setItem('sb-collapsed', String(!c))
      return !c
    })
  }

  return (
    <div className="sp-bg flex h-full min-h-screen">
      <Nav collapsed={collapsed} onToggle={toggle} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sp-topbar h-14 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-px h-4 rounded-full"
              style={{ background: 'linear-gradient(180deg, transparent, #FF1F2C, transparent)' }}
            />
            <h1 className="font-display text-[15px] font-bold text-sp-primary uppercase tracking-[0.12em]">{title}</h1>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
