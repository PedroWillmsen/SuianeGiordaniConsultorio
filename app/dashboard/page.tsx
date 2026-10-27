'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, PlusCircle, ListChecks, CalendarRange, Stethoscope, Settings, LogOut, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as D from '@/lib/dados'
import type { Atend, Config, Dentista, Usuario } from '@/lib/tipos'
import { Marca } from '@/components/Logo'
import { Painel } from '@/components/Painel'
import { Formulario } from '@/components/Formulario'
import { Historico } from '@/components/Historico'
import { Semanal } from '@/components/Semanal'
import { Dentistas } from '@/components/Dentistas'
import { Configuracoes } from '@/components/Configuracoes'
import { BackupLateral } from '@/components/Backup'

type Aba = 'dashboard' | 'novo' | 'historico' | 'semanal' | 'dentistas' | 'config'
const ABAS: { id: Aba; rotulo: string; dica: string; icone: LucideIcon; admin?: boolean }[] = [
  { id: 'dashboard', rotulo: 'Visão geral', dica: 'Resumo de hoje e do mês', icone: LayoutDashboard },
  { id: 'novo', rotulo: 'Novo atendimento', dica: 'Registrar um pagamento', icone: PlusCircle },
  { id: 'historico', rotulo: 'Histórico', dica: 'Buscar, editar e exportar', icone: ListChecks },
  { id: 'semanal', rotulo: 'Semanal', dica: 'Totais semana a semana', icone: CalendarRange },
  { id: 'dentistas', rotulo: 'Dentistas', dica: 'Equipe e comissões', icone: Stethoscope, admin: true },
  { id: 'config', rotulo: 'Configurações', dica: 'Procedimentos, formas e usuários', icone: Settings, admin: true },
]

