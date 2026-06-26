'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/nav'
import MatchPopup from '@/components/match-popup'
import { createClient } from '@/lib/supabase/client'
import type { InventoryItem, Model, InventoryStatus, MatchedLead } from '@/lib/supabase/types'

const STATUS_LABELS: Record<InventoryStatus, string> = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  vendido: 'Vendido',
}

export default function EstoqueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [matchLeads, setMatchLeads] = useState<MatchedLead[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)

  const [form, setForm] = useState({
    model_id: '', brand: '', year: '', color: '',
    mileage_km: '', price: '', status: 'disponivel' as InventoryStatus, notes: '',
  })

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [itemRes, modelsRes] = await Promise.all([
      supabase.from('inventory').select('*, models(name)').eq('id', id).single(),
      supabase.from('models').select('*').order('name'),
    ])
    if (itemRes.data) {
      const i = itemRes.data as InventoryItem
      setItem(i)
      setForm({
        model_id: i.model_id,
        brand: i.brand,
        year: i.year?.toString() ?? '',
        color: i.color ?? '',
        mileage_km: i.mileage_km?.toString() ?? '',
        price: i.price?.toString() ?? '',
        status: i.status,
        notes: i.notes ?? '',
      })
    }
    setModels(modelsRes.data ?? [])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('inventory').update({
      model_id: form.model_id,
      brand: form.brand,
      year: form.year ? parseInt(form.year) : null,
      color: form.color || null,
      mileage_km: form.mileage_km ? parseInt(form.mileage_km) : null,
      price: form.price ? parseFloat(form.price) : null,
      status: form.status,
      notes: form.notes || null,
    }).eq('id', id)
    setSaving(false)
    loadData()
  }

  async function handleMatchSearch() {
    setSearching(true)
    const { data } = await supabase
      .from('leads')
      .select('name, phone, email, notes')
      .eq('interested_model', form.model_id)
      .not('status', 'in', '("convertido","perdido")')
      .order('last_contacted_at', { ascending: true, nullsFirst: true })
    setMatchLeads(data ?? [])
    setSearching(false)
  }

  if (!item) return (
    <div className="flex h-full min-h-screen">
      <Nav />
      <main className="flex-1 p-6 text-gray-400 text-sm">Carregando...</main>
    </div>
  )

  const selectedModel = models.find(m => m.id === form.model_id)

  return (
    <div className="flex h-full min-h-screen">
      <Nav />
      <main className="flex-1 p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
          <h1 className="text-xl font-bold text-gray-900">
            {(item.models as Model | undefined)?.name} — {item.brand}
          </h1>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-lg border p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Modelo *</label>
              <select
                required value={form.model_id}
                onChange={e => setForm(f => ({ ...f, model_id: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm"
              >
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ano</label>
              <input type="number" value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Km</label>
              <input type="number" value={form.mileage_km}
                onChange={e => setForm(f => ({ ...f, mileage_km: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cor</label>
              <input value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Preço (R$)</label>
              <input type="number" step="0.01" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status}
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
            <textarea value={form.notes} rows={3}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={handleMatchSearch}
              disabled={searching}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {searching ? 'Buscando...' : 'Buscar leads interessados'}
            </button>
          </div>
        </form>
      </main>

      {matchLeads !== null && (
        <MatchPopup
          leads={matchLeads}
          modelName={selectedModel?.name ?? ''}
          onClose={() => setMatchLeads(null)}
        />
      )}
    </div>
  )
}
