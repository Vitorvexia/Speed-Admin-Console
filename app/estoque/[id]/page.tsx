'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import LayoutShell from '@/components/layout-shell'
import MatchPopup from '@/components/match-popup'
import ModelCombobox from '@/components/model-combobox'
import { createClient } from '@/lib/supabase/client'
import { syncLeadStatusForModel } from '@/lib/supabase/lead-sync'
import { fetchMatchedLeads } from '@/lib/supabase/matched-leads'
import type { InventoryItem, Model, InventoryStatus, MatchedLead } from '@/lib/supabase/types'

const STATUS_LABELS: Record<InventoryStatus, string> = {
  disponivel: 'Disponível',
  reservado:  'Reservado',
  vendido:    'Vendido',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-1.5">
      {children}
    </label>
  )
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
    const previousModelId = item?.model_id
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

    await syncLeadStatusForModel(supabase, form.model_id)
    if (previousModelId && previousModelId !== form.model_id) {
      await syncLeadStatusForModel(supabase, previousModelId)
    }

    setSaving(false)
    loadData()
  }

  async function handleMatchSearch() {
    setSearching(true)
    const data = await fetchMatchedLeads(supabase, form.model_id)
    setMatchLeads(data)
    setSearching(false)
  }

  if (!item) {
    return (
      <LayoutShell title="Estoque">
        <div className="flex items-center gap-2 text-sp-muted text-[13px] font-data py-8">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
          </svg>
          Carregando...
        </div>
      </LayoutShell>
    )
  }

  const selectedModel = models.find(m => m.id === form.model_id)
  const pageTitle = `${(item.models as Model | undefined)?.name ?? ''} — ${item.brand}`

  const backAction = (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 font-data text-[12px] text-sp-muted hover:text-sp-primary transition-colors"
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Voltar
    </button>
  )

  return (
    <LayoutShell title={pageTitle} actions={backAction}>
      <div className="max-w-2xl">
        <form onSubmit={handleSave} className="sp-card p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Modelo *</Label>
              <ModelCombobox value={form.model_id} onChange={id => setForm(f => ({ ...f, model_id: id }))} required />
            </div>
            <div>
              <Label>Marca *</Label>
              <input
                required value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Ano</Label>
              <input
                type="number" value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
              />
            </div>
            <div>
              <Label>Km</Label>
              <input
                type="number" value={form.mileage_km}
                onChange={e => setForm(f => ({ ...f, mileage_km: e.target.value }))}
                className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <input
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço (R$)</Label>
              <input
                type="number" step="0.01" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as InventoryStatus }))}
                className="sp-select w-full px-4 py-2.5 text-[13px]"
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <textarea
              value={form.notes} rows={3}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit" disabled={saving}
              className="sp-btn-primary px-5 py-2.5 text-white text-[12px] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={handleMatchSearch}
              disabled={searching}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-data text-[12px] text-sp-muted hover:text-sp-primary transition-colors disabled:opacity-50"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {searching ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  Buscando...
                </>
              ) : 'Buscar leads interessados'}
            </button>
          </div>
        </form>
      </div>

      {matchLeads !== null && (
        <MatchPopup
          leads={matchLeads}
          modelName={selectedModel?.name ?? ''}
          onClose={() => setMatchLeads(null)}
        />
      )}
    </LayoutShell>
  )
}
