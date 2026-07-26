export type TabelaFaixa = {
  idade: string
  prazo: string
  entrada: string
}

export type CampoPadrao = {
  label: string
  binario?: boolean
}

export type Categoria = 'Financiamento' | 'Parcelamento no cartão' | 'Canal informal'

export type ParceiroFinanceiro = {
  slug: string
  nome: string
  categoria: Categoria
  subtitulo: string
  fluxo?: string
  campos: string[]
  login?: string
  tabela?: TabelaFaixa[]
  formula?: string
  exemplos?: string[]
  aviso?: string
}

export const CHECKLIST_PADRAO: CampoPadrao[] = [
  { label: 'CPF' },
  { label: 'Data de nascimento' },
  { label: 'Valor de renda comprovada' },
  { label: 'Telefone' },
  { label: 'CNH', binario: true },
  { label: 'Valor de entrada', binario: true },
]

export const FINANCEIRO_CHECKLIST: ParceiroFinanceiro[] = [
  {
    slug: 'pan',
    nome: 'PAN',
    categoria: 'Financiamento',
    subtitulo: 'Financiamento moto/carro',
    campos: [
      'Moto ou carro',
      'Placa (consultar valor na tabela do parceiro — busca manual, fora do sistema)',
    ],
    login: 'Ver gestor de senhas da loja',
  },
  {
    slug: 'sicredi',
    nome: 'Sicredi',
    categoria: 'Financiamento',
    subtitulo: 'Financiamento — checklist padrão + placa do veículo',
    fluxo: 'Nova Simulação → Veículo → CPF → Dados cadastrais → Dados do veículo (placa)',
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
    categoria: 'Parcelamento no cartão',
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
    categoria: 'Canal informal',
    subtitulo: 'Canal de repasse — não é financiamento bancário formal. Contato direto (WhatsApp/telefone), sem portal próprio.',
    campos: [
      'Valor da moto',
      'Se já tentou no PAN',
      'Placa da moto',
    ],
  },
]
