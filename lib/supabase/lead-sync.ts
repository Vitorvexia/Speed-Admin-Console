import type { SupabaseClient } from '@supabase/supabase-js'

// Mantém leads.status coerente com a disponibilidade real do modelo no estoque.
// Nunca mexe em leads 'fechado' — negócio já concluído não deve reabrir sozinho.
export async function syncLeadStatusForModel(supabase: SupabaseClient, modelId: string | null | undefined) {
  if (!modelId) return

  const { data: stock } = await supabase
    .from('inventory')
    .select('id')
    .eq('model_id', modelId)
    .eq('status', 'disponivel')
    .limit(1)

  const hasStock = (stock?.length ?? 0) > 0

  if (hasStock) {
    await supabase.from('leads')
      .update({ status: 'a_negociar' })
      .eq('interested_model', modelId)
      .eq('status', 'pendente')
  } else {
    await supabase.from('leads')
      .update({ status: 'pendente' })
      .eq('interested_model', modelId)
      .eq('status', 'a_negociar')
  }
}
