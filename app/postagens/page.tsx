'use client'
import { useState, useEffect, useCallback } from 'react'
import LayoutShell from '@/components/layout-shell'
import { createClient } from '@/lib/supabase/client'
import type { Post, Model } from '@/lib/supabase/types'

// ─── Configurar número da loja ───────────────────────────────────────────────
const STORE_PHONE = '5511999999999'

// ─── Tipos rotativos do story interativo (Seg→Sáb) ───────────────────────────
const INTERATIVO_TYPES = [
  'Enquete',
  'Caixinha de perguntas',
  'Quiz',
  'Bastidor',
  'Dica rápida',
  'Livre',
] as const

const SLOTS = [
  {
    key:  'bom_dia',
    time: '8h30',
    label: 'Bom Dia',
    desc: 'Vídeo ou foto da equipe na loja',
    color: '#F59E0B',
  },
  {
    key:  'moto_dia',
    time: '11h',
    label: 'Stories de tarde',
    desc: 'Story em vídeo — moto ou novidade',
    color: '#38BDF8',
  },
  {
    key:  'interativo',
    time: '15h',
    label: 'Interativo',
    desc: 'Story de engajamento rotativo',
    color: '#A78BFA',
  },
  {
    key:  'cta',
    time: '18h',
    label: 'CTA',
    desc: 'Story de conversão com preço',
    color: '#FF1F2C',
  },
] as const

type SlotKey = typeof SLOTS[number]['key']

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type MotoSuggestion = { name: string; brand: string; year: number | null; price: number | null }

