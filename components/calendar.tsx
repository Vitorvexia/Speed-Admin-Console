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

  // Build calendar grid
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
    <div className="bg-white rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-700 px-2 py-1 text-lg font-bold">‹</button>
        <span className="font-semibold text-gray-800">{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-700 px-2 py-1 text-lg font-bold">›</button>
      </div>

      <div className="grid grid-cols-7 border-b">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const ds = day ? dateStr(day) : null
          const dayEvents = day ? eventsForDay(day) : []
          const isToday = ds === todayStr
          return (
            <div
              key={i}
              onClick={() => day && openAdd(dateStr(day))}
              className={`min-h-[72px] border-b border-r p-1 ${day ? 'cursor-pointer hover:bg-blue-50' : 'bg-gray-50'} ${i % 7 === 6 ? 'border-r-0' : ''}`}
            >
              {day && (
                <>
                  <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium mb-1 ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.map(e => (
                      <div
                        key={e.id}
                        onClick={ev => { ev.stopPropagation(); openEdit(e) }}
                        className="text-xs bg-orange-100 text-orange-800 rounded px-1 truncate cursor-pointer hover:bg-orange-200"
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-sm">
                {editingEvent ? 'Editar evento' : 'Novo evento'} — {selected?.split('-').reverse().join('/')}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input
                  required autoFocus value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Dia das Mães, Aniversário da loja..."
                  className="w-full border rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={form.notes} rows={2}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
                  Salvar
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="border text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                {editingEvent && (
                  <button type="button" onClick={handleDelete} className="ml-auto text-red-500 hover:text-red-700 text-sm px-2">
                    Excluir
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
