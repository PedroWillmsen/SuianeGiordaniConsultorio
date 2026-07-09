'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

const TAXAS:Record<string,number>={'Dinheiro':0,'PIX':0,'Mastercard Debito':1.99,'Mastercard Credito a vista':3.19,'Mastercard Parcelado 2x-6x':3.99,'Mastercard Parcelado 7x-12x':3.99,'Mastercard Parcelado cliente':3.19,'Mastercard RePay':3.19,'Visa Debito':1.99,'Visa Credito a vista':3.19,'Visa Parcelado 2x-6x':3.99,'Visa Parcelado 7x-12x':3.99,'Visa Parcelado cliente':3.19,'Visa RePay':3.19,'Elo Debito':1.99,'Elo Credito a vista':3.19,'Elo Parcelado 2x-6x':3.99,'Elo Parcelado 7x-12x':3.99,'Elo Parcelado cliente':3.19,'Elo RePay':3.19,'Banricompras Debito':1.99,'Banricompras Pre-datado':2.59,'Banricompras Credito 1 minuto':1.99,'Banricompras Parcelado 2x-6x':2.99,'Banricompras Parcelado 7x-12x':2.99,'Mastercard Debito (Link)':1.79,'Mastercard Credito a vista (Link)':3.09,'Mastercard Parcelado 2x-6x (Link)':3.59,'Mastercard Parcelado 7x-12x (Link)':3.59,'Visa Debito (Link)':1.79,'Visa Credito a vista (Link)':3.09,'Visa Parcelado 2x-6x (Link)':3.59,'Visa Parcelado 7x-12x (Link)':3.59,'Elo Debito (Link)':1.79,'Elo Credito a vista (Link)':3.09,'Elo Parcelado 2x-6x (Link)':3.59,'Elo Parcelado 7x-12x (Link)':3.59}
const GRUPOS_PADRAO=[{label:'Outros',formas:['Dinheiro','PIX']},{label:'Mastercard',formas:['Mastercard Debito','Mastercard Credito a vista','Mastercard Parcelado 2x-6x','Mastercard Parcelado 7x-12x','Mastercard Parcelado cliente','Mastercard RePay']},{label:'Visa',formas:['Visa Debito','Visa Credito a vista','Visa Parcelado 2x-6x','Visa Parcelado 7x-12x','Visa Parcelado cliente','Visa RePay']},{label:'Elo',formas:['Elo Debito','Elo Credito a vista','Elo Parcelado 2x-6x','Elo Parcelado 7x-12x','Elo Parcelado cliente','Elo RePay']},{label:'Banricompras',formas:['Banricompras Debito','Banricompras Pre-datado','Banricompras Credito 1 minuto','Banricompras Parcelado 2x-6x','Banricompras Parcelado 7x-12x']},{label:'Mastercard (Link)',formas:['Mastercard Debito (Link)','Mastercard Credito a vista (Link)','Mastercard Parcelado 2x-6x (Link)','Mastercard Parcelado 7x-12x (Link)']},{label:'Visa (Link)',formas:['Visa Debito (Link)','Visa Credito a vista (Link)','Visa Parcelado 2x-6x (Link)','Visa Parcelado 7x-12x (Link)']},{label:'Elo (Link)',formas:['Elo Debito (Link)','Elo Credito a vista (Link)','Elo Parcelado 2x-6x (Link)','Elo Parcelado 7x-12x (Link)']}]

function calcTaxa(f:string,cx:FormaCustom[]){const c=cx.find(x=>x.nome===f);return c?c.taxa:(TAXAS[f]??0)}
function isParc(f:string){return f.includes('2x-6x')||f.includes('7x-12x')}
function parcOpts(f:string):number[]{return f.includes('2x-6x')?[2,3,4,5,6]:f.includes('7x-12x')?[7,8,9,10,11,12]:[]}
function brl(v:number){return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function hj(){return new Date().toISOString().split('T')[0]}
function semKey(d:string){const dt=new Date(d+'T00:00:00');const dia=dt.getDay();const seg=new Date(dt);seg.setDate(dt.getDate()-(dia===0?6:dia-1));return seg.toISOString().split('T')[0]}
function semLbl(d:string){const dt=new Date(d+'T00:00:00');const dia=dt.getDay();const seg=new Date(dt);seg.setDate(dt.getDate()-(dia===0?6:dia-1));const dom=new Date(seg);dom.setDate(seg.getDate()+6);const f=(x:Date)=>x.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});return`${f(seg)} – ${f(dom)}`}

type Doc='CPF'|'CNPJ'
type FiltroPFPJ='todos'|'pf'|'pj'
type Aba='dashboard'|'novo'|'historico'|'dentistas'|'semanal'|'config'
interface FormaCustom{id:string;nome:string;taxa:number}
interface PagItem{id:string;forma:string;valor:string;parc:string}
interface PagSalvo{forma:string;valor:number;liquido:number;parcelas:string}
interface Dentista{id:string;consultorio_id:string;nome:string;comissao_percentual:number;ativo:boolean}
interface Consultorio{nome:string;cor_primaria:string;cor_secundaria:string;logo_url:string|null}
interface Atend{id:string;consultorio_id:string;data:string;paciente:string;dentista:string;valor_cobrado:number;forma_pagamento:string;parcelas:string;valor_liquido:number;comissao:number;tipo_doc:Doc;documento:string;recibo:string;nf:string;nome_pagador?:string;cpf_pagador?:string;procedimento?:string;pagamentos?:PagSalvo[]}
interface Usuario{id:string;nome:string;email:string;perfil:string;consultorio_id:string;consultorios:Consultorio}
const IN="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-all"
const pv={initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20}}
const pc=(a:boolean)=>`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${a?'bg-blue-600 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`

