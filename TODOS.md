# TODOS

## Configurar framework de teste (Vitest/Playwright)

**What:** Instalar e configurar infra de teste no projeto — hoje não existe nenhum
framework de teste (sem jest/vitest/playwright, sem script `test` no `package.json`,
sem pasta de testes).

**Why:** O primeiro design doc do projeto (2026-06-26) já previa "Tests: Vitest (unit) +
Playwright (E2E)" na arquitetura, mas isso nunca foi instalado. Toda feature nova (Leads,
Estoque, Postagens, e agora Financeiro) foi implementada sem cobertura automatizada.

**Pros:** Detecta regressão antes de chegar em produção; permite refatorar com confiança
conforme o app cresce; alinha com o que já foi planejado desde o início do projeto.

**Cons:** Setup inicial consome tempo que não vai direto pra feature nova; sem testes
existentes pra migrar, é começar do zero; para features simples (como Financeiro, que é
conteúdo estático sem lógica) o retorno imediato é baixo.

**Context:** Descoberto durante o eng review da feature Financeiro (2026-07-18) — a
feature em si não precisa de teste (zero lógica condicional, é página estática), mas o
projeto como um todo está crescendo (5 tabelas, várias features com lógica real como
match de leads por modelo, filtros, validação de contato) sem nenhuma rede de segurança.
Quem pegar isso: focar primeiro em Vitest pra lógica de negócio (ex: `lib/lead-dossier.ts`
se existir, cálculos, validações) antes de Playwright E2E — unit tests têm custo de setup
menor e cobrem o que mais importa (lógica que pode ter bug silencioso).

**Depends on / blocked by:** Nada — pode começar a qualquer momento, independente de
outras features.

**Status:** Proposto no eng review da feature Financeiro. Decisão do usuário: adicionar
aqui, não bloqueia a feature atual.
