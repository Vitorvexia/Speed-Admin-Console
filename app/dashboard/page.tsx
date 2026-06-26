import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/nav'
import Calendar from '@/components/calendar'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [leadsRes, topModelsRes] = await Promise.all([
    supabase.from('leads').select('status'),
    supabase.rpc('top_models_by_leads'),
  ])

  const leads = leadsRes.data ?? []
  const topModels: { model_name: string; total: number }[] = topModelsRes.data ?? []

  const counts = {
    novo:       leads.filter(l => l.status === 'novo').length,
    pendente:   leads.filter(l => l.status === 'pendente').length,
    a_negociar: leads.filter(l => l.status === 'a_negociar').length,
  }

  return (
    <div className="flex h-full min-h-screen">
      <Nav />
      <main className="flex-1 p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Leads por status</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Novo',       count: counts.novo,       color: 'bg-blue-50 text-blue-800 border border-blue-100' },
              { label: 'Pendente',   count: counts.pendente,   color: 'bg-yellow-50 text-yellow-800 border border-yellow-100' },
              { label: 'A negociar', count: counts.a_negociar, color: 'bg-orange-50 text-orange-800 border border-orange-100' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`rounded-lg p-4 ${color}`}>
                <div className="text-3xl font-bold">{count}</div>
                <div className="text-sm mt-1 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg border p-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top 5 — motos mais procuradas</h2>
          {topModels.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum lead cadastrado ainda.</p>
          ) : (
            <ol className="space-y-2">
              {topModels.map((m, i) => (
                <li key={m.model_name} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-gray-400 text-right">{i + 1}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(m.total / topModels[0].total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-800 w-40 truncate">{m.model_name}</span>
                  <span className="text-xs font-semibold text-gray-500 w-6 text-right">{m.total}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Calendário de eventos</h2>
          <p className="text-xs text-gray-400 mb-3">Clique em qualquer data para adicionar um evento ou data comemorativa.</p>
          <Calendar />
        </section>
      </main>
    </div>
  )
}
