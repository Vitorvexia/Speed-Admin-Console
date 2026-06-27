'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Event = {
  id: string
  title: string
  event_date: string
  notes: string | null
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export default function Calendar() {
  const supabase = createClient()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<Event[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', notes: '' })
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  const loadEvents = useCallback(async () => {
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const last = new Date(year, month + 1, 0).getDate()
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', from)
      .lte('event_date', to)
      .order('event_date')
    setEvents(data ?? [])
  }, [year, month])

  useEffect(() => { loadEvents() }, [loadEvents])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function openAdd(dateStr: string) {
    setSelected(dateStr)
    setEditingEvent(null)
    setForm({ title: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(e: Event) {
    setSelected(e.event_date)
    setEditingEvent(e)
    setForm({ title: e.title, notes: e.notes ?? '' })
    setShowModal(true)
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (editingEvent) {
      await supabase.from('events').update({ title: form.title, notes: form.notes || null }).eq('id', editingEvent.id)
    } else {
      await supabase.from('events').insert({ title: form.title, notes: form.notes || null, event_date: selected })
    }
    setShowModal(false)
    loadEvents()
  }

  async function handleDelete() {
    if (!editingEvent) return
    await supabase.from('events').delete().eq('id', editingEvent.id)
    setShowModal(false)
    loadEvents()
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  function dateStr(day: number) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  function eventsForDay(day: number) {
    return events.filter(e => e.event_date === dateStr(day))
  }

  return (
    <>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: '#0D1118',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Header de navegação */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sp-muted hover:text-sp-primary hover:bg-white/[0.05] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="font-display text-[13px] font-bold text-sp-primary uppercase tracking-[0.12em]">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-sp-muted hover:text-sp-primary hover:bg-white/[0.05] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {DAYS.map(d => (
            <div key={d} className="text-center font-data text-[10px] font-semibold text-sp-muted uppercase tracking-widest py-2.5">
              {d}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const ds = day ? dateStr(day) : null
            const dayEvents = day ? eventsForDay(day) : []
            const isToday = ds === todayStr
            const isWeekend = i % 7 === 0 || i % 7 === 6

            return (
              <div
                key={i}
                onClick={() => day && openAdd(dateStr(day))}
                className="min-h-[68px] p-1.5 transition-colors"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  borderRight: i % 7 !== 6 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                  background: !day ? 'rgba(0,0,0,0.2)' : isWeekend ? 'rgba(255,255,255,0.01)' : undefined,
                  cursor: day ? 'pointer' : 'default',
                }}
                onMouseEnter={e => { if (day) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (day) (e.currentTarget as HTMLDivElement).style.background = !day ? 'rgba(0,0,0,0.2)' : isWeekend ? 'rgba(255,255,255,0.01)' : '' }}
              >
                {day && (
                  <>
                    <span
                      className="inline-flex w-6 h-6 items-center justify-center rounded-full font-data text-[11px] font-medium mb-1"
                      style={isToday ? {
                        background: '#FF1F2C',
                        color: '#fff',
                        boxShadow: '0 0 8px rgba(255,31,44,0.5)',
                      } : {
                        color: isWeekend ? '#64748B' : '#94A3B8',
                      }}
                    >
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.map(e => (
                        <div
                          key={e.id}
                          onClick={ev => { ev.stopPropagation(); openEdit(e) }}
                          className="font-data text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors"
                          style={{
                            background: 'rgba(255,31,44,0.15)',
                            border: '1px solid rgba(255,31,44,0.25)',
                            color: '#FF8080',
                          }}
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: '#0D1118',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.8)',
            }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="font-display text-[13px] font-bold text-sp-primary uppercase tracking-[0.1em]">
                {editingEvent ? 'Editar evento' : 'Novo evento'}
              </h2>
              <p className="font-data text-[11px] text-sp-muted mt-0.5">
                {selected?.split('-').reverse().join('/')}
              </p>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-2">
                  Título *
                </label>
                <input
                  required autoFocus value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Dia das Mães, aniversário da loja..."
                  className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary placeholder:text-sp-faint font-data"
                />
              </div>
              <div>
                <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-2">
                  Notas
                </label>
                <textarea
                  value={form.notes} rows={2}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary placeholder:text-sp-faint font-data resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="sp-btn-primary px-5 py-2.5 text-white text-[12px]"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-lg font-data text-[12px] text-sp-muted hover:text-sp-primary transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancelar
                </button>
                {editingEvent && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="ml-auto font-data text-[12px] text-sp-muted hover:text-sp-red transition-colors px-2"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
