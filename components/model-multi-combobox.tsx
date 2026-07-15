'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Model } from '@/lib/supabase/types'

type Props = {
  value: string[]
  onChange: (ids: string[]) => void
  required?: boolean
}

export default function ModelMultiCombobox({ value, onChange, required }: Props) {
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
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedModels = value
    .map(id => models.find(m => m.id === id))
    .filter((m): m is Model => !!m)

  const filtered = (query.trim()
    ? models.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    : models
  ).filter(m => !value.includes(m.id))

  const exactMatch = models.some(m => m.name.toLowerCase() === query.toLowerCase().trim())
  const showCreate = query.trim().length > 0 && !exactMatch

  function handleSelect(m: Model) {
    onChange([...value, m.id])
    setQuery('')
    setOpen(false)
  }

  function handleRemove(id: string) {
    onChange(value.filter(v => v !== id))
  }

  async function handleCreate() {
    const name = query.trim()
    if (!name) return
    setCreating(true)
    const { data, error } = await supabase.from('models').insert({ name }).select().single()
    if (data) {
      await loadModels()
      onChange([...value, data.id])
      setQuery('')
    } else if (error) {
      alert(`Erro ao criar modelo: ${error.message}`)
    }
    setCreating(false)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      {selectedModels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedModels.map(m => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-data text-[11px] font-semibold"
              style={{ background: 'rgba(255,31,44,0.1)', border: '1px solid rgba(255,31,44,0.25)', color: '#FF8080' }}
            >
              {m.name}
              <button type="button" onClick={() => handleRemove(m.id)} className="hover:text-white transition-colors">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar ou criar modelo..."
        className="sp-input w-full px-4 py-2.5 text-[13px] text-sp-primary placeholder:text-sp-faint font-data"
      />
      <input type="hidden" value={value.length > 0 ? '1' : ''} required={required} />

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
              style={{ color: '#94A3B8' }}
              onMouseEnter={e => { (e.currentTarget as HTMLLIElement).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLLIElement).style.background = '' }}
            >
              {m.name}
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={handleCreate}
              className="px-4 py-2.5 font-data text-[13px] cursor-pointer transition-colors"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#38BDF8' }}
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
