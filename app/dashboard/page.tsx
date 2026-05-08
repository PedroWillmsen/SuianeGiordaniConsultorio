'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

const TAXAS: Record<string, number> = {
  'Dinheiro': 0, 'PIX': 0,
  'Mastercard Debito': 1.99, 'Mastercard Credito a vista': 3.19, 'Mastercard Parcelado 2x-6x': 3.99, 'Mastercard Parcelado 7x-12x': 3.99, 'Mastercard Parcelado cliente': 3.19, 'Mastercard RePay': 3.19,
  'Visa Debito': 1.99, 'Visa Credito a vista': 3.19, 'Visa Parcelado 2x-6x': 3.99, 'Visa Parcelado 7x-12x': 3.99, 'Visa Parcelado cliente': 3.19, 'Visa RePay': 3.19,
  'Elo Debito': 1.99, 'Elo Credito a vista': 3.19, 'Elo Parcelado 2x-6x': 3.99, 'Elo Parcelado 7x-12x': 3.99, 'Elo Parcelado cliente': 3.19, 'Elo RePay': 3.19,
  'Banricompras Debito': 1.99, 'Banricompras Pre-datado': 2.59, 'Banricompras Credito 1 minuto': 1.99, 'Banricompras Parcelado 2x-6x': 2.99, 'Banricompras Parcelado 7x-12x': 2.99,
  'Mastercard Debito (Link)': 1.79, 'Mastercard Credito a vista (Link)': 3.09, 'Mastercard Parcelado 2x-6x (Link)': 3.59, 'Mastercard Parcelado 7x-12x (Link)': 3.59,
  'Visa Debito (Link)': 1.79, 'Visa Credito a vista (Link)': 3.09, 'Visa Parcelado 2x-6x (Link)': 3.59, 'Visa Parcelado 7x-12x (Link)': 3.59,
  'Elo Debito (Link)': 1.79, 'Elo Credito a vista (Link)': 3.09, 'Elo Parcelado 2x-6x (Link)': 3.59, 'Elo Parcelado 7x-12x (Link)': 3.59,
}

const GRUPOS_FORMAS = [
  { label: 'Outros',            formas: ['Dinheiro','PIX'] },
  { label: 'Mastercard',        formas: ['Mastercard Debito','Mastercard Credito a vista','Mastercard Parcelado 2x-6x','Mastercard Parcelado 7x-12x','Mastercard Parcelado cliente','Mastercard RePay'] },
  { label: 'Visa',              formas: ['Visa Debito','Visa Credito a vista','Visa Parcelado 2x-6x','Visa Parcelado 7x-12x','Visa Parcelado cliente','Visa RePay'] },
  { label: 'Elo',               formas: ['Elo Debito','Elo Credito a vista','Elo Parcelado 2x-6x','Elo Parcelado 7x-12x','Elo Parcelado cliente','Elo RePay'] },
  { label: 'Banricompras',      formas: ['Banricompras Debito','Banricompras Pre-datado','Banricompras Credito 1 minuto','Banricompras Parcelado 2x-6x','Banricompras Parcelado 7x-12x'] },
  { label: 'Mastercard (Link)', formas: ['Mastercard Debito (Link)','Mastercard Credito a vista (Link)','Mastercard Parcelado 2x-6x (Link)','Mastercard Parcelado 7x-12x (Link)'] },
  { label: 'Visa (Link)',       formas: ['Visa Debito (Link)','Visa Credito a vista (Link)','Visa Parcelado 2x-6x (Link)','Visa Parcelado 7x-12x (Link)'] },
  { label: 'Elo (Link)',        formas: ['Elo Debito (Link)','Elo Credito a vista (Link)','Elo Parcelado 2x-6x (Link)','Elo Parcelado 7x-12x (Link)'] },
]

function calcTaxa(f: string) { return TAXAS[f] ?? 0 }
function isParcelado(f: string) { return f.includes('2x-6x') || f.includes('7x-12x') }
function parcelasOpcoes(f: string): number[] {
  if (f.includes('2x-6x'))  return [2,3,4,5,6]
  if (f.includes('7x-12x')) return [7,8,9,10,11,12]
  return []
}

