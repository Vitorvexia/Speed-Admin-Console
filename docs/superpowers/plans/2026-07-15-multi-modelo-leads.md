# Múltiplos Modelos de Interesse por Lead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que um lead tenha vários modelos de interesse (em vez de um único), com status automático baseado em qualquer um deles ter estoque, e todas as queries de leitura (filtro de Leads, contagem e popup de match do Estoque) refletindo o novo modelo N:N.

**Architecture:** Tabela de junção `lead_models` (lead_id, model_id) substitui a FK única `leads.interested_model`. Um helper compartilhado `lib/supabase/matched-leads.ts` centraliza a query "leads não-fechados interessados num modelo" — usada em 4 pontos diferentes (Estoque: form de nova moto, botão da tabela, card mobile; Estoque/[id]: busca de leads). `ModelMultiCombobox` é um novo componente (irmão do `ModelCombobox` existente, que continua em uso no form de Estoque pra `model_id` único da moto) com seleção múltipla via chips.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase JS client v2, Tailwind, Postgres/Supabase.

## Global Constraints

- Projeto não tem Vitest/Playwright configurado e nenhuma feature existente tem teste automatizado — não instalar framework de teste novo. Verificação é: `npx tsc --noEmit` (typecheck) + teste manual no browser via `npm run dev`.
- Não há Supabase CLI configurado (`supabase/` só tem a pasta `migrations`, sem `config.toml`) — migrations são SQL puro rodado manualmente no SQL Editor do Supabase (mesmo padrão do `001_initial_schema.sql`). A Task 1 exige uma ação manual do usuário fora do editor de código.
- Seguir estilo de código existente: `'use client'`, classes `sp-*` do design system, `font-data` pra labels/números, sem comentários desnecessários, sem generics de tipo no client Supabase (client já é usado sem `Database` type — resultados de query são `any`, cast manual quando precisa tipar).
- Sem prioridade/ordem entre modelos de interesse — lista simples.
- Status automático (`pendente` ↔ `a_negociar`): `a_negociar` se **qualquer** modelo de interesse do lead tem estoque `disponivel`; `pendente` se **nenhum** tem. `fechado` nunca é tocado.
- Volume: ~1000 leads/semestre — filtro por modelo na tela Leads é server-side (não carrega a base inteira pro client pra filtrar).

---

### Task 1: Migration — tabela `lead_models`

**Files:**
- Create: `supabase/migrations/002_lead_models_junction.sql`

**Interfaces:**
- Produces: tabela `lead_models(lead_id uuid, model_id uuid)` com PK composta, index em `model_id`, RLS igual às outras tabelas. Coluna `leads.interested_model` deixa de existir.

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/002_lead_models_junction.sql
-- Multiplos modelos de interesse por lead
-- Rodar no Supabase SQL Editor

CREATE TABLE lead_models (
  lead_id  uuid REFERENCES leads(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, model_id)
);

CREATE INDEX idx_lead_models_model ON lead_models(model_id);

ALTER TABLE lead_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_rw" ON lead_models
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Migra os dados existentes da FK única antes de dropar a coluna
INSERT INTO lead_models (lead_id, model_id)
SELECT id, interested_model FROM leads WHERE interested_model IS NOT NULL;

DROP INDEX IF EXISTS idx_leads_interested_model;

ALTER TABLE leads DROP COLUMN interested_model;
```

- [ ] **Step 2: Rodar no Supabase SQL Editor (ação manual do usuário)**

Abrir o projeto no Supabase Dashboard → SQL Editor → colar o conteúdo do arquivo → Run.

- [ ] **Step 3: Verificar no SQL Editor**

Rodar:

```sql
SELECT lead_id, model_id FROM lead_models LIMIT 5;
SELECT column_name FROM information_schema.columns WHERE table_name = 'leads';
```

Esperado: `lead_models` tem uma linha por lead que já tinha `interested_model` preenchido; a segunda query não lista mais `interested_model` entre as colunas de `leads`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_lead_models_junction.sql
git commit -m "feat: migration para tabela de juncao lead_models (multiplos modelos por lead)"
```

