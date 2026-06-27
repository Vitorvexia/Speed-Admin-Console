'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="sp-bg min-h-screen flex items-center justify-center p-4">
      {/* Corner glows */}
      <div className="fixed top-0 left-0 w-64 h-64 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(255,31,44,0.06) 0%, transparent 70%)' }} />
      <div className="fixed bottom-0 right-0 w-64 h-64 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at bottom right, rgba(56,189,248,0.04) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-s.png"
            alt="S"
            style={{
              width:          240,
              height:         240,
              objectFit:      'contain',
              display:        'block',
              filter:         'drop-shadow(0 0 32px rgba(255,31,44,0.5))',
            }}
          />
        </div>

        {/* Status badge */}
        <div className="flex justify-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-data text-[10px] uppercase tracking-widest"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748B',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#22C55E', boxShadow: '0 0 6px #22C55E' }}
            />
            Painel Administrativo
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: '#0D1118',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="sp-input w-full px-4 py-3 text-sm text-sp-primary placeholder:text-sp-faint font-data"
              />
            </div>
            <div>
              <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="sp-input w-full px-4 py-3 text-sm text-sp-primary placeholder:text-sp-faint font-data"
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2.5 px-4 py-3 rounded-lg font-data text-[12px]"
                style={{
                  background: 'rgba(255,31,44,0.07)',
                  border: '1px solid rgba(255,31,44,0.2)',
                  color: '#FF6B6B',
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="sp-btn-primary w-full text-white text-[13px] py-3.5 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
