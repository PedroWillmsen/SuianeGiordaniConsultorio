'use client'
import { useEffect, useState } from 'react'
import { ClipboardList, CreditCard, Users, DatabaseBackup, X, Plus, KeyRound, Trash2 } from 'lucide-react'
import type { Config, Usuario } from '@/lib/tipos'
import * as D from '@/lib/dados'
import type { UsuarioLinha } from '@/lib/dados'
import { BackupDetalhado } from './Backup'
import { Aviso, Botao, BotaoIcone, Cabecalho, Campo, Cartao, IN, Selo, TituloSecao } from './ui'

const PERFIS: Record<string, string> = { admin: 'Administrador(a)', secretaria: 'Secretária', dentista: 'Dentista' }

export function Configuracoes({ config, onSalvar, usuario }: { config: Config; onSalvar: (c: Partial<Config>) => Promise<void>; usuario: Usuario }) {
  const [novaProc, setNovaProc] = useState(''); const [erroP, setErroP] = useState('')
  const [novaForma, setNovaForma] = useState({ nome: '', taxa: '' }); const [erroF, setErroF] = useState('')
  const [usuarios, setUsuarios] = useState<UsuarioLinha[]>([])
  const [novoU, setNovoU] = useState({ nome: '', email: '', senha: '', perfil: 'secretaria' })
  const [msgU, setMsgU] = useState<{ tom: 'ok' | 'erro'; t: string } | null>(null)

  const cid = usuario.consultorio_id
  const carregarUsuarios = () => D.listarUsuarios(cid).then(setUsuarios).catch(() => {})
  useEffect(() => { carregarUsuarios() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Salva e mostra o erro (ex.: sem internet) no lugar certo
  const gravar = (c: Partial<Config>, setErr: (m: string) => void) => onSalvar(c).catch(e => setErr((e as Error).message))

  function addProc() {
    const p = novaProc.trim()
    if (!p) { setErroP('Digite o nome do procedimento.'); return }
    if (config.procedimentos.some(x => x.toLowerCase() === p.toLowerCase())) { setErroP('Esse procedimento já está na lista.'); return }
    gravar({ procedimentos: [...config.procedimentos, p].sort((a, b) => a.localeCompare(b, 'pt-BR')) }, setErroP); setNovaProc(''); setErroP('')
  }
  function addForma() {
    if (!novaForma.nome.trim()) { setErroF('Informe o nome.'); return }
    const taxa = parseFloat(novaForma.taxa); if (isNaN(taxa) || taxa < 0) { setErroF('Taxa inválida.'); return }
    gravar({ formas_custom: [...config.formas_custom, { id: 'c_' + Date.now(), nome: novaForma.nome.trim(), taxa }] }, setErroF); setNovaForma({ nome: '', taxa: '' }); setErroF('')
  }
  async function addUsuario(e: React.FormEvent) {
    e.preventDefault()
    try { await D.criarUsuario(cid, novoU); setMsgU({ tom: 'ok', t: `Acesso criado para ${novoU.nome}.` }); setNovoU({ nome: '', email: '', senha: '', perfil: 'secretaria' }); carregarUsuarios() }
    catch (err) { setMsgU({ tom: 'erro', t: (err as Error).message }) }
  }
  async function trocarSenha(u: UsuarioLinha) {
    const s = prompt(`Nova senha para ${u.nome} (mínimo 6 caracteres):`)
    if (s == null) return
    try { await D.trocarSenha(u.id, s); setMsgU({ tom: 'ok', t: `Senha de ${u.nome} alterada.` }) }
    catch (err) { setMsgU({ tom: 'erro', t: (err as Error).message }) }
  }
  async function removerUsuario(u: UsuarioLinha) {
    if (!confirm(`Remover o acesso de ${u.nome}?`)) return
    try { await D.removerUsuario(u.id); carregarUsuarios() } catch (err) { setMsgU({ tom: 'erro', t: (err as Error).message }) }
  }


  return (
    <div className="max-w-4xl space-y-5">
      <Cabecalho titulo="Configurações" ajuda="Listas usadas no formulário, quem pode acessar o sistema e cópias de segurança." />

      <Cartao className="p-5">
        <TituloSecao icone={ClipboardList} titulo="Procedimentos" dica="Aparecem como sugestão no campo “Procedimento” do formulário — evita erros de digitação." />
        <div className="mb-4 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
          {config.procedimentos.map(p => (
            <span key={p} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1.5 text-sm text-slate-700">
              {p}<button onClick={() => gravar({ procedimentos: config.procedimentos.filter(x => x !== p) }, setErroP)} title="Remover" className="rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
          {!config.procedimentos.length && <p className="text-sm text-slate-400">Nenhum procedimento cadastrado.</p>}
        </div>
        <div className="flex gap-2">
          <input value={novaProc} onChange={e => { setNovaProc(e.target.value); setErroP('') }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addProc() } }} placeholder="Ex: Clareamento, Restauração..." className={`${IN} max-w-sm`} />
          <Botao icone={Plus} onClick={addProc}>Adicionar</Botao>
        </div>
        {erroP && <p className="mt-2 text-sm text-red-600">{erroP}</p>}
      </Cartao>

      <Cartao className="p-5">
        <TituloSecao icone={CreditCard} titulo="Formas de pagamento personalizadas" dica="Além das formas padrão da maquininha (ex.: Boleto, Financiamento próprio)." />
        {config.formas_custom.length > 0 && (
          <ul className="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {config.formas_custom.map(f => (
              <li key={f.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-slate-700">{f.nome}</span>
                <span className="flex items-center gap-2"><Selo tom="azul">taxa {f.taxa}%</Selo><BotaoIcone icone={Trash2} titulo="Remover" perigo onClick={() => gravar({ formas_custom: config.formas_custom.filter(x => x.id !== f.id) }, setErroF)} /></span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Nome" className="min-w-[200px] flex-1"><input value={novaForma.nome} onChange={e => { setNovaForma(p => ({ ...p, nome: e.target.value })); setErroF('') }} placeholder="Ex: Boleto" className={IN} /></Campo>
          <Campo rotulo="Taxa (%)" className="w-28"><input type="number" step="0.01" min="0" value={novaForma.taxa} onChange={e => { setNovaForma(p => ({ ...p, taxa: e.target.value })); setErroF('') }} placeholder="0" className={IN} /></Campo>
          <Botao icone={Plus} onClick={addForma}>Adicionar</Botao>
        </div>
        {erroF && <p className="mt-2 text-sm text-red-600">{erroF}</p>}
      </Cartao>

      <Cartao className="p-5">
        <TituloSecao icone={Users} titulo="Quem pode acessar" dica="Secretárias e dentistas não veem as telas de Dentistas e Configurações." />
        <ul className="mb-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {usuarios.map(u => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{u.nome}{u.id === usuario.id && <span className="ml-1 text-xs font-normal text-slate-400">(você)</span>}</p><p className="text-xs text-slate-400">{u.email}</p></div>
              <Selo>{PERFIS[u.perfil] || u.perfil}</Selo>
              <Botao variante="secundario" className="h-8 px-3 text-xs" icone={KeyRound} onClick={() => trocarSenha(u)}>Trocar senha</Botao>
              {u.id !== usuario.id && <BotaoIcone icone={Trash2} titulo="Remover acesso" perigo onClick={() => removerUsuario(u)} />}
            </li>
          ))}
        </ul>
        <form onSubmit={addUsuario} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_140px_150px_auto] lg:items-end">
          <Campo rotulo="Nome"><input value={novoU.nome} onChange={e => setNovoU(p => ({ ...p, nome: e.target.value }))} className={IN} required /></Campo>
          <Campo rotulo="Email"><input type="email" value={novoU.email} onChange={e => setNovoU(p => ({ ...p, email: e.target.value }))} className={IN} required /></Campo>
          <Campo rotulo="Senha"><input type="password" minLength={6} value={novoU.senha} onChange={e => setNovoU(p => ({ ...p, senha: e.target.value }))} className={IN} required /></Campo>
          <Campo rotulo="Função"><select value={novoU.perfil} onChange={e => setNovoU(p => ({ ...p, perfil: e.target.value }))} className={IN}>{Object.entries(PERFIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
          <Botao type="submit" icone={Plus}>Criar acesso</Botao>
        </form>
        {msgU && <div className="mt-3"><Aviso tom={msgU.tom}>{msgU.t}</Aviso></div>}
      </Cartao>

      <Cartao className="p-5">
        <TituloSecao icone={DatabaseBackup} titulo="Cópia de segurança" />
        <BackupDetalhado usuario={usuario} />
      </Cartao>
    </div>
  )
}
