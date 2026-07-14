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
