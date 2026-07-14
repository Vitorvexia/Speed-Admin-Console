'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import LayoutShell from '@/components/layout-shell'
import MatchPopup from '@/components/match-popup'
import ModelCombobox from '@/components/model-combobox'
import { createClient } from '@/lib/supabase/client'
import { syncLeadStatusForModel } from '@/lib/supabase/lead-sync'
import type { InventoryItem, Model, InventoryStatus, MatchedLead } from '@/lib/supabase/types'

const STATUS_LABELS: Record<InventoryStatus, string> = {
  disponivel: 'Disponível',
  reservado:  'Reservado',
  vendido:    'Vendido',
}

const STATUS_STYLE: Record<InventoryStatus, { bg: string; color: string; border: string }> = {
  disponivel: { bg: 'rgba(34,197,94,0.1)',  color: '#4ADE80', border: 'rgba(34,197,94,0.25)'  },
  reservado:  { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  vendido:    { bg: 'rgba(255,255,255,0.05)', color: '#64748B', border: 'rgba(255,255,255,0.1)' },
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-1.5">
      {children}
    </label>
  )
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
  const [deletingItem, setDeletingItem] = useState<{ id: string; name: string; model_id: string } | null>(null)

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
      supabase.from('leads').select('interested_model').in('status', ['pendente', 'a_negociar']),
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

  async function handleDelete(id: string, modelId: string) {
    await supabase.from('inventory').delete().eq('id', id)
    await syncLeadStatusForModel(supabase, modelId)
    setDeletingItem(null)
    loadData()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.model_id) {
      alert('Selecione ou crie um modelo na lista antes de salvar (clique em "+ Criar" no campo Modelo).')
      return
    }

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
    if (error) {
      alert(`Erro ao salvar moto: ${error.message}`)
      return
    }

    await syncLeadStatusForModel(supabase, form.model_id)

    const selectedModel = models.find(m => m.id === form.model_id)
    const { data: matched } = await supabase
      .from('leads')
      .select('name, phone, email, notes')
      .eq('interested_model', form.model_id)
      .in('status', ['pendente', 'a_negociar'])
      .order('last_contacted_at', { ascending: true, nullsFirst: true })

    setShowForm(false)
    setForm({ model_id: '', brand: '', year: '', color: '', mileage_km: '', price: '', status: 'disponivel', notes: '' })
    loadData()

    if (matched && matched.length > 0) {
      setMatchModelName(selectedModel?.name ?? '')
      setMatchLeads(matched)
    }
  }

  const actions = (
    <button
      onClick={() => setShowForm(true)}
      className="sp-btn-primary px-4 py-2 text-white text-[12px]"
    >
      + Nova Moto
    </button>
  )

  return (
    <LayoutShell title="Estoque" actions={actions}>
      {/* Filtro */}
      <div className="mb-5">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="sp-select font-data text-[13px] px-4 py-2"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sp-muted text-[13px] font-data py-8">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
          </svg>
          Carregando...
        </div>
      ) : items.length === 0 ? (
        <div className="sp-card p-10 text-center">
          <p className="font-data text-[13px] text-sp-muted">Estoque vazio.</p>
          <button onClick={() => setShowForm(true)} className="sp-btn-primary mt-4 px-5 py-2 text-white text-[12px]">
            + Nova Moto
          </button>
        </div>
      ) : (
        <>
          {/* Desktop — tabela */}
          <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Modelo', 'Marca', 'Ano', 'Km', 'Preço', 'Status', 'Leads', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-data font-semibold text-sp-muted text-[10px] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                  >
                    <td className="px-4 py-3 font-data font-semibold text-sp-primary">{(item.models as Model | undefined)?.name}</td>
                    <td className="px-4 py-3 font-data text-sp-muted">{item.brand}</td>
                    <td className="px-4 py-3 font-data text-sp-muted">{item.year ?? '—'}</td>
                    <td className="px-4 py-3 font-data text-sp-muted">
                      {item.mileage_km != null ? `${item.mileage_km.toLocaleString('pt-BR')} km` : '—'}
                    </td>
                    <td className="px-4 py-3 font-data text-sp-primary font-semibold">
                      {item.price != null ? `R$ ${Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full font-data text-[10px] font-semibold"
                        style={{ background: STATUS_STYLE[item.status].bg, color: STATUS_STYLE[item.status].color, border: `1px solid ${STATUS_STYLE[item.status].border}` }}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(leadCounts[item.model_id] ?? 0) > 0 ? (
                        <button
                          onClick={async () => {
                            const { data } = await supabase.from('leads').select('name, phone, email, notes').eq('interested_model', item.model_id).in('status', ['pendente', 'a_negociar']).order('last_contacted_at', { ascending: true, nullsFirst: true })
                            setMatchModelName((item.models as Model | undefined)?.name ?? '')
                            setMatchLeads(data ?? [])
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-data text-[10px] font-semibold transition-colors"
                          style={{ background: 'rgba(255,31,44,0.1)', border: '1px solid rgba(255,31,44,0.25)', color: '#FF8080' }}>
                          {leadCounts[item.model_id]} lead{leadCounts[item.model_id] > 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="font-data text-[12px] text-sp-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/estoque/${item.id}`} className="font-data text-[11px] text-sp-muted hover:text-sp-blue transition-colors">
                          Detalhes
                        </Link>
                        <button
                          onClick={() => setDeletingItem({ id: item.id, model_id: item.model_id, name: `${(item.models as Model | undefined)?.name ?? 'Moto'} ${item.brand}` })}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-sp-muted hover:text-sp-red"
                          style={{ background: 'rgba(255,255,255,0.04)' }} title="Excluir">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile — cards */}
          <div className="block md:hidden space-y-3">
            {items.map(item => {
              const modelName = (item.models as Model | undefined)?.name ?? '—'
              const leadsCount = leadCounts[item.model_id] ?? 0
              return (
                <div key={item.id} className="sp-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-display font-bold text-sp-primary text-[16px] leading-tight">{modelName}</span>
                    <span className="px-2.5 py-0.5 rounded-full font-data text-[10px] font-semibold flex-shrink-0"
                      style={{ background: STATUS_STYLE[item.status].bg, color: STATUS_STYLE[item.status].color, border: `1px solid ${STATUS_STYLE[item.status].border}` }}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <div className="font-data text-[12px] text-sp-muted mb-2">
                    {item.brand}{item.year ? ` · ${item.year}` : ''}{item.color ? ` · ${item.color}` : ''}
                    {item.mileage_km != null ? ` · ${item.mileage_km.toLocaleString('pt-BR')} km` : ''}
                  </div>
                  {item.price != null && (
                    <div className="font-display text-sp-red text-[22px] font-black sp-num-glow mb-2 leading-none">
                      R$ {Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </div>
                  )}
                  {leadsCount > 0 && (
                    <button
                      onClick={async () => {
                        const { data } = await supabase.from('leads').select('name, phone, email, notes').eq('interested_model', item.model_id).in('status', ['pendente', 'a_negociar']).order('last_contacted_at', { ascending: true, nullsFirst: true })
                        setMatchModelName(modelName)
                        setMatchLeads(data ?? [])
                      }}
                      className="mb-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-data text-[10px] font-semibold"
                      style={{ background: 'rgba(255,31,44,0.1)', border: '1px solid rgba(255,31,44,0.25)', color: '#FF8080' }}>
                      {leadsCount} lead{leadsCount > 1 ? 's' : ''} interessado{leadsCount > 1 ? 's' : ''}
                    </button>
                  )}
                  <div className="flex gap-2 pt-3 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Link href={`/estoque/${item.id}`}
                      className="flex-1 py-2 rounded-lg font-data text-[12px] text-center text-sp-muted hover:text-sp-blue transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      Detalhes
                    </Link>
                    <button
                      onClick={() => setDeletingItem({ id: item.id, model_id: item.model_id, name: `${modelName} ${item.brand}` })}
                      className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-sp-muted hover:text-sp-red flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Modal nova moto */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-end md:items-center justify-center z-50 p-0 md:p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full md:max-w-lg rounded-t-2xl md:rounded-2xl flex flex-col max-h-[90vh]"
            style={{
              background: '#0D1118',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.8)',
            }}
          >
            <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="font-display text-[13px] font-bold text-sp-primary uppercase tracking-[0.1em]">Nova Moto</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-sp-muted hover:text-sp-primary hover:bg-white/[0.05] transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                <div className="col-span-2 sm:col-span-1">
                  <Label>Cor</Label>
                  <input
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  value={form.notes} rows={2}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1 pb-2">
                <button type="submit" className="sp-btn-primary px-5 py-2.5 text-white text-[12px]">
                  Salvar e buscar leads
                </button>
                <button
                  type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-lg font-data text-[12px] text-sp-muted hover:text-sp-primary transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {matchLeads !== null && (
        <MatchPopup leads={matchLeads} modelName={matchModelName} onClose={() => setMatchLeads(null)} />
      )}

      {/* Popup excluir */}
      {deletingItem && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeletingItem(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl p-6 flex flex-col gap-4"
            style={{
              background: '#0D1118',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-[14px] font-bold text-sp-primary uppercase tracking-[0.08em]">
                Excluir moto?
              </h3>
              <p className="font-data text-[12px] text-sp-muted">
                <span className="text-sp-primary font-semibold">{deletingItem.name}</span> será removida permanentemente.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deletingItem.id, deletingItem.model_id)}
                className="flex-1 py-2.5 rounded-lg font-data text-[12px] font-semibold text-white transition-colors"
                style={{ background: '#FF1F2C', boxShadow: '0 0 16px rgba(255,31,44,0.3)' }}
              >
                Excluir
              </button>
              <button
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2.5 rounded-lg font-data text-[12px] text-sp-muted hover:text-sp-primary transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutShell>
  )
}
