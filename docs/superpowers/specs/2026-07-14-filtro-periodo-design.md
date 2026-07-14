# Filtro de período — Leads e Estoque (match)

## Contexto

Tela Leads não tem como filtrar clientes/leads por período. Tela Estoque, no popup
de match (leads interessados quando chega moto nova), mostra todos os leads do
modelo sem distinguir recência — lead de 5 anos atrás aparece junto com lead de
ontem, mas não tem mais interesse real na moto de hoje.

## Componente base: `DateRangeFilter`

Novo componente em `components/date-range-filter.tsx`.

- Dropdown com presets: `7 dias`, `30 dias`, `90 dias`, `6 meses`, `1 ano`, `Tudo`.
- Opção extra `Personalizado` no dropdown revela 2 inputs `type="date"` (de/até).
- Props: `value: { preset: string; from: Date | null; to: Date | null }`,
  `onChange: (value) => void`.
- Cálculo preset→data feito uma vez dentro do componente (ex: `30 dias` = hoje − 30d).
- Sem chamada a rede — componente é puramente controlado, parent decide o que
  fazer com o range (query server-side ou filtro client-side).

## Tela Leads (`app/leads/page.tsx`)

Dois `DateRangeFilter` adicionados na linha de filtros, ao lado de status e modelo:

1. **"Entrou em"** — filtra `leads.created_at`.
2. **"Último contato"** — filtra `leads.last_contacted_at`.

Aplicados na query Supabase existente (`buildLeadsQuery`) via `.gte()`/`.lte()`,
mesmo padrão dos filtros de status/modelo já existentes. Entram na dependência do
`useEffect` que recarrega dados: `[filterStatus, filterModel, filterCreatedRange, filterContactedRange]`.

Default de ambos: `Tudo` (sem filtro, comportamento atual preservado).

## Estoque — popup de match (`components/match-popup.tsx`)

`MatchedLead` (em `lib/supabase/types.ts`) ganha dois campos que já existem na
tabela `leads` mas não são selecionados hoje: `last_contacted_at: string | null`
e `created_at: string`.

Os dois pontos que buscam `matched leads` em `app/estoque/page.tsx`
(`handleSubmit` e o botão "N leads" na tabela/card) passam a selecionar essas
colunas também.

Dentro do `MatchPopup`, um `DateRangeFilter` filtra a lista **em memória**
(sem nova query — lista por modelo já é pequena). Regra de comparação por lead:

```
data_referencia = lead.last_contacted_at ?? lead.created_at
incluir lead se data_referencia >= range.from (quando range.from definido)
```

Default do dropdown dentro do popup: `Tudo` — preserva o comportamento atual até
o usuário decidir estreitar.

## Fora de escopo

- Filtro de período na listagem geral do Estoque (não pedido — pedido é
  especificamente sobre o popup de match).
- Persistência do filtro escolhido entre sessões (localStorage) — não mencionado,
  YAGNI por ora.

## Testes

- E2E existente de Leads: adicionar caso cobrindo os 2 filtros de período
  (ex: lead com `created_at` fora do preset "30 dias" não aparece).
- E2E existente de Estoque/match: adicionar caso cobrindo filtro dentro do popup
  (lead com `last_contacted_at` antigo escondido ao escolher preset curto; lead
  sem `last_contacted_at` mas `created_at` recente aparece — fallback).
