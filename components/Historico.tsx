'use client'
import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Search, Download, Pencil, Trash2, Inbox, FilterX } from 'lucide-react'
import type { Atend } from '@/lib/tipos'
import { brl, hj, iso, dataBR } from '@/lib/regras'
import { Alternador, Botao, BotaoIcone, Cabecalho, Campo, Cartao, IN, Numero, Selo, Vazio } from './ui'

type PFPJ = 'todos' | 'pf' | 'pj'
const simNao = (v: string) => v === 'Nao' ? 'Não' : v

function periodo(p: string): [string, string] {
  const d = new Date()
  if (p === 'mes') return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), hj()]
  if (p === 'passado') return [iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), iso(new Date(d.getFullYear(), d.getMonth(), 0))]
  if (p === 'ano') return [`${d.getFullYear()}-01-01`, hj()]
  return ['', '']
}

export function Historico({ dados, onEditar, onRemover }: { dados: Atend[]; onEditar: (a: Atend) => void; onRemover: (a: Atend) => void }) {
  const [busca, setBusca] = useState(''); const [fDent, setFDent] = useState(''); const [fForma, setFForma] = useState('')
  const [dIni, setDIni] = useState(''); const [dFim, setDFim] = useState(''); const [pfpj, setPfpj] = useState<PFPJ>('todos'); const [fProc, setFProc] = useState('')
  const [limite, setLimite] = useState(100)

  const dentistas = useMemo(() => [...new Set(dados.map(a => a.dentista).filter(Boolean))].sort(), [dados])
  const formas = useMemo(() => [...new Set(dados.map(a => a.forma_pagamento).filter(Boolean))].sort(), [dados])
  const lista = useMemo(() => dados.filter(a => {
    if (busca && !a.paciente.toLowerCase().includes(busca.toLowerCase()) && !(a.nome_pagador || '').toLowerCase().includes(busca.toLowerCase())) return false
    if (fDent && a.dentista !== fDent) return false
    if (fForma && a.forma_pagamento !== fForma) return false
    if (dIni && a.data < dIni) return false
    if (dFim && a.data > dFim) return false
    if (pfpj === 'pf' && a.tipo_doc !== 'CPF') return false
    if (pfpj === 'pj' && a.tipo_doc !== 'CNPJ') return false
    if (fProc && !(a.procedimento || '').toLowerCase().includes(fProc.toLowerCase())) return false
    return true
  }), [dados, busca, fDent, fForma, dIni, dFim, pfpj, fProc])
  const tot = (k: 'valor_cobrado' | 'valor_liquido' | 'comissao') => lista.reduce((s, a) => s + Number(a[k]), 0)
  const temFiltro = busca || fDent || fForma || dIni || dFim || pfpj !== 'todos' || fProc
  function limpar() { setBusca(''); setFDent(''); setFForma(''); setDIni(''); setDFim(''); setPfpj('todos'); setFProc('') }

  function exportar() {
    if (!lista.length) return
    const rows: Record<string, unknown>[] = []
    lista.forEach(a => {
      const base = { 'Data': dataBR(a.data), 'Paciente': a.paciente, 'Tipo Doc': a.tipo_doc, 'Doc': a.documento || '-', 'Pagador': a.nome_pagador || '-', 'CPF Pag': a.cpf_pagador || '-', 'Procedimento': a.procedimento || '-', 'Dentista': a.dentista || '-' }
      if (a.pagamentos && a.pagamentos.length > 0) {
        a.pagamentos.forEach((p, i) => rows.push({ ...Object.fromEntries(Object.entries(base).map(([k, v]) => [k, i === 0 ? v : ''])), 'Forma': p.forma, 'Parcelas': p.parcelas || '-', 'Valor': p.valor, 'Liquido': p.liquido, 'Comissao': i === 0 ? a.comissao : '', 'Recibo': i === 0 ? simNao(a.recibo) : '', 'NF': i === 0 ? simNao(a.nf) : '' }))
      } else {
        rows.push({ ...base, 'Forma': a.forma_pagamento, 'Parcelas': a.parcelas || '-', 'Valor': a.valor_cobrado, 'Liquido': a.valor_liquido, 'Comissao': a.comissao, 'Recibo': simNao(a.recibo), 'NF': simNao(a.nf) })
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 18 }))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Atendimentos'); XLSX.writeFile(wb, `atendimentos_${hj()}.xlsx`)
  }

  return (
    <div>
      <Cabecalho titulo="Histórico" ajuda="Todos os atendimentos registrados. Use os filtros para encontrar algo; os totais e a exportação para Excel respeitam os filtros."
        acao={<Botao variante="secundario" icone={Download} onClick={exportar} disabled={!lista.length}>Exportar Excel</Botao>} />

      <Cartao className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Alternador valor={pfpj} onChange={setPfpj} opcoes={[{ id: 'todos', rotulo: 'Todos' }, { id: 'pf', rotulo: 'Pessoa física (CPF)' }, { id: 'pj', rotulo: 'Empresa (CNPJ)' }]} />
          <div className="flex flex-wrap gap-1.5">
            {[['mes', 'Este mês'], ['passado', 'Mês passado'], ['ano', 'Este ano']].map(([id, r]) => {
              const [i, f] = periodo(id); const ativo = dIni === i && dFim === f
              return <button key={id} onClick={() => { setDIni(i); setDFim(f) }} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${ativo ? 'border-[var(--marca)] bg-[var(--marca-fundo)] text-[var(--marca)]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{r}</button>
            })}
          </div>
          {temFiltro && <button onClick={limpar} className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"><FilterX className="h-3.5 w-3.5" />Limpar filtros</button>}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Campo rotulo="Paciente ou pagador" className="col-span-2 md:col-span-1">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome..." className={`${IN} pl-9`} /></div>
          </Campo>
          <Campo rotulo="Procedimento"><input value={fProc} onChange={e => setFProc(e.target.value)} placeholder="Qualquer" className={IN} /></Campo>
          <Campo rotulo="Dentista"><select value={fDent} onChange={e => setFDent(e.target.value)} className={IN}><option value="">Todos</option>{dentistas.map(d => <option key={d}>{d}</option>)}</select></Campo>
          <Campo rotulo="Forma de pagamento"><select value={fForma} onChange={e => setFForma(e.target.value)} className={IN}><option value="">Todas</option>{formas.map(f => <option key={f}>{f}</option>)}</select></Campo>
          <Campo rotulo="De"><input type="date" value={dIni} onChange={e => setDIni(e.target.value)} className={IN} /></Campo>
          <Campo rotulo="Até"><input type="date" value={dFim} onChange={e => setDFim(e.target.value)} className={IN} /></Campo>
        </div>
      </Cartao>

      <div className="my-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Numero rotulo="Registros" valor={String(lista.length)} sub={temFiltro ? `de ${dados.length} no total` : 'todos'} />
        <Numero rotulo="Total cobrado" valor={brl(tot('valor_cobrado'))} />
        <Numero rotulo="Total líquido" valor={brl(tot('valor_liquido'))} tom="text-emerald-700" />
        <Numero rotulo="Comissões" valor={brl(tot('comissao'))} tom="text-violet-700" />
      </div>

      <Cartao className="overflow-hidden">
        {!lista.length ? <Vazio icone={Inbox} titulo="Nenhum atendimento encontrado" texto={temFiltro ? 'Tente limpar os filtros.' : undefined} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-medium text-slate-500">
                  <th className="px-3 py-3 pl-5">Data</th>
                  <th className="px-3 py-3">Paciente</th>
                  <th className="px-3 py-3">Procedimento</th>
                  <th className="px-3 py-3">Dentista</th>
                  <th className="px-3 py-3">Pagamento</th>
                  <th className="px-3 py-3 text-right">Cobrado</th>
                  <th className="px-3 py-3 text-right">Líquido</th>
                  <th className="px-3 py-3 text-right">Comissão</th>
                  <th className="whitespace-nowrap px-3 py-3">Recibo / NF</th>
                  <th className="px-3 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.slice(0, limite).map(a => (
                  <tr key={a.id} className="group align-top transition-colors hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-3 py-3 pl-5 tabular-nums text-slate-500">{dataBR(a.data)}</td>
                    <td className="min-w-[190px] px-3 py-3">
                      <p className="font-medium text-slate-800">{a.paciente}</p>
                      <p className="whitespace-nowrap text-xs text-slate-400">{a.tipo_doc}{a.documento ? ` ${a.documento}` : ''}</p>
                      {a.nome_pagador && <p className="mt-0.5 text-xs text-amber-700">Pago por {a.nome_pagador}{a.cpf_pagador ? ` · ${a.cpf_pagador}` : ''}</p>}
                    </td>
                    <td className="min-w-[120px] px-3 py-3 text-slate-500">{a.procedimento || '—'}</td>
                    <td className="px-3 py-3 text-slate-600">{a.dentista || '—'}</td>
                    <td className="min-w-[150px] px-3 py-3 text-xs text-slate-500">
                      {a.pagamentos && a.pagamentos.length > 1
                        ? <div className="space-y-0.5"><Selo tom="azul">Dividido</Selo>{a.pagamentos.map((p, i) => <p key={i}><span className="tabular-nums text-slate-700">{brl(p.valor)}</span> {p.forma}{p.parcelas ? ` (${p.parcelas})` : ''}</p>)}</div>
                        : <span>{a.forma_pagamento}{a.parcelas ? ` · ${a.parcelas}` : ''}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{brl(Number(a.valor_cobrado))}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-emerald-700">{brl(Number(a.valor_liquido))}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-violet-700">{brl(Number(a.comissao))}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs">
                      <span className={a.recibo === 'Sim' ? 'font-medium text-emerald-700' : 'text-slate-400'}>{simNao(a.recibo)}</span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className={a.nf === 'Sim' ? 'font-medium text-emerald-700' : 'text-slate-400'}>{simNao(a.nf)}</span>
                    </td>
                    <td className="px-2 py-2"><div className="flex gap-0.5 opacity-60 transition group-hover:opacity-100"><BotaoIcone icone={Pencil} titulo="Editar" onClick={() => onEditar(a)} /><BotaoIcone icone={Trash2} titulo="Remover" perigo onClick={() => onRemover(a)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lista.length > limite && (
              <div className="border-t border-slate-100 p-4 text-center">
                <Botao variante="secundario" onClick={() => setLimite(l => l + 200)}>Mostrar mais ({lista.length - limite} restantes)</Botao>
              </div>
            )}
          </div>
        )}
      </Cartao>
    </div>
  )
}
