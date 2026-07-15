'use client'
import { useState, useEffect, useRef } from 'react'
import LayoutShell from '@/components/layout-shell'
import ModelMultiCombobox from '@/components/model-multi-combobox'
import DateRangeFilter from '@/components/date-range-filter'
import { DEFAULT_DATE_RANGE, dateRangeBounds, type DateRangeValue } from '@/lib/date-range'
import { createClient } from '@/lib/supabase/client'
import type { Lead, Model, LeadStatus } from '@/lib/supabase/types'

const STATUS_LABELS: Record<LeadStatus, string> = {
  pendente:   'Pendente',
  a_negociar: 'A negociar',
  fechado:    'Fechado',
}

const STATUS_STYLE: Record<LeadStatus, { bg: string; color: string; border: string }> = {
  pendente:   { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B', border: 'rgba(245,158,11,0.25)'  },
  a_negociar: { bg: 'rgba(255,31,44,0.1)',   color: '#FF6B6B', border: 'rgba(255,31,44,0.25)'   },
  fechado:    { bg: 'rgba(34,197,94,0.1)',   color: '#4ADE80', border: 'rgba(34,197,94,0.25)'   },
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-1.5">
      {children}
    </label>
  )
}

type LeadRow = Omit<Lead, 'models'> & { lead_models: { models: Model }[] }

