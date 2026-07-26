# Checklist de ordem de postagem — design

## Contexto

Fluxo de publicação de moto nova (foto → vídeo → redes → marketplace → whatsapp → consulta de leads) não tinha nenhum suporte na interface. Usuário já tinha pedido antes, nunca foi implementado.

## Passos do checklist

1. Tirou foto e fez vídeo speed ramp
2. Postar Instagram Stories e Feed
3. Postar perfil e página do Facebook
4. Postar Marketplace
5. Postar catálogo WhatsApp
6. Consultar clientes interessados

## Localização

Card fixo no topo da página `/postagens` (`app/postagens/page.tsx`), acima do bloco de navegação de semana + grid de slots existente. Não altera o grid de slots (`bom_dia`, `moto_dia`, `interativo`, `cta`) nem a tabela `posts`.

## Comportamento

- **Ordem livre**: qualquer passo pode ser marcado/desmarcado a qualquer momento, sem bloqueio sequencial. Mesmo padrão de toggle já usado nos cards de slot (círculo com check).
- **Estado local only**: `useState` no componente da página, sem tabela nova no Supabase, sem persistência entre sessões/dispositivos. Reseta ao recarregar a página.
- **Auto-reset**: ao marcar o passo 6 (último), aguarda ~1.5s e desmarca os 6 automaticamente, pronto pra próxima moto. Mesmo padrão de feedback temporizado já usado no "Copiado!" do modal de CTA (`setTimeout` + `setCopied`).
- **Progresso**: contador "X/6" visível no card, mesmo estilo do contador "doneSlots/totalSlots" que já existe no topo da página.

## Visual

Reaproveita padrão visual já existente:
- `sp-card` como container
- Fundo/borda verde (`rgba(34,197,94,...)`) quando passo marcado, igual aos slots
- Círculo de toggle com ícone de check (mesmo SVG dos slots)
- Fonte `font-data`, tamanhos e cores consistentes com o resto da página

## Fora de escopo

- Sem histórico por moto individual (não amarra ao item do estoque).
- Sem persistência no banco.
- Sem bloqueio de ordem entre os passos.
