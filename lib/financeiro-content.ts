export type TabelaFaixa = {
  idade: string
  prazo: string
  entrada: string
}

export type ParceiroFinanceiro = {
  slug: string
  nome: string
  subtitulo: string
  campos: string[]
  login?: string
  tabela?: TabelaFaixa[]
  formula?: string
  exemplos?: string[]
  aviso?: string
}

export const FINANCEIRO_CHECKLIST: ParceiroFinanceiro[] = [
  {
    slug: 'pan',
    nome: 'PAN',
    subtitulo: 'Financiamento moto/carro',
    campos: [
      'CPF',
      'Moto ou carro',
      'Data de nascimento',
      'Placa (consultar valor na tabela do parceiro — busca manual, fora do sistema)',
      'Valor de renda comprovada',
      'Telefone',
      'CNH (tem ou não)',
      'Valor de entrada (tem ou não)',
    ],
    login: 'Ver gestor de senhas da loja',
  },
  {
    slug: 'sicredi',
    nome: 'Sicredi',
    subtitulo: 'Financiamento — fluxo: Nova Simulação → veículo → CPF → dados cadastrais → dados do veículo (placa)',
    campos: [],
    login: 'Ver gestor de senhas da loja',
    tabela: [
      { idade: '0 KM',        prazo: 'Até 48 meses', entrada: '10%' },
      { idade: '1 a 5 anos',  prazo: 'Até 48 meses', entrada: '20%' },
      { idade: '6 a 15 anos', prazo: 'Até 24 meses', entrada: '30%' },
    ],
    formula:
      '(valor de venda − valor tabela Sicredi) + 475 (gravame) + IOF (variável) + ' +
      '[10% | 20% | 30% conforme idade] da tabela Sicredi = valor mínimo de entrada. ' +
      'Financia 80-90% do FIPE (tabela acima é só para motocicletas). Cálculo continua manual.',
    exemplos: [
      'Moto 1 a 5 anos (faixa 20%), venda 18.000, tabela Sicredi 16.280, cliente sem entrada: ' +
        '1.720 (diferença) + 475 (gravame) + IOF + 3.256 (20% de 16.280) = 5.451 + IOF = valor mínimo de entrada.',
      'Mesma moto, cliente já com 8.000 disponível: 8.000 cobre o mínimo do banco (5.451 + IOF) — ' +
        'o restante pode virar entrada extra pra loja ou reduzir o valor financiado, a critério da loja.',
    ],
    aviso:
      'Números vêm da fórmula documentada, não de simulação real no sistema Sicredi — ' +
      'confirmar com quem atende os clientes antes de tratar como definitivo.',
  },
  {
    slug: 'listofacil',
    nome: 'ListoFacil',
    subtitulo: 'Parcelamento no cartão',
    campos: [
      'Valor a simular',
      'Bandeira do cartão',
      'Custo cliente (cartão de crédito)',
    ],
    login: 'Ver gestor de senhas da loja',
  },
  {
    slug: 'ricardo-bovalente',
    nome: 'Ricardo Bovalente',
    subtitulo: 'Canal de repasse — não é financiamento bancário formal. Contato direto (WhatsApp/telefone), sem portal próprio.',
    campos: [
      'CPF',
      'Valor da moto',
      'Valor de entrada (se tiver)',
      'CNH (obrigatória)',
      'Se já tentou no PAN',
      'Placa da moto',
    ],
  },
]
