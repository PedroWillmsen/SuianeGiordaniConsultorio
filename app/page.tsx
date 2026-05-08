'use client'
import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LoginForm() {
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [erro,    setErro]    = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    if (params.get('cadastro') === 'ok') setSucesso(true)
  }, [params])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')
    const { data, error } = await supabase
      .from('usuarios')
      .select('*, consultorios(*)')
      .eq('email', email).eq('senha', senha).single()
    if (error || !data) { setErro('Email ou senha incorretos.'); setLoading(false); return }
    sessionStorage.setItem('usuario', JSON.stringify(data))
    router.push('/dashboard')
  }

  const IN = "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-800 to-indigo-700 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">

        <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }} className="text-center mb-8">
          <div className="text-8xl mb-3 drop-shadow-lg">🦷</div>
          <h1 className="text-4xl font-black text-white tracking-tight">Consultório</h1>
          <p className="text-blue-300 mt-1 text-sm">Sistema de Gestão Odontológica</p>
        </motion.div>

        {sucesso && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/20 border border-green-400/30 text-green-200 rounded-2xl px-5 py-3 text-sm text-center mb-4 font-semibold">
            ✅ Consultório criado com sucesso! Faça seu login.
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-bold mb-6 text-center">Bem-vindo(a) de volta 👋</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-blue-200 text-xs font-semibold uppercase tracking-wider block mb-1.5">Email</label>
              <motion.input whileFocus={{ scale: 1.01 }} type="email" value={email}
                onChange={e => { setEmail(e.target.value); setErro('') }} placeholder="seu@email.com" className={IN} required/>
            </div>
            <div>
              <label className="text-blue-200 text-xs font-semibold uppercase tracking-wider block mb-1.5">Senha</label>
              <motion.input whileFocus={{ scale: 1.01 }} type="password" value={senha}
                onChange={e => { setSenha(e.target.value); setErro('') }} placeholder="••••••••" className={IN} required/>
            </div>
            {erro && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl px-4 py-3 text-sm">
                ⚠️ {erro}
              </motion.div>
            )}
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} whileTap={{ scale: 0.97 }}
              className="w-full bg-white text-blue-700 font-black py-3.5 rounded-xl mt-2 hover:bg-blue-50 transition-colors disabled:opacity-60 shadow-xl text-base">
              {loading ? '⏳ Entrando...' : 'Entrar →'}
            </motion.button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center mt-5 space-y-2">
          <p className="text-blue-400 text-xs">Acesso restrito — apenas usuários autorizados</p>
          <button onClick={() => router.push('/cadastro')}
            className="text-blue-300 hover:text-white text-sm font-semibold transition-colors underline underline-offset-2">
            + Criar novo consultório
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function Page() {
  return <Suspense><LoginForm /></Suspense>
}