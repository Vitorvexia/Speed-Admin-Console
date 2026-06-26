import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/nav'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [leadsRes, postsRes, inventoryRes] = await Promise.all([
    supabase.from('leads').select('status'),
    supabase.from('posts')
      .select('id, title, scheduled_date')
      .eq('status', 'planejado')
      .gte('scheduled_date', new Date().toISOString().slice(0, 10))
      .order('scheduled_date', { ascending: true })
      .limit(5),
    supabase.from('inventory')
      .select('id, brand, status, created_at, models(name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const leads = leadsRes.data ?? []
  const posts = postsRes.data ?? []
  const inventory = inventoryRes.data ?? []

  const counts = {
    novo: leads.filter(l => l.status === 'novo').length,
    em_contato: leads.filter(l => l.status === 'em_contato').length,
    convertido: leads.filter(l => l.status === 'convertido').length,
    perdido: leads.filter(l => l.status === 'perdido').length,
  }

  return (
    <div className="flex h-full min-h-screen">
      <Nav />
      <main className="flex-1 p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Leads por status</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Novo', count: counts.novo, color: 'bg-blue-100 text-blue-800' },
              { label: 'Em contato', count: counts.em_contato, color: 'bg-yellow-100 text-yellow-800' },
              { label: 'Convertido', count: counts.convertido, color: 'bg-green-100 text-green-800' },
              { label: 'Perdido', count: counts.perdido, color: 'bg-red-100 text-red-800' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`rounded-lg p-4 ${color}`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-6">
          <section className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Próximas postagens</h2>
            {posts.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma postagem planejada.</p>
            ) : (
              <ul className="space-y-2">
                {posts.map((p: { id: string; title: string; scheduled_date: string | null }) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{p.title}</span>
                    <span className="text-gray-400 ml-4 whitespace-nowrap">
                      {p.scheduled_date ? new Date(p.scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Últimas motos no estoque</h2>
            {inventory.length === 0 ? (
              <p className="text-sm text-gray-400">Estoque vazio.</p>
            ) : (
              <ul className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {inventory.map((item: any) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">
                      {item.brand} {item.models?.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'disponivel' ? 'bg-green-100 text-green-700' :
                      item.status === 'reservado' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {item.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
