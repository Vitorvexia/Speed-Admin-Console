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
        className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input type="hidden" value={value} required={required} />

      {open && (filtered.length > 0 || showCreate) && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(m => (
            <li
              key={m.id}
              onMouseDown={() => handleSelect(m)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${value === m.id ? 'bg-blue-50 font-medium' : ''}`}
            >
              {m.name}
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={handleCreate}
              className="px-3 py-2 text-sm cursor-pointer text-blue-600 hover:bg-blue-50 border-t flex items-center gap-2"
            >
              {creating ? 'Criando...' : <>+ Criar <strong>&quot;{query.trim()}&quot;</strong></>}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
