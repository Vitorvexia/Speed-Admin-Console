'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function IconDashboard() {
  return (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconLeads() {
  return (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconEstoque() {
  return (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M19 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z" />
      <circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" />
      <path d="M5 10h14M9 5v5" />
    </svg>
  )
}

function IconPostagens() {
  return (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

const links = [
  { href: '/dashboard',  label: 'Dashboard',  Icon: IconDashboard  },
  { href: '/leads',      label: 'Leads',      Icon: IconLeads      },
  { href: '/estoque',    label: 'Estoque',    Icon: IconEstoque    },
  { href: '/postagens',  label: 'Postagens',  Icon: IconPostagens  },
]

type Props = { collapsed: boolean; onToggle: () => void }

export default function Nav({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="sp-nav hidden md:flex flex-col flex-shrink-0 min-h-screen transition-all duration-200"
      style={{ width: collapsed ? 56 : 220 }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center flex-shrink-0 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)', height: collapsed ? 56 : 80 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-s.png"
          alt="S"
          style={{
            width:      collapsed ? 36 : 68,
            height:     collapsed ? 36 : 68,
            objectFit:  'contain',
            display:    'block',
            filter:     'drop-shadow(0 0 8px rgba(255,31,44,0.5))',
          }}
        />
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {links.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`relative flex items-center rounded-lg transition-all duration-150 overflow-hidden
                ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
                ${active ? 'text-sp-primary' : 'text-sp-muted hover:text-sp-primary hover:bg-white/[0.03]'}`}
              style={active ? {
                background: 'linear-gradient(90deg, rgba(255,31,44,0.14) 0%, rgba(255,31,44,0.03) 100%)',
              } : undefined}
            >
              {active && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-[2px] rounded-r"
                  style={{
                    background: '#FF1F2C',
                    boxShadow: '0 0 8px rgba(255,31,44,0.8), 0 0 20px rgba(255,31,44,0.3)',
                  }}
                />
              )}
              <span className={active ? 'text-sp-red' : ''}>
                <Icon />
              </span>
              {!collapsed && (
                <span className="text-[13px] font-medium tracking-wide">{label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t space-y-0.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className={`w-full flex items-center rounded-lg px-3 py-2.5 text-[13px] text-sp-muted hover:text-sp-primary hover:bg-white/[0.04] transition-colors ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <IconLogout />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={onToggle}
          className={`w-full flex items-center rounded-lg px-3 py-2 text-sp-faint hover:text-sp-muted transition-colors ${collapsed ? 'justify-center' : 'justify-end'}`}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
