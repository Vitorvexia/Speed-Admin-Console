# Filtro de Período — Leads e Estoque (match) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar filtro de período (presets + range customizado) na tela Leads (por data de entrada e por último contato) e no popup de match do Estoque (por último contato, com fallback pra data de entrada).

**Architecture:** Um módulo puro `lib/date-range.ts` centraliza tipos e cálculo de presets→bounds. Um componente `components/date-range-filter.tsx` renderiza o dropdown + inputs customizados e é controlado pelo parent. Leads aplica os bounds na query Supabase (server-side). O popup de match aplica os bounds num filtro client-side sobre a lista já carregada (sem query nova).

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase JS client, Tailwind.

## Global Constraints

- Projeto não tem Vitest/Playwright configurado e nenhuma feature existente tem teste automatizado — não instalar framework de teste novo. Verificação é: `npx tsc --noEmit` (typecheck) + teste manual no browser via `npm run dev`.
- Seguir estilo de código existente: `'use client'`, classes `sp-*` do design system, `font-data` pra números/labels, sem comentários desnecessários.
- Datas em inputs `type="date"` usam string `YYYY-MM-DD` (mesmo padrão já usado em `last_contacted_at.slice(0, 10)` em `app/leads/page.tsx`).

---

### Task 1: Módulo `lib/date-range.ts`

**Files:**
- Create: `lib/date-range.ts`

**Interfaces:**
- Produces: `DateRangePreset` (union type), `DateRangeValue` (`{ preset: DateRangePreset; from: string | null; to: string | null }`), `DEFAULT_DATE_RANGE: DateRangeValue`, `PRESET_LABELS: Record<DateRangePreset, string>`, `PRESET_ORDER: DateRangePreset[]`, `dateRangeBounds(value: DateRangeValue): { gte: string | null; lte: string | null }`, `isWithinDateRange(iso: string, value: DateRangeValue): boolean`.

- [ ] **Step 1: Criar o arquivo com tipos, presets e cálculo de bounds**

```typescript
// lib/date-range.ts

export type DateRangePreset = '7d' | '30d' | '90d' | '6m' | '1y' | 'all' | 'custom'

export type DateRangeValue = {
  preset: DateRangePreset
  from: string | null // 'YYYY-MM-DD', só usado quando preset === 'custom'
  to: string | null   // 'YYYY-MM-DD', só usado quando preset === 'custom'
}

export const DEFAULT_DATE_RANGE: DateRangeValue = { preset: 'all', from: null, to: null }

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  '6m': '6 meses',
  '1y': '1 ano',
  all: 'Tudo',
  custom: 'Personalizado',
}

export const PRESET_ORDER: DateRangePreset[] = ['all', '7d', '30d', '90d', '6m', '1y', 'custom']

const PRESET_DAYS: Record<'7d' | '30d' | '90d' | '6m' | '1y', number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 182,
  '1y': 365,
}

// Bounds inclusivos em ISO timestamp. null = sem limite naquele lado.
export function dateRangeBounds(value: DateRangeValue): { gte: string | null; lte: string | null } {
  if (value.preset === 'all') return { gte: null, lte: null }

  if (value.preset === 'custom') {
    return {
      gte: value.from ? `${value.from}T00:00:00.000Z` : null,
      lte: value.to ? `${value.to}T23:59:59.999Z` : null,
    }
  }

  const from = new Date()
  from.setUTCDate(from.getUTCDate() - PRESET_DAYS[value.preset])
  return { gte: from.toISOString(), lte: null }
}

// Compara uma data ISO contra o range — usado pro filtro client-side do match popup.
export function isWithinDateRange(iso: string, value: DateRangeValue): boolean {
  const bounds = dateRangeBounds(value)
  if (!bounds.gte && !bounds.lte) return true
  const t = new Date(iso).getTime()
  if (bounds.gte && t < new Date(bounds.gte).getTime()) return false
  if (bounds.lte && t > new Date(bounds.lte).getTime()) return false
  return true
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `lib/date-range.ts` (o projeto pode já ter warnings pré-existentes em outros arquivos — ignore-os, confira só que nada aponta pra este arquivo).

- [ ] **Step 3: Commit**

```bash
git add lib/date-range.ts
git commit -m "feat: adicionar helper de calculo de range de datas (presets + custom)"
```

---

### Task 2: Componente `components/date-range-filter.tsx`

**Files:**
- Create: `components/date-range-filter.tsx`

**Interfaces:**
- Consumes: `DateRangeValue`, `DateRangePreset`, `PRESET_LABELS`, `PRESET_ORDER` de `@/lib/date-range` (Task 1).
- Produces: `DateRangeFilter` (default export), props `{ label: string; value: DateRangeValue; onChange: (value: DateRangeValue) => void }`.

- [ ] **Step 1: Criar o componente**

```tsx
// components/date-range-filter.tsx
'use client'
import type { DateRangePreset, DateRangeValue } from '@/lib/date-range'
import { PRESET_LABELS, PRESET_ORDER } from '@/lib/date-range'

