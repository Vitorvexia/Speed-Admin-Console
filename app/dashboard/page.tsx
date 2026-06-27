import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LayoutShell from '@/components/layout-shell'
import Calendar from '@/components/calendar'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span
        className="w-1 h-3.5 rounded-full flex-shrink-0"
        style={{ background: '#FF1F2C', boxShadow: '0 0 8px rgba(255,31,44,0.6)' }}
      />
      <h2 className="font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.16em]">{children}</h2>
    </div>
  )
}

function StatBar({
  label,
  count,
  pct,
  color,
}: {
  label: string
  count: number
  pct: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-data text-[11px] text-sp-muted uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2.5">
          <span className="font-data text-[11px] text-sp-muted">{pct}%</span>
          <span className="font-data text-base font-bold text-sp-primary">{count}</span>
        </div>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}88`,
          }}
        />
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [leadsRes, topModelsRes] = await Promise.all([
    supabase.from('leads').select('status'),
    supabase.rpc('top_models_by_leads'),
  ])

  const leads = leadsRes.data ?? []
  const topModels: { model_name: string; total: number }[] = topModelsRes.data ?? []

  const counts = {
    pendente:   leads.filter(l => l.status === 'pendente').length,
    a_negociar: leads.filter(l => l.status === 'a_negociar').length,
    fechado:    leads.filter(l => l.status === 'fechado').length,
  }
  const total = counts.pendente + counts.a_negociar + counts.fechado
  const divisor = total || 1

  const statusBars = [
    { label: 'Pendente',   count: counts.pendente,   color: '#F59E0B', pct: Math.round(counts.pendente / divisor * 100) },
    { label: 'A negociar', count: counts.a_negociar, color: '#38BDF8', pct: Math.round(counts.a_negociar / divisor * 100) },
    { label: 'Fechado',    count: counts.fechado,    color: '#22C55E', pct: Math.round(counts.fechado / divisor * 100) },
  ]

  return (
    <LayoutShell title="Dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Leads por Status */}
        <div className="sp-card p-6">
          <SectionLabel>Leads por Status</SectionLabel>
          <div className="space-y-5">
            {statusBars.map(s => <StatBar key={s.label} {...s} />)}
          </div>
          <div
            className="mt-6 pt-5 flex items-end justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <div className="font-data text-[9px] text-sp-muted uppercase tracking-[0.18em] mb-1">Total ativos</div>
              <span
                className="font-display text-5xl font-black leading-none text-sp-red sp-num-glow"
              >
                {total}
              </span>
            </div>
            <div
              className="text-[9px] font-data uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)',
                color: '#22C55E',
              }}
            >
              Ao vivo
            </div>
          </div>
        </div>

        {/* Top 5 Motos */}
        <div className="sp-card p-6">
          <SectionLabel>Top 5 Motos Procuradas</SectionLabel>
          {topModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <svg width="18" height="18" fill="none" stroke="#64748B" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M19 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z" />
                  <circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" />
                </svg>
              </div>
              <p className="font-data text-[12px] text-sp-muted">Nenhum lead cadastrado ainda.</p>
            </div>
          ) : (
            <ol className="space-y-3.5">
              {topModels.map((m, i) => (
                <li key={m.model_name} className="flex items-center gap-3.5">
                  <span
                    className="font-display font-black text-base w-5 text-right flex-shrink-0 tabular-nums"
                    style={{
                      color: i === 0 ? '#FF1F2C' : '#1E293B',
                      textShadow: i === 0 ? '0 0 10px rgba(255,31,44,0.5)' : undefined,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-data text-[12px] text-sp-primary truncate pr-2">{m.model_name}</span>
                      <span className="font-data text-[11px] font-semibold text-sp-muted flex-shrink-0">{m.total}</span>
                    </div>
                    <div
                      className="h-px rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(m.total / topModels[0].total) * 100}%`,
                          background: i === 0 ? '#FF1F2C' : 'rgba(255,255,255,0.15)',
                          boxShadow: i === 0 ? '0 0 4px rgba(255,31,44,0.6)' : undefined,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Calendário */}
        <div className="sp-card p-6 lg:col-span-2">
          <SectionLabel>Calendário de Eventos</SectionLabel>
          <p className="font-data text-[11px] text-sp-muted mb-4 -mt-2">
            Clique em uma data para adicionar evento ou data comemorativa.
          </p>
          <Calendar />
        </div>

      </div>
    </LayoutShell>
  )
}
