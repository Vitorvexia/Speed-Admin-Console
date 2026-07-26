# Instagram nos leads + fix logo do login

## 1. Fix logo quebrada no login (bug)

`proxy.ts` intercepta toda requisição (matcher `/((?!_next/static|_next/image|favicon.ico).*)`), incluindo arquivos estáticos do `public/` como `/logo-s.png`. Sem sessão ativa (tela de login), a checagem `!user && !isLoginPage` redireciona a requisição da imagem para `/login`, e o `<img>` recebe HTML em vez do PNG — ícone quebrado.

**Fix:** ajustar o matcher para também excluir extensões de arquivo estático (`png`, `jpg`, `jpeg`, `svg`, `webp`, `gif`, `ico`), além dos caminhos já excluídos.

## 2. Campo Instagram + filtro de tipo de contato nos leads

### Contexto
Leads hoje só têm `phone` (WhatsApp). Alguns contatos preferem Instagram. Objetivo: permitir cadastrar `@usuario` do Instagram como contato alternativo, e filtrar leads por tipo de contato disponível.

### Regras
- `phone` e `instagram` continuam campos de texto livre, ambos opcionais individualmente, mas **pelo menos um dos dois é obrigatório** (constraint de banco + validação no form).
- Instagram é salvo **sem o `@`** (só o username); a UI mostra `@usuario` e monta o link `https://instagram.com/{usuario}`.

### Schema
Nova migration `supabase/migrations/003_lead_instagram.sql`:
```sql
ALTER TABLE leads ADD COLUMN instagram text;
ALTER TABLE leads ADD CONSTRAINT leads_contact_required
  CHECK (phone IS NOT NULL OR instagram IS NOT NULL);
```
Migration manual via Supabase SQL Editor (projeto não tem CLI configurado) — confirmar aplicação real antes de testar end-to-end (ver [[feedback-migrations-manuais]]).

### Types
`lib/supabase/types.ts`: adicionar `instagram: string | null` ao tipo `Lead`.

### UI — `app/leads/page.tsx`
- **Form**: novo input "Instagram" ao lado do campo Telefone (placeholder `usuario`, sem `@`). Ao submeter, se `phone` e `instagram` vierem ambos vazios, bloquear com alert (mesmo padrão do bloqueio de "nenhum modelo selecionado" já existente).
- **Tabela desktop / cards mobile**: coluna/linha de contato mostra telefone (com badge WA já existente) e, se houver, `@usuario` com badge **IG** linkando para `instagram.com/{usuario}` (`target="_blank"`), estilo visual análogo ao badge WA (cor/formato próprios para diferenciar).
- **Filtro novo**: select "Tipo de contato" com opções Todos / Tem WhatsApp / Tem Instagram, ao lado dos filtros de status e modelo. Aplicado em `buildLeadsQuery` via `.not('phone', 'is', null)` ou `.not('instagram', 'is', null)`.

### Fora de escopo
- Não mexe em `lib/supabase/matched-leads.ts` / `MatchedLead` type (usado no popup de match do Estoque) — pode ser extensão futura, não pedida agora.
- Não normaliza/valida formato do username do Instagram além de remover `@` se o usuário digitar por engano.
