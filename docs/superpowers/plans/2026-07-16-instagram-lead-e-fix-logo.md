# Instagram nos Leads + Fix Logo Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a logo quebrada na tela de login e adicionar campo Instagram (opcional, com exigência de ao menos um contato) + filtro de tipo de contato nos leads.

**Architecture:** Fix isolado de uma linha em `proxy.ts` (matcher de assets estáticos). Feature de Instagram: nova coluna `instagram` na tabela `leads` via migration manual SQL, tipo TS atualizado, e três mudanças em `app/leads/page.tsx` (form + validação, exibição em tabela/cards, filtro por tipo de contato).

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (Postgres + supabase-js), TypeScript, Tailwind. Sem framework de testes no projeto — verificação via `tsc --noEmit`, `npm run lint` e checagem manual no `npm run dev`.

## Global Constraints

- Projeto não tem Supabase CLI configurado — migrations SQL são coladas manualmente no SQL Editor do Supabase pelo usuário. Sempre confirmar a aplicação real da migration (query de verificação) antes de testar o fluxo end-to-end que depende dela.
- Instagram é salvo no banco **sem `@`** (só o username); UI exibe `@username` e monta link `https://instagram.com/{username}`.
- `phone` e `instagram` continuam individualmente opcionais, mas pelo menos um dos dois é obrigatório (constraint de banco + validação client-side).
- Não mexer em `lib/supabase/matched-leads.ts` / tipo `MatchedLead` — fora de escopo.
- Seguir estilo visual existente (badges com `rgba(...)` inline styles, `font-data`, classes `sp-*`) — não introduzir nova lib de UI.

---

### Task 1: Fix matcher do proxy (logo quebrada no login)

**Files:**
- Modify: `proxy.ts:38-40`

**Interfaces:**
- Nenhuma nova interface — só ajusta a regex do `config.matcher` do Next.js.

- [ ] **Step 1: Editar o matcher para excluir arquivos estáticos**

Em `proxy.ts`, trocar:

```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

por:

```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)'],
}
```

- [ ] **Step 2: Rodar type-check**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `proxy.ts`.

- [ ] **Step 3: Verificar manualmente no browser**

Run: `npm run dev`, abrir `http://localhost:3000/login` numa aba anônima (sem sessão).
Expected: a logo "S" da Speed Multimarcas aparece normalmente (sem ícone de imagem quebrada). Confirmar via DevTools > Network que `GET /logo-s.png` retorna `200` com `content-type: image/png` (não mais um redirect 307/302 para `/login`).

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "fix: matcher do proxy bloqueava assets estaticos do public (logo quebrada no login)"
```

---

### Task 2: Migration + tipo TypeScript para `instagram`

**Files:**
- Create: `supabase/migrations/003_lead_instagram.sql`
- Modify: `lib/supabase/types.ts:10-21` (tipo `Lead`)

**Interfaces:**
- Produces: `Lead.instagram: string | null` — usado pelas Tasks 3, 4 e 5.

- [ ] **Step 1: Criar a migration**

Criar `supabase/migrations/003_lead_instagram.sql`:

```sql
-- supabase/migrations/003_lead_instagram.sql
-- Campo Instagram como contato alternativo ao WhatsApp
-- Rodar no Supabase SQL Editor

ALTER TABLE leads ADD COLUMN instagram text;

ALTER TABLE leads ADD CONSTRAINT leads_contact_required
  CHECK (phone IS NOT NULL OR instagram IS NOT NULL);
```

- [ ] **Step 2: Pedir para o usuário rodar a migration e confirmar aplicação real**

Pedir ao usuário para colar o SQL acima no Supabase SQL Editor e rodar. Depois, verificar de fato que a coluna existe (não confiar em "já rodei" — ver constraint [[feedback-migrations-manuais]] do projeto): rodar no SQL Editor:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'leads' AND column_name = 'instagram';
```

Expected: retorna uma linha com `instagram`. Só prosseguir para a Task 3+ depois de confirmar isso.

- [ ] **Step 3: Atualizar o tipo `Lead`**

Em `lib/supabase/types.ts`, mudar:

