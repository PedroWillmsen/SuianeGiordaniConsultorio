'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, User, Wallet, CreditCard, FileText, Plus, X, Calculator, ArrowLeft, Loader2 } from 'lucide-react'
import type { Atend, Config, Dentista, Doc, PagSalvo } from '@/lib/tipos'
import { GRUPOS_PADRAO, calcTaxa, isParc, parcOpts, brl, hj, arred } from '@/lib/regras'
import { Alternador, Aviso, Botao, Cabecalho, Campo, Cartao, IN, TituloSecao } from './ui'

interface PagItem { id: string; forma: string; valor: string; parc: string }
interface FS { data: string; paciente: string; dentista: string; valorCobrado: string; forma: string; parc: string; tipoDoc: Doc; doc: string; recibo: string; nf: string; nomePag: string; cpfPag: string; procedimento: string; misto: boolean; pagItems: PagItem[] }

export function Formulario({ inicial, dentistas, config, onSalvar, onCancelar }: { inicial: Atend | null; dentistas: Dentista[]; config: Config; onSalvar: (a: Partial<Atend>) => Promise<void>; onCancelar: () => void }) {
  const formasCustom = config.formas_custom
  const temMisto = !!(inicial?.pagamentos && inicial.pagamentos.length > 0)
  const itensIniciais: PagItem[] = temMisto
    ? inicial!.pagamentos!.map((p, i) => ({ id: String(i), forma: p.forma, valor: String(p.valor), parc: p.parcelas?.replace('x', '') || '2' }))
    : [{ id: '1', forma: inicial?.forma_pagamento || 'Dinheiro', valor: inicial ? String(inicial.valor_cobrado) : '', parc: inicial?.parcelas?.replace('x', '') || '2' }]
  const [f, setF] = useState<FS>({
    data: inicial?.data || hj(), paciente: inicial?.paciente || '', dentista: inicial?.dentista || (dentistas[0]?.nome || ''),
    valorCobrado: inicial && !temMisto ? String(inicial.valor_cobrado) : '', forma: inicial && !temMisto ? (inicial.forma_pagamento || 'Dinheiro') : 'Dinheiro',
    parc: inicial?.parcelas?.replace('x', '') || '2', tipoDoc: inicial?.tipo_doc || 'CPF', doc: inicial?.documento || '',
    recibo: (!inicial || inicial.recibo === 'N/A') ? 'Nao' : inicial.recibo, nf: inicial?.nf || 'Nao',
    nomePag: inicial?.nome_pagador || '', cpfPag: inicial?.cpf_pagador || '', procedimento: inicial?.procedimento || '',
    misto: temMisto, pagItems: itensIniciais,
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  function s<K extends keyof FS>(k: K, v: FS[K]) { setF(p => ({ ...p, [k]: v })); setErro('') }
  function ativaMisto(v: boolean) { setF(p => ({ ...p, misto: v, pagItems: v ? [{ id: '1', forma: p.forma, valor: p.valorCobrado, parc: p.parc }, { id: '2', forma: 'PIX', valor: '', parc: '2' }] : p.pagItems })) }
  function updItem(id: string, k: keyof PagItem, v: string) { setF(p => ({ ...p, pagItems: p.pagItems.map(x => x.id === id ? { ...x, [k]: v } : x) })) }
  function addItem() { setF(p => ({ ...p, pagItems: [...p.pagItems, { id: Date.now().toString(), forma: 'Dinheiro', valor: '', parc: '2' }] })) }
  function remItem(id: string) { setF(p => ({ ...p, pagItems: p.pagItems.filter(x => x.id !== id) })) }

  // Cálculo automático: taxa da forma de pagamento → valor líquido → comissão do dentista
  const showParc = isParc(f.forma)
  const t = calcTaxa(f.forma, formasCustom), val = parseFloat(f.valorCobrado) || 0, liq = val * (1 - t / 100)
  const calcPags = f.pagItems.map(p => { const v = parseFloat(p.valor) || 0; const tx = calcTaxa(p.forma, formasCustom); return { ...p, v, tx, liq: v * (1 - tx / 100), showP: isParc(p.forma) } })
  const totVal = calcPags.reduce((s, p) => s + p.v, 0), totLiq = calcPags.reduce((s, p) => s + p.liq, 0)
  const totalVal = f.misto ? totVal : val, totalLiq = f.misto ? totLiq : liq
  const dObj = dentistas.find(d => d.nome === f.dentista)
  const pct = dObj?.comissao_percentual ?? 0
  const com = dObj ? totalLiq * (pct / 100) : 0
  const rec = f.tipoDoc === 'CNPJ' ? 'N/A' : f.recibo, nfFinal = f.tipoDoc === 'CNPJ' ? 'Sim' : f.nf
  const grupos = [...GRUPOS_PADRAO, ...(formasCustom.length ? [{ label: 'Personalizadas', formas: formasCustom.map(c => c.nome) }] : [])]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.paciente.trim()) { setErro('Informe o nome do paciente.'); return }
    const base = { data: f.data, paciente: f.paciente.trim(), dentista: f.dentista, tipo_doc: f.tipoDoc, documento: f.doc, recibo: rec, nf: nfFinal, nome_pagador: f.nomePag.trim() || null, cpf_pagador: f.cpfPag.trim() || null, procedimento: f.procedimento.trim() || null }
    let dados: Partial<Atend>
    if (f.misto) {
      if (calcPags.some(p => !p.v)) { setErro('Informe o valor de cada forma de pagamento.'); return }
      const pags: PagSalvo[] = calcPags.map(p => ({ forma: p.forma, valor: p.v, liquido: arred(p.liq), parcelas: p.showP ? p.parc + 'x' : '' }))
      dados = { ...base, valor_cobrado: arred(totVal), valor_liquido: arred(totLiq), comissao: arred(com), forma_pagamento: pags.length === 1 ? pags[0].forma : 'Misto', parcelas: '', pagamentos: pags }
    } else {
      if (!val || val <= 0) { setErro('Informe um valor válido.'); return }
      dados = { ...base, valor_cobrado: val, valor_liquido: arred(liq), comissao: arred(com), forma_pagamento: f.forma, parcelas: showParc ? f.parc + 'x' : '', pagamentos: null }
    }
    setSalvando(true)
    try { await onSalvar(dados) } catch (err) { setErro((err as Error).message); setSalvando(false) }
  }

  const selectFormas = (valor: string, onChange: (v: string) => void) => (
    <select value={valor} onChange={e => onChange(e.target.value)} className={IN}>
      {grupos.map(g => <optgroup key={g.label} label={g.label}>{g.formas.map(ff => <option key={ff} value={ff}>{ff} {calcTaxa(ff, formasCustom) ? `(${calcTaxa(ff, formasCustom)}%)` : ''}</option>)}</optgroup>)}
    </select>
  )

  return (
    <form onSubmit={submit}>
      <Cabecalho titulo={inicial ? 'Editar atendimento' : 'Novo atendimento'}
        ajuda="Preencha os dados do atendimento. Taxa da maquininha, valor líquido e comissão são calculados automaticamente ao lado."
        acao={inicial ? <Botao type="button" variante="secundario" icone={ArrowLeft} onClick={onCancelar}>Voltar ao histórico</Botao> : undefined} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Cartao className="p-5">
            <TituloSecao icone={CalendarDays} titulo="Quando e o quê" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Data"><input type="date" value={f.data} onChange={e => s('data', e.target.value)} className={IN} required /></Campo>
              <Campo rotulo="Procedimento" dica={config.procedimentos.length ? 'Escolha da lista ou digite um novo.' : 'Cadastre a lista em Configurações.'}>
                <input list="proc-list" value={f.procedimento} onChange={e => s('procedimento', e.target.value)} placeholder="Ex: Profilaxia, Restauração..." className={IN} />
                <datalist id="proc-list">{config.procedimentos.map(p => <option key={p} value={p} />)}</datalist>
              </Campo>
            </div>
          </Cartao>

          <Cartao className="p-5">
            <TituloSecao icone={User} titulo="Beneficiário" dica="Quem recebe o tratamento" cor="text-sky-700" />
            <div className="grid gap-4 sm:grid-cols-[1fr_120px_1fr]">
              <Campo rotulo="Nome do paciente"><input value={f.paciente} onChange={e => s('paciente', e.target.value)} placeholder="Nome completo" className={IN} /></Campo>
              <Campo rotulo="Documento">
                <select value={f.tipoDoc} onChange={e => s('tipoDoc', e.target.value as Doc)} className={IN}><option value="CPF">CPF</option><option value="CNPJ">CNPJ</option></select>
              </Campo>
              <Campo rotulo={`Número do ${f.tipoDoc}`}><input value={f.doc} onChange={e => s('doc', e.target.value)} placeholder={f.tipoDoc === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'} className={IN} /></Campo>
            </div>
          </Cartao>

          <Cartao className="p-5">
            <TituloSecao icone={Wallet} titulo="Pagador" dica="Preencha só se quem paga for outra pessoa (ex.: mãe paga o tratamento do filho)" cor="text-amber-700" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome do pagador"><input value={f.nomePag} onChange={e => s('nomePag', e.target.value)} placeholder="Deixe vazio se for o mesmo" className={IN} /></Campo>
              <Campo rotulo="CPF do pagador"><input value={f.cpfPag} onChange={e => s('cpfPag', e.target.value)} placeholder="000.000.000-00" className={IN} /></Campo>
            </div>
          </Cartao>

          <Cartao className="p-5">
            <TituloSecao icone={CreditCard} titulo="Dentista e pagamento" dica="A taxa de cada forma aparece entre parênteses" cor="text-[var(--marca)]" />
            <div className="space-y-4">
              <Campo rotulo="Dentista">
                <select value={f.dentista} onChange={e => s('dentista', e.target.value)} className={IN}>
                  <option value="">Selecione...</option>
                  {dentistas.map(d => <option key={d.id} value={d.nome}>{d.nome} — comissão {d.comissao_percentual}%</option>)}
                </select>
              </Campo>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Como foi pago?</span>
                <Alternador valor={f.misto ? 'm' : 's'} onChange={v => ativaMisto(v === 'm')} opcoes={[{ id: 's', rotulo: 'Uma forma só' }, { id: 'm', rotulo: 'Dividido em 2 ou mais formas' }]} />
              </div>
              {!f.misto ? (
                <div className="grid gap-4 sm:grid-cols-[160px_1fr_110px]">
                  <Campo rotulo="Valor cobrado (R$)"><input type="number" min="0" step="0.01" value={f.valorCobrado} onChange={e => s('valorCobrado', e.target.value)} placeholder="0,00" className={`${IN} tabular-nums`} /></Campo>
                  <Campo rotulo="Forma de pagamento">{selectFormas(f.forma, v => { s('forma', v); if (!isParc(v)) s('parc', '2') })}</Campo>
                  {showParc && <Campo rotulo="Parcelas"><select value={f.parc} onChange={e => s('parc', e.target.value)} className={IN}>{parcOpts(f.forma).map(n => <option key={n} value={String(n)}>{n}x</option>)}</select></Campo>}
                </div>
              ) : (
                <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                  {calcPags.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="grid grid-cols-[20px_1fr_32px] items-center gap-2 sm:grid-cols-[20px_1fr_130px_84px_32px]">
                        <span className="text-xs font-medium text-slate-400">{i + 1}.</span>
                        {selectFormas(p.forma, v => updItem(p.id, 'forma', v))}
                        <input type="number" min="0" step="0.01" value={p.valor} onChange={e => updItem(p.id, 'valor', e.target.value)} placeholder="R$ valor" className={`${IN} col-start-2 tabular-nums sm:col-start-auto`} />
                        {p.showP ? <select value={p.parc} onChange={e => updItem(p.id, 'parc', e.target.value)} className={IN}>{parcOpts(p.forma).map(n => <option key={n} value={String(n)}>{n}x</option>)}</select> : <span className="hidden sm:block" />}
                        {f.pagItems.length > 1 ? <button type="button" onClick={() => remItem(p.id)} title="Remover esta forma" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button> : <span />}
                      </div>
                      {p.v > 0 && <p className="ml-7 mt-1.5 text-xs text-slate-500">Taxa {p.tx}% → líquido <span className="font-medium text-emerald-700">{brl(p.liq)}</span></p>}
                    </motion.div>
                  ))}
                  <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-1 py-1 text-sm font-medium text-[var(--marca)] hover:underline"><Plus className="h-4 w-4" />Adicionar outra forma</button>
                </div>
              )}
            </div>
          </Cartao>

          <Cartao className="p-5">
            <TituloSecao icone={FileText} titulo="Documentos" dica={f.tipoDoc === 'CNPJ' ? 'Para CNPJ a nota fiscal é sempre emitida.' : 'O paciente quer recibo ou nota fiscal?'} />
            <div className="grid gap-4 sm:grid-cols-2">
              {f.tipoDoc === 'CPF' && <Campo rotulo="Deseja recibo?"><select value={f.recibo} onChange={e => s('recibo', e.target.value)} className={IN}><option value="Nao">Não</option><option value="Sim">Sim</option></select></Campo>}
              <Campo rotulo="Nota fiscal (NF)?">
                {f.tipoDoc === 'CNPJ'
                  ? <div className={`${IN} flex items-center bg-emerald-50 text-emerald-700`}>Sim (automático para CNPJ)</div>
                  : <select value={f.nf} onChange={e => s('nf', e.target.value)} className={IN}><option value="Nao">Não</option><option value="Sim">Sim</option></select>}
              </Campo>
            </div>
          </Cartao>
        </div>

        {/* Resumo com o cálculo automático */}
        <div className="lg:sticky lg:top-10">
          <Cartao className="overflow-hidden">
            <div className="bg-[var(--marca)] px-5 py-4 text-white">
              <div className="flex items-center gap-2 text-xs font-medium text-white/80"><Calculator className="h-4 w-4" />Cálculo automático</div>
              <p className="mt-2 text-xs text-white/70">Total cobrado</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{brl(totalVal)}</p>
            </div>
            <dl className="divide-y divide-slate-100 text-sm">
              <div className="flex justify-between px-5 py-3"><dt className="text-slate-500">Taxa da maquininha</dt><dd className="tabular-nums text-red-600">− {brl(totalVal - totalLiq)}</dd></div>
              <div className="flex justify-between px-5 py-3"><dt className="text-slate-500">Valor líquido</dt><dd className="font-semibold tabular-nums text-emerald-700">{brl(totalLiq)}</dd></div>
              <div className="flex justify-between px-5 py-3"><dt className="text-slate-500">Comissão {dObj ? `(${pct}%)` : ''}</dt><dd className="font-semibold tabular-nums text-violet-700">{brl(com)}</dd></div>
            </dl>
            <p className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">Comissão = valor líquido × percentual do dentista.</p>
          </Cartao>
          <div className="mt-4 space-y-3">
            {erro && <Aviso tom="erro">{erro}</Aviso>}
            <Botao type="submit" disabled={salvando} className="h-11 w-full">{salvando ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : inicial ? 'Salvar alterações' : 'Registrar atendimento'}</Botao>
            {inicial && <Botao type="button" variante="secundario" onClick={onCancelar} className="w-full">Cancelar</Botao>}
          </div>
        </div>
      </div>
    </form>
  )
}
