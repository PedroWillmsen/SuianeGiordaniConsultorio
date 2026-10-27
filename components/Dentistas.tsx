'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Percent, Power, Trash2, ShieldCheck, Loader2 } from 'lucide-react'
import type { Atend, Dentista } from '@/lib/tipos'
import { atualizarDentista, criarDentista, excluirDentista, recalcularComissoes } from '@/lib/dados'
import { brl, arred, dataBR } from '@/lib/regras'
import { Aviso, Botao, Cabecalho, Campo, Cartao, IN, Selo } from './ui'

type Modo = 'futuro' | 'tudo' | 'desde'

function EditarComissao({ d, dados, onFechar, onSalvo }: { d: Dentista; dados: Atend[]; onFechar: () => void; onSalvo: (msg: string) => void }) {
  const [pct, setPct] = useState(String(d.comissao_percentual))
  const [modo, setModo] = useState<Modo>('futuro')
  const [desde, setDesde] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [prog, setProg] = useState<{ feitos: number; total: number } | null>(null)

  const p = parseFloat(pct)
  const afetados = modo === 'futuro' ? [] : dados.filter(a => a.dentista === d.nome && (modo === 'tudo' || (desde && a.data >= desde)))
  const comAtual = afetados.reduce((s, a) => s + Number(a.comissao), 0)
  const comNova = afetados.reduce((s, a) => s + arred(Number(a.valor_liquido) * (isNaN(p) ? 0 : p) / 100), 0)

  async function salvar() {
    if (isNaN(p) || p < 0 || p > 100) { setErro('Percentual inválido (use de 0 a 100).'); return }
    if (modo === 'desde' && !desde) { setErro('Escolha a data a partir da qual recalcular.'); return }
    if (modo !== 'futuro' && !confirm(`Recalcular a comissão de ${afetados.length} atendimento(s) de ${d.nome} para ${p}%?\n\nComissão total passa de ${brl(comAtual)} para ${brl(comNova)}.\n\n(Dica: use “Baixar cópia de segurança” no menu antes, caso precise desfazer.)`)) return
    setSalvando(true)
    try {
      await atualizarDentista(d.id, { comissao_percentual: p })
      const n = modo === 'futuro' ? 0 : await recalcularComissoes(afetados, p, (feitos, total) => setProg({ feitos, total }))
      onSalvo(modo === 'futuro' ? `Comissão de ${d.nome} agora é ${p}% para os próximos atendimentos.` : `Comissão de ${d.nome} agora é ${p}%. ${n} atendimento(s) recalculado(s).`)
    } catch (e) { setErro((e as Error).message + ' — clique em Salvar de novo para terminar.'); setSalvando(false); setProg(null) }
  }

  const opcao = (m: Modo, titulo: string, texto: string) => (
    <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${modo === m ? 'border-[var(--marca)] bg-[var(--marca-fundo)]' : 'border-slate-200 hover:bg-slate-50'}`}>
      <input type="radio" checked={modo === m} onChange={() => setModo(m)} className="mt-0.5 accent-[var(--marca)]" />
      <span><span className="block text-sm font-medium text-slate-800">{titulo}</span><span className="block text-xs text-slate-500">{texto}</span></span>
    </label>
  )

  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <div className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <Campo rotulo="Novo percentual de comissão" className="max-w-[180px]">
          <div className="relative"><input type="number" min="0" max="100" step="0.1" value={pct} onChange={e => { setPct(e.target.value); setErro('') }} className={`${IN} pr-8 tabular-nums`} autoFocus /><Percent className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /></div>
        </Campo>
        <div>
          <span className="mb-2 block text-xs font-medium text-slate-600">Aplicar a quais atendimentos?</span>
          <div className="grid gap-2 md:grid-cols-3">
            {opcao('futuro', 'Só os próximos', 'Os atendimentos já registrados continuam como estão.')}
            {opcao('tudo', 'Também os anteriores', 'Recalcula todos os atendimentos já registrados deste dentista.')}
            {opcao('desde', 'A partir de uma data', 'Recalcula só os atendimentos a partir do dia escolhido.')}
          </div>
        </div>
        {modo === 'desde' && <Campo rotulo="A partir de" className="max-w-[200px]"><input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={IN} /></Campo>}
        {modo !== 'futuro' && (modo === 'tudo' || desde) && (
          <Aviso tom="atencao">
            <strong>{afetados.length}</strong> atendimento(s) {modo === 'desde' ? `desde ${dataBR(desde)} ` : ''}serão recalculados: comissão total de <strong>{brl(comAtual)}</strong> passa para <strong>{brl(comNova)}</strong>.
          </Aviso>
        )}
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <div className="flex gap-2">
          <Botao onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />}{prog && prog.total ? `Salvando ${prog.feitos} de ${prog.total}...` : 'Salvar'}</Botao>
          <Botao variante="secundario" onClick={onFechar} disabled={salvando}>Cancelar</Botao>
        </div>
      </div>
    </motion.div>
  )
}

export function Dentistas({ dentistas, dados, consultorioId, onUpdate }: { dentistas: Dentista[]; dados: Atend[]; consultorioId: string; onUpdate: () => Promise<void> }) {
  const [nome, setNome] = useState(''); const [comissao, setComissao] = useState('50'); const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [erro, setErro] = useState(''); const [sucesso, setSucesso] = useState('')
  const ativos = dentistas.filter(d => d.ativo), inativos = dentistas.filter(d => !d.ativo)
  const qtd = (n: string) => dados.filter(a => a.dentista === n).length

  function ok(msg: string) { setSucesso(msg); setErro(''); setTimeout(() => setSucesso(''), 6000) }
  async function exec(f: () => Promise<unknown>, msg?: string) {
    try { await f(); await onUpdate(); if (msg) ok(msg) } catch (e) { setErro((e as Error).message); setSucesso('') }
  }
  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    const n = nome.trim(), pct = parseFloat(comissao)
    if (!n) { setErro('Informe o nome.'); return }
    if (isNaN(pct) || pct < 0 || pct > 100) { setErro('Percentual inválido (use de 0 a 100).'); return }
    if (dentistas.some(d => d.nome.toLowerCase() === n.toLowerCase())) { setErro('Já existe um dentista com esse nome.'); return }
    setLoading(true)
    await exec(() => criarDentista(consultorioId, n, pct), `${n} adicionado(a).`)
    setNome(''); setComissao('50'); setLoading(false)
  }
  const toggle = (d: Dentista) => confirm(d.ativo ? `Desativar ${d.nome}?

Ele(a) deixa de aparecer no formulário, mas o histórico continua.` : `Reativar ${d.nome}?`) && exec(() => atualizarDentista(d.id, { ativo: !d.ativo }))
  const excluir = (d: Dentista) => confirm(`EXCLUIR permanentemente ${d.nome}?

Os atendimentos já registrados NÃO são apagados.`) && exec(() => excluirDentista(d.id))

  return (
    <div className="max-w-4xl">
      <Cabecalho titulo="Dentistas" ajuda="Cadastre a equipe e o percentual de comissão de cada um. A comissão é calculada sobre o valor líquido (depois da taxa da maquininha)." />

      <Cartao className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Adicionar dentista</h2>
        <form onSubmit={adicionar} className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Nome" className="min-w-[220px] flex-1"><input value={nome} onChange={e => { setNome(e.target.value); setErro('') }} placeholder="Nome do dentista" className={IN} /></Campo>
          <Campo rotulo="Comissão" className="w-28"><div className="relative"><input type="number" min="0" max="100" step="0.1" value={comissao} onChange={e => setComissao(e.target.value)} className={`${IN} pr-8`} /><Percent className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /></div></Campo>
          <Botao type="submit" icone={UserPlus} disabled={loading || !nome.trim()}>Adicionar</Botao>
        </form>
      </Cartao>

      <div className="my-5 space-y-3">
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        {sucesso && <Aviso tom="ok">{sucesso}</Aviso>}
        <Aviso tom="info"><span className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>Ao mudar a comissão, você escolhe se vale <strong>só para os próximos</strong> atendimentos ou se também <strong>recalcula os já registrados</strong>. Excluir um dentista nunca apaga o histórico.</span></span></Aviso>
      </div>

      <Cartao className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-800">Ativos <span className="font-normal text-slate-400">({ativos.length})</span></h2></div>
        <ul className="divide-y divide-slate-100">
          {!ativos.length && <li className="px-5 py-8 text-center text-sm text-slate-400">Nenhum dentista ativo.</li>}
          {ativos.map(d => (
            <li key={d.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--marca-fundo)] text-sm font-semibold text-[var(--marca)]">{d.nome.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{d.nome}</p>
                  <p className="text-xs text-slate-400">{qtd(d.nome)} atendimento(s) registrados</p>
                </div>
                <Selo tom={d.comissao_percentual === 0 ? 'neutro' : 'roxo'}>comissão {d.comissao_percentual}%</Selo>
                <div className="flex gap-1">
                  <Botao variante="secundario" className="h-8 px-3 text-xs" icone={Percent} onClick={() => setEditId(editId === d.id ? null : d.id)}>Alterar comissão</Botao>
                  <Botao variante="fantasma" className="h-8 px-2.5 text-xs" icone={Power} onClick={() => toggle(d)} title="Desativar">Desativar</Botao>
                  <Botao variante="fantasma" className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50" icone={Trash2} onClick={() => excluir(d)} title="Excluir" />
                </div>
              </div>
              <AnimatePresence>{editId === d.id && <EditarComissao d={d} dados={dados} onFechar={() => setEditId(null)} onSalvo={async m => { setEditId(null); await onUpdate(); ok(m) }} />}</AnimatePresence>
            </li>
          ))}
        </ul>
      </Cartao>

      {!!inativos.length && (
        <Cartao className="mt-5 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-500">Inativos <span className="font-normal">({inativos.length})</span></h2></div>
          <ul className="divide-y divide-slate-100">
            {inativos.map(d => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <p className="text-sm text-slate-400">{d.nome} · {d.comissao_percentual}%</p>
                <div className="flex gap-1">
                  <Botao variante="secundario" className="h-8 px-3 text-xs" icone={Power} onClick={() => toggle(d)}>Reativar</Botao>
                  <Botao variante="fantasma" className="h-8 px-2.5 text-xs text-red-600 hover:bg-red-50" icone={Trash2} onClick={() => excluir(d)} />
                </div>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  )
}