```ts
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

para:

```ts
export type Lead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  instagram: string | null
  status: LeadStatus
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  models: Model[]
}
```

- [ ] **Step 4: Rodar type-check**

Run: `npx tsc --noEmit`
Expected: aparecem erros em `app/leads/page.tsx` (campo `instagram` faltando nos objetos `form`/inserts) — esperado, serão corrigidos na Task 3.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/003_lead_instagram.sql lib/supabase/types.ts
git commit -m "feat: adicionar coluna instagram na tabela leads"
```

---

### Task 3: Form de lead — campo Instagram + validação de contato obrigatório

**Files:**
- Modify: `app/leads/page.tsx` (state `form`, `openNew`, `openEdit`, `handleSubmit`, JSX do form)

**Interfaces:**
- Consumes: `Lead.instagram: string | null` (Task 2).
- Produces: `form.instagram: string` no state local — consumido pela Task 4 (nenhuma, é só exibição via `leads` recarregado) e nenhuma outra task depende diretamente deste state.

- [ ] **Step 1: Adicionar `instagram` ao state do form**

Em `app/leads/page.tsx:46-50`, mudar:

```ts
const [form, setForm] = useState({
  name: '', phone: '', email: '',
  model_ids: [] as string[], status: 'pendente' as LeadStatus,
  notes: '', last_contacted_at: '',
})
```

para:

```ts
const [form, setForm] = useState({
  name: '', phone: '', email: '', instagram: '',
  model_ids: [] as string[], status: 'pendente' as LeadStatus,
  notes: '', last_contacted_at: '',
})
```

- [ ] **Step 2: Incluir `instagram: ''` nos resets de `openNew`**

Em `app/leads/page.tsx:107-112`, mudar:

```ts
function openNew() {
  setEditingLead(null)
  setForm({ name: '', phone: '', email: '', model_ids: [], status: 'pendente', notes: '', last_contacted_at: '' })
  setAutoStatus(null)
  setShowForm(true)
}
```

para:

```ts
function openNew() {
  setEditingLead(null)
  setForm({ name: '', phone: '', email: '', instagram: '', model_ids: [], status: 'pendente', notes: '', last_contacted_at: '' })
  setAutoStatus(null)
  setShowForm(true)
}
```

- [ ] **Step 3: Popular `instagram` em `openEdit`**

Em `app/leads/page.tsx:114-127`, mudar:

```ts
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

para:

```ts
function openEdit(lead: Lead) {
  setEditingLead(lead)
  setAutoStatus(null)
  setForm({
    name: lead.name,
    phone: lead.phone ?? '',
    email: lead.email ?? '',
    instagram: lead.instagram ?? '',
    model_ids: lead.models.map(m => m.id),
    status: lead.status,
    notes: lead.notes ?? '',
    last_contacted_at: lead.last_contacted_at ? lead.last_contacted_at.slice(0, 10) : '',
  })
  setShowForm(true)
}
```

- [ ] **Step 4: Validar e persistir `instagram` em `handleSubmit`**

Em `app/leads/page.tsx:135-150`, mudar:

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  if (form.model_ids.length === 0) {
    alert('Selecione ao menos um modelo de interesse antes de salvar.')
    return
  }

  const data = {
    name: form.name,
    phone: form.phone || null,
    email: form.email || null,
    status: form.status,
    notes: form.notes || null,
    last_contacted_at: form.last_contacted_at ? new Date(form.last_contacted_at).toISOString() : null,
  }
```

para:

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  if (form.model_ids.length === 0) {
    alert('Selecione ao menos um modelo de interesse antes de salvar.')
    return
  }

  const instagram = form.instagram.trim().replace(/^@/, '') || null
  if (!form.phone && !instagram) {
    alert('Informe ao menos um contato: telefone ou Instagram.')
    return
  }

  const data = {
    name: form.name,
    phone: form.phone || null,
    email: form.email || null,
    instagram,
    status: form.status,
    notes: form.notes || null,
    last_contacted_at: form.last_contacted_at ? new Date(form.last_contacted_at).toISOString() : null,
  }
```

- [ ] **Step 5: Adicionar o input de Instagram no JSX do form**

Em `app/leads/page.tsx:400-408`, o bloco atual é:

```tsx
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
```

Trocar por (adiciona um grid extra com Instagram antes do bloco de Email/Status):

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <Label>Instagram</Label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sp-faint font-data text-[13px] pointer-events-none">@</span>
      <input
        value={form.instagram}
        onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
        placeholder="usuario"
        className="sp-input w-full pl-8 pr-4 py-2.5 text-[13px] text-sp-primary font-data"
      />
    </div>
  </div>
  <div>
    <Label>Email</Label>
    <input
      type="email" value={form.email}
      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
      className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary font-data"
    />
  </div>
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <Label>Status</Label>
```

