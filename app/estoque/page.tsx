'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/nav'
import MatchPopup from '@/components/match-popup'
import ModelCombobox from '@/components/model-combobox'
import { createClient } from '@/lib/supabase/client'
import type { InventoryItem, Model, InventoryStatus, MatchedLead } from '@/lib/supabase/types'

const STATUS_LABELS: Record<InventoryStatus, string> = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  vendido: 'Vendido',
}

const STATUS_COLORS: Record<InventoryStatus, string> = {
  disponivel: 'bg-green-100 text-green-700',
  reservado: 'bg-yellow-100 text-yellow-700',
  vendido: 'bg-gray-100 text-gray-500',
}

export default function EstoquePage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({})
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [matchLeads, setMatchLeads] = useState<MatchedLead[] | null>(null)
  const [matchModelName, setMatchModelName] = useState('')

  const [form, setForm] = useState({
    model_id: '', brand: '', year: '', color: '',
    mileage_km: '', price: '', status: 'disponivel' as InventoryStatus, notes: '',
  })

  useEffect(() => { loadData() }, [filterStatus])

  async function loadData() {
    setLoading(true)
    const [modelsRes, itemsQuery, leadsRes] = await Promise.all([
      supabase.from('models').select('*').order('name'),
      buildItemsQuery(),
      supabase.from('leads').select('interested_model').in('status', ['novo', 'pendente', 'a_negociar']),
    ])
    setModels(modelsRes.data ?? [])
    setItems(itemsQuery.data ?? [])
    const counts: Record<string, number> = {}
    for (const l of leadsRes.data ?? []) {
      counts[l.interested_model] = (counts[l.interested_model] ?? 0) + 1
    }
    setLeadCounts(counts)
    setLoading(false)
  }

  function buildItemsQuery() {
    let q = supabase.from('inventory').select('*, models(name)').order('created_at', { ascending: false })
    if (filterStatus) q = q.eq('status', filterStatus)
    return q
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      model_id: form.model_id,
      brand: form.brand,
      year: form.year ? parseInt(form.year) : null,
      color: form.color || null,
      mileage_km: form.mileage_km ? parseInt(form.mileage_km) : null,
      price: form.price ? parseFloat(form.price) : null,
      status: form.status,
      notes: form.notes || null,
    }

    const { error } = await supabase.from('inventory').insert(data)
    if (error) return

    const selectedModel = models.find(m => m.id === form.model_id)

    const { data: matched } = await supabase
      .from('leads')
      .select('name, phone, email, notes')
      .eq('interested_model', form.model_id)
      .in('status', ['novo', 'pendente', 'a_negociar'])
      .order('last_contacted_at', { ascending: true, nullsFirst: true })

    setShowForm(false)
    setForm({ model_id: '', brand: '', year: '', color: '', mileage_km: '', price: '', status: 'disponivel', notes: '' })
    loadData()

    if (matched && matched.length > 0) {
      setMatchModelName(selectedModel?.name ?? '')
      setMatchLeads(matched)
    }
  }

  return (
    <div className="flex h-full min-h-screen">
      <Nav />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Estoque</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            + Nova Moto
          </button>
        </div>

        <div className="mb-4">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-gray-400 text-sm">Estoque vazio.</p>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Modelo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Marca</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Ano</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Km</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Preço</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Leads</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{(item.models as Model | undefined)?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{item.brand}</td>
                    <td className="px-4 py-3 text-gray-600">{item.year ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.mileage_km != null ? `${item.mileage_km.toLocaleString('pt-BR')} km` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.price != null ? `R$ ${Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(leadCounts[item.model_id] ?? 0) > 0 ? (
                        <button
                          onClick={async () => {
                            const { data } = await supabase
                              .from('leads')
                              .select('name, phone, email, notes')
                              .eq('interested_model', item.model_id)
                              .in('status', ['novo', 'pendente', 'a_negociar'])
                              .order('last_contacted_at', { ascending: true, nullsFirst: true })
                            setMatchModelName((item.models as Model | undefined)?.name ?? '')
                            setMatchLeads(data ?? [])
                          }}
                          className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full hover:bg-orange-200"
                        >
                          {leadCounts[item.model_id]} lead{leadCounts[item.model_id] > 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/estoque/${item.id}`} className="text-blue-600 hover:underline text-xs">
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Nova Moto</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Modelo *</label>
                    <ModelCombobox
                      value={form.model_id}
                      onChange={id => setForm(f => ({ ...f, model_id: id }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Marca *</label>
                    <input
                      required value={form.brand}
                      onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ano</label>
                    <input
                      type="number" value={form.year}
                      onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Km</label>
                    <input
                      type="number" value={form.mileage_km}
                      onChange={e => setForm(f => ({ ...f, mileage_km: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cor</label>
                    <input
                      value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Preço (R$)</label>
                    <input
                      type="number" step="0.01" value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as InventoryStatus }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={form.notes} rows={2}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
                    Salvar e buscar leads
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="text-gray-600 px-4 py-2 rounded text-sm border hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {matchLeads !== null && (
          <MatchPopup
            leads={matchLeads}
            modelName={matchModelName}
            onClose={() => setMatchLeads(null)}
          />
        )}
      </main>
    </div>
  )
}