export default function DashboardPage(){
  const [usuario,setUsuario]=useState<Usuario|null>(null)
  const [aba,setAba]=useState<Aba>('dashboard')
  const [dados,setDados]=useState<Atend[]>([])
  const [dentistas,setDentistas]=useState<Dentista[]>([])
  const [edit,setEdit]=useState<Atend|null>(null)
  const [loading,setLoading]=useState(true)
  const [formasCustom,setFormasCustom]=useState<FormaCustom[]>([])
  const [procedimentos,setProcedimentos]=useState<string[]>([])
  const router=useRouter()
  useEffect(()=>{
    const u=sessionStorage.getItem('usuario');if(!u){router.push('/');return}
    const p=JSON.parse(u);setUsuario(p)
    const fc=localStorage.getItem(`formas_custom_${p.consultorio_id}`);if(fc)setFormasCustom(JSON.parse(fc))
    const pr=localStorage.getItem(`procedimentos_${p.consultorio_id}`);if(pr)setProcedimentos(JSON.parse(pr))
    if(p.consultorio_id)Promise.all([loadDados(p.consultorio_id),loadDentistas(p.consultorio_id)]);else setLoading(false)
  },[])
  function saveFormas(f:FormaCustom[]){setFormasCustom(f);if(usuario?.consultorio_id)localStorage.setItem(`formas_custom_${usuario.consultorio_id}`,JSON.stringify(f))}
  function saveProcs(p:string[]){setProcedimentos(p);if(usuario?.consultorio_id)localStorage.setItem(`procedimentos_${usuario.consultorio_id}`,JSON.stringify(p))}
  async function loadDados(cid:string){if(!cid){setLoading(false);return};setLoading(true);const{data}=await supabase.from('atendimentos').select('*').eq('consultorio_id',cid).order('data',{ascending:false});if(data)setDados(data);setLoading(false)}
  async function loadDentistas(cid:string){if(!cid)return;const{data}=await supabase.from('dentistas').select('*').eq('consultorio_id',cid).order('nome');if(data)setDentistas(data)}
  async function salvar(a:Partial<Atend>){
    if(!usuario)return
    if(edit){const{data}=await supabase.from('atendimentos').update(a).eq('id',edit.id).select().single();if(data)setDados(prev=>prev.map(x=>x.id===edit.id?data:x));setEdit(null)}
    else{const{data}=await supabase.from('atendimentos').insert({...a,consultorio_id:usuario.consultorio_id}).select().single();if(data)setDados(prev=>[data,...prev])}
    setAba('historico')
  }
  async function remover(id:string){if(!confirm('Remover este atendimento?'))return;await supabase.from('atendimentos').delete().eq('id',id);setDados(prev=>prev.filter(a=>a.id!==id))}
  function logout(){sessionStorage.removeItem('usuario');router.push('/')}
  const cor1=usuario?.consultorios?.cor_primaria||'#1e3a8a'
  const cor2=usuario?.consultorios?.cor_secundaria||'#3b82f6'
  if(loading&&!dados.length)return(<div className="min-h-screen flex items-center justify-center" style={{background:`linear-gradient(135deg,${cor1},${cor2})`}}><div className="text-center text-white"><motion.div animate={{scale:[1,1.15,1]}} transition={{repeat:Infinity,duration:1.2}} className="text-7xl mb-4">{usuario?.consultorios?.logo_url?<img src={usuario.consultorios.logo_url} alt="" className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white/40"/>:<span>🦷</span>}</motion.div><p className="font-bold text-white/80 text-sm">Carregando...</p></div></div>)
  const isAdmin=usuario?.perfil==='admin'
  const tabs=[{id:'dashboard'as Aba,lb:'Dashboard'},{id:'novo'as Aba,lb:'+ Novo'},{id:'historico'as Aba,lb:'Historico'},{id:'semanal'as Aba,lb:'Semanal'},...(isAdmin?[{id:'dentistas'as Aba,lb:'Dentistas'},{id:'config'as Aba,lb:'Config'}]:[])]
  return(<div className="min-h-screen bg-slate-100">
    <motion.header initial={{y:-60,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:0.4}} style={{background:`linear-gradient(to right,${cor1},${cor2})`}} className="shadow-2xl">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div><h1 className="text-white font-black text-lg leading-tight">{usuario?.consultorios?.nome||'Consultorio'}</h1><p className="text-white/60 text-xs">Ola, <span className="text-white font-bold">{usuario?.nome}</span>{usuario?.perfil&&<span className="ml-1 opacity-60"> - {usuario.perfil}</span>}</p></div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <nav className="flex gap-1 bg-black/20 p-1 rounded-xl flex-wrap">{tabs.map(t=>(<motion.button key={t.id} whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>{setAba(t.id);setEdit(null)}} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${aba===t.id&&!edit?'bg-white text-gray-700 shadow-lg':'text-white/80 hover:text-white hover:bg-white/10'}`}>{t.lb}</motion.button>))}</nav>
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={logout} className="ml-1 px-3 py-2 bg-black/20 hover:bg-red-500/40 text-white/80 hover:text-white rounded-xl text-sm transition-all">Sair</motion.button>
        </div>
      </div>
    </motion.header>
    <main className="max-w-6xl mx-auto px-4 py-6">
      <AnimatePresence mode="wait">
        {aba==='dashboard'&&!edit&&<motion.div key="db"{...pv}transition={{duration:0.25}}><DashView dados={dados} cor1={cor1} cor2={cor2}/></motion.div>}
        {(aba==='novo'||edit)&&<motion.div key="fm"{...pv}transition={{duration:0.25}}><Formulario inicial={edit} dentistas={dentistas.filter(d=>d.ativo)} formasCustom={formasCustom} procedimentos={procedimentos} onSalvar={salvar} onCancelar={()=>{setEdit(null);setAba('historico')}} cor1={cor1} cor2={cor2}/></motion.div>}
        {aba==='historico'&&!edit&&<motion.div key="hi"{...pv}transition={{duration:0.25}}><Historico dados={dados} onEditar={a=>setEdit(a)} onRemover={remover} cor1={cor1} cor2={cor2}/></motion.div>}
        {aba==='semanal'&&!edit&&<motion.div key="sm"{...pv}transition={{duration:0.25}}><SemanalView dados={dados} cor1={cor1} cor2={cor2}/></motion.div>}
        {aba==='dentistas'&&!edit&&<motion.div key="dt"{...pv}transition={{duration:0.25}}><GestDentistas dentistas={dentistas} consultorioId={usuario?.consultorio_id||''} onUpdate={async()=>{await loadDentistas(usuario?.consultorio_id||'')}} cor1={cor1} cor2={cor2}/></motion.div>}
        {aba==='config'&&!edit&&<motion.div key="cf"{...pv}transition={{duration:0.25}}><ConfigView formasCustom={formasCustom} onSalvarFormas={saveFormas} procedimentos={procedimentos} onSalvarProcs={saveProcs} cor1={cor1} cor2={cor2}/></motion.div>}
      </AnimatePresence>
    </main>
  </div>)
}

function DashView({dados,cor1,cor2}:{dados:Atend[];cor1:string;cor2:string}){
  const hj_s=hj(),mes_s=hj_s.slice(0,7),hj_d=dados.filter(a=>a.data===hj_s),mes_d=dados.filter(a=>a.data.startsWith(mes_s))
  const cards=[{label:'Atendimentos Hoje',val:String(hj_d.length),sub:'hoje',grad:'from-sky-400 to-blue-500'},{label:'Faturamento Hoje',val:brl(hj_d.reduce((s,a)=>s+Number(a.valor_liquido),0)),sub:'valor liquido',grad:'from-emerald-400 to-green-600'},{label:'Atend. no Mes',val:String(mes_d.length),sub:'este mes',grad:'from-violet-400 to-purple-600'},{label:'Faturamento Mes',val:brl(mes_d.reduce((s,a)=>s+Number(a.valor_liquido),0)),sub:`comissoes: ${brl(mes_d.reduce((s,a)=>s+Number(a.comissao),0))}`,grad:'from-amber-400 to-orange-500'}]
  const porDent=mes_d.reduce((acc,a)=>{if(!a.dentista)return acc;if(!acc[a.dentista])acc[a.dentista]={liq:0,com:0,n:0};acc[a.dentista].liq+=Number(a.valor_liquido);acc[a.dentista].com+=Number(a.comissao);acc[a.dentista].n++;return acc},{} as Record<string,{liq:number;com:number;n:number}>)
  return(<div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map((c,i)=>(<motion.div key={c.label} initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} whileHover={{y:-5,scale:1.03}} className={`bg-gradient-to-br ${c.grad} rounded-2xl p-5 text-white shadow-lg cursor-default`}><div className="text-2xl font-black">{c.val}</div><div className="text-xs font-semibold opacity-90 mt-1">{c.label}</div><div className="text-xs opacity-60 mt-0.5">{c.sub}</div></motion.div>))}</div>
    <div className="grid md:grid-cols-2 gap-4">
      <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.4}} className="bg-white rounded-2xl shadow p-5"><h3 className="font-bold text-gray-700 mb-4">Por Dentista (mes)</h3>{!Object.keys(porDent).length?<p className="text-gray-400 text-sm py-4 text-center">Nenhum atendimento este mes</p>:Object.entries(porDent).sort((a,b)=>b[1].liq-a[1].liq).map(([nome,d])=>(<motion.div key={nome} whileHover={{x:4}} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl mb-2"><div><p className="font-semibold text-sm">{nome}</p><p className="text-xs text-gray-500">{d.n} atendimento{d.n!==1?'s':''}</p></div><div className="text-right"><p className="text-sm font-black text-green-600">{brl(d.liq)}</p><p className="text-xs text-purple-500">comissao: {brl(d.com)}</p></div></motion.div>))}</motion.div>
      <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.5}} className="bg-white rounded-2xl shadow p-5"><h3 className="font-bold text-gray-700 mb-4">Ultimos Atendimentos</h3>{!dados.length?<p className="text-gray-400 text-sm py-4 text-center">Nenhum ainda</p>:dados.slice(0,6).map((a,i)=>(<motion.div key={a.id} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{delay:0.5+i*0.05}} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0"><div><p className="text-sm font-semibold text-gray-800">{a.paciente}</p><p className="text-xs text-gray-400">{a.data} - {a.dentista||'-'} - {a.forma_pagamento}</p></div><p className="text-sm font-black text-green-600 ml-3 shrink-0">{brl(Number(a.valor_liquido))}</p></motion.div>))}</motion.div>
    </div>
  </div>)
}

function SemanalView({dados,cor1,cor2}:{dados:Atend[];cor1:string;cor2:string}){
  const semanas=useMemo(()=>{const map=new Map<string,{label:string;cobrado:number;liquido:number;comissao:number;count:number;pf:number;pj:number}>();for(const a of dados){const key=semKey(a.data);const lbl=semLbl(a.data);if(!map.has(key))map.set(key,{label:lbl,cobrado:0,liquido:0,comissao:0,count:0,pf:0,pj:0});const s=map.get(key)!;s.cobrado+=Number(a.valor_cobrado);s.liquido+=Number(a.valor_liquido);s.comissao+=Number(a.comissao);s.count++;if(a.tipo_doc==='CNPJ')s.pj++;else s.pf++};return[...map.entries()].sort((a,b)=>b[0].localeCompare(a[0])).map(([,v])=>v)},[dados])
  const totC=semanas.reduce((s,w)=>s+w.cobrado,0),totL=semanas.reduce((s,w)=>s+w.liquido,0),totK=semanas.reduce((s,w)=>s+w.comissao,0)
  if(!semanas.length)return<div className="bg-white rounded-2xl shadow p-10 text-center"><p className="text-gray-400 font-semibold">Nenhum atendimento ainda.</p></div>
  return(<div className="space-y-4">
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="rounded-2xl p-5 text-white shadow-xl" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}><h2 className="font-black text-lg mb-4">Resumo Geral</h2><div className="grid grid-cols-3 gap-3">{[{l:'Total Cobrado',v:brl(totC)},{l:'Total Liquido',v:brl(totL)},{l:'Total Comissoes',v:brl(totK)}].map(i=>(<div key={i.l} className="text-center bg-white/15 rounded-xl p-3"><p className="text-xs text-white/70 mb-1">{i.l}</p><p className="font-black text-lg">{i.v}</p></div>))}</div></motion.div>
    {semanas.map((s,i)=>(<motion.div key={i} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className="bg-white rounded-2xl shadow overflow-hidden"><div className="h-1 w-full" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}/><div className="p-5"><div className="flex items-center justify-between mb-4 flex-wrap gap-2"><h3 className="font-black text-gray-700">📅 {s.label}</h3><div className="flex gap-2"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{s.count} atend.</span>{s.pf>0&&<span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">👤 {s.pf} PF</span>}{s.pj>0&&<span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">🏢 {s.pj} PJ</span>}</div></div><div className="grid grid-cols-3 gap-3"><div className="text-center p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-400 mb-1">Total Cobrado</p><p className="font-black text-gray-700">{brl(s.cobrado)}</p></div><div className="text-center p-3 bg-green-50 rounded-xl"><p className="text-xs text-gray-400 mb-1">Total Liquido</p><p className="font-black text-green-600">{brl(s.liquido)}</p></div><div className="text-center p-3 bg-purple-50 rounded-xl"><p className="text-xs text-gray-400 mb-1">Comissoes</p><p className="font-black text-purple-600">{brl(s.comissao)}</p></div></div></div></motion.div>))}
  </div>)
}

interface FS{data:string;paciente:string;dentista:string;valorCobrado:string;forma:string;parc:string;tipoDoc:Doc;doc:string;recibo:string;nf:string;nomePag:string;cpfPag:string;procedimento:string;misto:boolean;pagItems:PagItem[]}
function Formulario({inicial,dentistas,formasCustom,procedimentos,onSalvar,onCancelar,cor1,cor2}:{inicial:Atend|null;dentistas:Dentista[];formasCustom:FormaCustom[];procedimentos:string[];onSalvar:(a:any)=>void;onCancelar:()=>void;cor1:string;cor2:string}){
  const temMisto=!!(inicial?.pagamentos&&inicial.pagamentos.length>0)
  const inicialItems:PagItem[]=temMisto?inicial!.pagamentos!.map((p,i)=>({id:String(i),forma:p.forma,valor:String(p.valor),parc:p.parcelas?.replace('x','')||'2'})):[{id:'1',forma:inicial?.forma_pagamento||'Dinheiro',valor:inicial&&!temMisto?String(inicial.valor_cobrado):'',parc:inicial?.parcelas?.replace('x','')||'2'}]
  const [f,setF]=useState<FS>({data:inicial?.data||hj(),paciente:inicial?.paciente||'',dentista:inicial?.dentista||(dentistas[0]?.nome||''),valorCobrado:inicial&&!temMisto?String(inicial.valor_cobrado):'',forma:inicial&&!temMisto?(inicial.forma_pagamento||'Dinheiro'):'Dinheiro',parc:inicial?.parcelas?.replace('x','')||'2',tipoDoc:inicial?.tipo_doc||'CPF',doc:inicial?.documento||'',recibo:(!inicial||inicial.recibo==='N/A')?'Nao':inicial.recibo,nf:inicial?.nf||'Nao',nomePag:inicial?.nome_pagador||'',cpfPag:inicial?.cpf_pagador||'',procedimento:inicial?.procedimento||'',misto:temMisto,pagItems:inicialItems})
  const [erro,setErro]=useState('')
  const LB="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
  function s(k:keyof FS,v:any){setF(p=>({...p,[k]:v}));setErro('')}
  function ativaMisto(v:boolean){setF(p=>({...p,misto:v,pagItems:v?[{id:'1',forma:p.forma,valor:p.valorCobrado,parc:p.parc},{id:'2',forma:'PIX',valor:'',parc:'2'}]:p.pagItems}))}
  function updItem(id:string,k:keyof PagItem,v:string){setF(p=>({...p,pagItems:p.pagItems.map(x=>x.id===id?{...x,[k]:v}:x)}))}
  function addItem(){setF(p=>({...p,pagItems:[...p.pagItems,{id:Date.now().toString(),forma:'Dinheiro',valor:'',parc:'2'}]}))}
  function remItem(id:string){setF(p=>({...p,pagItems:p.pagItems.filter(x=>x.id!==id)}))}
  const showParc=isParc(f.forma);const parcopts=parcOpts(f.forma)
  const t=calcTaxa(f.forma,formasCustom);const val=parseFloat(f.valorCobrado)||0;const liq=val*(1-t/100)
  const calcPags=f.pagItems.map(p=>{const v=parseFloat(p.valor)||0;const tx=calcTaxa(p.forma,formasCustom);return{...p,v,tx,liq:v*(1-tx/100),showP:isParc(p.forma)}})
  const totVal=calcPags.reduce((s,p)=>s+p.v,0),totLiq=calcPags.reduce((s,p)=>s+p.liq,0)
  const totalVal=f.misto?totVal:val,totalLiq=f.misto?totLiq:liq
  const dObj=dentistas.find(d=>d.nome===f.dentista);const com=dObj?totalLiq*(dObj.comissao_percentual/100):0
  const rec=f.tipoDoc==='CNPJ'?'N/A':f.recibo;const nfFinal=f.tipoDoc==='CNPJ'?'Sim':f.nf
  const gruposFormas=[...GRUPOS_PADRAO,...(formasCustom.length?[{label:'Personalizadas',formas:formasCustom.map(c=>c.nome)}]:[])];
  function submit(e:React.FormEvent){
    e.preventDefault();if(!f.paciente.trim()){setErro('Informe o nome do paciente.');return}
    const base={data:f.data,paciente:f.paciente.trim(),dentista:f.dentista,tipo_doc:f.tipoDoc,documento:f.doc,recibo:rec,nf:nfFinal,nome_pagador:f.nomePag.trim()||null,cpf_pagador:f.cpfPag.trim()||null,procedimento:f.procedimento.trim()||null}
    if(f.misto){
      if(calcPags.some(p=>!p.v)){setErro('Informe o valor de cada forma de pagamento.');return}
      const pags:PagSalvo[]=calcPags.map(p=>({forma:p.forma,valor:p.v,liquido:Math.round(p.liq*100)/100,parcelas:p.showP?p.parc+'x':''}))
      onSalvar({...base,valor_cobrado:Math.round(totVal*100)/100,valor_liquido:Math.round(totLiq*100)/100,comissao:Math.round(com*100)/100,forma_pagamento:pags.length===1?pags[0].forma:'Misto',parcelas:'',pagamentos:pags})
    }else{
      if(!val||val<=0){setErro('Informe um valor valido.');return}
      onSalvar({...base,valor_cobrado:val,valor_liquido:Math.round(liq*100)/100,comissao:Math.round(com*100)/100,forma_pagamento:f.forma,parcelas:showParc?f.parc+'x':'',pagamentos:null})
    }
  }
  return(<div className="max-w-3xl mx-auto"><motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl shadow-xl overflow-hidden"><div className="h-2 w-full" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}/><div className="p-6">
    <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black text-gray-800">{inicial?'Editar Atendimento':'+ Novo Atendimento'}</h2>{inicial&&<button onClick={onCancelar} className="text-sm text-gray-400 hover:text-gray-700">Voltar</button>}</div>
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={LB}>Data</label><input type="date" value={f.data} onChange={e=>s('data',e.target.value)} className={IN} required/></div>
        <div><label className={LB}>Procedimento</label><input list="proc-list" value={f.procedimento} onChange={e=>s('procedimento',e.target.value)} placeholder={procedimentos.length?"Selecione ou digite...":"Ex: Limpeza, Extracao..."} className={IN}/>{procedimentos.length>0&&<datalist id="proc-list">{procedimentos.map(p=><option key={p} value={p}/>)}</datalist>}</div>
      </div>
      <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/40 space-y-3">
        <h3 className="text-xs font-black text-blue-700 uppercase tracking-wider">👤 Beneficiario <span className="font-normal text-gray-400 normal-case">(quem recebe o tratamento)</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={LB}>Nome do Paciente</label><input value={f.paciente} onChange={e=>s('paciente',e.target.value)} placeholder="Nome completo" className={IN}/></div>
          <div><label className={LB}>Tipo de Doc.</label><select value={f.tipoDoc} onChange={e=>s('tipoDoc',e.target.value as Doc)} className={IN}><option value="CPF">CPF</option><option value="CNPJ">CNPJ</option></select></div>
          <div><label className={LB}>{f.tipoDoc}</label><input value={f.doc} onChange={e=>s('doc',e.target.value)} placeholder={f.tipoDoc==='CPF'?'000.000.000-00':'00.000.000/0000-00'} className={IN}/></div>
        </div>
      </div>
      <div className="border border-amber-100 rounded-2xl p-4 bg-amber-50/40 space-y-3">
        <h3 className="text-xs font-black text-amber-700 uppercase tracking-wider">💰 Pagador <span className="font-normal text-gray-400 normal-case">(preencha so se diferente do beneficiario)</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={LB}>Nome do Pagador</label><input value={f.nomePag} onChange={e=>s('nomePag',e.target.value)} placeholder="Deixe vazio se for o mesmo" className={IN}/></div>
          <div><label className={LB}>CPF do Pagador</label><input value={f.cpfPag} onChange={e=>s('cpfPag',e.target.value)} placeholder="000.000.000-00" className={IN}/></div>
        </div>
      </div>
      <div><label className={LB}>Dentista</label><select value={f.dentista} onChange={e=>s('dentista',e.target.value)} className={IN}><option value="">Selecione...</option>{dentistas.map(d=><option key={d.id} value={d.nome}>{d.nome} ({d.comissao_percentual}%)</option>)}</select></div>
      <div><label className={LB}>Modo de Pagamento</label><div className="flex gap-2"><button type="button" onClick={()=>ativaMisto(false)} className={pc(!f.misto)}>Simples</button><button type="button" onClick={()=>ativaMisto(true)} className={pc(f.misto)}>Dividido (2+ formas)</button></div></div>
      {!f.misto&&(<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={LB}>Valor Cobrado (R$)</label><input type="number" min="0" step="0.01" value={f.valorCobrado} onChange={e=>s('valorCobrado',e.target.value)} placeholder="0,00" className={IN}/></div>
        <div><label className={LB}>Forma de Pagamento</label><select value={f.forma} onChange={e=>{s('forma',e.target.value);if(!isParc(e.target.value))s('parc','2')}} className={IN}>{gruposFormas.map(g=><optgroup key={g.label} label={g.label}>{g.formas.map(ff=><option key={ff} value={ff}>{ff}</option>)}</optgroup>)}</select></div>
        {showParc&&<div><label className={LB}>Parcelas</label><select value={f.parc} onChange={e=>s('parc',e.target.value)} className={IN}>{parcopts.map(n=><option key={n} value={String(n)}>{n}x</option>)}</select></div>}
      </div>)}
      {f.misto&&(<div className="border border-indigo-100 rounded-2xl p-4 bg-indigo-50/30 space-y-3">
        <h3 className="text-xs font-black text-indigo-700 uppercase tracking-wider">💳 Formas de Pagamento</h3>
        {calcPags.map(p=>(<div key={p.id} className="p-3 bg-white rounded-xl border border-gray-100 space-y-2">
          <div className="flex gap-2 items-center flex-wrap">
            <select value={p.forma} onChange={e=>updItem(p.id,'forma',e.target.value)} className={`${IN} flex-1 min-w-[160px]`}>{gruposFormas.map(g=><optgroup key={g.label} label={g.label}>{g.formas.map(ff=><option key={ff} value={ff}>{ff}</option>)}</optgroup>)}</select>
            <input type="number" min="0" step="0.01" value={p.valor} onChange={e=>updItem(p.id,'valor',e.target.value)} placeholder="R$ valor" className={`${IN} w-32`}/>
            {p.showP&&<select value={p.parc} onChange={e=>updItem(p.id,'parc',e.target.value)} className={`${IN} w-20`}>{parcOpts(p.forma).map(n=><option key={n} value={String(n)}>{n}x</option>)}</select>}
            {f.pagItems.length>1&&<button type="button" onClick={()=>remItem(p.id)} className="text-red-400 hover:text-red-600 font-black text-lg px-1">✕</button>}
          </div>
          {p.v>0&&<p className="text-xs text-gray-500 ml-1">Taxa {p.tx}% → Liquido: <span className="font-bold text-green-600">{brl(p.liq)}</span></p>}
        </div>))}
        <button type="button" onClick={addItem} className="text-sm text-indigo-600 font-bold hover:text-indigo-800">+ Adicionar outra forma</button>
      </div>)}
      <motion.div className="rounded-2xl p-4" style={{background:`linear-gradient(to right,${cor1}15,${cor2}15)`,border:`1px solid ${cor1}30`}}>
        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">Calculo Automatico</p>
        <div className="grid grid-cols-3 gap-4">{[{label:'Total Cobrado',val:brl(totalVal),color:'#374151'},{label:'Valor Liquido',val:brl(totalLiq),color:'#16a34a'},{label:'Comissao',val:brl(com),color:'#9333ea'}].map(i=>(<div key={i.label} className="text-center bg-white rounded-xl p-3 shadow-sm"><p className="text-xs text-gray-500 mb-1">{i.label}</p><motion.p key={i.val} initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="text-lg font-black" style={{color:i.color}}>{i.val}</motion.p></div>))}</div>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {f.tipoDoc==='CPF'&&<div><label className={LB}>Deseja recibo?</label><select value={f.recibo} onChange={e=>s('recibo',e.target.value)} className={IN}><option>Nao</option><option>Sim</option></select></div>}
        <div><label className={LB}>NF (Nota Fiscal)?</label>{f.tipoDoc==='CNPJ'?<div className={`${IN} bg-green-50 text-green-600 font-semibold pointer-events-none`}>Sim (automatico CNPJ)</div>:<select value={f.nf} onChange={e=>s('nf',e.target.value)} className={IN}><option>Nao</option><option>Sim</option></select>}</div>
      </div>
      {erro&&<motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{erro}</motion.div>}
      <div className="flex gap-3 pt-2">
        {inicial&&<motion.button type="button" onClick={onCancelar} whileHover={{scale:1.02}} whileTap={{scale:0.98}} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50">Cancelar</motion.button>}
        <motion.button type="submit" whileHover={{scale:1.02}} whileTap={{scale:0.97}} style={{background:`linear-gradient(to right,${cor1},${cor2})`}} className="flex-1 text-white font-black py-3 rounded-xl shadow-lg">{inicial?'Salvar Alteracoes':'+ Registrar Atendimento'}</motion.button>
      </div>
    </form>
  </div></motion.div></div>)
}

function Historico({dados,onEditar,onRemover,cor1,cor2}:{dados:Atend[];onEditar:(a:Atend)=>void;onRemover:(id:string)=>void;cor1:string;cor2:string}){
  const [busca,setBusca]=useState('');const [fDent,setFDent]=useState('');const [fForma,setFForma]=useState('');const [dIni,setDIni]=useState('');const [dFim,setDFim]=useState('');const [filtroPFPJ,setFiltroPFPJ]=useState<FiltroPFPJ>('todos');const [fProc,setFProc]=useState('')
  const dentistas=useMemo(()=>[...new Set(dados.map(a=>a.dentista).filter(Boolean))],[dados]);const formas=useMemo(()=>[...new Set(dados.map(a=>a.forma_pagamento).filter(Boolean))],[dados])
  const lista=useMemo(()=>dados.filter(a=>{if(busca&&!a.paciente.toLowerCase().includes(busca.toLowerCase()))return false;if(fDent&&a.dentista!==fDent)return false;if(fForma&&a.forma_pagamento!==fForma)return false;if(dIni&&a.data<dIni)return false;if(dFim&&a.data>dFim)return false;if(filtroPFPJ==='pf'&&a.tipo_doc!=='CPF')return false;if(filtroPFPJ==='pj'&&a.tipo_doc!=='CNPJ')return false;if(fProc&&!(a.procedimento||'').toLowerCase().includes(fProc.toLowerCase()))return false;return true}),[dados,busca,fDent,fForma,dIni,dFim,filtroPFPJ,fProc])
  const totLiq=lista.reduce((s,a)=>s+Number(a.valor_liquido),0),totCom=lista.reduce((s,a)=>s+Number(a.comissao),0)
  function exportar(){
    if(!lista.length)return;const rows:any[]=[]
    lista.forEach(a=>{if(a.pagamentos&&a.pagamentos.length>0){a.pagamentos.forEach((p,i)=>rows.push({'Data':i===0?a.data:'','Paciente':i===0?a.paciente:'','Tipo Doc':i===0?a.tipo_doc:'','Doc':i===0?(a.documento||'-'):'','Pagador':i===0?(a.nome_pagador||'-'):'','CPF Pag':i===0?(a.cpf_pagador||'-'):'','Procedimento':i===0?(a.procedimento||'-'):'','Dentista':i===0?(a.dentista||'-'):'','Forma':p.forma,'Parcelas':p.parcelas||'-','Valor':p.valor,'Liquido':p.liquido,'Comissao':i===0?a.comissao:'','Recibo':i===0?a.recibo:'','NF':i===0?a.nf:''}))}else{rows.push({'Data':a.data,'Paciente':a.paciente,'Tipo Doc':a.tipo_doc,'Doc':a.documento||'-','Pagador':a.nome_pagador||'-','CPF Pag':a.cpf_pagador||'-','Procedimento':a.procedimento||'-','Dentista':a.dentista||'-','Forma':a.forma_pagamento,'Parcelas':a.parcelas||'-','Valor':a.valor_cobrado,'Liquido':a.valor_liquido,'Comissao':a.comissao,'Recibo':a.recibo,'NF':a.nf})}})
    const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=Object.keys(rows[0]).map(()=>({wch:18}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Atendimentos');XLSX.writeFile(wb,`atendimentos_${hj()}.xlsx`)
  }
  return(<div className="space-y-4">
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl shadow overflow-hidden"><div className="h-1 w-full" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}/><div className="p-5">
      <h3 className="font-bold text-gray-700 mb-4">Filtros</h3>
      <div className="flex gap-1 mb-3"><button onClick={()=>setFiltroPFPJ('todos')} className={pc(filtroPFPJ==='todos')}>Todos</button><button onClick={()=>setFiltroPFPJ('pf')} className={pc(filtroPFPJ==='pf')}>👤 PF (CPF)</button><button onClick={()=>setFiltroPFPJ('pj')} className={pc(filtroPFPJ==='pj')}>🏢 PJ (CNPJ)</button></div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar paciente..." className={IN}/>
        <input value={fProc} onChange={e=>setFProc(e.target.value)} placeholder="Procedimento..." className={IN}/>
        <select value={fDent} onChange={e=>setFDent(e.target.value)} className={IN}><option value="">Todos dentistas</option>{dentistas.map(d=><option key={d} value={d}>{d}</option>)}</select>
        <select value={fForma} onChange={e=>setFForma(e.target.value)} className={IN}><option value="">Todas as formas</option>{formas.map(f=><option key={f} value={f}>{f}</option>)}</select>
        <div><input type="date" value={dIni} onChange={e=>setDIni(e.target.value)} className={IN}/><p className="text-xs text-gray-400 mt-0.5 ml-1">De</p></div>
        <div><input type="date" value={dFim} onChange={e=>setDFim(e.target.value)} className={IN}/><p className="text-xs text-gray-400 mt-0.5 ml-1">Ate</p></div>
      </div>
    </div></motion.div>
    <div className="flex flex-wrap gap-3 items-center justify-between">
      <div className="flex gap-3 flex-wrap">{[{label:'Registros',val:String(lista.length),c:'text-blue-600'},{label:'Total Liquido',val:brl(totLiq),c:'text-green-600'},{label:'Comissoes',val:brl(totCom),c:'text-purple-600'}].map(i=>(<motion.div key={i.label} whileHover={{y:-2}} className="bg-white rounded-xl shadow px-4 py-3 text-center"><p className="text-xs text-gray-400">{i.label}</p><p className={`font-black ${i.c}`}>{i.val}</p></motion.div>))}</div>
      <motion.button onClick={exportar} whileHover={{scale:1.05}} whileTap={{scale:0.97}} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-black px-6 py-3 rounded-xl shadow-lg">Exportar Excel</motion.button>
    </div>
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15}} className="bg-white rounded-2xl shadow overflow-hidden">
      {!lista.length?<div className="py-16 text-center"><p className="font-semibold text-gray-500">Nenhum atendimento encontrado</p></div>
        :<div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200" style={{background:`linear-gradient(to right,${cor1}08,${cor2}08)`}}>{['Data','Paciente / Pagador','Proc.','Dentista','Cobrado','Pagamento','Parc.','Liquido','Comissao','Rec.','NF',''].map(h=>(<th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>))}</tr></thead>
          <tbody className="divide-y divide-gray-50">{lista.map((a,i)=>(<motion.tr key={a.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}} whileHover={{backgroundColor:'rgba(239,246,255,0.8)'}} className="transition-colors">
            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{a.data}</td>
            <td className="px-4 py-3"><p className="font-semibold text-gray-800">{a.paciente}</p><p className="text-xs text-gray-400">{a.tipo_doc}: {a.documento||'-'}</p>{a.nome_pagador&&<p className="text-xs text-amber-600 font-semibold mt-0.5">💰 {a.nome_pagador}{a.cpf_pagador?` · ${a.cpf_pagador}`:''}</p>}</td>
            <td className="px-4 py-3 text-gray-500 text-xs">{a.procedimento||'-'}</td>
            <td className="px-4 py-3 text-gray-500">{a.dentista||'-'}</td>
            <td className="px-4 py-3 whitespace-nowrap">{brl(Number(a.valor_cobrado))}</td>
            <td className="px-4 py-3 text-xs">{a.pagamentos&&a.pagamentos.length>1?<div className="space-y-0.5">{a.pagamentos.map((p,pi)=><p key={pi} className="text-gray-500"><span className="font-semibold">{brl(p.valor)}</span> {p.forma}{p.parcelas?` (${p.parcelas})`:''}</p>)}</div>:<span className="text-gray-500 whitespace-nowrap">{a.forma_pagamento}</span>}</td>
            <td className="px-4 py-3 text-gray-400 text-xs">{a.pagamentos&&a.pagamentos.length>1?'Misto':a.parcelas||'-'}</td>
            <td className="px-4 py-3 font-black text-green-600 whitespace-nowrap">{brl(Number(a.valor_liquido))}</td>
            <td className="px-4 py-3 font-black text-purple-600 whitespace-nowrap">{brl(Number(a.comissao))}</td>
            <td className="px-4 py-3 text-center text-xs text-gray-500">{a.recibo}</td>
            <td className="px-4 py-3 text-center text-xs text-gray-500">{a.nf}</td>
            <td className="px-4 py-3"><div className="flex gap-1"><motion.button whileHover={{scale:1.2}} whileTap={{scale:0.9}} onClick={()=>onEditar(a)} className="w-7 h-7 flex items-center justify-center bg-blue-50 hover:bg-blue-100 rounded-lg text-xs">✏️</motion.button><motion.button whileHover={{scale:1.2}} whileTap={{scale:0.9}} onClick={()=>onRemover(a.id)} className="w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg text-xs">✕</motion.button></div></td>
          </motion.tr>))}</tbody>
        </table></div>}
    </motion.div>
  </div>)
}
function GestDentistas({dentistas,consultorioId,onUpdate,cor1,cor2}:{dentistas:Dentista[];consultorioId:string;onUpdate:()=>Promise<void>;cor1:string;cor2:string}){
  const [nome,setNome]=useState('');const [comissao,setComissao]=useState('50');const [loading,setLoading]=useState(false)
  const [editId,setEditId]=useState<string|null>(null);const [editCom,setEditCom]=useState('');const [erro,setErro]=useState('');const [sucesso,setSucesso]=useState('')
  const ativos=dentistas.filter(d=>d.ativo);const inativos=dentistas.filter(d=>!d.ativo)
  async function adicionar(e:React.FormEvent){
    e.preventDefault();if(!nome.trim()){setErro('Informe o nome.');return}
    const pct=parseFloat(comissao);if(isNaN(pct)||pct<0||pct>100){setErro('Percentual invalido (0-100).');return}
    if(!consultorioId){setErro('Erro: ID do consultorio nao encontrado.');return}
    setLoading(true);setErro('');setSucesso('')
    const{error}=await supabase.from('dentistas').insert({consultorio_id:consultorioId,nome:nome.trim(),comissao_percentual:pct,ativo:true})
    if(error){setErro('Erro: '+error.message);setLoading(false);return}
    setSucesso(nome.trim()+' adicionado!');setNome('');setComissao('50');await onUpdate();setLoading(false);setTimeout(()=>setSucesso(''),4000)
  }
  async function salvarEd(id:string){const pct=parseFloat(editCom);if(isNaN(pct)||pct<0||pct>100){setErro('Percentual invalido.');return};const{error}=await supabase.from('dentistas').update({comissao_percentual:pct}).eq('id',id);if(error){setErro('Erro: '+error.message);return};setEditId(null);await onUpdate()}
  async function toggle(d:Dentista){if(!confirm(d.ativo?`Desativar ${d.nome}?`:`Reativar ${d.nome}?`))return;await supabase.from('dentistas').update({ativo:!d.ativo}).eq('id',d.id);await onUpdate()}
  async function excluir(d:Dentista){if(!confirm(`EXCLUIR permanentemente ${d.nome}? O historico NAO sera apagado.`))return;const{error}=await supabase.from('dentistas').delete().eq('id',d.id);if(error){setErro('Erro: '+error.message);return};await onUpdate()}
  return(<div className="max-w-3xl mx-auto space-y-5">
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="h-2 w-full" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}/>
      <div className="p-6">
        <h2 className="text-xl font-black text-gray-800 mb-1">Gestao de Dentistas</h2>
        <p className="text-xs text-gray-400 mb-5 font-mono">ID: <span className={`font-bold ${consultorioId?'text-green-600':'text-red-500'}`}>{consultorioId||'NAO ENCONTRADO'}</span></p>
        <form onSubmit={adicionar} className="flex gap-3 flex-wrap">
          <input value={nome} onChange={e=>{setNome(e.target.value);setErro('');setSucesso('')}} placeholder="Nome do dentista" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-all flex-1 min-w-[180px]"/>
          <div className="flex items-center gap-2"><input type="number" min="0" max="100" step="0.1" value={comissao} onChange={e=>{setComissao(e.target.value);setErro('')}} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-all w-24"/><span className="text-gray-500 font-bold">%</span></div>
          <motion.button type="submit" disabled={loading||!consultorioId} whileHover={{scale:1.03}} whileTap={{scale:0.97}} style={{background:`linear-gradient(to right,${cor1},${cor2})`}} className="text-white font-black px-6 py-2.5 rounded-xl shadow-lg text-sm disabled:opacity-40">{loading?'Salvando...':'+ Adicionar'}</motion.button>
        </form>
        {erro&&<p className="mt-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2">{erro}</p>}
        {sucesso&&<p className="mt-3 text-sm bg-green-50 border border-green-200 text-green-600 rounded-xl px-4 py-2">{sucesso}</p>}
      </div>
    </motion.div>
    <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-sm text-blue-700"><strong>Historico protegido:</strong> Editar % ou excluir <strong>nao afeta</strong> atendimentos ja registrados.</div>
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15}} className="bg-white rounded-2xl shadow p-5">
      <h3 className="font-bold text-gray-700 mb-4">Ativos ({ativos.length})</h3>
      {!ativos.length?<p className="text-gray-400 text-sm text-center py-4">Nenhum dentista ativo.</p>
        :<div className="space-y-2">{ativos.map((d,i)=>(
          <motion.div key={d.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md" style={{background:`linear-gradient(135deg,${cor1},${cor2})`}}>{d.nome.charAt(0)}</div>
              <p className="font-semibold text-gray-800">{d.nome}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {editId===d.id?<>
                <input type="number" min="0" max="100" step="0.1" value={editCom} onChange={e=>setEditCom(e.target.value)} className="w-20 border border-blue-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"/>
                <span className="text-gray-500 text-sm">%</span>
                <button onClick={()=>salvarEd(d.id)} className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Salvar</button>
                <button onClick={()=>setEditId(null)} className="bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg">X</button>
              </>:<>
                <span className="font-black text-lg" style={{color:cor1}}>{d.comissao_percentual}%</span>
                <button onClick={()=>{setEditId(d.id);setEditCom(String(d.comissao_percentual));setErro('')}} className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg">Editar %</button>
                <button onClick={()=>toggle(d)} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-600 text-xs font-bold px-3 py-1.5 rounded-lg">Desativar</button>
                <button onClick={()=>excluir(d)} className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg">Excluir</button>
              </>}
            </div>
          </motion.div>
        ))}</div>}
    </motion.div>
    {!!inativos.length&&(<div className="bg-white rounded-2xl shadow p-5">
      <h3 className="font-bold text-gray-400 mb-3">Inativos ({inativos.length})</h3>
      <div className="space-y-2">{inativos.map(d=>(<div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><p className="font-semibold text-gray-400 line-through">{d.nome} - {d.comissao_percentual}%</p><div className="flex gap-2"><button onClick={()=>toggle(d)} className="bg-green-50 hover:bg-green-100 text-green-600 text-xs font-bold px-3 py-1.5 rounded-lg">Reativar</button><button onClick={()=>excluir(d)} className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg">Excluir</button></div></div>))}</div>
    </div>)}
  </div>)
}

function ConfigView({formasCustom,onSalvarFormas,procedimentos,onSalvarProcs,cor1,cor2}:{formasCustom:FormaCustom[];onSalvarFormas:(f:FormaCustom[])=>void;procedimentos:string[];onSalvarProcs:(p:string[])=>void;cor1:string;cor2:string}){
  const [novaForma,setNovaForma]=useState({nome:'',taxa:''});const [erroF,setErroF]=useState('')
  const [novaProc,setNovaProc]=useState('');const [erroP,setErroP]=useState('')
  const IN2="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-all"
  const LB="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
  function addForma(){if(!novaForma.nome.trim()){setErroF('Informe o nome.');return};const taxa=parseFloat(novaForma.taxa);if(isNaN(taxa)||taxa<0){setErroF('Taxa invalida.');return};onSalvarFormas([...formasCustom,{id:'c_'+Date.now(),nome:novaForma.nome.trim(),taxa}]);setNovaForma({nome:'',taxa:''});setErroF('')}
  function addProc(){if(!novaProc.trim()){setErroP('Informe o procedimento.');return};if(procedimentos.includes(novaProc.trim())){setErroP('Ja existe.');return};onSalvarProcs([...procedimentos,novaProc.trim()]);setNovaProc('');setErroP('')}
  return(<div className="max-w-3xl mx-auto space-y-5">
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="h-2 w-full" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}/>
      <div className="p-6">
        <h2 className="text-xl font-black text-gray-800 mb-1">Procedimentos do Consultorio</h2>
        <p className="text-xs text-gray-400 mb-4">Adicione os procedimentos. No formulario aparece como lista com autocomplete (evita erros de digitacao).</p>
        {procedimentos.length>0&&(
          <div className="flex flex-wrap gap-2 mb-4">
            {procedimentos.map(p=>(<div key={p} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5">
              <span className="text-blue-700 text-sm font-semibold">{p}</span>
              <button onClick={()=>onSalvarProcs(procedimentos.filter(x=>x!==p))} className="text-blue-400 hover:text-red-500 font-black text-base leading-none ml-1">✕</button>
            </div>))}
          </div>
        )}
        <div className="flex gap-3 items-end">
          <div className="flex-1"><label className={LB}>Novo Procedimento</label><input value={novaProc} onChange={e=>{setNovaProc(e.target.value);setErroP('')}} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addProc())} placeholder="Ex: Limpeza, Extracao, Clareamento, Restauracao..." className={IN2}/></div>
          <motion.button onClick={addProc} whileHover={{scale:1.03}} whileTap={{scale:0.97}} style={{background:`linear-gradient(to right,${cor1},${cor2})`}} className="text-white font-black px-5 py-2.5 rounded-xl shadow text-sm">Adicionar</motion.button>
        </div>
        {erroP&&<p className="mt-2 text-sm text-red-500">{erroP}</p>}
      </div>
    </motion.div>

    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="h-2 w-full" style={{background:`linear-gradient(to right,${cor1},${cor2})`}}/>
      <div className="p-6">
        <h2 className="text-xl font-black text-gray-800 mb-1">Formas de Pagamento Personalizadas</h2>
        <p className="text-xs text-gray-400 mb-4">Crie formas extras alem das padrao (ex: Boleto, Financiamento proprio).</p>
        {formasCustom.length>0&&(<div className="space-y-2 mb-4">{formasCustom.map(f=>(<div key={f.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors"><span className="font-semibold text-gray-700">{f.nome}</span><div className="flex items-center gap-3"><span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg text-sm">{f.taxa}%</span><button onClick={()=>onSalvarFormas(formasCustom.filter(x=>x.id!==f.id))} className="text-red-400 hover:text-red-600 font-bold text-lg">✕</button></div></div>))}</div>)}
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[180px]"><label className={LB}>Nome</label><input value={novaForma.nome} onChange={e=>{setNovaForma(p=>({...p,nome:e.target.value}));setErroF('')}} placeholder="Ex: Boleto, Financiamento..." className={IN2}/></div>
          <div className="w-28"><label className={LB}>Taxa (%)</label><input type="number" step="0.01" min="0" value={novaForma.taxa} onChange={e=>{setNovaForma(p=>({...p,taxa:e.target.value}));setErroF('')}} placeholder="0,00" className={IN2}/></div>
          <motion.button onClick={addForma} whileHover={{scale:1.03}} whileTap={{scale:0.97}} style={{background:`linear-gradient(to right,${cor1},${cor2})`}} className="text-white font-black px-6 py-2.5 rounded-xl shadow-lg text-sm">Adicionar</motion.button>
        </div>
        {erroF&&<p className="mt-2 text-sm text-red-500">{erroF}</p>}
      </div>
    </motion.div>

    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-700">
      <strong>Nota:</strong> Procedimentos e formas personalizadas ficam salvas no <strong>navegador deste computador</strong>. Para outro dispositivo, adicione novamente.
    </div>
  </div>)
}