---

### Task 2: Tipo `Lead` sem FK única

**Files:**
- Modify: `lib/supabase/types.ts:10-22`

**Interfaces:**
- Produces: `Lead` com `models: Model[]` no lugar de `interested_model: string` e `models?: Model`.

- [ ] **Step 1: Atualizar o tipo**

Em `lib/supabase/types.ts:10-22`, trocar:

```typescript
export type Lead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  interested_model: string
  status: LeadStatus
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  models?: Model
}
```

por:

```typescript
export type Lead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  status: LeadStatus
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  models: Model[]
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: novos erros em `app/leads/page.tsx` (ainda não migrado — normal, será corrigido na Task 6). Confirme que não há erro apontando pra `lib/supabase/types.ts` em si.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: tipo Lead passa a ter varios modelos de interesse"
```

---

### Task 3: `lead-sync.ts` — status considera todos os modelos do lead

**Files:**
- Modify: `lib/supabase/lead-sync.ts`

**Interfaces:**
- Consumes: tabela `lead_models` (Task 1).
- Produces: `syncLeadStatusForModel(supabase: SupabaseClient, modelId: string | null | undefined): Promise<void>` — mesma assinatura de antes, chamada sem mudança pelos callers em `app/estoque/page.tsx` e `app/estoque/[id]/page.tsx`.

- [ ] **Step 1: Reescrever a lógica de sync**

Em `lib/supabase/lead-sync.ts`, substituir o arquivo inteiro por:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

