'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase/client'
import type { Model } from '@/lib/supabase/types'

export default function ModelosPage() {
  const supabase = createClient()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => { loadModels() }, [])

  async function loadModels() {
    setLoading(true)
    const { data } = await supabase.from('models').select('*').order('name')
    setModels(data ?? [])
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('models').insert({ name: newName.trim() })
    setNewName('')
    setSaving(false)
    loadModels()
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return
    await supabase.from('models').update({ name: editName.trim() }).eq('id', id)
    setEditingId(null)
    loadModels()
  }

  return (
    <div className="flex h-full min-h-screen">
      <Nav />
      <main className="flex-1 p-6 max-w-lg">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Modelos</h1>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ex: Honda Biz 125"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : (
          <div className="bg-white rounded-lg border divide-y">
            {models.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Nenhum modelo cadastrado.</p>
            ) : models.map(model => (
              <div key={model.id} className="flex items-center justify-between px-4 py-3">
                {editingId === model.id ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEdit(model.id)}
                      className="text-green-600 text-sm font-medium hover:underline"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 text-sm hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-900">{model.name}</span>
                    <button
                      onClick={() => { setEditingId(model.id); setEditName(model.name) }}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Editar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
