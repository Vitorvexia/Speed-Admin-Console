# Mobile Optimization — SpeedConsole

**Date:** 2026-07-14  
**Status:** Approved  
**Scope:** Responsive overhaul for all authenticated pages

---

## Context

SpeedConsole é painel admin para loja de motos (Speed Multimarcas). Dono e funcionários acessam do celular para consultar leads, estoque e dashboard. Layout atual tem sidebar lateral fixa que quebra completamente em mobile. Tabelas de 6 colunas são ilegíveis em telas pequenas.

---

## Breakpoints

Tailwind padrão — breakpoint único relevante: `md` (768px).

- `< md` → mobile layout
- `md+` → desktop layout (comportamento atual preservado)

---

## 1. Navegação

### Desktop (md+)
Sidebar lateral existente — zero mudança. Width 220px (expandida) ou 56px (colapsada), controlada por localStorage.

### Mobile (< md)
- `<aside>` ganha classe `hidden md:flex` — some completamente
- Novo componente `components/bottom-nav.tsx`: barra fixa na base da tela
  - `fixed bottom-0 inset-x-0 z-20`
  - Backdrop blur: `bg-sp-base/90 backdrop-blur-md`
  - Borda superior: `border-t border-sp-border`
  - 4 itens: Dashboard, Leads, Estoque, Postagens
  - Cada item: ícone (17×17) + label 10px abaixo
  - Ativo: ícone e texto em `text-sp-red`
  - Inativo: `text-sp-muted`
- Logout em mobile: ícone adicionado no topbar (canto direito do header), visível só em `md:hidden`

### Layout Shell
- `<main>` ganha `pb-16 md:pb-0` para conteúdo não ficar sob bottom nav
- Padding interno: `p-3 md:p-6`
- `LayoutShell` não recebe mais `collapsed`/`onToggle` do Nav em mobile (Nav já oculto)

---

## 2. Tabelas → Cards em Mobile

### Padrão de renderização dual
```
{/* Desktop */}
<div className="hidden md:block">
  <table>...</table>
</div>

{/* Mobile */}
<div className="block md:hidden space-y-3">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Cards de Leads
Cada card `sp-card p-4` contém:
- Linha 1: nome (font-data semibold) + badge status (direita)
- Linha 2: telefone + botão WA verde (se tiver telefone)
- Linha 3: modelo de interesse (text-sp-muted)
- Linha 4: último contato (text-sp-muted text-[11px])
- Footer: botão Editar (full width) + ícone excluir

### Cards de Estoque
Cada card `sp-card p-4` contém:
- Linha 1: modelo (font-display bold) + badge status (direita)
- Linha 2: marca · ano · cor
- Linha 3: preço em destaque (text-sp-red font-display text-xl) + km
- Linha 4: contador de leads interessados (se > 0)
- Footer: botão Ver detalhes + botão Match (se disponível)

---

## 3. Formulários / Modais

### Grid de campos
`grid-cols-2 gap-3` → `grid-cols-1 sm:grid-cols-2 gap-3`

### Modal em mobile (bottom sheet)
- Container: `items-end md:items-center` no overlay
- Modal box: `rounded-t-2xl md:rounded-2xl rounded-b-none md:rounded-b-2xl`
- `max-h-[90vh] overflow-y-auto`
- Desktop: comportamento atual (centered, max-w-lg)

---

## 4. Dashboard

- Grid `grid-cols-1 lg:grid-cols-2` já correto — sem mudança
- Padding via LayoutShell (`p-3 md:p-6` cobre este caso)
- Calendário: verificar que não transborda — adicionar `overflow-x-auto` se necessário

---

## 5. Postagens

- Verificar layout atual e aplicar mesmo padrão de padding
- Cards de postagens: garantir que não usam largura fixa

---

## Arquivos Afetados

| Arquivo | Tipo de mudança |
|---|---|
| `components/bottom-nav.tsx` | NOVO — bottom navigation mobile |
| `components/nav.tsx` | `hidden md:flex` no aside; logout mobile no topbar |
| `components/layout-shell.tsx` | `pb-16 md:pb-0` no main; padding `p-3 md:p-6`; bottom-nav incluído |
| `app/leads/page.tsx` | dual render table/cards; modal bottom sheet em mobile |
| `app/estoque/page.tsx` | dual render table/cards; modal bottom sheet em mobile |
| `app/dashboard/page.tsx` | verificar calendário overflow |
| `app/postagens/page.tsx` | padding e layout check |

---

## O Que NÃO Muda

- Design system (cores, tokens, fontes) — intocado
- Comportamento desktop — zero regressão
- Lógica de negócio (Supabase queries, estado, handlers)
- Sidebar collapse/expand em desktop

---

## Critérios de Sucesso

- Nav acessível em mobile (bottom bar funcional, item ativo correto)
- Leads e estoque legíveis e operáveis em 375px (iPhone SE)
- Formulários sem campos cortados
- Modais scrolláveis em telas pequenas
- Desktop sem regressão visual
