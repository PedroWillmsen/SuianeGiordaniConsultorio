'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react'
import { entrar as fazerLogin, usuarioSalvo } from '@/lib/dados'
import { Dente } from '@/components/Logo'
import { Aviso } from '@/components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => { if (usuarioSalvo()) router.replace('/dashboard') }, [router])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')
    try {
      await fazerLogin(email, senha)
      router.push('/dashboard')
    } catch (err) {
      setErro((err as Error).message); setLoading(false)
    }
  }

  const campo = 'h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[var(--marca)] focus:outline-none focus:ring-4 focus:ring-[var(--marca-suave)]'

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Painel da marca */}
      <div className="relative hidden overflow-hidden bg-[var(--marca)] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_90%,rgba(255,255,255,0.12),transparent_40%)]" />
        <Dente className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] text-white/[0.07]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Dente className="h-5 w-5" /></div>
            <span className="font-medium">Consultório</span>
          </div>
          <div>
            <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">Atendimentos, pagamentos e comissões em um só lugar.</h2>
            <p className="mt-4 max-w-md text-white/70">Registre cada atendimento e o sistema calcula sozinho as taxas da maquininha, o valor líquido e a comissão de cada dentista.</p>
          </div>
          <p className="text-xs text-white/50">Acesse de onde estiver: na clínica, em casa ou pelo celular.</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-sm">
          <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--marca)] text-white lg:hidden"><Dente className="h-5 w-5" /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Boas-vindas</h1>
          <p className="mt-1 text-sm text-slate-500">Entre com seu email e senha para acessar o sistema.</p>

          <form onSubmit={entrar} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErro('') }} placeholder="seu@email.com" className={campo} required autoFocus />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Senha</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="password" value={senha} onChange={e => { setSenha(e.target.value); setErro('') }} placeholder="••••••••" className={campo} required />
              </div>
            </label>
            {erro && <Aviso tom="erro">{erro}</Aviso>}
            <button type="submit" disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--marca)] text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : <>Entrar <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
          <p className="mt-8 text-center text-xs text-slate-400">Acesso restrito — apenas usuários autorizados.<br />Esqueceu a senha? Uma administradora pode trocar em Configurações.</p>
        </motion.div>
      </div>
    </div>
  )
}
