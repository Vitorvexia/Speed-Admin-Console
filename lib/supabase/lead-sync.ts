import type { SupabaseClient } from '@supabase/supabase-js'

// Mantém leads.status coerente com a disponibilidade real dos modelos de interesse no estoque.
// a_negociar se QUALQUER modelo do lead tem estoque disponivel; pendente se NENHUM tem.
// Nunca mexe em leads 'fechado' — negócio já concluído não deve reabrir sozinho.
export async function syncLeadStatusForModel(supabase: SupabaseClient, modelId: string | null | undefined) {
  if (!modelId) return

  const { data: affected } = await supabase
    .from('lead_models')
    .select('lead_id, leads!inner(status)')
    .eq('model_id', modelId)
    .neq('leads.status', 'fechado')

  for (const row of affected ?? []) {
    const leadId = row.lead_id as string
    const currentStatus = (row.leads as unknown as { status: string }).status

    const { data: leadModels } = await supabase
      .from('lead_models')
      .select('model_id')
      .eq('lead_id', leadId)
    const modelIds = (leadModels ?? []).map(lm => lm.model_id)
    if (modelIds.length === 0) continue

    const { data: stock } = await supabase
      .from('inventory')
      .select('id')
      .in('model_id', modelIds)
      .eq('status', 'disponivel')
      .limit(1)
    const hasStock = (stock?.length ?? 0) > 0

    const nextStatus = hasStock ? 'a_negociar' : 'pendente'
    if (nextStatus !== currentStatus) {
      await supabase.from('leads').update({ status: nextStatus }).eq('id', leadId)
    }
  }
}
