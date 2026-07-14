'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from './nav'
import BottomNav from './bottom-nav'
import { createClient } from '@/lib/supabase/client'

type Props = {
  children: React.ReactNode
  title: string
  actions?: React.ReactNode
}

export default function LayoutShell({ children, title, actions }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="sp-bg flex h-full min-h-screen">
      <Nav collapsed={collapsed} onToggle={toggle} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sp-topbar h-14 flex items-center justify-between px-4 md:px-6 flex-shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-px h-4 rounded-full"
              style={{ background: 'linear-gradient(180deg, transparent, #FF1F2C, transparent)' }}
            />
            <h1 className="font-display text-[15px] font-bold text-sp-primary uppercase tracking-[0.12em]">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button
              onClick={handleLogout}
              className="flex md:hidden w-8 h-8 items-center justify-center rounded-lg text-sp-muted hover:text-sp-primary hover:bg-white/[0.05] transition-colors"
              title="Sair"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-3 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
