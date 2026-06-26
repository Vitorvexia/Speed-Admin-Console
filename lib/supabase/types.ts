export type LeadStatus = 'novo' | 'em_contato' | 'convertido' | 'perdido'
export type InventoryStatus = 'disponivel' | 'reservado' | 'vendido'
export type PostStatus = 'ideia' | 'planejado' | 'publicado'

export type Model = {
  id: string
  name: string
}

export type Lead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  interested_model: string
  status: LeadStatus
  notes: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  models?: Model
}

export type InventoryItem = {
  id: string
  model_id: string
  brand: string
  year: number | null
  color: string | null
  mileage_km: number | null
  price: number | null
  status: InventoryStatus
  notes: string | null
  created_at: string
  models?: Model
}

export type Post = {
  id: string
  title: string
  content_idea: string | null
  scheduled_date: string | null
  status: PostStatus
  created_at: string
}

export type MatchedLead = {
  name: string
  phone: string | null
  email: string | null
  notes: string | null
}
