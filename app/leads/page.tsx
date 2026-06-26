'use client'
import { useState, useEffect, useRef } from 'react'
import Nav from '@/components/nav'
import ModelCombobox from '@/components/model-combobox'
import { createClient } from '@/lib/supabase/client'
import type { Lead, Model, LeadStatus } from '@/lib/supabase/types'

const STATUS_LABELS: Record<LeadStatus, string> = {
  novo:       'Novo',
  pendente:   'Pendente',
  a_negociar: 'A negociar',
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  novo:       'bg-blue-100 text-blue-700',
  pendente:   'bg-yellow-100 text-yellow-700',
  a_negociar: 'bg-orange-100 text-orange-700',
}

export default function LeadsPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterModelName, setFilterModelName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const editingLeadRef = useRef<Lead | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    interested_model: '', status: 'novo' as LeadStatus,
    notes: '', last_contacted_at: '',
  })
  const [autoStatus, setAutoStatus] = useState<{ reason: string; hasStock: boolean } | null>(null)

  async function handleModelChange(id: string) {
    setForm(f => ({ ...f, interested_model: id }))
    setAutoStatus(null)
    if (!id) return
    const { data, error } = await supabase
      .from('inventory')
      .select('id')
      .eq('model_id', id)
      .eq('status', 'disponivel')
      .limit(1)
    if (error) return
    const hasStock = (data?.length ?? 0) > 0
    setAutoStatus({ hasStock, reason: hasStock ? 'Moto disponível no estoque' : 'Modelo não disponível no estoque' })
    if (!editingLeadRef.current) {
      setForm(f => ({ ...f, status: hasStock ? 'a_negociar' : 'pendente' }))
    }
  }

  useEffect(() => { editingLeadRef.current = editingLead }, [editingLead])
  useEffect(() => { loadData() }, [filterStatus, filterModel])

  async function loadData() {
    setLoading(true)
    const [modelsRes, leadsRes] = await Promise.all([
      supabase.from('models').select('*').order('name'),
      buildLeadsQuery(),
    ])
    setModels(modelsRes.data ?? [])
    setLeads(leadsRes.data ?? [])
    setLoading(false)
  }

  function buildLeadsQuery() {
    let q = supabase.from('leads').select('*, models(name)').order('created_at', { ascending: false })
    if (filterStatus) q = q.eq('status', filterStatus)
    if (filterModel) q = q.eq('interested_model', filterModel)
    return q
  }

  function openNew() {
    setEditingLead(null)
    setForm({ name: '', phone: '', email: '', interested_model: '', status: 'novo', notes: '', last_contacted_at: '' })
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
      interested_model: lead.interested_model,
      status: lead.status,
      notes: lead.notes ?? '',
      last_contacted_at: lead.last_contacted_at ? lead.last_contacted_at.slice(0, 10) : '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      interested_model: form.interested_model,
      status: form.status,
      notes: form.notes || null,
      last_contacted_at: form.last_contacted_at ? new Date(form.last_contacted_at).toISOString() : null,
    }
    if (editingLead) {
      await supabase.from('leads').update(data).eq('id', editingLead.id)
    } else {
      await supabase.from('leads').insert(data)
    }
    setShowForm(false)
    loadData()
  }

  return (
    <div className="flex h-full min-h-screen">
      <Nav />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
            + Novo Lead
          </button>
        </div>

        <div className="flex gap-3 mb-4">
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
          <select
            value={filterModel}
            onChange={e => setFilterModel(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">Todos os modelos</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : leads.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum lead encontrado.</p>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Telefone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Modelo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Último contato</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-mono text-sm">{lead.phone ?? '—'}</span>
                        {lead.phone && (
                          <a
                            href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded hover:bg-green-600"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{(lead.models as Model | undefined)?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {lead.last_contacted_at
                        ? new Date(lead.last_contacted_at).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(lead)} className="text-blue-600 hover:underline text-xs">
                        Editar
                      </button>
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
                <h2 className="font-semibold">{editingLead ? 'Editar Lead' : 'Novo Lead'}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      required value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={e => { setForm(f => ({ ...f, status: e.target.value as LeadStatus })); setAutoStatus(null) }}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    {autoStatus && (
                      <p className={`text-xs mt-1 ${autoStatus.hasStock ? 'text-green-600' : 'text-yellow-600'}`}>
                        ↑ auto — {autoStatus.reason}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Modelo de interesse *</label>
                  <ModelCombobox
                    value={form.interested_model}
                    onChange={handleModelChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Último contato</label>
                  <input
                    type="date" value={form.last_contacted_at}
                    onChange={e => setForm(f => ({ ...f, last_contacted_at: e.target.value }))}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
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
                    Salvar
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="text-gray-600 px-4 py-2 rounded text-sm border hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
