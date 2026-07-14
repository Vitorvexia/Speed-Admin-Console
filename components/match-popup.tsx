'use client'
import { useState } from 'react'
import type { MatchedLead } from '@/lib/supabase/types'
import DateRangeFilter from '@/components/date-range-filter'
import { DEFAULT_DATE_RANGE, isWithinDateRange, type DateRangeValue } from '@/lib/date-range'

type Props = {
  leads: MatchedLead[]
  modelName: string
  onClose: () => void
}

export default function MatchPopup({ leads, modelName, onClose }: Props) {
  const [range, setRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
  const filteredLeads = leads.filter(l => isWithinDateRange(l.last_contacted_at ?? l.created_at, range))
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: '#0D1118',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#FF1F2C', boxShadow: '0 0 6px rgba(255,31,44,0.8)' }}
              />
              <h2 className="font-display text-[13px] font-bold text-sp-primary uppercase tracking-[0.1em]">
                Match — {modelName}
              </h2>
            </div>
            <p className="font-data text-[11px] text-sp-muted">
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} para contatar
            </p>
            <div className="mt-2">
              <DateRangeFilter label="Último contato" value={range} onChange={setRange} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-sp-muted hover:text-sp-primary hover:bg-white/[0.05] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Lista */}
        {filteredLeads.length === 0 ? (
          <div className="py-10 text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <svg width="18" height="18" fill="none" stroke="#64748B" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
            <p className="font-data text-[12px] text-sp-muted">Nenhum lead com interesse neste modelo.</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {filteredLeads.map((lead, i) => (
              <li key={i} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-data text-[13px] font-semibold text-sp-primary truncate">{lead.name}</div>
                    {lead.phone && (
                      <div className="font-data text-[12px] text-sp-muted mt-0.5 select-all">{lead.phone}</div>
                    )}
                    {lead.email && (
                      <div className="font-data text-[11px] text-sp-muted truncate">{lead.email}</div>
                    )}
                    {lead.notes && (
                      <div className="font-data text-[11px] text-sp-muted mt-1 italic truncate">{lead.notes}</div>
                    )}
                  </div>
                  {lead.phone && (
                    <a
                      href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-data text-[11px] font-semibold text-white transition-all"
                      style={{
                        background: 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#4ADE80',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(34,197,94,0.25)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(34,197,94,0.15)'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.122 1.528 5.855L.057 23.882a.5.5 0 0 0 .611.61l6.084-1.595A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.013-1.378l-.36-.213-3.726.977.993-3.634-.234-.374A9.818 9.818 0 1 1 12 21.818z"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="px-5 py-4 flex justify-end" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="sp-btn-primary px-5 py-2 text-white text-[12px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
