'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Usuario } from '@/lib/tipos'
import { baixarCopia, ultimaCopia } from '@/lib/dados'
import { hj, iso } from '@/lib/regras'

export function quando(isoStr?: string | null) {
  if (!isoStr) return 'nunca'
  const d = new Date(isoStr)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
  if (iso(d) === hj()) return `hoje às ${hora}`
  if (iso(d) === iso(ontem)) return `ontem às ${hora}`
  return `${d.toLocaleDateString('pt-BR')} às ${hora}`
}

// Considera "em dia" se a última cópia baixada neste aparelho tem menos de 7 dias.
function emDia(isoStr: string | null) {
  return !!isoStr && Date.now() - new Date(isoStr).getTime() < 7 * 864e5
}

function useCopia(usuario: Usuario) {
  const [ultima, setUltima] = useState<string | null>(() => ultimaCopia(usuario.consultorio_id))
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)

  async function baixar() {
    setSalvando(true); setMsg(null)
    try {
      const r = await baixarCopia(usuario)
      setUltima(new Date().toISOString())
      setMsg({ ok: true, t: `Cópia baixada (${r.atendimentos} atendimentos). Guarde o arquivo no Google Drive ou num pendrive.` })
    } catch (e) { setMsg({ ok: false, t: (e as Error).message }) }
    setSalvando(false)
    setTimeout(() => setMsg(null), 10000)
  }
  return { ultima, salvando, msg, baixar }
}

// Versão compacta para o menu lateral
export function BackupLateral({ usuario }: { usuario: Usuario }) {
  const { ultima, salvando, msg, baixar } = useCopia(usuario)
  const ok = emDia(ultima)
  return (
    <div className="mx-3 mb-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-center gap-2 text-xs">
        {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
        <span className="text-slate-600">Última cópia: {quando(ultima)}</span>
      </div>
      <button onClick={baixar} disabled={salvando}
        className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-slate-700 shadow-xs ring-1 ring-slate-200 transition hover:bg-[var(--marca-fundo)] hover:text-[var(--marca)] hover:ring-[var(--marca)] disabled:opacity-60">
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {salvando ? 'Gerando...' : 'Baixar cópia de segurança'}
      </button>
      <AnimatePresence>
        {msg && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className={`mt-2 text-xs ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.t}</motion.p>}
      </AnimatePresence>
    </div>
  )
}

// Versão completa para Configurações
export function BackupDetalhado({ usuario }: { usuario: Usuario }) {
  const { ultima, salvando, msg, baixar } = useCopia(usuario)
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Os dados ficam guardados no servidor (Supabase). Este botão baixa um arquivo com <strong>todos</strong> os atendimentos,
        dentistas e configurações — uma cópia extra que fica com vocês. Recomendado: uma vez por semana, e guardar o arquivo no Google Drive.
      </p>
      <p className="text-xs text-slate-500">Última cópia baixada neste aparelho: <strong>{quando(ultima)}</strong></p>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={baixar} disabled={salvando}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--marca)] px-4 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Baixar cópia de segurança
        </button>
        {msg && <span className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.t}</span>}
      </div>
    </div>
  )
}
