'use client'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

export const IN = 'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-xs transition focus:border-[var(--marca)] focus:outline-none focus:ring-4 focus:ring-[var(--marca-suave)] disabled:bg-slate-50 disabled:text-slate-500'

export function Cartao({ children, className = '', atraso = 0 }: { children: ReactNode; className?: string; atraso?: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: atraso }}
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </motion.section>
  )
}

// Cabeçalho de cada tela: título + uma frase explicando para que serve.
export function Cabecalho({ titulo, ajuda, acao }: { titulo: string; ajuda: string; acao?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{ajuda}</p>
      </div>
      {acao}
    </div>
  )
}

export function TituloSecao({ icone: Icone, titulo, dica, cor = 'text-slate-700' }: { icone?: LucideIcon; titulo: string; dica?: string; cor?: string }) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      {Icone && <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${cor}`} />}
      <div>
        <h2 className={`text-sm font-semibold ${cor}`}>{titulo}</h2>
        {dica && <p className="text-xs text-slate-500">{dica}</p>}
      </div>
    </div>
  )
}

export function Campo({ rotulo, dica, children, className = '' }: { rotulo: string; dica?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-slate-400">{dica}</span>}
    </label>
  )
}

type Variante = 'primario' | 'secundario' | 'perigo' | 'fantasma'
const VAR: Record<Variante, string> = {
  primario: 'bg-[var(--marca)] text-white hover:brightness-110 shadow-sm',
  secundario: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  perigo: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  fantasma: 'text-slate-600 hover:bg-slate-100',
}
export function Botao({ variante = 'primario', icone: Icone, children, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; icone?: LucideIcon }) {
  return (
    <button {...p} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VAR[variante]} ${className}`}>
      {Icone && <Icone className="h-4 w-4" />}{children}
    </button>
  )
}

export function BotaoIcone({ icone: Icone, titulo, perigo, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { icone: LucideIcon; titulo: string; perigo?: boolean }) {
  return (
    <button {...p} title={titulo} aria-label={titulo}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition ${perigo ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-700'}`}>
      <Icone className="h-4 w-4" />
    </button>
  )
}

// Grupo de botões de escolha (ex.: Simples / Dividido)
export function Alternador<T extends string>({ opcoes, valor, onChange }: { opcoes: { id: T; rotulo: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1">
      {opcoes.map(o => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${valor === o.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export function Selo({ children, tom = 'neutro' }: { children: ReactNode; tom?: 'neutro' | 'verde' | 'ambar' | 'roxo' | 'azul' }) {
  const t = { neutro: 'bg-slate-100 text-slate-600', verde: 'bg-emerald-50 text-emerald-700', ambar: 'bg-amber-50 text-amber-700', roxo: 'bg-violet-50 text-violet-700', azul: 'bg-sky-50 text-sky-700' }[tom]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>
}

export function Numero({ rotulo, valor, sub, icone: Icone, tom = 'text-slate-900' }: { rotulo: string; valor: string; sub?: string; icone?: LucideIcon; tom?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        {rotulo}{Icone && <Icone className="h-4 w-4 text-slate-300" />}
      </div>
      <div className={`mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl ${tom}`}>{valor}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

export function Aviso({ tom = 'info', children }: { tom?: 'info' | 'erro' | 'ok' | 'atencao'; children: ReactNode }) {
  const t = { info: 'border-sky-200 bg-sky-50 text-sky-800', erro: 'border-red-200 bg-red-50 text-red-700', ok: 'border-emerald-200 bg-emerald-50 text-emerald-800', atencao: 'border-amber-200 bg-amber-50 text-amber-800' }[tom]
  return <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border px-4 py-3 text-sm ${t}`}>{children}</motion.div>
}

export function Vazio({ icone: Icone, titulo, texto }: { icone: LucideIcon; titulo: string; texto?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100"><Icone className="h-5 w-5 text-slate-400" /></div>
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
      {texto && <p className="mt-1 text-xs text-slate-500">{texto}</p>}
    </div>
  )
}