E fechar o novo grid corretamente: o `<div>` do "Status" que antes fechava o grid junto com "Email" agora fica sozinho — ajustar o JSX final desse bloco para:

```tsx
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
```

(o restante do form — Modelos de interesse, Último contato, Notas — continua igual, sem mudanças).

- [ ] **Step 6: Rodar type-check e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 7: Verificar manualmente no browser**

Run: `npm run dev`, logar, ir em `/leads`, clicar "+ Novo Lead".
Expected:
- Campo "Instagram" aparece com prefixo `@` visual antes do input.
- Deixar telefone e Instagram vazios e submeter → alert "Informe ao menos um contato: telefone ou Instagram." e o form não fecha.
- Preencher só Instagram (ex: `@fulano` ou `fulano`) com nome e modelo, salvar → sem erro, lead criado.
- Editar esse lead → campo Instagram vem preenchido sem `@` duplicado.

- [ ] **Step 8: Commit**

```bash
git add app/leads/page.tsx
git commit -m "feat: campo instagram no form de leads com validacao de contato obrigatorio"
```

---

### Task 4: Exibir Instagram na tabela/cards de leads (badge IG)

**Files:**
- Modify: `app/leads/page.tsx` (coluna "Telefone" → "Contato" na tabela desktop, bloco de contato nos cards mobile)

**Interfaces:**
- Consumes: `Lead.instagram: string | null` (Task 2), `Lead.phone: string | null` (já existente).

- [ ] **Step 1: Renomear cabeçalho da coluna e ajustar largura visual (tabela desktop)**

Em `app/leads/page.tsx:226`, mudar:

```tsx
{['Nome', 'Telefone', 'Modelos', 'Status', 'Último contato', ''].map(h => (
```

para:

```tsx
{['Nome', 'Contato', 'Modelos', 'Status', 'Último contato', ''].map(h => (
```

- [ ] **Step 2: Adicionar badge IG na célula de contato (tabela desktop)**

Em `app/leads/page.tsx:242-253`, o bloco atual é:

```tsx
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
```

Trocar por:

```tsx
<td className="px-4 py-3">
  <div className="flex flex-col gap-1">
    {lead.phone && (
      <div className="flex items-center gap-2">
        <span className="font-data text-sp-muted">{lead.phone}</span>
        <a href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-data text-[10px] font-semibold transition-colors"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ADE80' }}>
          WA
        </a>
      </div>
    )}
    {lead.instagram && (
      <div className="flex items-center gap-2">
        <span className="font-data text-sp-muted">@{lead.instagram}</span>
        <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-data text-[10px] font-semibold transition-colors"
          style={{ background: 'rgba(217,70,239,0.1)', border: '1px solid rgba(217,70,239,0.25)', color: '#E879F9' }}>
          IG
        </a>
      </div>
    )}
    {!lead.phone && !lead.instagram && <span className="font-data text-sp-faint">—</span>}
  </div>
</td>
```

- [ ] **Step 3: Adicionar badge IG no card mobile**

Em `app/leads/page.tsx:307-316`, o bloco atual é:

```tsx
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
```

Trocar por:

