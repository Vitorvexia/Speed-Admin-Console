# Múltiplos modelos de interesse por lead

## Contexto

Hoje `leads.interested_model` é uma FK única pra `models`. Cliente que se interessa por mais de uma moto exige criar leads duplicados ou perder informação. Objetivo: um lead pode ter N modelos de interesse.

Volume: ~200 leads/ano. Baixo — decisões de performance abaixo priorizam simplicidade sobre otimização prematura.

## Decisões

- **Sem prioridade/ordem entre modelos** — lista simples, interesse igual pra todos os modelos marcados num lead.
- **Status automático** (`pendente` ↔ `a_negociar`) passa a considerar **qualquer** modelo do lead: vira `a_negociar` se pelo menos um dos modelos de interesse tem moto disponível em estoque; volta a `pendente` só quando nenhum tem. `fechado` nunca é tocado (regra já existente, mantida).
- **Migração direta, sem coluna legada** — `interested_model` é dropada após migrar os dados pra tabela nova. App de uso único (uma loja), sem consumidores externos da coluna.

## Modelo de dados

Nova tabela de junção substitui a FK única:

```sql
CREATE TABLE lead_models (
  lead_id  uuid REFERENCES leads(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, model_id)
);
CREATE INDEX idx_lead_models_model ON lead_models(model_id);

ALTER TABLE lead_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_rw" ON lead_models
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

Migração (nova migration file, ex. `002_lead_models_junction.sql`):
1. Criar `lead_models` (SQL acima).
2. `INSERT INTO lead_models (lead_id, model_id) SELECT id, interested_model FROM leads WHERE interested_model IS NOT NULL;`
3. `DROP INDEX idx_leads_interested_model;`
4. `ALTER TABLE leads DROP COLUMN interested_model;`

Tipos (`lib/supabase/types.ts`):
- `Lead` perde `interested_model: string`, ganha `lead_models?: { models: Model }[]` (embed do Supabase) — ou um campo derivado `models: Model[]` montado no client após fetch, pra simplificar o uso nos componentes. Decisão de implementação: montar array `Model[]` já achatado no load, pra não espalhar `.map(lm => lm.models)` por toda a UI.

## Lógica de sync de estoque (`lib/supabase/lead-sync.ts`)

`syncLeadStatusForModel(supabase, modelId)` é chamada quando uma moto entra/sai do estoque (em `app/estoque/page.tsx`, nas ações de criar e excluir). Nova versão:

1. Busca leads não-fechados que têm `modelId` entre seus `lead_models` (join `lead_models.model_id = modelId`, `leads.status != 'fechado'`).
2. Para cada lead afetado, busca todos os `model_id`s desse lead (não só o `modelId` que mudou) e verifica se **algum** tem estoque `disponivel`.
3. Atualiza o status do lead (`a_negociar` se achou estoque em algum, `pendente` senão) só se o status atual for o oposto — mesma guarda de hoje, sem regredir `fechado`.

N+1 aceito — o subconjunto de leads afetados por uma mudança de estoque é só quem se interessa naquele modelo específico, não os 200 leads inteiros.

## Queries de leitura

**`app/leads/page.tsx`**
- Fetch: `supabase.from('leads').select('*, lead_models(models(id, name))')`.
- Filtro por modelo (`filterModel`, dropdown single-select): aplicado client-side sobre o resultado (`lead.models.some(m => m.id === filterModel)`) — volume baixo dispensa filtro server-side.
- Form: `interested_model: string` no state vira `model_ids: string[]`.
- `handleModelChange` (auto-status na criação/edição): roda sobre a lista inteira — `hasStock` = true se **qualquer** `model_id` selecionado tem estoque disponível.
- Submit (insert/update): grava lead normalmente, depois substitui as linhas de `lead_models` (delete + insert, ou upsert) pro `lead.id`.
- Tabela desktop e cards mobile: coluna/linha "Modelo" → "Modelos", renderiza como lista de chips (nome de cada modelo).

**`app/estoque/page.tsx`**
- `leadCounts` (contagem de leads interessados por modelo, usado no badge da tabela): query troca de `leads.select('interested_model')` pra `lead_models.select('model_id, leads!inner(status)').in('leads.status', ['pendente','a_negociar'])`, conta por `model_id`.
- Match popup (leads interessados nesse modelo, ao criar moto nova ou clicar no badge): mesma troca de query, inner join com `leads` filtrando status e projetando os campos de `MatchedLead`.
- Sem mudança visual no Estoque — segue mostrando contagem/lista por modelo único (o da moto em estoque).

## UI — novo componente `ModelMultiCombobox`

Baseado no `ModelCombobox` existente (`components/model-combobox.tsx`): mesma busca com filtro por texto e "+ Criar" pra modelo novo. Diferenças:
- `value: string[]`, `onChange: (ids: string[]) => void`.
- Modelos já selecionados aparecem como chips acima do input, cada um com botão de remover (×).
- Selecionar um item da lista adiciona à seleção (não substitui) e limpa a busca; item já selecionado não aparece mais na lista de opções.
- Mantém o mesmo estilo visual (cores, bordas, dropdown) do combobox single existente.

`ModelCombobox` original continua existindo sem mudança — ainda usado no form de Estoque (`model_id` da moto é sempre um só).

## Fora de escopo

- Prioridade/ordem entre modelos de interesse.
- Alterar o filtro de modelo da página Leads pra multi-select.
- Mudança visual na página Estoque.