type Doc = 'CPF'|'CNPJ'
type Aba = 'dashboard'|'novo'|'historico'|'dentistas'
interface Dentista { id:string; consultorio_id:string; nome:string; comissao_percentual:number; ativo:boolean }
interface Consultorio { nome:string; cor_primaria:string; cor_secundaria:string; logo_url:string|null }
interface Atend { id:string; consultorio_id:string; data:string; paciente:string; dentista:string; valor_cobrado:number; forma_pagamento:string; parcelas:string; valor_liquido:number; comissao:number; tipo_doc:Doc; documento:string; recibo:string; nf:string }
interface Usuario { id:string; nome:string; email:string; perfil:string; consultorio_id:string; consultorios:Consultorio }

const IN = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-all"
const pv = { initial:{opacity:0,x:20}, animate:{opacity:1,x:0}, exit:{opacity:0,x:-20} }
function brl(v:number){return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function hj(){return new Date().toISOString().split('T')[0]}

function LogoConsultorio({c,size='md'}:{c:Consultorio;size?:'sm'|'md'|'lg'}) {
  const sizes={sm:'w-8 h-8 text-xl',md:'w-10 h-10 text-3xl',lg:'w-16 h-16 text-5xl'}
  if(c.logo_url) return <img src={c.logo_url} alt={c.nome} className={`${sizes[size]} rounded-full object-cover border-2 border-white/30 shadow-lg`} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
  return <span className={sizes[size]}>+</span>
}

export default function DashboardPage() {
  const [usuario,   setUsuario]   = useState<Usuario|null>(null)
  const [aba,       setAba]       = useState<Aba>('dashboard')
  const [dados,     setDados]     = useState<Atend[]>([])
  const [dentistas, setDentistas] = useState<Dentista[]>([])
  const [edit,      setEdit]      = useState<Atend|null>(null)
  const [loading,   setLoading]   = useState(true)
  const router = useRouter()

  useEffect(()=>{
    const u = sessionStorage.getItem('usuario')
    if(!u){router.push('/');return}
    const p = JSON.parse(u)
    setUsuario(p)
    if(p.consultorio_id){
      Promise.all([carregarDados(p.consultorio_id), carregarDentistas(p.consultorio_id)])
    } else {
      setLoading(false)
    }
  },[])

  async function carregarDados(cid:string){
    if(!cid){setLoading(false);return}
    setLoading(true)
    const{data}=await supabase.from('atendimentos').select('*').eq('consultorio_id',cid).order('data',{ascending:false})
    if(data) setDados(data)
    setLoading(false)
  }

  async function carregarDentistas(cid:string){
    if(!cid) return
    const{data}=await supabase.from('dentistas').select('*').eq('consultorio_id',cid).order('nome')
    if(data) setDentistas(data)
  }

  async function salvar(a:Partial<Atend>){
    if(!usuario) return
    if(edit){
      const{data}=await supabase.from('atendimentos').update(a).eq('id',edit.id).select().single()
      if(data) setDados(prev=>prev.map(x=>x.id===edit.id?data:x)); setEdit(null)
    } else {
      const{data}=await supabase.from('atendimentos').insert({...a,consultorio_id:usuario.consultorio_id}).select().single()
      if(data) setDados(prev=>[data,...prev])
    }
    setAba('historico')
  }

  async function remover(id:string){
    if(!confirm('Remover este atendimento?')) return
    await supabase.from('atendimentos').delete().eq('id',id)
    setDados(prev=>prev.filter(a=>a.id!==id))
  }

  function logout(){sessionStorage.removeItem('usuario');router.push('/')}

  const cor1=usuario?.consultorios?.cor_primaria||'#1e3a8a'
  const cor2=usuario?.consultorios?.cor_secundaria||'#3b82f6'

  if(loading&&!dados.length) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:`linear-gradient(135deg,${cor1},${cor2})`}}>
      <div className="text-center text-white">
        <motion.div animate={{scale:[1,1.15,1]}} transition={{repeat:Infinity,duration:1.2}} className="text-7xl mb-4">
          {usuario?.consultorios?.logo_url
            ?<img src={usuario.consultorios.logo_url} alt="" className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white/40"/>
            :<span>+</span>}
        </motion.div>
        <p className="font-bold text-white/80 text-sm">Carregando...</p>
      </div>
    </div>
  )

  const isAdmin=usuario?.perfil==='admin'
  const tabs=[
    {id:'dashboard'as Aba,lb:'Dashboard'},
    {id:'novo'     as Aba,lb:'+ Novo'},
    {id:'historico'as Aba,lb:'Historico'},
    ...(isAdmin?[{id:'dentistas'as Aba,lb:'Dentistas'}]:[]),
  ]

  return (
    <div className="min-h-screen bg-slate-100">
      <motion.header initial={{y:-60,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:0.4}}
        style={{background:`linear-gradient(to right,${cor1},${cor2})`}} className="shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-white font-black text-lg leading-tight">{usuario?.consultorios?.nome||'Consultorio'}</h1>
              <p className="text-white/60 text-xs">Ola, <span className="text-white font-bold">{usuario?.nome}</span>{usuario?.perfil&&<span className="ml-1 opacity-60"> - {usuario.perfil}</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1 bg-black/20 p-1 rounded-xl">
              {tabs.map(t=>(
                <motion.button key={t.id} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                  onClick={()=>{setAba(t.id);setEdit(null)}}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${aba===t.id&&!edit?'bg-white text-gray-700 shadow-lg':'text-white/80 hover:text-white hover:bg-white/10'}`}>
                  {t.lb}
                </motion.button>
              ))}
            </nav>
            <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={logout}
              className="ml-1 px-3 py-2 bg-black/20 hover:bg-red-500/40 text-white/80 hover:text-white rounded-xl text-sm transition-all">
              Sair
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {aba==='dashboard'&&!edit&&<motion.div key="db"{...pv}transition={{duration:0.25}}><DashView dados={dados} cor1={cor1} cor2={cor2}/></motion.div>}
          {(aba==='novo'||edit)     &&<motion.div key="fm"{...pv}transition={{duration:0.25}}><Formulario inicial={edit} dentistas={dentistas.filter(d=>d.ativo)} onSalvar={salvar} onCancelar={()=>{setEdit(null);setAba('historico')}} cor1={cor1} cor2={cor2}/></motion.div>}
          {aba==='historico'&&!edit &&<motion.div key="hi"{...pv}transition={{duration:0.25}}><Historico dados={dados} onEditar={a=>setEdit(a)} onRemover={remover} cor1={cor1} cor2={cor2}/></motion.div>}
          {aba==='dentistas'&&!edit &&<motion.div key="dt"{...pv}transition={{duration:0.25}}>
            <GestDentistas
              dentistas={dentistas}
              consultorioId={usuario?.consultorio_id||''}
              onUpdate={async()=>{ await carregarDentistas(usuario?.consultorio_id||'') }}
              cor1={cor1} cor2={cor2}
            />
          </motion.div>}
        </AnimatePresence>
      </main>
    </div>
  )
}

// DASHBOARD VIEW
function DashView({dados,cor1,cor2}:{dados:Atend[];cor1:string;cor2:string}) {
  const hj_s=hj(),mes_s=hj_s.slice(0,7)
  const hj_d=dados.filter(a=>a.data===hj_s)
  const mes_d=dados.filter(a=>a.data.startsWith(mes_s))
  const cards=[
    {label:'Atendimentos Hoje', val:String(hj_d.length),sub:'hoje',grad:'from-sky-400 to-blue-500'},
    {label:'Faturamento Hoje',  val:brl(hj_d.reduce((s,a)=>s+Number(a.valor_liquido),0)),sub:'valor liquido',grad:'from-emerald-400 to-green-600'},
    {label:'Atend. no Mes',     val:String(mes_d.length),sub:'este mes',grad:'from-violet-400 to-purple-600'},
    {label:'Faturamento Mes',   val:brl(mes_d.reduce((s,a)=>s+Number(a.valor_liquido),0)),sub:`comissoes: ${brl(mes_d.reduce((s,a)=>s+Number(a.comissao),0))}`,grad:'from-amber-400 to-orange-500'},
  ]
  const porDent=mes_d.reduce((acc,a)=>{
    if(!a.dentista) return acc
    if(!acc[a.dentista]) acc[a.dentista]={liq:0,com:0,n:0}
    acc[a.dentista].liq+=Number(a.valor_liquido); acc[a.dentista].com+=Number(a.comissao); acc[a.dentista].n++
    return acc
  },{} as Record<string,{liq:number;com:number;n:number}>)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c,i)=>(
          <motion.div key={c.label} initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
            whileHover={{y:-5,scale:1.03}} className={`bg-gradient-to-br ${c.grad} rounded-2xl p-5 text-white shadow-lg cursor-default`}>
            <div className="text-2xl font-black">{c.val}</div>
            <div className="text-xs font-semibold opacity-90 mt-1">{c.label}</div>
            <div className="text-xs opacity-60 mt-0.5">{c.sub}</div>
          </motion.div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.4}} className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-700 mb-4">Por Dentista (mes)</h3>
          {!Object.keys(porDent).length
            ?<p className="text-gray-400 text-sm py-4 text-center">Nenhum atendimento este mes</p>
            :Object.entries(porDent).sort((a,b)=>b[1].liq-a[1].liq).map(([nome,d])=>(
              <motion.div key={nome} whileHover={{x:4}} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl mb-2">
                <div><p className="font-semibold text-sm">{nome}</p><p className="text-xs text-gray-500">{d.n} atendimento{d.n!==1?'s':''}</p></div>
                <div className="text-right"><p className="text-sm font-black text-green-600">{brl(d.liq)}</p><p className="text-xs text-purple-500">comissao: {brl(d.com)}</p></div>
              </motion.div>
            ))
          }
        </motion.div>
        <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.5}} className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-700 mb-4">Ultimos Atendimentos</h3>
          {!dados.length?<p className="text-gray-400 text-sm py-4 text-center">Nenhum ainda</p>
            :dados.slice(0,6).map((a,i)=>(
              <motion.div key={a.id} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{delay:0.5+i*0.05}}
                className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
                <div><p className="text-sm font-semibold text-gray-800">{a.paciente}</p><p className="text-xs text-gray-400">{a.data} - {a.dentista||'-'} - {a.forma_pagamento}</p></div>
                <p className="text-sm font-black text-green-600 ml-3 shrink-0">{brl(Number(a.valor_liquido))}</p>
              </motion.div>
            ))
          }
        </motion.div>
      </div>
    </div>
  )
}

// FORMULARIO
interface FS{data:string;paciente:string;dentista:string;valorCobrado:string;forma:string;parc:string;tipoDoc:Doc;doc:string;recibo:string}
function Formulario({inicial,dentistas,onSalvar,onCancelar,cor1,cor2}:{inicial:Atend|null;dentistas:Dentista[];onSalvar:(a:any)=>void;onCancelar:()=>void;cor1:string;cor2:string}) {
  const [f,setF]=useState<FS>({
    data:inicial?.data||hj(), paciente:inicial?.paciente||'',
    dentista:inicial?.dentista||(dentistas[0]?.nome||''),
    valorCobrado:inicial?String(inicial.valor_cobrado):'',
    forma:inicial?.forma_pagamento||'Dinheiro',
    parc:inicial?.parcelas?.replace('x','')||'2',
    tipoDoc:inicial?.tipo_doc||'CPF',
    doc:inicial?.documento||'',
    recibo:(!inicial||inicial.recibo==='N/A')?'Nao':inicial.recibo,
  })
  const [erro,setErro]=useState('')
  const showParc=isParcelado(f.forma)
  const parcopts=parcelasOpcoes(f.forma)
  const t=calcTaxa(f.forma), val=parseFloat(f.valorCobrado)||0
  const liq=val*(1-t/100)
  const dObj=dentistas.find(d=>d.nome===f.dentista)
  const com=dObj?liq*(dObj.comissao_percentual/100):0
  const nf=f.tipoDoc==='CNPJ'?'Sim':'Nao'
  const rec=f.tipoDoc==='CNPJ'?'N/A':f.recibo
  const LB="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
  function s(k:keyof FS,v:string){setF(p=>({...p,[k]:v}));setErro('')}
  function submit(e:React.FormEvent){
    e.preventDefault()
    if(!f.paciente.trim()){setErro('Informe o nome do paciente.');return}
    if(!val||val<=0){setErro('Informe um valor valido.');return}
    onSalvar({data:f.data,paciente:f.paciente.trim(),dentista:f.dentista,valor_cobrado:val,
      forma_pagamento:f.forma,parcelas:showParc?f.parc+'x':'',
      valor_liquido:Math.round(liq*100)/100,comissao:Math.round(com*100)/100,
      tipo_doc:f.tipoDoc,documento:f.doc,recibo:rec,nf})
  }
  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="h-2 w-full" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}/>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-800">{inicial?'Editar Atendimento':'+ Novo Atendimento'}</h2>
            {inicial&&<button onClick={onCancelar} className="text-sm text-gray-400 hover:text-gray-700">Voltar</button>}
          </div>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={LB}>Data</label><input type="date" value={f.data} onChange={e=>s('data',e.target.value)} className={IN} required/></div>
            <div><label className={LB}>Paciente</label><input value={f.paciente} onChange={e=>s('paciente',e.target.value)} placeholder="Nome completo" className={IN}/></div>
            <div><label className={LB}>Dentista</label>
              <select value={f.dentista} onChange={e=>s('dentista',e.target.value)} className={IN}>
                <option value="">Selecione...</option>
                {dentistas.map(d=><option key={d.id} value={d.nome}>{d.nome} ({d.comissao_percentual}%)</option>)}
              </select>
            </div>
            <div><label className={LB}>Valor Cobrado (R$)</label>
              <input type="number" min="0" step="0.01" value={f.valorCobrado} onChange={e=>s('valorCobrado',e.target.value)} placeholder="0,00" className={IN}/>
            </div>
            <div className={showParc?'':'sm:col-span-2'}>
              <label className={LB}>Forma de Pagamento</label>
              <select value={f.forma} onChange={e=>{s('forma',e.target.value);if(!isParcelado(e.target.value))s('parc','2')}} className={IN}>
                {GRUPOS_FORMAS.map(g=>(
                  <optgroup key={g.label} label={g.label}>
                    {g.formas.map(ff=><option key={ff} value={ff}>{ff}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {showParc&&<div><label className={LB}>Nr de Parcelas</label>
              <select value={f.parc} onChange={e=>s('parc',e.target.value)} className={IN}>
                {parcopts.map(n=><option key={n} value={String(n)}>{n}x</option>)}
              </select>
            </div>}
            <motion.div className="sm:col-span-2 rounded-2xl p-4" key={`${val}-${f.forma}-${f.parc}`}
              style={{background:`linear-gradient(to right,${cor1}15,${cor2}15)`,border:`1px solid ${cor1}30`}}>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">Calculo Automatico</p>
              <div className="grid grid-cols-3 gap-4">
                {[{label:'Taxa',val:`${t}%`,color:cor1},{label:'Valor Liquido',val:brl(liq),color:'#16a34a'},{label:'Comissao',val:brl(com),color:'#9333ea'}].map(item=>(
                  <div key={item.label} className="text-center bg-white rounded-xl p-3 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <motion.p key={item.val} initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
                      className="text-xl font-black" style={{color:item.color}}>{item.val}</motion.p>
                  </div>
                ))}
              </div>
            </motion.div>
            <div><label className={LB}>Tipo de Documento</label>
              <select value={f.tipoDoc} onChange={e=>s('tipoDoc',e.target.value as Doc)} className={IN}>
                <option value="CPF">CPF</option><option value="CNPJ">CNPJ</option>
              </select>
            </div>
            <div><label className={LB}>{f.tipoDoc}</label>
              <input value={f.doc} onChange={e=>s('doc',e.target.value)}
                placeholder={f.tipoDoc==='CPF'?'000.000.000-00':'00.000.000/0000-00'} className={IN}/>
            </div>
            {f.tipoDoc==='CPF'&&<div><label className={LB}>Deseja recibo?</label>
              <select value={f.recibo} onChange={e=>s('recibo',e.target.value)} className={IN}>
                <option>Nao</option><option>Sim</option>
              </select>
            </div>}
            <div><label className={LB}>NF?</label>
              <div className={`${IN} pointer-events-none font-semibold ${nf==='Sim'?'bg-green-50 text-green-600 border-green-200':'bg-gray-50 text-gray-400'}`}>
                {nf==='Sim'?'Sim (CNPJ)':'Nao'}
              </div>
            </div>
            {erro&&<motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
              className="sm:col-span-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{erro}</motion.div>}
            <div className="sm:col-span-2 flex gap-3 pt-2">
              {inicial&&<motion.button type="button" onClick={onCancelar} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50">Cancelar</motion.button>}
              <motion.button type="submit" whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                style={{background:`linear-gradient(to right,${cor1},${cor2})`}}
                className="flex-1 text-white font-black py-3 rounded-xl shadow-lg">
                {inicial?'Salvar Alteracoes':'+ Registrar Atendimento'}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

// GESTAO DE DENTISTAS
function GestDentistas({dentistas,consultorioId,onUpdate,cor1,cor2}:{dentistas:Dentista[];consultorioId:string;onUpdate:()=>Promise<void>;cor1:string;cor2:string}) {
  const [nome,setNome]=useState('')
  const [comissao,setComissao]=useState('50')
  const [loading,setLoading]=useState(false)
  const [editId,setEditId]=useState<string|null>(null)
  const [editCom,setEditCom]=useState('')
  const [erro,setErro]=useState('')
  const [sucesso,setSucesso]=useState('')
  const ativos=dentistas.filter(d=>d.ativo)
  const inativos=dentistas.filter(d=>!d.ativo)

  async function adicionar(e:React.FormEvent){
    e.preventDefault()
    if(!nome.trim()){setErro('Informe o nome.');return}
    const pct=parseFloat(comissao)
    if(isNaN(pct)||pct<0||pct>100){setErro('Percentual invalido (0-100).');return}
    if(!consultorioId){setErro('Erro: ID do consultorio nao encontrado. Faca logout e entre novamente.');return}
    setLoading(true);setErro('');setSucesso('')
    const{error}=await supabase.from('dentistas').insert({consultorio_id:consultorioId,nome:nome.trim(),comissao_percentual:pct,ativo:true})
    if(error){
      setErro('Erro: '+error.message)
      setLoading(false);return
    }
    setSucesso(nome.trim()+' adicionado com sucesso!')
    setNome('');setComissao('50')
    await onUpdate()
    setLoading(false)
    setTimeout(()=>setSucesso(''),4000)
  }

  async function salvarEdicao(id:string){
    const pct=parseFloat(editCom)
    if(isNaN(pct)||pct<0||pct>100){setErro('Percentual invalido.');return}
    const{error}=await supabase.from('dentistas').update({comissao_percentual:pct}).eq('id',id)
    if(error){setErro('Erro: '+error.message);return}
    setEditId(null);await onUpdate()
  }

  async function toggleAtivo(d:Dentista){
    if(!confirm(d.ativo?`Desativar ${d.nome}?`:`Reativar ${d.nome}?`)) return
    await supabase.from('dentistas').update({ativo:!d.ativo}).eq('id',d.id)
    await onUpdate()
  }

  async function excluir(d:Dentista){
    if(!confirm(`EXCLUIR permanentemente ${d.nome}? O historico de atendimentos NAO sera apagado.`)) return
    const{error}=await supabase.from('dentistas').delete().eq('id',d.id)
    if(error){setErro('Erro ao excluir: '+error.message);return}
    await onUpdate()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="h-2 w-full" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}/>
        <div className="p-6">
          <h2 className="text-xl font-black text-gray-800 mb-1">Gestao de Dentistas</h2>
          <p className="text-xs text-gray-400 mb-5 font-mono">
            ID consultorio: <span className={`font-bold ${consultorioId?'text-green-600':'text-red-500'}`}>{consultorioId||'NAO ENCONTRADO - faca logout e entre novamente'}</span>
          </p>
          <form onSubmit={adicionar} className="flex gap-3 flex-wrap">
            <input value={nome} onChange={e=>{setNome(e.target.value);setErro('');setSucesso('')}} placeholder="Nome do dentista" className={`${IN} flex-1 min-w-[180px]`}/>
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="100" step="0.1" value={comissao} onChange={e=>{setComissao(e.target.value);setErro('')}} className={`${IN} w-24`}/>
              <span className="text-gray-500 font-bold">%</span>
            </div>
            <motion.button type="submit" disabled={loading||!consultorioId} whileHover={{scale:1.03}} whileTap={{scale:0.97}}
              style={{background:`linear-gradient(to right,${cor1},${cor2})`}}
              className="text-white font-black px-6 py-2.5 rounded-xl shadow-lg text-sm disabled:opacity-40">
              {loading?'Salvando...':'+ Adicionar'}
            </motion.button>
          </form>
          {erro   &&<motion.p initial={{opacity:0}} animate={{opacity:1}} className="mt-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2">{erro}</motion.p>}
          {sucesso&&<motion.p initial={{opacity:0}} animate={{opacity:1}} className="mt-3 text-sm bg-green-50 border border-green-200 text-green-600 rounded-xl px-4 py-2">{sucesso}</motion.p>}
        </div>
      </motion.div>

      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}
        className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-sm text-blue-700">
        <strong>Historico protegido:</strong> Editar o % ou excluir um dentista <strong>nao afeta</strong> nenhum atendimento ja registrado.
      </motion.div>

      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15}} className="bg-white rounded-2xl shadow p-5">
        <h3 className="font-bold text-gray-700 mb-4">Ativos ({ativos.length})</h3>
        {!ativos.length
          ?<p className="text-gray-400 text-sm text-center py-4">Nenhum dentista ativo. Adicione acima.</p>
          :<div className="space-y-2">
            {ativos.map((d,i)=>(
              <motion.div key={d.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md"
                    style={{background:`linear-gradient(135deg,${cor1},${cor2})`}}>{d.nome.charAt(0)}</div>
                  <p className="font-semibold text-gray-800">{d.nome}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {editId===d.id
                    ?<>
                      <input type="number" min="0" max="100" step="0.1" value={editCom} onChange={e=>setEditCom(e.target.value)}
                        className="w-20 border border-blue-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                      <span className="text-gray-500 text-sm">%</span>
                      <motion.button whileTap={{scale:0.95}} onClick={()=>salvarEdicao(d.id)} className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Salvar</motion.button>
                      <motion.button whileTap={{scale:0.95}} onClick={()=>setEditId(null)} className="bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg">X</motion.button>
                    </>
                    :<>
                      <span className="font-black text-lg" style={{color:cor1}}>{d.comissao_percentual}%</span>
                      <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                        onClick={()=>{setEditId(d.id);setEditCom(String(d.comissao_percentual));setErro('')}}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg">Editar %</motion.button>
                      <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>toggleAtivo(d)}
                        className="bg-yellow-50 hover:bg-yellow-100 text-yellow-600 text-xs font-bold px-3 py-1.5 rounded-lg">Desativar</motion.button>
                      <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>excluir(d)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg">Excluir</motion.button>
                    </>
                  }
                </div>
              </motion.div>
            ))}
          </div>
        }
      </motion.div>

      {!!inativos.length&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} className="bg-white rounded-2xl shadow p-5">
          <h3 className="font-bold text-gray-400 mb-3">Inativos ({inativos.length})</h3>
          <div className="space-y-2">
            {inativos.map(d=>(
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <p className="font-semibold text-gray-400 line-through">{d.nome} - {d.comissao_percentual}%</p>
                <div className="flex gap-2">
                  <button onClick={()=>toggleAtivo(d)} className="bg-green-50 hover:bg-green-100 text-green-600 text-xs font-bold px-3 py-1.5 rounded-lg">Reativar</button>
                  <button onClick={()=>excluir(d)} className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// HISTORICO
function Historico({dados,onEditar,onRemover,cor1,cor2}:{dados:Atend[];onEditar:(a:Atend)=>void;onRemover:(id:string)=>void;cor1:string;cor2:string}) {
  const [busca,setBusca]=useState(''); const [fDent,setFDent]=useState('')
  const [fForma,setFForma]=useState(''); const [dIni,setDIni]=useState(''); const [dFim,setDFim]=useState('')
  const dentistas=useMemo(()=>[...new Set(dados.map(a=>a.dentista).filter(Boolean))],[dados])
  const formas=useMemo(()=>[...new Set(dados.map(a=>a.forma_pagamento).filter(Boolean))],[dados])
  const lista=useMemo(()=>dados.filter(a=>{
    if(busca&&!a.paciente.toLowerCase().includes(busca.toLowerCase())) return false
    if(fDent&&a.dentista!==fDent) return false
    if(fForma&&a.forma_pagamento!==fForma) return false
    if(dIni&&a.data<dIni) return false
    if(dFim&&a.data>dFim) return false
    return true
  }),[dados,busca,fDent,fForma,dIni,dFim])
  const totLiq=lista.reduce((s,a)=>s+Number(a.valor_liquido),0)
  const totCom=lista.reduce((s,a)=>s+Number(a.comissao),0)
  function exportar(){
    if(!lista.length) return
    const rows=lista.map(a=>({'Data':a.data,'Paciente':a.paciente,'Dentista':a.dentista||'-','Valor Cobrado':a.valor_cobrado,'Forma':a.forma_pagamento,'Parcelas':a.parcelas||'-','Valor Liquido':a.valor_liquido,'Comissao':a.comissao,'Documento':`${a.tipo_doc}: ${a.documento||'-'}`,'Recibo?':a.recibo,'NF?':a.nf}))
    const ws=XLSX.utils.json_to_sheet(rows); ws['!cols']=Object.keys(rows[0]).map(()=>({wch:22}))
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Atendimentos'); XLSX.writeFile(wb,`atendimentos_${hj()}.xlsx`)
  }
  return (
    <div className="space-y-4">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="h-1 w-full" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}/>
        <div className="p-5">
          <h3 className="font-bold text-gray-700 mb-4">Filtros</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar paciente..." className={IN}/>
            <select value={fDent} onChange={e=>setFDent(e.target.value)} className={IN}><option value="">Todos dentistas</option>{dentistas.map(d=><option key={d} value={d}>{d}</option>)}</select>
            <select value={fForma} onChange={e=>setFForma(e.target.value)} className={IN}><option value="">Todas as formas</option>{formas.map(f=><option key={f} value={f}>{f}</option>)}</select>
            <div><input type="date" value={dIni} onChange={e=>setDIni(e.target.value)} className={IN}/><p className="text-xs text-gray-400 mt-0.5 ml-1">De</p></div>
            <div><input type="date" value={dFim} onChange={e=>setDFim(e.target.value)} className={IN}/><p className="text-xs text-gray-400 mt-0.5 ml-1">Ate</p></div>
          </div>
        </div>
      </motion.div>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          {[{label:'Registros',val:String(lista.length),c:'text-blue-600'},{label:'Total Liquido',val:brl(totLiq),c:'text-green-600'},{label:'Comissoes',val:brl(totCom),c:'text-purple-600'}].map(item=>(
            <motion.div key={item.label} whileHover={{y:-2}} className="bg-white rounded-xl shadow px-4 py-3 text-center">
              <p className="text-xs text-gray-400">{item.label}</p><p className={`font-black ${item.c}`}>{item.val}</p>
            </motion.div>
          ))}
        </div>
        <motion.button onClick={exportar} whileHover={{scale:1.05}} whileTap={{scale:0.97}}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-black px-6 py-3 rounded-xl shadow-lg">
          Exportar Excel
        </motion.button>
      </div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15}} className="bg-white rounded-2xl shadow overflow-hidden">
        {!lista.length
          ?<div className="py-16 text-center"><p className="font-semibold text-gray-500">Nenhum atendimento encontrado</p></div>
          :<div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200" style={{background:`linear-gradient(to right,${cor1}08,${cor2}08)`}}>
                {['Data','Paciente','Dentista','Cobrado','Pagamento','Parc.','Liquido','Comissao','Rec.','NF',''].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {lista.map((a,i)=>(
                  <motion.tr key={a.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                    whileHover={{backgroundColor:'rgba(239,246,255,0.8)'}} className="transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{a.data}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{a.paciente}</td>
                    <td className="px-4 py-3 text-gray-500">{a.dentista||'-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{brl(Number(a.valor_cobrado))}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{a.forma_pagamento}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{a.parcelas||'-'}</td>
                    <td className="px-4 py-3 font-black text-green-600 whitespace-nowrap">{brl(Number(a.valor_liquido))}</td>
                    <td className="px-4 py-3 font-black text-purple-600 whitespace-nowrap">{brl(Number(a.comissao))}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{a.recibo}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{a.nf}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <motion.button whileHover={{scale:1.2}} whileTap={{scale:0.9}} onClick={()=>onEditar(a)} className="w-7 h-7 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded-lg text-xs">Ed</motion.button>
                      <motion.button whileHover={{scale:1.2}} whileTap={{scale:0.9}} onClick={()=>onRemover(a.id)} className="w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg text-xs">X</motion.button>
                    </div></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </motion.div>
    </div>
  )
}