export default function DashboardPage() {
  const [usuario] = useState<Usuario | null>(() => D.usuarioSalvo())
  const [aba, setAba] = useState<Aba>('dashboard')
  const [dados, setDados] = useState<Atend[]>([])
  const [dentistas, setDentistas] = useState<Dentista[]>([])
  const [config, setConfig] = useState<Config>({ procedimentos: [], formas_custom: [] })
  const [edit, setEdit] = useState<Atend | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [erroCarga, setErroCarga] = useState('')
  const cid = usuario?.consultorio_id || ''

  const loadDados = useCallback(async (c: string) => setDados(await D.listarAtendimentos(c)), [])
  const loadDentistas = useCallback(async (c: string) => setDentistas(await D.listarDentistas(c)), [])

  useEffect(() => {
    const u = usuario
    if (!u) { router.replace('/'); return }
    let ativo = true
    Promise.all([D.listarAtendimentos(u.consultorio_id), D.listarDentistas(u.consultorio_id), D.carregarConfig(u.consultorio_id)])
      .then(([a, d, c]) => { if (ativo) { setDados(a); setDentistas(d); setConfig(c) } })
      .catch(e => { if (ativo) setErroCarga((e as Error).message) })
      .finally(() => { if (ativo) setLoading(false) })
    return () => { ativo = false }
  }, [router, usuario])

  // Sugestões de procedimento: a lista cadastrada + os que já foram usados nos atendimentos
  const configForm = useMemo(() => {
    const vistos = new Map(config.procedimentos.map(p => [p.toLowerCase(), p]))
    for (const a of dados) { const p = (a.procedimento || '').trim(); if (p && !vistos.has(p.toLowerCase())) vistos.set(p.toLowerCase(), p) }
    return { ...config, procedimentos: [...vistos.values()].sort((x, y) => x.localeCompare(y, 'pt-BR')) }
  }, [config, dados])

  async function salvar(a: Partial<Atend>) {
    if (edit) {
      const novo = await D.atualizarAtendimento(edit.id, a)
      setDados(prev => prev.map(x => x.id === edit.id ? novo : x)); setEdit(null)
    } else {
      const novo = await D.criarAtendimento(cid, a)
      setDados(prev => [novo, ...prev].sort((x, y) => y.data.localeCompare(x.data)))
    }
    setAba('historico')
  }
  async function remover(a: Atend) {
    if (!confirm(`Remover o atendimento de ${a.paciente} (${a.data.split('-').reverse().join('/')})?

Essa ação não pode ser desfeita.`)) return
    try { await D.removerAtendimento(a.id); setDados(prev => prev.filter(x => x.id !== a.id)) } catch (e) { alert((e as Error).message) }
  }
  async function salvarConfig(c: Partial<Config>) {
    const novo = { ...config, ...c }
    await D.salvarConfig(cid, novo); setConfig(novo)
  }
  function sair() { D.sair(); router.push('/') }

  const cor = usuario?.consultorios?.cor_primaria || '#1e40af'
  const estilo = { ['--marca' as string]: cor }
  const isAdmin = usuario?.perfil === 'admin'
  const abas = ABAS.filter(t => !t.admin || isAdmin)
  const atual = edit ? 'novo' : aba
  function ir(id: Aba) { setAba(id); setEdit(null); window.scrollTo({ top: 0 }) }

  if (loading) return (
    <div style={estilo} className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Marca logo={usuario?.consultorios?.logo_url} tamanho="h-12 w-12" />
        <span className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Carregando...</span>
      </div>
    </div>
  )

  if (erroCarga) return (
    <div style={estilo} className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
        <p className="font-semibold text-slate-900">Não foi possível carregar os dados</p>
        <p className="mt-2 text-sm text-slate-500">{erroCarga}</p>
        <p className="mt-2 text-sm text-slate-500">Verifique a internet e tente de novo. Se continuar, avise o Pedro.</p>
        <button onClick={() => location.reload()} className="mt-4 h-10 rounded-lg bg-[var(--marca)] px-4 text-sm font-medium text-white">Tentar de novo</button>
      </div>
    </div>
  )

  return (
    <div style={estilo} className="min-h-screen lg:flex">
      {/* Menu lateral (computador) / barra superior (celular) */}
      <aside className="sticky top-0 z-20 border-b border-slate-200 bg-white lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-5 py-4 lg:py-6">
            <Marca logo={usuario?.consultorios?.logo_url} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{usuario?.consultorios?.nome || 'Consultório'}</p>
              <p className="truncate text-xs text-slate-500">Gestão de atendimentos</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {abas.map(t => {
              const ativo = atual === t.id
              return (
                <button key={t.id} onClick={() => ir(t.id)}
                  className={`group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-left transition lg:py-2.5 ${ativo ? 'bg-[var(--marca-fundo)] text-[var(--marca)]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                  {ativo && <motion.span layoutId="ativo" className="absolute inset-y-2 left-0 hidden w-1 rounded-full bg-[var(--marca)] lg:block" />}
                  <t.icone className="h-[18px] w-[18px] shrink-0" />
                  <span>
                    <span className="block whitespace-nowrap text-sm font-medium">{t.rotulo}</span>
                    <span className={`hidden text-xs lg:block ${ativo ? 'text-[var(--marca)]/70' : 'text-slate-400'}`}>{t.dica}</span>
                  </span>
                </button>
              )
            })}
          </nav>
          <div className="hidden lg:block"><BackupLateral usuario={usuario!} /></div>
          <div className="hidden border-t border-slate-100 p-4 lg:block">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{usuario?.nome?.charAt(0)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{usuario?.nome}</p>
                <p className="text-xs capitalize text-slate-400">{usuario?.perfil === 'secretaria' ? 'secretária' : usuario?.perfil}</p>
              </div>
              <button onClick={sair} title="Sair" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
          <button onClick={sair} className="absolute right-4 top-5 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 lg:hidden" title="Sair"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div key={atual + (edit?.id || '')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {atual === 'dashboard' && <Painel dados={dados} usuario={usuario!} onNovo={() => ir('novo')} />}
              {atual === 'novo' && <Formulario inicial={edit} dentistas={dentistas.filter(d => d.ativo || d.nome === edit?.dentista)} config={configForm} onSalvar={salvar} onCancelar={() => { setEdit(null); setAba('historico') }} />}
              {atual === 'historico' && <Historico dados={dados} onEditar={a => setEdit(a)} onRemover={remover} />}
              {atual === 'semanal' && <Semanal dados={dados} />}
              {atual === 'dentistas' && <Dentistas dentistas={dentistas} dados={dados} consultorioId={cid} onUpdate={async () => { await Promise.all([loadDentistas(cid), loadDados(cid)]) }} />}
              {atual === 'config' && <Configuracoes config={config} onSalvar={salvarConfig} usuario={usuario!} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
