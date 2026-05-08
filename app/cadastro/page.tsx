'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Perfil = 'admin' | 'secretaria' | 'dentista'

export default function Cadastro() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()

  // Step 1 — Consultório
  const [nomeC,   setNomeC]   = useState('')
  const [corP,    setCorP]    = useState('#1e40af')
  const [corS,    setCorS]    = useState('#3b82f6')
  const [logoUrl, setLogoUrl] = useState('')

  // Step 2 — Usuário admin
  const [nomeU,  setNomeU]  = useState('')
  const [email,  setEmail]  = useState('')
  const [senha,  setSenha]  = useState('')
  const [perfil, setPerfil] = useState<Perfil>('admin')

  async function finalizar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    try {
      // 1. Criar consultório
      const { data: c, error: ec } = await supabase
        .from('consultorios')
        .insert({ nome: nomeC, cor_primaria: corP, cor_secundaria: corS, logo_url: logoUrl || null })
        .select().single()
      if (ec || !c) throw new Error('Erro ao criar consultório.')

      // 2. Verificar se email já existe
      const { data: existing } = await supabase
        .from('usuarios').select('id').eq('email', email).single()
      if (existing) throw new Error('Este email já está cadastrado.')

      // 3. Criar usuário
      const { error: eu } = await supabase
        .from('usuarios')
        .insert({ consultorio_id: c.id, nome: nomeU, email, senha, perfil })
      if (eu) throw new Error('Erro ao criar usuário.')

      router.push('/?cadastro=ok')
    } catch (err: any) {
      setErro(err.message || 'Erro inesperado.')
    }
    setLoading(false)
  }

  const IN = "w-full border border-white/20 bg-white/10 rounded-xl px-4 py-3 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-800 to-purple-700 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
            <span className="text-7xl">🦷</span>
          </motion.div>
          <h1 className="text-3xl font-black text-white mt-3">Criar Consultório</h1>
          <p className="text-blue-300 text-sm mt-1">Configure seu espaço personalizado</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6 px-2">
          {[1,2].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <motion.div
                animate={{ scale: step === n ? 1.15 : 1 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                  step > n ? 'bg-green-400 text-white' : step === n ? 'bg-white text-blue-700' : 'bg-white/20 text-white/50'
                }`}
              >
                {step > n ? '✓' : n}
              </motion.div>
              <span className={`text-xs font-semibold transition-all ${step === n ? 'text-white' : 'text-white/40'}`}>
                {n === 1 ? 'Consultório' : 'Usuário Admin'}
              </span>
              {n < 2 && <div className={`flex-1 h-0.5 rounded ${step > n ? 'bg-green-400' : 'bg-white/20'}`}/>}
            </div>
          ))}
        </div>

        <motion.div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-7 shadow-2xl">
          <AnimatePresence mode="wait">

            {/* STEP 1 */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h2 className="text-white font-black text-lg mb-5">🏥 Dados do Consultório</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1.5">Nome do Consultório</label>
                    <input value={nomeC} onChange={e => setNomeC(e.target.value)} placeholder="Ex: Clínica Sorriso" className={IN}/>
                  </div>
                  <div>
                    <label className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1.5">Logo (URL da imagem) — opcional</label>
                    <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://... (deixe em branco para usar 🦷)" className={IN}/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1.5">Cor Principal</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={corP} onChange={e => setCorP(e.target.value)} className="w-12 h-10 rounded-lg border-0 cursor-pointer bg-transparent"/>
                        <input value={corP} onChange={e => setCorP(e.target.value)} className={`${IN} flex-1`} placeholder="#1e40af"/>
                      </div>
                    </div>
                    <div>
                      <label className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1.5">Cor Secundária</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={corS} onChange={e => setCorS(e.target.value)} className="w-12 h-10 rounded-lg border-0 cursor-pointer bg-transparent"/>
                        <input value={corS} onChange={e => setCorS(e.target.value)} className={`${IN} flex-1`} placeholder="#3b82f6"/>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <motion.div
                    key={`${corP}-${corS}`}
                    initial={{ scale: 0.97, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-2xl p-4 text-white text-sm font-bold"
                    style={{ background: `linear-gradient(to right, ${corP}, ${corS})` }}
                  >
                    <div className="flex items-center gap-2">
                      {logoUrl
                        ? <img src={logoUrl} alt="logo" className="w-8 h-8 rounded-full object-cover bg-white/20"/>
                        : <span className="text-2xl">🦷</span>
                      }
                      <div>
                        <p className="font-black">{nomeC || 'Nome do Consultório'}</p>
                        <p className="text-white/60 text-xs">Preview do cabeçalho</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.button
                  onClick={() => { if (!nomeC.trim()) { setErro('Informe o nome do consultório.'); return } setErro(''); setStep(2) }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full bg-white text-blue-700 font-black py-3.5 rounded-xl mt-6 shadow-xl hover:bg-blue-50 transition-colors"
                >
                  Próximo →
                </motion.button>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <motion.form key="s2" onSubmit={finalizar} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h2 className="text-white font-black text-lg mb-5">👤 Usuário Administrador</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1.5">Nome Completo</label>
                    <input value={nomeU} onChange={e => setNomeU(e.target.value)} placeholder="Ex: Dra. Suiane" className={IN} required/>
                  </div>
                  <div>
                    <label className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1.5">Função / Cargo</label>
                    <select value={perfil} onChange={e => setPerfil(e.target.value as Perfil)} className={IN}>
                      <option value="admin">Administrador(a)</option>
                      <option value="dentista">Dentista</option>
                      <option value="secretaria">Secretária / Recepcionista</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className={IN} required/>
                  </div>
                  <div>
                    <label className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1.5">Senha</label>
                    <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} className={IN} required/>
                  </div>
                </div>

                {erro && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-4 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl px-4 py-3 text-sm">
                    ⚠️ {erro}
                  </motion.div>
                )}

                <div className="flex gap-3 mt-6">
                  <motion.button type="button" onClick={() => { setStep(1); setErro('') }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 border-2 border-white/20 text-white/80 font-bold py-3 rounded-xl hover:bg-white/10 transition-colors">
                    ← Voltar
                  </motion.button>
                  <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} whileTap={{ scale: 0.97 }}
                    className="flex-1 bg-white text-blue-700 font-black py-3 rounded-xl shadow-xl hover:bg-blue-50 transition-colors disabled:opacity-60">
                    {loading ? '⏳ Criando...' : '✅ Criar Consultório'}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {erro && step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl px-4 py-3 text-sm">
              ⚠️ {erro}
            </motion.div>
          )}
        </motion.div>

        <p className="text-center mt-6">
          <button onClick={() => router.push('/')} className="text-blue-300 hover:text-white text-sm transition-colors">
            ← Voltar para o login
          </button>
        </p>
      </motion.div>
    </div>
  )
}