```tsx
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
{lead.instagram ? (
  <div className="flex items-center gap-2 mb-2">
    <span className="font-data text-[13px] text-sp-muted">@{lead.instagram}</span>
    <a href={`https://instagram.com/${lead.instagram}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-data text-[10px] font-semibold"
      style={{ background: 'rgba(217,70,239,0.1)', border: '1px solid rgba(217,70,239,0.25)', color: '#E879F9' }}>
      IG
    </a>
  </div>
) : null}
```

- [ ] **Step 4: Rodar type-check e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 5: Verificar manualmente no browser**

Run: `npm run dev`, ir em `/leads`.
Expected:
- Cabeçalho da tabela mostra "Contato" no lugar de "Telefone".
- Lead com telefone e Instagram mostra as duas linhas com badges WA e IG.
- Lead só com Instagram mostra só a linha `@usuario` + badge IG, sem "—" sobrando.
- Clicar no badge IG abre `instagram.com/{usuario}` em nova aba.
- Redimensionar pra mobile (ou DevTools responsive) — cards mostram o mesmo padrão.

- [ ] **Step 6: Commit**

```bash
git add app/leads/page.tsx
git commit -m "feat: exibir instagram com badge IG na tabela e cards de leads"
```

---

### Task 5: Filtro "Tipo de contato" (WhatsApp / Instagram)

**Files:**
- Modify: `app/leads/page.tsx` (novo state de filtro, `buildLeadsQuery`, `useEffect` de reload, JSX dos filtros)

**Interfaces:**
- Consumes: `buildLeadsQuery(leadIdFilter: string[] | null)` já existente (Task/linha 91-105).

- [ ] **Step 1: Adicionar state do filtro**

Em `app/leads/page.tsx:36-39`, mudar:

```ts
const [filterStatus, setFilterStatus] = useState('')
const [filterModel, setFilterModel] = useState('')
const [filterCreatedRange, setFilterCreatedRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
const [filterContactedRange, setFilterContactedRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
```

para:

```ts
const [filterStatus, setFilterStatus] = useState('')
const [filterModel, setFilterModel] = useState('')
const [filterContactType, setFilterContactType] = useState('')
const [filterCreatedRange, setFilterCreatedRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
const [filterContactedRange, setFilterContactedRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
```

- [ ] **Step 2: Incluir no `useEffect` de reload**

Em `app/leads/page.tsx:72`, mudar:

```ts
useEffect(() => { loadData() }, [filterStatus, filterModel, filterCreatedRange, filterContactedRange])
```

para:

```ts
useEffect(() => { loadData() }, [filterStatus, filterModel, filterContactType, filterCreatedRange, filterContactedRange])
```

- [ ] **Step 3: Aplicar o filtro em `buildLeadsQuery`**

Em `app/leads/page.tsx:91-105`, mudar:

```ts
function buildLeadsQuery(leadIdFilter: string[] | null) {
  let q = supabase.from('leads').select('*, lead_models(models(id, name))').order('created_at', { ascending: false })
  if (filterStatus) q = q.eq('status', filterStatus)
  if (leadIdFilter) q = q.in('id', leadIdFilter)
```

para:

```ts
function buildLeadsQuery(leadIdFilter: string[] | null) {
  let q = supabase.from('leads').select('*, lead_models(models(id, name))').order('created_at', { ascending: false })
  if (filterStatus) q = q.eq('status', filterStatus)
  if (filterContactType === 'whatsapp') q = q.not('phone', 'is', null)
  if (filterContactType === 'instagram') q = q.not('instagram', 'is', null)
  if (leadIdFilter) q = q.in('id', leadIdFilter)
```

- [ ] **Step 4: Adicionar o select de filtro no JSX**

Em `app/leads/page.tsx:193-200`, o bloco atual é:

```tsx
<select
  value={filterModel}
  onChange={e => setFilterModel(e.target.value)}
  className="sp-select font-data text-[13px] px-4 py-2"
>
  <option value="">Todos os modelos</option>
  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
</select>
```

Trocar por (adiciona o novo select logo depois):

```tsx
<select
  value={filterModel}
  onChange={e => setFilterModel(e.target.value)}
  className="sp-select font-data text-[13px] px-4 py-2"
>
  <option value="">Todos os modelos</option>
  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
</select>
<select
  value={filterContactType}
  onChange={e => setFilterContactType(e.target.value)}
  className="sp-select font-data text-[13px] px-4 py-2"
>
  <option value="">Todos os contatos</option>
  <option value="whatsapp">Tem WhatsApp</option>
  <option value="instagram">Tem Instagram</option>
</select>
```

- [ ] **Step 5: Rodar type-check e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 6: Verificar manualmente no browser**

Run: `npm run dev`, ir em `/leads`.
Expected:
- Novo select "Todos os contatos / Tem WhatsApp / Tem Instagram" aparece ao lado do filtro de modelo.
- Selecionar "Tem WhatsApp" → lista só leads com `phone` preenchido.
- Selecionar "Tem Instagram" → lista só leads com `instagram` preenchido.
- Voltar pra "Todos os contatos" → lista completa volta.

- [ ] **Step 7: Commit**

```bash
git add app/leads/page.tsx
git commit -m "feat: filtro de tipo de contato (whatsapp/instagram) nos leads"
```