type Props = {
  label: string
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
}

export default function DateRangeFilter({ label, value, onChange }: Props) {
  function handlePresetChange(preset: DateRangePreset) {
    if (preset === 'custom') {
      onChange({ preset, from: value.from, to: value.to })
    } else {
      onChange({ preset, from: null, to: null })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value.preset}
        onChange={e => handlePresetChange(e.target.value as DateRangePreset)}
        className="sp-select font-data text-[13px] px-4 py-2"
      >
        {PRESET_ORDER.map(p => (
          <option key={p} value={p}>{label} — {PRESET_LABELS[p]}</option>
        ))}
      </select>
      {value.preset === 'custom' && (
        <>
          <input
            type="date"
            value={value.from ?? ''}
            onChange={e => onChange({ ...value, from: e.target.value || null })}
            className="sp-input font-data text-[13px] px-3 py-2"
          />
          <span className="font-data text-[12px] text-sp-muted">até</span>
          <input
            type="date"
            value={value.to ?? ''}
            onChange={e => onChange({ ...value, to: e.target.value || null })}
            className="sp-input font-data text-[13px] px-3 py-2"
          />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros apontando pra `components/date-range-filter.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/date-range-filter.tsx
git commit -m "feat: adicionar componente DateRangeFilter (presets + range customizado)"
```

---

### Task 3: Filtros de período na tela Leads

**Files:**
- Modify: `app/leads/page.tsx`

**Interfaces:**
- Consumes: `DateRangeFilter` (Task 2), `DateRangeValue`, `DEFAULT_DATE_RANGE`, `dateRangeBounds` de `@/lib/date-range` (Task 1).

- [ ] **Step 1: Importar dependências novas**

Em `app/leads/page.tsx:1-6`, adicionar aos imports existentes:

```typescript
import DateRangeFilter from '@/components/date-range-filter'
import { DEFAULT_DATE_RANGE, dateRangeBounds, type DateRangeValue } from '@/lib/date-range'
```

- [ ] **Step 2: Adicionar estado dos dois filtros**

Em `app/leads/page.tsx:32-33` (logo após `filterStatus`/`filterModel`), adicionar:

```typescript
  const [filterCreatedRange, setFilterCreatedRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
  const [filterContactedRange, setFilterContactedRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
```

- [ ] **Step 3: Incluir os novos filtros na dependência do `useEffect` que recarrega dados**

Em `app/leads/page.tsx:66`, trocar:

```typescript
  useEffect(() => { loadData() }, [filterStatus, filterModel])
```

por:

```typescript
  useEffect(() => { loadData() }, [filterStatus, filterModel, filterCreatedRange, filterContactedRange])
```

- [ ] **Step 4: Aplicar os bounds na query**

Em `app/leads/page.tsx:79-84`, trocar `buildLeadsQuery`:

```typescript
  function buildLeadsQuery() {
    let q = supabase.from('leads').select('*, models(name)').order('created_at', { ascending: false })
    if (filterStatus) q = q.eq('status', filterStatus)
    if (filterModel) q = q.eq('interested_model', filterModel)
    return q
  }
```

por:

```typescript
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

- [ ] **Step 5: Renderizar os dois filtros na UI**

Em `app/leads/page.tsx:146-165`, dentro da `<div className="flex flex-wrap gap-3 mb-5">`, depois do `<select>` de modelo (antes do fechamento da div), adicionar:

```tsx
        <DateRangeFilter label="Entrou em" value={filterCreatedRange} onChange={setFilterCreatedRange} />
        <DateRangeFilter label="Último contato" value={filterContactedRange} onChange={setFilterContactedRange} />
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros em `app/leads/page.tsx`.

- [ ] **Step 7: Verificação manual no browser**

Run: `npm run dev`

No browser, em `/leads`:
1. Cadastre (ou confirme que já existe) um lead com `last_contacted_at` de mais de 90 dias atrás e outro recente.
2. Selecione preset "30 dias" no filtro "Último contato" — confira que só o lead recente aparece.
3. Troque pra "Personalizado", escolha um range que cubra o lead antigo — confira que ele reaparece.
4. Repita rapidamente pro filtro "Entrou em" usando `created_at` (pode inferir pela ordem/data de criação do lead).
5. Volte ambos os filtros pra "Tudo" — confira que a lista completa volta.

- [ ] **Step 8: Commit**

```bash
git add app/leads/page.tsx
git commit -m "feat: filtro de periodo (entrada e ultimo contato) na tela Leads"
```

---

### Task 4: Campos extras em `MatchedLead` e nas queries do Estoque

**Files:**
- Modify: `lib/supabase/types.ts:47-52`
- Modify: `app/estoque/page.tsx:108-113` (query em `handleSubmit`), `app/estoque/page.tsx:204-208` (botão de leads na tabela desktop), `app/estoque/page.tsx:266-269` (botão de leads no card mobile)

**Interfaces:**
- Produces: `MatchedLead` com `last_contacted_at: string | null` e `created_at: string` — consumido por `MatchPopup` na Task 5.

- [ ] **Step 1: Adicionar os campos no tipo `MatchedLead`**

Em `lib/supabase/types.ts:47-52`, trocar:

```typescript
export type MatchedLead = {
  name: string
  phone: string | null
  email: string | null
  notes: string | null
}
```

por:

```typescript
export type MatchedLead = {
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  last_contacted_at: string | null
  created_at: string
}
```

- [ ] **Step 2: Incluir os campos nas 3 queries que buscam leads pareados**

Em `app/estoque/page.tsx`, as 3 ocorrências de `.select('name, phone, email, notes')` (linhas ~110, ~205, ~267) trocam para:

```typescript
.select('name, phone, email, notes, last_contacted_at, created_at')
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros em `lib/supabase/types.ts` ou `app/estoque/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts app/estoque/page.tsx
git commit -m "feat: incluir last_contacted_at e created_at na busca de leads pareados"
```

---

### Task 5: Filtro de período dentro do popup de match

**Files:**
- Modify: `components/match-popup.tsx`

**Interfaces:**
- Consumes: `DateRangeFilter` (Task 2), `DEFAULT_DATE_RANGE`, `isWithinDateRange`, `type DateRangeValue` de `@/lib/date-range` (Task 1); `MatchedLead` com os campos novos (Task 4).

- [ ] **Step 1: Importar dependências e adicionar estado do filtro**

Em `components/match-popup.tsx:1-8`, trocar:

```typescript
'use client'
import type { MatchedLead } from '@/lib/supabase/types'

type Props = {
  leads: MatchedLead[]
  modelName: string
  onClose: () => void
}

export default function MatchPopup({ leads, modelName, onClose }: Props) {
```

por:

```typescript
'use client'
import { useState } from 'react'
import type { MatchedLead } from '@/lib/supabase/types'
import DateRangeFilter from '@/components/date-range-filter'
import { DEFAULT_DATE_RANGE, isWithinDateRange, type DateRangeValue } from '@/lib/date-range'

type Props = {
  leads: MatchedLead[]
  modelName: string
  onClose: () => void
}

export default function MatchPopup({ leads, modelName, onClose }: Props) {
  const [range, setRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
  const filteredLeads = leads.filter(l => isWithinDateRange(l.last_contacted_at ?? l.created_at, range))
```

- [ ] **Step 2: Trocar as referências de `leads` por `filteredLeads` na renderização**

Em `components/match-popup.tsx`, a contagem no header (linha ~37: `{leads.length} lead{leads.length !== 1 ? 's' : ''} para contatar`) e a lista (linha ~65-66: `leads.length === 0` / `leads.map(...)`) trocam `leads` por `filteredLeads`:

```tsx
            <p className="font-data text-[11px] text-sp-muted">
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} para contatar
            </p>
```

```tsx
        {filteredLeads.length === 0 ? (
          <div className="py-10 text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <svg width="18" height="18" fill="none" stroke="#64748B" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <p className="font-data text-[12px] text-sp-muted">Nenhum lead com interesse neste modelo.</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {filteredLeads.map((lead, i) => (
```

(mantém o resto do `<li>` igual — só a fonte da lista muda.)

- [ ] **Step 3: Adicionar o `DateRangeFilter` no header do popup**

Em `components/match-popup.tsx`, logo abaixo do parágrafo de contagem (dentro da mesma `<div>` do header, antes do botão de fechar ou numa linha própria), adicionar:

```tsx
            <div className="mt-2">
              <DateRangeFilter label="Último contato" value={range} onChange={setRange} />
            </div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros em `components/match-popup.tsx`.

- [ ] **Step 5: Verificação manual no browser**

Run: `npm run dev` (se não estiver rodando da Task 3)

No browser, em `/estoque`:
1. Garanta que existe um modelo com pelo menos 2 leads interessados: um com `last_contacted_at` recente, outro com `last_contacted_at` antigo (>90 dias) ou sem contato mas `created_at` recente.
2. Clique no badge "N leads" desse modelo (ou cadastre uma moto nova desse modelo pra abrir o popup via fluxo de match).
3. Confirme que o popup abre com preset "Tudo" e mostra todos os leads.
4. Troque pro preset "30 dias" — confirme que o lead antigo (com contato antigo) some e o lead sem contato mas recente continua aparecendo (fallback pra `created_at`).
5. Volte pra "Tudo" — confirme que a lista completa retorna.

- [ ] **Step 6: Commit**

```bash
git add components/match-popup.tsx
git commit -m "feat: filtro de periodo no popup de match do Estoque (com fallback para created_at)"
```
