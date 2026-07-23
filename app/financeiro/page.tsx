import LayoutShell from '@/components/layout-shell'
import { FINANCEIRO_CHECKLIST } from '@/lib/financeiro-content'

export default function FinanceiroPage() {
  return (
    <LayoutShell title="Financeiro">
      <div className="space-y-3 max-w-3xl">
        {FINANCEIRO_CHECKLIST.map((parceiro) => (
          <details key={parceiro.slug} className="sp-card p-4 group">
            <summary className="cursor-pointer list-none flex items-center justify-between">
              <div>
                <h2 className="font-display text-[15px] font-bold text-sp-primary uppercase tracking-[0.08em]">
                  {parceiro.nome}
                </h2>
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
              {parceiro.campos.length > 0 && (
                <div>
                  <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-2">
                    Pedir do cliente
                  </label>
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
                  <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-2">
                    Tabela — motocicletas
                  </label>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] text-left">
                      <thead>
                        <tr className="text-sp-muted font-data text-[10px] uppercase tracking-[0.1em]">
                          <th className="pb-1.5 font-semibold">Idade</th>
                          <th className="pb-1.5 font-semibold">Prazo máx</th>
                          <th className="pb-1.5 font-semibold">Entrada mín</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parceiro.tabela.map((faixa) => (
                          <tr key={faixa.idade} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <td className="py-1.5 text-sp-primary">{faixa.idade}</td>
                            <td className="py-1.5 text-sp-primary">{faixa.prazo}</td>
                            <td className="py-1.5 text-sp-red font-semibold">{faixa.entrada}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {parceiro.formula && (
                <div>
                  <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-2">
                    Fórmula — entrada mínima (referência, cálculo continua manual)
                  </label>
                  <p className="text-[13px] text-sp-primary font-data">{parceiro.formula}</p>
                </div>
              )}

              {parceiro.exemplos && parceiro.exemplos.length > 0 && (
                <div>
                  <label className="block font-data text-[10px] font-semibold text-sp-muted uppercase tracking-[0.15em] mb-2">
                    Exemplos
                  </label>
                  <ul className="space-y-2">
                    {parceiro.exemplos.map((exemplo, i) => (
                      <li key={i} className="text-[13px] text-sp-muted">{exemplo}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parceiro.aviso && (
                <div
                  className="text-[12px] p-2.5 rounded-lg"
                  style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  ⚠️ {parceiro.aviso}
                </div>
              )}

              {parceiro.login && (
                <p className="text-[12px] text-sp-muted">Login: {parceiro.login}</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </LayoutShell>
  )
}
