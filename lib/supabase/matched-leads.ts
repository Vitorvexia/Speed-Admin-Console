import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchedLead } from '@/lib/supabase/types'

// Leads não-fechados interessados num modelo, via a tabela de juncao lead_models.
export async function fetchMatchedLeads(supabase: SupabaseClient, modelId: string): Promise<MatchedLead[]> {
  const { data } = await supabase
    .from('lead_models')
    .select('leads!inner(name, phone, email, notes, last_contacted_at, created_at, status)')
    .eq('model_id', modelId)
    .in('leads.status', ['pendente', 'a_negociar'])
    .order('last_contacted_at', { referencedTable: 'leads', ascending: true, nullsFirst: true })

  return (data ?? []).map(row => row.leads as unknown as MatchedLead)
}
