'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/lib/supabase/types'

export default function IdeiasPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [form, setForm] = useState({ title: '', content_idea: '' })
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [promotingDate, setPromotingDate] = useState('')

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'ideia')
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  function openNew() {
    setEditingPost(null)
    setForm({ title: '', content_idea: '' })
    setShowForm(true)
  }

  function openEdit(post: Post) {
    setEditingPost(post)
    setForm({ title: post.title, content_idea: post.content_idea ?? '' })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      title: form.title,
      content_idea: form.content_idea || null,
      status: 'ideia' as const,
    }
    if (editingPost) {
      await supabase.from('posts').update(data).eq('id', editingPost.id)
    } else {
      await supabase.from('posts').insert(data)
    }
    setShowForm(false)
    loadPosts()
  }

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault()
    if (!promotingId) return
    await supabase.from('posts').update({
      status: 'planejado',
      scheduled_date: promotingDate || null,
    }).eq('id', promotingId)
    setPromotingId(null)
    setPromotingDate('')
    loadPosts()
  }

  return (
    <div className="flex h-full min-h-screen">
      <Nav />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Ideias</h1>
          <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
            + Nova Ideia
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma ideia ainda.</p>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-lg border px-4 py-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{post.title}</p>
                  {post.content_idea && (
                    <p className="text-xs text-gray-400 mt-1">{post.content_idea}</p>
                  )}
                </div>
                <div className="flex gap-3 ml-4 shrink-0">
                  <button
                    onClick={() => { setPromotingId(post.id); setPromotingDate('') }}
                    className="text-green-600 hover:underline text-xs"
                  >
                    Planejar
                  </button>
                  <button onClick={() => openEdit(post)} className="text-blue-600 hover:underline text-xs">
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="p-4 border-b">
                <h2 className="font-semibold">{editingPost ? 'Editar Ideia' : 'Nova Ideia'}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                  <input required value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ideia / conteúdo</label>
                  <textarea value={form.content_idea} rows={3}
                    onChange={e => setForm(f => ({ ...f, content_idea: e.target.value }))}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
                    Salvar
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="text-gray-600 px-4 py-2 rounded text-sm border hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {promotingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Planejar postagem</h2>
              </div>
              <form onSubmit={handlePromote} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data planejada</label>
                  <input type="date" value={promotingDate}
                    onChange={e => setPromotingDate(e.target.value)}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700">
                    Mover para Postagens
                  </button>
                  <button type="button" onClick={() => setPromotingId(null)} className="text-gray-600 px-4 py-2 rounded text-sm border hover:bg-gray-50">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
