'use client'
import { useMemo } from 'react'
import { Inbox } from 'lucide-react'
import type { Atend } from '@/lib/tipos'
import { brl, semKey, semLbl } from '@/lib/regras'
import { Cabecalho, Cartao, Selo, Vazio } from './ui'

export function Semanal({ dados }: { dados: Atend[] }) {
  const semanas = useMemo(() => {
    const map = new Map<string, { label: string; cobrado: number; liquido: number; comissao: number; count: number; pf: number; pj: number }>()
    for (const a of dados) {
      const key = semKey(a.data)
      if (!map.has(key)) map.set(key, { label: semLbl(a.data), cobrado: 0, liquido: 0, comissao: 0, count: 0, pf: 0, pj: 0 })
      const s = map.get(key)!
      s.cobrado += Number(a.valor_cobrado); s.liquido += Number(a.valor_liquido); s.comissao += Number(a.comissao); s.count++
      if (a.tipo_doc === 'CNPJ') s.pj++; else s.pf++
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => ({ key: k, ...v }))
  }, [dados])
  const totC = semanas.reduce((s, w) => s + w.cobrado, 0), totL = semanas.reduce((s, w) => s + w.liquido, 0), totK = semanas.reduce((s, w) => s + w.comissao, 0)

  return (
    <div>
      <Cabecalho titulo="Resumo semanal" ajuda="Totais de cada semana (segunda a domingo), da mais recente para a mais antiga." />
      {!semanas.length ? <Cartao><Vazio icone={Inbox} titulo="Nenhum atendimento ainda" /></Cartao> : <>
        <Cartao className="mb-5 overflow-hidden">
          <div className="grid divide-y divide-white/15 bg-[var(--marca)] text-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[{ l: 'Total cobrado (geral)', v: totC }, { l: 'Total líquido (geral)', v: totL }, { l: 'Total de comissões (geral)', v: totK }].map(i => (
              <div key={i.l} className="px-6 py-5"><p className="text-xs text-white/70">{i.l}</p><p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{brl(i.v)}</p></div>
            ))}
          </div>
        </Cartao>
        <Cartao className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-medium text-slate-500">
                  <th className="px-5 py-3">Semana</th><th className="px-5 py-3">Atendimentos</th>
                  <th className="px-5 py-3 text-right">Cobrado</th><th className="px-5 py-3 text-right">Líquido</th><th className="px-5 py-3 text-right">Comissões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {semanas.map(s => (
                  <tr key={s.key} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium tabular-nums text-slate-800">{s.label}</td>
                    <td className="px-5 py-3.5"><div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 tabular-nums text-slate-700">{s.count}</span>{s.pf > 0 && <Selo tom="verde">{s.pf} PF</Selo>}{s.pj > 0 && <Selo tom="roxo">{s.pj} PJ</Selo>}</div></td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-700">{brl(s.cobrado)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium tabular-nums text-emerald-700">{brl(s.liquido)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium tabular-nums text-violet-700">{brl(s.comissao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      </>}
    </div>
  )
}