// ─── Helpers de data ─────────────────────────────────────────────────────────
function getMondayOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(d.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(d.getDate() + n); return r
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function display(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}
function getWeekIndex(d: Date): number {
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return Math.floor((d.getTime() - jan1.getTime()) / (7 * 86400000))
}

function generateCTA(moto: MotoSuggestion): string {
  const price = moto.price
    ? `R$ ${Number(moto.price).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
    : 'Consulte o preço'
  return `🏍️ ${moto.name}${moto.year ? ` ${moto.year}` : ''}\n${price}\n\nInteresse? Fale comigo no WhatsApp 👇\nwa.me/${STORE_PHONE}`
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function PostagensPage() {
  const supabase = createClient()
  const today = new Date()
  const [weekStart, setWeekStart]   = useState(() => getMondayOfWeek(today))
  const [posts, setPosts]           = useState<Post[]>([])
  const [motos, setMotos]           = useState<MotoSuggestion[]>([])
  const [toggling, setToggling]     = useState<string | null>(null)
  const [ctaModal, setCtaModal]     = useState<{ text: string; moto: string } | null>(null)
  const [copied, setCopied]         = useState(false)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const todayISO = toISO(new Date())
    const mon = getMondayOfWeek(new Date())
    const idx = Array.from({ length: 6 }, (_, i) => toISO(addDays(mon, i))).indexOf(todayISO)
    return idx >= 0 ? idx : 0
  })

  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
  const weekEnd = days[5]

  const load = useCallback(async () => {
    const [postsRes, inventoryRes] = await Promise.all([
      supabase
        .from('posts')
        .select('*')
        .gte('scheduled_date', toISO(weekStart))
        .lte('scheduled_date', toISO(weekEnd))
        .in('title', SLOTS.map(s => s.key)),
      supabase
        .from('inventory')
        .select('*, models(name)')
        .eq('status', 'disponivel')
        .order('created_at'),
    ])
    setPosts(postsRes.data ?? [])
    setMotos(
      (inventoryRes.data ?? []).map(item => ({
        name:  (item.models as Model | undefined)?.name ?? 'Moto',
        brand: item.brand,
        year:  item.year,
        price: item.price,
      }))
    )
  }, [weekStart])

  useEffect(() => { load() }, [load])

  function getPost(d: Date, key: string) {
    return posts.find(p => p.scheduled_date === toISO(d) && p.title === key)
  }

  function getMotoForDay(dayIndex: number): MotoSuggestion | null {
    if (!motos.length) return null
    const base = getWeekIndex(weekStart)
    return motos[(base + dayIndex) % motos.length]
  }

  function getInterativoForDay(dayIndex: number): string {
    return INTERATIVO_TYPES[dayIndex % INTERATIVO_TYPES.length]
  }

  async function toggle(d: Date, slotKey: SlotKey) {
    const k = `${toISO(d)}-${slotKey}`
    setToggling(k)
    const existing = getPost(d, slotKey)
    if (existing) {
      const next = existing.status === 'publicado' ? 'planejado' : 'publicado'
      await supabase.from('posts').update({ status: next }).eq('id', existing.id)
    } else {
      await supabase.from('posts').insert({
        title: slotKey,
        scheduled_date: toISO(d),
        status: 'planejado',
        content_idea: null,
      })
    }
    await load()
    setToggling(null)
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const isCurrentWeek = toISO(weekStart) === toISO(getMondayOfWeek(today))
  const doneSlots = posts.filter(p => p.status === 'publicado').length
  const totalSlots = 24

  return (
    <LayoutShell title="Postagens">
      {/* Nav de semana + progresso */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStart(d => addDays(d, -7))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sp-muted hover:text-sp-primary hover:bg-white/[0.05] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="font-display text-[14px] font-bold text-sp-primary uppercase tracking-[0.1em]">
              {display(weekStart)} — {display(weekEnd)}
            </span>
            {isCurrentWeek && (
              <span className="font-data text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ADE80' }}>
                esta semana
              </span>
            )}
          </div>
          <button
            onClick={() => setWeekStart(d => addDays(d, 7))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sp-muted hover:text-sp-primary hover:bg-white/[0.05] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-data text-[12px] text-sp-muted">
            <span className="text-sp-primary font-semibold">{doneSlots}</span>/{totalSlots} postados
          </span>
          <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(doneSlots / totalSlots * 100)}%`,
                background: doneSlots === totalSlots ? '#22C55E' : '#FF1F2C',
                boxShadow: `0 0 6px ${doneSlots === totalSlots ? 'rgba(34,197,94,0.5)' : 'rgba(255,31,44,0.4)'}`,
              }} />
          </div>
        </div>
      </div>

      {/* Mobile — seletor de dia + cards verticais */}
      <div className="block md:hidden">
        {/* Tabs de dias */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {days.map((d, i) => {
            const isToday = toISO(d) === toISO(today)
            const active = selectedDayIndex === i
            return (
              <button
                key={i}
                onClick={() => setSelectedDayIndex(i)}
                className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all"
                style={{
                  background: active ? 'rgba(255,31,44,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(255,31,44,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  minWidth: 52,
                }}
              >
                <span className="font-data text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: active ? '#FF1F2C' : isToday ? '#FF1F2C' : '#64748B' }}>
                  {DAY_NAMES[i]}
                </span>
                <span className="font-data text-[13px] font-bold mt-0.5"
                  style={{ color: active ? '#FF1F2C' : isToday ? '#FF6B6B' : '#94A3B8' }}>
                  {display(d)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Cards de slot para o dia selecionado */}
        <div className="space-y-3">
          {SLOTS.map((slot, si) => {
            const d = days[selectedDayIndex]
            const post = getPost(d, slot.key)
            const done = post?.status === 'publicado'
            const cellKey = `${toISO(d)}-${slot.key}`
            const loading = toggling === cellKey
            const moto = (slot.key === 'moto_dia' || slot.key === 'cta') ? getMotoForDay(selectedDayIndex) : null
            const itype = slot.key === 'interativo' ? getInterativoForDay(selectedDayIndex) : null
            const ctaText = (slot.key === 'cta' && moto) ? generateCTA(moto) : null

            return (
              <div key={slot.key} className="sp-card p-4"
                style={{ background: done ? 'rgba(34,197,94,0.04)' : undefined }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-data text-[13px] font-bold" style={{ color: slot.color }}>
                        {slot.time}
                      </span>
                      <span className="font-data text-[12px] font-semibold text-sp-primary">{slot.label}</span>
                    </div>
                    <span className="font-data text-[11px] text-sp-muted">{slot.desc}</span>

                    {/* Sugestão contextual */}
                    {moto && (
                      <div className="mt-2 font-data text-[12px]" style={{ color: done ? '#4ADE80' : slot.color }}>
                        {moto.name}
                        {moto.price && (
                          <span className="text-sp-muted ml-1 text-[11px]">
                            R$ {Number(moto.price).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    )}
                    {itype && (
                      <div className="mt-2">
                        <span className="font-data text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: done ? 'rgba(34,197,94,0.15)' : 'rgba(167,139,250,0.12)',
                            border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'rgba(167,139,250,0.25)'}`,
                            color: done ? '#4ADE80' : '#A78BFA',
                          }}>
                          {itype}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => !loading && toggle(d, slot.key as SlotKey)}
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
                    style={done ? {
                      background: 'rgba(34,197,94,0.18)',
                      border: '2px solid #22C55E',
                      boxShadow: '0 0 10px rgba(34,197,94,0.3)',
                    } : {
                      border: '2px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    {loading ? (
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#64748B" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                    ) : done ? (
                      <svg width="14" height="14" fill="none" stroke="#22C55E" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </button>
                </div>

                {/* Ações */}
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => {
                      window.location.href = 'instagram://camera'
                      setTimeout(() => { window.open('https://www.instagram.com/', '_blank') }, 1200)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-data text-[11px] font-semibold transition-all"
                    style={{
                      background: done ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      color: done ? '#4ADE80' : '#94A3B8',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                    Abrir Story
                  </button>
                  {ctaText && (
                    <button
                      onClick={() => setCtaModal({ text: ctaText, moto: moto?.name ?? '' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-data text-[11px] font-semibold transition-all"
                      style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#38BDF8' }}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copiar CTA
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop — grid */}
      <div className="hidden md:block">
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Header dos dias */}
        <div className="grid" style={{ gridTemplateColumns: '140px repeat(6, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}>
          <div className="px-4 py-3" />
          {days.map((d, i) => {
            const isToday = toISO(d) === toISO(today)
            return (
              <div key={i} className="px-2 py-3 text-center">
                <div className="font-data text-[10px] font-semibold uppercase tracking-wider" style={{ color: isToday ? '#FF1F2C' : '#64748B' }}>
                  {DAY_NAMES[i]}
                </div>
                <div className="font-data text-[13px] font-bold mt-0.5" style={{ color: isToday ? '#FF1F2C' : '#94A3B8' }}>
                  {display(d)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Linhas por slot */}
        {SLOTS.map((slot, si) => (
          <div key={slot.key} className="grid" style={{
            gridTemplateColumns: '140px repeat(6, 1fr)',
            borderBottom: si < SLOTS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
          }}>
            {/* Label */}
            <div className="flex flex-col justify-center px-4 py-4" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="font-data text-[13px] font-bold" style={{ color: slot.color, textShadow: `0 0 8px ${slot.color}66` }}>
                {slot.time}
              </span>
              <span className="font-data text-[11px] font-semibold text-sp-primary mt-0.5">{slot.label}</span>
              <span className="font-data text-[9px] text-sp-muted mt-0.5 leading-tight">{slot.desc}</span>
            </div>

            {/* Células */}
            {days.map((d, di) => {
              const post    = getPost(d, slot.key)
              const done    = post?.status === 'publicado'
              const cellKey = `${toISO(d)}-${slot.key}`
              const loading = toggling === cellKey
              const isToday = toISO(d) === toISO(today)
              const moto    = (slot.key === 'moto_dia' || slot.key === 'cta') ? getMotoForDay(di) : null
              const itype   = slot.key === 'interativo' ? getInterativoForDay(di) : null

              const ctaText = (slot.key === 'cta' && moto) ? generateCTA(moto) : null

              return (
                <div
                  key={di}
                  onClick={() => !loading && toggle(d, slot.key as SlotKey)}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 cursor-pointer transition-colors"
                  style={{
                    borderRight: di < 5 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                    background: done ? 'rgba(34,197,94,0.06)' : isToday ? `${slot.color}08` : undefined,
                    minHeight: 80,
                  }}
                  onMouseEnter={e => { if (!done) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = done ? 'rgba(34,197,94,0.06)' : isToday ? `${slot.color}08` : '' }}
                >
                  {/* Sugestão contextual */}
                  {(slot.key === 'moto_dia' || slot.key === 'cta') && (
                    moto ? (
                      <span className="font-data text-[10px] text-center leading-tight px-1" style={{ color: done ? '#4ADE80' : slot.color }}>
                        {moto.name}
                        {moto.price ? (
                          <span className="block text-sp-muted text-[9px]">
                            R$ {Number(moto.price).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="font-data text-[9px] text-center leading-tight px-1 text-sp-faint italic">
                        {slot.key === 'cta' ? 'Sem moto\nno estoque' : 'Adicione motos\ndisponíveis'}
                      </span>
                    )
                  )}
                  {itype && (
                    <span
                      className="font-data text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-center"
                      style={{
                        background: done ? 'rgba(34,197,94,0.15)' : 'rgba(167,139,250,0.12)',
                        border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'rgba(167,139,250,0.25)'}`,
                        color: done ? '#4ADE80' : '#A78BFA',
                      }}
                    >
                      {itype}
                    </span>
                  )}

                  {/* Abrir Instagram Stories */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      window.location.href = 'instagram://camera'
                      setTimeout(() => { window.open('https://www.instagram.com/', '_blank') }, 1200)
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full font-data text-[9px] font-semibold transition-all"
                    style={{
                      background: done ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      color: done ? '#4ADE80' : '#94A3B8',
                    }}
                    title="Abrir Instagram Stories"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                    Story
                  </button>

                  {/* Toggle + CTA copy */}
                  <div className="flex items-center gap-1.5">
                    {loading ? (
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#64748B" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                    ) : done ? (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(34,197,94,0.18)', border: '1.5px solid #22C55E', boxShadow: '0 0 6px rgba(34,197,94,0.3)' }}>
                        <svg width="10" height="10" fill="none" stroke="#22C55E" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full" style={{ border: '1.5px solid rgba(255,255,255,0.1)' }} />
                    )}

                    {ctaText && (
                      <button
                        onClick={e => { e.stopPropagation(); setCtaModal({ text: ctaText, moto: moto?.name ?? '' }) }}
                        className="w-5 h-5 flex items-center justify-center rounded text-sp-muted hover:text-sp-blue transition-colors"
                        title="Ver CTA"
                      >
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      </div>

      {/* Modal CTA */}
      {ctaModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setCtaModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: '#0D1118', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="font-display text-[13px] font-bold text-sp-primary uppercase tracking-[0.1em]">Texto CTA</h2>
                <p className="font-data text-[11px] text-sp-muted mt-0.5">{ctaModal.moto}</p>
              </div>
              <button onClick={() => setCtaModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-sp-muted hover:text-sp-primary hover:bg-white/[0.05] transition-colors">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-5">
              <pre
                className="font-data text-[13px] text-sp-primary whitespace-pre-wrap leading-relaxed rounded-lg px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {ctaModal.text}
              </pre>
              <button
                onClick={() => copyText(ctaModal.text)}
                className="sp-btn-primary w-full mt-4 py-2.5 text-white text-[12px] flex items-center justify-center gap-2"
              >
                {copied ? (
                  <><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg> Copiado!</>
                ) : (
                  <><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> Copiar texto</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutShell>
  )
}
