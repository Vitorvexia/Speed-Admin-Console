'use client'
import type { MatchedLead } from '@/lib/supabase/types'

type Props = {
  leads: MatchedLead[]
  modelName: string
  onClose: () => void
}

export default function MatchPopup({ leads, modelName, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            Leads interessados — {modelName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} para contatar
          </p>
        </div>

        {leads.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhum lead com interesse neste modelo.
          </div>
        ) : (
          <ul className="divide-y max-h-80 overflow-y-auto">
            {leads.map((lead, i) => (
              <li key={i} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{lead.name}</div>
                    {lead.phone && (
                      <div className="text-sm text-gray-700 font-mono mt-0.5 select-all">{lead.phone}</div>
                    )}
                    {lead.email && (
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    )}
                    {lead.notes && (
                      <div className="text-xs text-gray-400 mt-1 italic">{lead.notes}</div>
                    )}
                  </div>
                  {lead.phone && (
                    <a
                      href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 bg-green-500 text-white text-xs px-3 py-1.5 rounded hover:bg-green-600 font-medium"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-700 text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
