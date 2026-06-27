'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Model } from '@/lib/supabase/types'

type Props = {
  value: string
  onChange: (id: string) => void
  required?: boolean
}

export default function ModelCombobox({ value, onChange, required }: Props) {
  const supabase = createClient()
  const [models, setModels] = useState<Model[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadModels = useCallback(async () => {
    const { data } = await supabase.from('models').select('*').order('name')
    setModels(data ?? [])
  }, [])

  useEffect(() => { loadModels() }, [loadModels])

  useEffect(() => {
    const selected = models.find(m => m.id === value)
    if (selected) setQuery(selected.name)
  }, [value, models])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? models.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    : models

  const exactMatch = models.some(m => m.name.toLowerCase() === query.toLowerCase().trim())
  const showCreate = query.trim().length > 0 && !exactMatch

  function handleSelect(m: Model) {
    onChange(m.id)
    setQuery(m.name)
    setOpen(false)
  }

  async function handleCreate() {
    const name = query.trim()
    if (!name) return
    setCreating(true)
    const { data } = await supabase.from('models').insert({ name }).select().single()
    if (data) {
      await loadModels()
      onChange(data.id)
      setQuery(data.name)
    }
    setCreating(false)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange('') }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar ou criar modelo..."
        className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary placeholder:text-sp-faint font-data"
      />
      <input type="hidden" value={value} required={required} />

      {open && (filtered.length > 0 || showCreate) && (
        <ul
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden max-h-52 overflow-y-auto"
          style={{
            background: '#131B26',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          }}
        >
          {filtered.map(m => (
            <li
              key={m.id}
              onMouseDown={() => handleSelect(m)}
              className="px-4 py-2.5 font-data text-[13px] cursor-pointer transition-colors"
              style={{
                color: value === m.id ? '#FF1F2C' : '#94A3B8',
                background: value === m.id ? 'rgba(255,31,44,0.08)' : undefined,
              }}
              onMouseEnter={e => { if (value !== m.id) (e.currentTarget as HTMLLIElement).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (value !== m.id) (e.currentTarget as HTMLLIElement).style.background = '' }}
            >
              {m.name}
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={handleCreate}
              className="px-4 py-2.5 font-data text-[13px] cursor-pointer transition-colors"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                color: '#38BDF8',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLLIElement).style.background = 'rgba(56,189,248,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLLIElement).style.background = '' }}
            >
              {creating ? 'Criando...' : <>+ Criar <strong>&quot;{query.trim()}&quot;</strong></>}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
