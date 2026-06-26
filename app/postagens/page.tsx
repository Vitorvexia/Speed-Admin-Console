'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase/client'
import type { Post, PostStatus } from '@/lib/supabase/types'

const STATUS_LABELS: Record<PostStatus, string> = {
  ideia: 'Ideia',
  planejado: 'Planejado',
  publicado: 'Publicado',
}

const STATUS_COLORS: Record<PostStatus, string> = {
  ideia: 'bg-gray-100 text-gray-500',
  planejado: 'bg-blue-100 text-blue-700',
  publicado: 'bg-green-100 text-green-700',
}

export default function PostagensPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [form, setForm] = useState({ title: '', content_idea: '', scheduled_date: '', status: 'planejado' as PostStatus })

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*')
      .in('status', ['planejado', 'publicado'])
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  function openNew() {
    setEditingPost(null)
    setForm({ title: '', content_idea: '', scheduled_date: '', status: 'planejado' })
    setShowForm(true)
  }

  function openEdit(post: Post) {
    setEditingPost(post)
    setForm({
      title: post.title,
      content_idea: post.content_idea ?? '',
      scheduled_date: post.scheduled_date ?? '',
      status: post.status,
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      title: form.title,
      content_idea: form.content_idea || null,
      scheduled_date: form.scheduled_date || null,
      status: form.status,
    }
    if (editingPost) {
      await supabase.from('posts').update(data).eq('id', editingPost.id)
    } else {
      await supabase.from('posts').insert(data)
    }
    setShowForm(false)
    loadPosts()
  }

  return (
    <div className="flex h-full min-h-screen">
      <Nav />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Postagens</h1>
          <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
            + Nova Postagem
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma postagem planejada.</p>
        ) : (
          <div className="space-y-2">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-lg border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[post.status]}`}>
                    {STATUS_LABELS[post.status]}
                  </span>
                  {post.scheduled_date && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(post.scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-900">{post.title}</span>
                  {post.content_idea && (
                    <span className="text-xs text-gray-400 truncate max-w-xs">{post.content_idea}</span>
                  )}
                </div>
                <button onClick={() => openEdit(post)} className="text-blue-600 hover:underline text-xs ml-4 shrink-0">
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="p-4 border-b">
                <h2 className="font-semibold">{editingPost ? 'Editar Postagem' : 'Nova Postagem'}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                  <input required value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Data planejada</label>
                    <input type="date" value={form.scheduled_date}
                      onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as PostStatus }))}
                      className="w-full border rounded px-3 py-1.5 text-sm"
                    >
                      <option value="planejado">Planejado</option>
                      <option value="publicado">Publicado</option>
                    </select>
                  </div>
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
      </main>
    </div>
  )
}