export default function LeadsPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterCreatedRange, setFilterCreatedRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
  const [filterContactedRange, setFilterContactedRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const editingLeadRef = useRef<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingItem, setDeletingItem] = useState<{ id: string; name: string } | null>(null)

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    model_ids: [] as string[], status: 'pendente' as LeadStatus,
    notes: '', last_contacted_at: '',
  })
  const [autoStatus, setAutoStatus] = useState<{ reason: string; hasStock: boolean } | null>(null)

  async function handleModelsChange(ids: string[]) {
    setForm(f => ({ ...f, model_ids: ids }))
    setAutoStatus(null)
    if (ids.length === 0) return
    const { data, error } = await supabase
      .from('inventory')
      .select('id')
      .in('model_id', ids)
      .eq('status', 'disponivel')
      .limit(1)
    if (error) return
    const hasStock = (data?.length ?? 0) > 0
    setAutoStatus({ hasStock, reason: hasStock ? 'Ao menos um modelo disponível no estoque' : 'Nenhum modelo disponível no estoque' })
    if (!editingLeadRef.current) {
      setForm(f => ({ ...f, status: hasStock ? 'a_negociar' : 'pendente' }))
    }
  }

  useEffect(() => { editingLeadRef.current = editingLead }, [editingLead])
  useEffect(() => { loadData() }, [filterStatus, filterModel, filterCreatedRange, filterContactedRange])

  async function loadData() {
    setLoading(true)
    let leadIdFilter: string[] | null = null
    if (filterModel) {
      const { data: matching } = await supabase.from('lead_models').select('lead_id').eq('model_id', filterModel)
      leadIdFilter = (matching ?? []).map(r => r.lead_id)
    }
    const [modelsRes, leadsRes] = await Promise.all([
      supabase.from('models').select('*').order('name'),
      buildLeadsQuery(leadIdFilter),
    ])
    setModels(modelsRes.data ?? [])
    const rows = (leadsRes.data ?? []) as LeadRow[]
    setLeads(rows.map(({ lead_models, ...rest }) => ({ ...rest, models: lead_models.map(lm => lm.models) })))
    setLoading(false)
  }

  function buildLeadsQuery(leadIdFilter: string[] | null) {
    let q = supabase.from('leads').select('*, lead_models(models(id, name))').order('created_at', { ascending: false })
    if (filterStatus) q = q.eq('status', filterStatus)
    if (leadIdFilter) q = q.in('id', leadIdFilter)

    const createdBounds = dateRangeBounds(filterCreatedRange)
    if (createdBounds.gte) q = q.gte('created_at', createdBounds.gte)
    if (createdBounds.lte) q = q.lte('created_at', createdBounds.lte)

    const contactedBounds = dateRangeBounds(filterContactedRange)
    if (contactedBounds.gte) q = q.gte('last_contacted_at', contactedBounds.gte)
    if (contactedBounds.lte) q = q.lte('last_contacted_at', contactedBounds.lte)

    return q
  }

  function openNew() {
    setEditingLead(null)
    setForm({ name: '', phone: '', email: '', model_ids: [], status: 'pendente', notes: '', last_contacted_at: '' })
    setAutoStatus(null)
    setShowForm(true)
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead)
    setAutoStatus(null)
    setForm({
      name: lead.name,
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      model_ids: lead.models.map(m => m.id),
      status: lead.status,
      notes: lead.notes ?? '',
      last_contacted_at: lead.last_contacted_at ? lead.last_contacted_at.slice(0, 10) : '',
    })
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    await supabase.from('leads').delete().eq('id', id)
    setDeletingItem(null)
    loadData()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      status: form.status,
      notes: form.notes || null,
      last_contacted_at: form.last_contacted_at ? new Date(form.last_contacted_at).toISOString() : null,
    }
    let leadId = editingLead?.id
    if (editingLead) {
      await supabase.from('leads').update(data).eq('id', editingLead.id)
    } else {
      const { data: inserted, error } = await supabase.from('leads').insert(data).select('id').single()
      if (error || !inserted) {
        alert(`Erro ao salvar lead: ${error?.message}`)
        return
      }
      leadId = inserted.id
    }
    await supabase.from('lead_models').delete().eq('lead_id', leadId)
    if (form.model_ids.length > 0) {
      await supabase.from('lead_models').insert(form.model_ids.map(model_id => ({ lead_id: leadId, model_id })))
    }
    setShowForm(false)
    loadData()
  }

  const actions = (
    <button
      onClick={openNew}
      className="sp-btn-primary px-4 py-2 text-white text-[12px]"
    >
      + Novo Lead
    </button>
  )

  return (
    <LayoutShell title="Leads" actions={actions}>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
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
        <select
          value={filterModel}
          onChange={e => setFilterModel(e.target.value)}
          className="sp-select font-data text-[13px] px-4 py-2"
        >
          <option value="">Todos os modelos</option>
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <DateRangeFilter label="Entrou em" value={filterCreatedRange} onChange={setFilterCreatedRange} />
        <DateRangeFilter label="Último contato" value={filterContactedRange} onChange={setFilterContactedRange} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sp-muted text-[13px] font-data py-8">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
          </svg>
          Carregando...
        </div>
      ) : leads.length === 0 ? (
        <div className="sp-card p-10 text-center">
          <p className="font-data text-[13px] text-sp-muted">Nenhum lead encontrado.</p>
          <button onClick={openNew} className="sp-btn-primary mt-4 px-5 py-2 text-white text-[12px]">
            + Novo Lead
          </button>
        </div>
      ) : (
        <>
          {/* Desktop — tabela */}
          <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Nome', 'Telefone', 'Modelos', 'Status', 'Último contato', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-data font-semibold text-sp-muted text-[10px] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: i < leads.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                  >
                    <td className="px-4 py-3 font-data font-semibold text-sp-primary">{lead.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-data text-sp-muted">{lead.phone ?? '—'}</span>
                        {lead.phone && (
                          <a href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-data text-[10px] font-semibold transition-colors"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ADE80' }}>
                            WA
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {lead.models.length > 0 ? lead.models.map(m => (
                          <span key={m.id} className="px-2 py-0.5 rounded-full font-data text-[10px] text-sp-muted"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {m.name}
                          </span>
                        )) : <span className="font-data text-[12px] text-sp-faint">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full font-data text-[10px] font-semibold"
                        style={{ background: STATUS_STYLE[lead.status].bg, color: STATUS_STYLE[lead.status].color, border: `1px solid ${STATUS_STYLE[lead.status].border}` }}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-data text-sp-muted text-[12px]">
                      {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(lead)} className="font-data text-[11px] text-sp-muted hover:text-sp-blue transition-colors">
                          Editar
                        </button>
                        <button onClick={() => setDeletingItem({ id: lead.id, name: lead.name })}
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
            {leads.map(lead => (
              <div key={lead.id} className="sp-card p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-data font-semibold text-sp-primary text-[14px]">{lead.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full font-data text-[10px] font-semibold flex-shrink-0"
                    style={{ background: STATUS_STYLE[lead.status].bg, color: STATUS_STYLE[lead.status].color, border: `1px solid ${STATUS_STYLE[lead.status].border}` }}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </div>
                {lead.phone ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-data text-[13px] text-sp-muted">{lead.phone}</span>
                    <a href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-data text-[10px] font-semibold"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ADE80' }}>
                      WA
                    </a>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-1 mb-2">
                  {lead.models.length > 0 ? lead.models.map(m => (
                    <span key={m.id} className="px-2 py-0.5 rounded-full font-data text-[10px] text-sp-muted"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {m.name}
                    </span>
                  )) : <span className="font-data text-[12px] text-sp-faint">—</span>}
                </div>
                {lead.last_contacted_at && (
                  <div className="font-data text-[11px] text-sp-muted mb-1">
                    Último contato: {new Date(lead.last_contacted_at).toLocaleDateString('pt-BR')}
                  </div>
                )}
                <div className="flex gap-2 pt-3 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => openEdit(lead)}
                    className="flex-1 py-2 rounded-lg font-data text-[12px] text-sp-muted hover:text-sp-blue transition-colors text-center"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    Editar
                  </button>
                  <button onClick={() => setDeletingItem({ id: lead.id, name: lead.name })}
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
            ))}
          </div>
        </>
      )}

      {/* Modal */}
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
              <h2 className="font-display text-[13px] font-bold text-sp-primary uppercase tracking-[0.1em]">
                {editingLead ? 'Editar Lead' : 'Novo Lead'}
              </h2>
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
                  <Label>Nome *</Label>
                  <input
                    required value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <input
                    type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={e => { setForm(f => ({ ...f, status: e.target.value as LeadStatus })); setAutoStatus(null) }}
                    className="sp-select w-full px-4 py-2.5 text-[13px]"
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  {autoStatus && (
                    <p className={`font-data text-[11px] mt-1 ${autoStatus.hasStock ? 'text-sp-green' : 'text-sp-amber'}`}>
                      ↑ auto — {autoStatus.reason}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label>Modelos de interesse *</Label>
                <ModelMultiCombobox value={form.model_ids} onChange={handleModelsChange} required />
              </div>
              <div>
                <Label>Último contato</Label>
                <input
                  type="date" value={form.last_contacted_at}
                  onChange={e => setForm(f => ({ ...f, last_contacted_at: e.target.value }))}
                  className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
                />
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
                  Salvar
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
                Excluir lead?
              </h3>
              <p className="font-data text-[12px] text-sp-muted">
                <span className="text-sp-primary font-semibold">{deletingItem.name}</span> será removido permanentemente.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deletingItem.id)}
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
