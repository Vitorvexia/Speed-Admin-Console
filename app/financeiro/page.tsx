import LayoutShell from '@/components/layout-shell'
import { FINANCEIRO_CHECKLIST, CHECKLIST_PADRAO, type Categoria } from '@/lib/financeiro-content'

const CATEGORIA_STYLE: Record<Categoria, { bg: string; color: string; border: string }> = {
  'Financiamento':          { bg: 'rgba(56,189,248,0.1)',  color: '#38BDF8', border: 'rgba(56,189,248,0.25)' },
  'Parcelamento no cartão': { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  'Canal informal':         { bg: 'rgba(255,255,255,0.06)', color: '#94A3B8', border: 'rgba(255,255,255,0.12)' },
}

function CategoriaBadge({ categoria }: { categoria: Categoria }) {
  const style = CATEGORIA_STYLE[categoria]
  return (
    <span
      className="px-2 py-0.5 rounded-full font-data text-[10px] font-semibold whitespace-nowrap"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {categoria}
    </span>
  )
}

function Section({ label }: { label: string }) {
  return (
    <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-2">
      {label}
    </label>
  )
}

export default function FinanceiroPage() {
  return (
    <LayoutShell title="Financeiro">
    <div className="space-y-5 max-w-3xl">
      {/* Checklist padrão */}
      <div className="sp-card p-4 md:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,31,44,0.1)', border: '1px solid rgba(255,31,44,0.25)' }}
          >
            <svg width="15" height="15" fill="none" stroke="#FF6B6B" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-[15px] font-bold text-sp-primary uppercase tracking-[0.08em]">
              Checklist padrão
            </h2>
            <p className="text-[12px] text-sp-muted mt-0.5">
              Pedir do cliente em qualquer financiamento (PAN, Sicredi, Ricardo Bovalente)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CHECKLIST_PADRAO.map(campo => (
            <div
              key={campo.label}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sp-red flex-shrink-0" />
              <span className="text-[13px] text-sp-primary font-data leading-tight">{campo.label}</span>
              {campo.binario && (
                <span
                  className="ml-auto px-1.5 py-0.5 rounded font-data text-[9px] font-semibold flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  TEM/NÃO
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Parceiros */}
      <div>
        <Section label="Parceiros" />
        <div className="space-y-3">
          {FINANCEIRO_CHECKLIST.map((parceiro) => (
            <details key={parceiro.slug} className="sp-card p-4 group open:pb-5">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-[15px] font-bold text-sp-primary uppercase tracking-[0.08em]">
                      {parceiro.nome}
                    </h2>
                    <CategoriaBadge categoria={parceiro.categoria} />
                  </div>
                  <p className="text-[12px] text-sp-muted mt-0.5">{parceiro.subtitulo}</p>
                </div>
                <svg
                  width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  className="text-sp-faint flex-shrink-0 transition-transform duration-150 group-open:rotate-180"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>

              <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                {parceiro.fluxo && (
                  <div>
                    <Section label="Fluxo" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {parceiro.fluxo.split('→').map((passo, i, arr) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span
                            className="px-2.5 py-1 rounded-full font-data text-[11px] text-sp-primary"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            {passo.trim()}
                          </span>
                          {i < arr.length - 1 && <span className="text-sp-faint text-[11px]">→</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parceiro.campos.length > 0 && (
                  <div>
                    <Section label="Também pedir" />
                    <ul className="space-y-1.5">
                      {parceiro.campos.map((campo) => (
                        <li key={campo} className="text-[13px] text-sp-primary flex gap-2">
                          <span className="text-sp-red flex-shrink-0">·</span>
                          {campo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parceiro.tabela && (
                  <div>
                    <Section label="Tabela — motocicletas" />
                    <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                      <table className="w-full text-[13px] text-left">
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="text-sp-muted font-data text-[10px] uppercase tracking-[0.1em]">
                            <th className="px-3 py-2 font-semibold">Idade</th>
                            <th className="px-3 py-2 font-semibold">Prazo máx</th>
                            <th className="px-3 py-2 font-semibold">Entrada mín</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parceiro.tabela.map((faixa) => (
                            <tr key={faixa.idade} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <td className="px-3 py-2 text-sp-primary">{faixa.idade}</td>
                              <td className="px-3 py-2 text-sp-primary">{faixa.prazo}</td>
                              <td className="px-3 py-2 text-sp-red font-semibold">{faixa.entrada}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {parceiro.formula && (
                  <div>
                    <Section label="Fórmula — entrada mínima (referência, cálculo continua manual)" />
                    <p
                      className="text-[13px] text-sp-primary font-data leading-relaxed p-3 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      {parceiro.formula}
                    </p>
                  </div>
                )}

                {parceiro.exemplos && parceiro.exemplos.length > 0 && (
                  <div>
                    <Section label="Exemplos" />
                    <ul className="space-y-2">
                      {parceiro.exemplos.map((exemplo, i) => (
                        <li key={i} className="text-[13px] text-sp-muted leading-relaxed">{exemplo}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {parceiro.aviso && (
                  <div
                    className="text-[12px] p-2.5 rounded-lg flex items-start gap-2"
                    style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <span className="flex-shrink-0">⚠️</span>
                    {parceiro.aviso}
                  </div>
                )}

                {parceiro.login && (
                  <p className="text-[12px] text-sp-muted">Login: {parceiro.login}</p>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
    </LayoutShell>
  )
}