// Mantém leads.status coerente com a disponibilidade real dos modelos de interesse no estoque.
// a_negociar se QUALQUER modelo do lead tem estoque disponivel; pendente se NENHUM tem.
// Nunca mexe em leads 'fechado' — negócio já concluído não deve reabrir sozinho.
export async function syncLeadStatusForModel(supabase: SupabaseClient, modelId: string | null | undefined) {
  if (!modelId) return

  const { data: affected } = await supabase
    .from('lead_models')
    .select('lead_id, leads!inner(status)')
    .eq('model_id', modelId)
    .neq('leads.status', 'fechado')

  for (const row of affected ?? []) {
    const leadId = row.lead_id as string
    const currentStatus = (row.leads as unknown as { status: string }).status

    const { data: leadModels } = await supabase
      .from('lead_models')
      .select('model_id')
      .eq('lead_id', leadId)
    const modelIds = (leadModels ?? []).map(lm => lm.model_id)
    if (modelIds.length === 0) continue

    const { data: stock } = await supabase
      .from('inventory')
      .select('id')
      .in('model_id', modelIds)
      .eq('status', 'disponivel')
      .limit(1)
    const hasStock = (stock?.length ?? 0) > 0

    const nextStatus = hasStock ? 'a_negociar' : 'pendente'
    if (nextStatus !== currentStatus) {
      await supabase.from('leads').update({ status: nextStatus }).eq('id', leadId)
    }
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros apontando pra `lib/supabase/lead-sync.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/lead-sync.ts
git commit -m "feat: sync de status considera todos os modelos de interesse do lead"
```

---

### Task 4: Helper `fetchMatchedLeads`

**Files:**
- Create: `lib/supabase/matched-leads.ts`

**Interfaces:**
- Consumes: tabela `lead_models` (Task 1), tipo `MatchedLead` de `@/lib/supabase/types` (sem mudança nesta task).
- Produces: `fetchMatchedLeads(supabase: SupabaseClient, modelId: string): Promise<MatchedLead[]>` — usado nas Tasks 6 e 7.

- [ ] **Step 1: Criar o helper**

```typescript
// lib/supabase/matched-leads.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchedLead } from '@/lib/supabase/types'

// Leads não-fechados interessados num modelo, via a tabela de juncao lead_models.
export async function fetchMatchedLeads(supabase: SupabaseClient, modelId: string): Promise<MatchedLead[]> {
  const { data } = await supabase
    .from('lead_models')
    .select('leads!inner(name, phone, email, notes, last_contacted_at, created_at, status)')
    .eq('model_id', modelId)
    .in('leads.status', ['pendente', 'a_negociar'])
    .order('last_contacted_at', { referencedTable: 'leads', ascending: true, nullsFirst: true })

  return (data ?? []).map(row => row.leads as unknown as MatchedLead)
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros apontando pra `lib/supabase/matched-leads.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/matched-leads.ts
git commit -m "feat: adicionar helper fetchMatchedLeads (busca de leads por modelo via lead_models)"
```

---

### Task 5: Componente `ModelMultiCombobox`

**Files:**
- Create: `components/model-multi-combobox.tsx`

**Interfaces:**
- Consumes: `Model` de `@/lib/supabase/types`, `createClient` de `@/lib/supabase/client`.
- Produces: `ModelMultiCombobox` (default export), props `{ value: string[]; onChange: (ids: string[]) => void; required?: boolean }` — usado na Task 6.

- [ ] **Step 1: Criar o componente**

```tsx
// components/model-multi-combobox.tsx
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Model } from '@/lib/supabase/types'

type Props = {
  value: string[]
  onChange: (ids: string[]) => void
  required?: boolean
}

export default function ModelMultiCombobox({ value, onChange, required }: Props) {
  const supabase = createClient()
  const [models, setModels] = useState<Model[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadModels = useCallback(async () => {
    const { data } = await supabase.from('models').select('*').order('name')
    setModels(data ?? [])
  }, [])

  useEffect(() => { loadModels() }, [loadModels])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedModels = value
    .map(id => models.find(m => m.id === id))
    .filter((m): m is Model => !!m)

  const filtered = (query.trim()
    ? models.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    : models
  ).filter(m => !value.includes(m.id))

  const exactMatch = models.some(m => m.name.toLowerCase() === query.toLowerCase().trim())
  const showCreate = query.trim().length > 0 && !exactMatch

  function handleSelect(m: Model) {
    onChange([...value, m.id])
    setQuery('')
    setOpen(false)
  }

  function handleRemove(id: string) {
    onChange(value.filter(v => v !== id))
  }

  async function handleCreate() {
    const name = query.trim()
    if (!name) return
    setCreating(true)
    const { data, error } = await supabase.from('models').insert({ name }).select().single()
    if (data) {
      await loadModels()
      onChange([...value, data.id])
      setQuery('')
    } else if (error) {
      alert(`Erro ao criar modelo: ${error.message}`)
    }
    setCreating(false)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      {selectedModels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedModels.map(m => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-data text-[11px] font-semibold"
              style={{ background: 'rgba(255,31,44,0.1)', border: '1px solid rgba(255,31,44,0.25)', color: '#FF8080' }}
            >
              {m.name}
              <button type="button" onClick={() => handleRemove(m.id)} className="hover:text-white transition-colors">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar ou criar modelo..."
        className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary placeholder:text-sp-faint font-data"
      />
      <input type="hidden" value={value.length > 0 ? '1' : ''} required={required} />

      {open && (filtered.length > 0 || showCreate) && (
        <ul
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden max-h-52 overflow-y-auto"
          style={{
            background: '#131B26',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          }}
        >
          {filtered.map(m => (
            <li
              key={m.id}
              onMouseDown={() => handleSelect(m)}
              className="px-4 py-2.5 font-data text-[13px] cursor-pointer transition-colors"
              style={{ color: '#94A3B8' }}
              onMouseEnter={e => { (e.currentTarget as HTMLLIElement).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLLIElement).style.background = '' }}
            >
              {m.name}
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={handleCreate}
              className="px-4 py-2.5 font-data text-[13px] cursor-pointer transition-colors"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#38BDF8' }}
              onMouseEnter={e => { (e.currentTarget as HTMLLIElement).style.background = 'rgba(56,189,248,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLLIElement).style.background = '' }}
            >
              {creating ? 'Criando...' : <>+ Criar <strong>&quot;{query.trim()}&quot;</strong></>}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros apontando pra `components/model-multi-combobox.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/model-multi-combobox.tsx
git commit -m "feat: adicionar componente ModelMultiCombobox (selecao de varios modelos)"
```

---

### Task 6: Tela Leads — form, filtro e listagem com vários modelos

**Files:**
- Modify: `app/leads/page.tsx`

**Interfaces:**
- Consumes: `Lead` (Task 2), `syncLeadStatusForModel` sem mudança de assinatura, `ModelMultiCombobox` (Task 5).

- [ ] **Step 1: Trocar o import do combobox**

Em `app/leads/page.tsx:3`, trocar:

```typescript
import ModelCombobox from '@/components/model-combobox'
```

por:

```typescript
import ModelMultiCombobox from '@/components/model-multi-combobox'
```

- [ ] **Step 2: Trocar o campo do form de `interested_model` pra `model_ids`**

Em `app/leads/page.tsx:44-48`, trocar:

```typescript
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    interested_model: '', status: 'pendente' as LeadStatus,
    notes: '', last_contacted_at: '',
  })
```

por:

```typescript
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    model_ids: [] as string[], status: 'pendente' as LeadStatus,
    notes: '', last_contacted_at: '',
  })
```

- [ ] **Step 3: Reescrever `handleModelChange` pra `handleModelsChange`**

Em `app/leads/page.tsx:51-67`, trocar:

```typescript
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
```

por:

```typescript
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
```

- [ ] **Step 4: Reescrever `loadData` e `buildLeadsQuery` pra filtro server-side por modelo**

Em `app/leads/page.tsx:72-97`, trocar:

```typescript
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

    const createdBounds = dateRangeBounds(filterCreatedRange)
    if (createdBounds.gte) q = q.gte('created_at', createdBounds.gte)
    if (createdBounds.lte) q = q.lte('created_at', createdBounds.lte)

    const contactedBounds = dateRangeBounds(filterContactedRange)
    if (contactedBounds.gte) q = q.gte('last_contacted_at', contactedBounds.gte)
    if (contactedBounds.lte) q = q.lte('last_contacted_at', contactedBounds.lte)

    return q
  }
```

por:

```typescript
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
    setLeads((leadsRes.data ?? []).map(l => ({ ...l, models: (l.lead_models ?? []).map(lm => lm.models) })))
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
```

Nota: filtrar direto no embed (`.eq('lead_models.model_id', ...)` com `!inner`) restringiria também as linhas retornadas dentro do array `lead_models` de cada lead (só mostraria o modelo filtrado, escondendo os outros modelos do mesmo lead nos chips). Por isso o filtro busca os `lead_id`s primeiro e depois usa `.in('id', ...)` no fetch completo (sem `!inner`), que traz todos os modelos de cada lead retornado.

- [ ] **Step 5: Atualizar `openNew` e `openEdit`**

Em `app/leads/page.tsx:99-119`, trocar:

```typescript
  function openNew() {
    setEditingLead(null)
    setForm({ name: '', phone: '', email: '', interested_model: '', status: 'pendente', notes: '', last_contacted_at: '' })
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
```

por:

```typescript
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
```

- [ ] **Step 6: Reescrever `handleSubmit` pra gravar `lead_models`**

Em `app/leads/page.tsx:127-145`, trocar:

```typescript
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
```

por:

```typescript
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
```

- [ ] **Step 7: Coluna "Modelo" → "Modelos" na tabela desktop (chips)**

Em `app/leads/page.tsx:203-207`, trocar o header:

```tsx
                  {['Nome', 'Telefone', 'Modelo', 'Status', 'Último contato', ''].map(h => (
```

por:

```tsx
                  {['Nome', 'Telefone', 'Modelos', 'Status', 'Último contato', ''].map(h => (
```

Em `app/leads/page.tsx:231`, trocar:

```tsx
                    <td className="px-4 py-3 font-data text-sp-muted">{(lead.models as Model | undefined)?.name ?? '—'}</td>
```

por:

```tsx
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
```

- [ ] **Step 8: Chips no card mobile**

Em `app/leads/page.tsx:285-287`, trocar:

```tsx
                <div className="font-data text-[12px] text-sp-muted mb-1">
                  {(lead.models as Model | undefined)?.name ?? '—'}
                </div>
```

por:

```tsx
                <div className="flex flex-wrap gap-1 mb-2">
                  {lead.models.length > 0 ? lead.models.map(m => (
                    <span key={m.id} className="px-2 py-0.5 rounded-full font-data text-[10px] text-sp-muted"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {m.name}
                    </span>
                  )) : <span className="font-data text-[12px] text-sp-faint">—</span>}
                </div>
```

- [ ] **Step 9: Trocar o combobox no form do modal**

Em `app/leads/page.tsx:390-393`, trocar:

```tsx
              <div>
                <Label>Modelo de interesse *</Label>
                <ModelCombobox value={form.interested_model} onChange={handleModelChange} required />
              </div>
```

por:

```tsx
              <div>
                <Label>Modelos de interesse *</Label>
                <ModelMultiCombobox value={form.model_ids} onChange={handleModelsChange} required />
              </div>
```

- [ ] **Step 10: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros em `app/leads/page.tsx`.

- [ ] **Step 11: Verificação manual no browser**

Pré-requisito: Task 1 (migration) já aplicada no Supabase.

Run: `npm run dev`

No browser, em `/leads`:
1. Clique "+ Novo Lead", preencha nome, selecione 2 modelos diferentes no campo "Modelos de interesse" (confirme que aparecem como chips e dá pra remover um clicando no ×), salve.
2. Confirme que o lead aparece na tabela/card com os 2 modelos como chips.
3. Edite o lead, remova um modelo, adicione outro, salve — confirme que a lista de chips atualiza.
4. Use o filtro "Todos os modelos" pra selecionar um dos modelos do lead — confirme que ele aparece na lista filtrada com **todos** os seus modelos visíveis (não só o filtrado).
5. Cadastre uma moto em estoque (na tela Estoque) pra um dos modelos do lead — volte em Leads e confirme que o status virou "A negociar" automaticamente (se o lead ainda estava "Pendente").

- [ ] **Step 12: Commit**

```bash
git add app/leads/page.tsx
git commit -m "feat: multiplos modelos de interesse por lead na tela Leads"
```

---

### Task 7: Tela Estoque — contagem e match popup via `lead_models`

**Files:**
- Modify: `app/estoque/page.tsx`

**Interfaces:**
- Consumes: `fetchMatchedLeads` (Task 4).

- [ ] **Step 1: Importar o helper**

Em `app/estoque/page.tsx:8`, adicionar após o import de `syncLeadStatusForModel`:

```typescript
import { fetchMatchedLeads } from '@/lib/supabase/matched-leads'
```

- [ ] **Step 2: Trocar a query de contagem de leads por modelo**

Em `app/estoque/page.tsx:50-65`, trocar:

```typescript
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
```

por:

```typescript
  async function loadData() {
    setLoading(true)
    const [modelsRes, itemsQuery, leadModelsRes] = await Promise.all([
      supabase.from('models').select('*').order('name'),
      buildItemsQuery(),
      supabase.from('lead_models').select('model_id, leads!inner(status)').in('leads.status', ['pendente', 'a_negociar']),
    ])
    setModels(modelsRes.data ?? [])
    setItems(itemsQuery.data ?? [])
    const counts: Record<string, number> = {}
    for (const row of leadModelsRes.data ?? []) {
      counts[row.model_id] = (counts[row.model_id] ?? 0) + 1
    }
    setLeadCounts(counts)
    setLoading(false)
  }
```

- [ ] **Step 3: Trocar a query de match no `handleSubmit`**

Em `app/estoque/page.tsx:107-113`, trocar:

```typescript
    const selectedModel = models.find(m => m.id === form.model_id)
    const { data: matched } = await supabase
      .from('leads')
      .select('name, phone, email, notes, last_contacted_at, created_at')
      .eq('interested_model', form.model_id)
      .in('status', ['pendente', 'a_negociar'])
      .order('last_contacted_at', { ascending: true, nullsFirst: true })
```

por:

```typescript
    const selectedModel = models.find(m => m.id === form.model_id)
    const matched = await fetchMatchedLeads(supabase, form.model_id)
```

- [ ] **Step 4: Trocar a query do botão de leads na tabela desktop**

Em `app/estoque/page.tsx:203-207`, trocar:

```typescript
                          onClick={async () => {
                            const { data } = await supabase.from('leads').select('name, phone, email, notes, last_contacted_at, created_at').eq('interested_model', item.model_id).in('status', ['pendente', 'a_negociar']).order('last_contacted_at', { ascending: true, nullsFirst: true })
                            setMatchModelName((item.models as Model | undefined)?.name ?? '')
                            setMatchLeads(data ?? [])
                          }}
```

por:

```typescript
                          onClick={async () => {
                            const data = await fetchMatchedLeads(supabase, item.model_id)
                            setMatchModelName((item.models as Model | undefined)?.name ?? '')
                            setMatchLeads(data)
                          }}
```

- [ ] **Step 5: Trocar a query do botão de leads no card mobile**

Em `app/estoque/page.tsx:265-269`, trocar:

```typescript
                      onClick={async () => {
                        const { data } = await supabase.from('leads').select('name, phone, email, notes, last_contacted_at, created_at').eq('interested_model', item.model_id).in('status', ['pendente', 'a_negociar']).order('last_contacted_at', { ascending: true, nullsFirst: true })
                        setMatchModelName(modelName)
                        setMatchLeads(data ?? [])
                      }}
```

por:

```typescript
                      onClick={async () => {
                        const data = await fetchMatchedLeads(supabase, item.model_id)
                        setMatchModelName(modelName)
                        setMatchLeads(data)
                      }}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros em `app/estoque/page.tsx`.

- [ ] **Step 7: Verificação manual no browser**

Run: `npm run dev` (se não estiver rodando)

No browser, em `/estoque`:
1. Confirme que a coluna "Leads" mostra a contagem correta de leads interessados por modelo (compare com os leads cadastrados na Task 6, que têm múltiplos modelos — cada modelo deles deve contar).
2. Clique no badge de leads de um modelo — confirme que o popup mostra os leads certos.
3. Cadastre uma moto nova de um modelo que tem lead interessado — confirme que o popup de match abre automaticamente com esse lead.

- [ ] **Step 8: Commit**

```bash
git add app/estoque/page.tsx
git commit -m "feat: contagem e match de leads no Estoque via tabela lead_models"
```

---

### Task 8: Tela Estoque/[id] — busca de leads via `lead_models`

**Files:**
- Modify: `app/estoque/[id]/page.tsx`

**Interfaces:**
- Consumes: `fetchMatchedLeads` (Task 4).

- [ ] **Step 1: Importar o helper**

Em `app/estoque/[id]/page.tsx:8`, adicionar após o import de `syncLeadStatusForModel`:

```typescript
import { fetchMatchedLeads } from '@/lib/supabase/matched-leads'
```

- [ ] **Step 2: Trocar `handleMatchSearch`**

Em `app/estoque/[id]/page.tsx:88-98`, trocar:

```typescript
  async function handleMatchSearch() {
    setSearching(true)
    const { data } = await supabase
      .from('leads')
      .select('name, phone, email, notes, last_contacted_at, created_at')
      .eq('interested_model', form.model_id)
      .in('status', ['pendente', 'a_negociar'])
      .order('last_contacted_at', { ascending: true, nullsFirst: true })
    setMatchLeads(data ?? [])
    setSearching(false)
  }
```

por:

```typescript
  async function handleMatchSearch() {
    setSearching(true)
    const data = await fetchMatchedLeads(supabase, form.model_id)
    setMatchLeads(data)
    setSearching(false)
  }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros em `app/estoque/[id]/page.tsx`.

- [ ] **Step 4: Verificação manual no browser**

Run: `npm run dev` (se não estiver rodando)

No browser, entre em `/estoque/[id]` de uma moto cujo modelo tem leads interessados (dos cadastrados na Task 6) e clique "Buscar leads interessados" — confirme que o popup mostra os leads certos.

- [ ] **Step 5: Commit**

```bash
git add "app/estoque/[id]/page.tsx"
git commit -m "feat: busca de leads interessados no detalhe do Estoque via tabela lead_models"
```
