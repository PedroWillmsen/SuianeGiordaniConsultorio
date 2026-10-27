// Acesso aos dados no Supabase (tudo o que as telas leem ou gravam passa por aqui).
import { supabase } from './supabase'
import type { Atend, Config, Dentista, FormaCustom, Usuario } from './tipos'

const CHAVE_SESSAO = 'usuario'

function erro(e: { message: string } | null, msg: string) {
  if (e) throw new Error(`${msg} (${e.message})`)
}

// ---------- Sessão ----------
export function usuarioSalvo(): Usuario | null {
  if (typeof window === 'undefined') return null
  const u = sessionStorage.getItem(CHAVE_SESSAO)
  return u ? JSON.parse(u) : null
}

export async function entrar(email: string, senha: string): Promise<Usuario> {
  const { data, error } = await supabase.from('usuarios').select('*, consultorios(*)').eq('email', email.trim()).eq('senha', senha).maybeSingle()
  if (error) throw new Error('Não foi possível conectar. Verifique a internet e tente de novo.')
  if (!data) throw new Error('Email ou senha incorretos.')
  const { senha: _s, ...usuario } = data
  void _s
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuario))
  return usuario as Usuario
}

export function sair() { sessionStorage.removeItem(CHAVE_SESSAO) }

// ---------- Atendimentos ----------
// O Supabase devolve no máximo 1000 linhas por vez: busca em páginas para nunca cortar o histórico.
export async function listarAtendimentos(cid: string): Promise<Atend[]> {
  const pagina = 1000, todos: Atend[] = []
  for (let de = 0; ; de += pagina) {
    const { data, error } = await supabase.from('atendimentos').select('*').eq('consultorio_id', cid)
      .order('data', { ascending: false }).order('created_at', { ascending: false }).range(de, de + pagina - 1)
    erro(error, 'Erro ao carregar atendimentos')
    todos.push(...(data as Atend[]))
    if (!data || data.length < pagina) return todos
  }
}

export async function criarAtendimento(cid: string, a: Partial<Atend>): Promise<Atend> {
  const { data, error } = await supabase.from('atendimentos').insert({ ...a, consultorio_id: cid }).select().single()
  erro(error, 'Erro ao salvar o atendimento')
  return data as Atend
}

export async function atualizarAtendimento(id: string, a: Partial<Atend>): Promise<Atend> {
  const { data, error } = await supabase.from('atendimentos').update(a).eq('id', id).select().single()
  erro(error, 'Erro ao salvar as alterações')
  return data as Atend
}

export async function removerAtendimento(id: string) {
  const { error } = await supabase.from('atendimentos').delete().eq('id', id)
  erro(error, 'Erro ao remover')
}

// ---------- Dentistas ----------
export async function listarDentistas(cid: string): Promise<Dentista[]> {
  const { data, error } = await supabase.from('dentistas').select('*').eq('consultorio_id', cid).order('nome')
  erro(error, 'Erro ao carregar dentistas')
  return data as Dentista[]
}

export async function criarDentista(cid: string, nome: string, pct: number) {
  const { error } = await supabase.from('dentistas').insert({ consultorio_id: cid, nome, comissao_percentual: pct, ativo: true })
  erro(error, 'Erro ao adicionar dentista')
}

export async function atualizarDentista(id: string, campos: Partial<Dentista>) {
  const { error } = await supabase.from('dentistas').update(campos).eq('id', id)
  erro(error, 'Erro ao atualizar dentista')
}

export async function excluirDentista(id: string) {
  const { error } = await supabase.from('dentistas').delete().eq('id', id)
  erro(error, 'Erro ao excluir dentista')
}

// Recalcula a comissão dos atendimentos já registrados (comissão = líquido × % / 100).
// Grava de 10 em 10 e avisa o progresso; só envia as linhas que realmente mudam.
export async function recalcularComissoes(atends: Atend[], pct: number, progresso?: (feitos: number, total: number) => void) {
  const mudar = atends
    .map(a => ({ id: a.id, nova: Math.round(Number(a.valor_liquido) * pct) / 100, atual: Number(a.comissao) }))
    .filter(x => Math.abs(x.nova - x.atual) >= 0.005)
  let feitos = 0
  progresso?.(0, mudar.length)
  for (let i = 0; i < mudar.length; i += 10) {
    await Promise.all(mudar.slice(i, i + 10).map(async x => {
      const { error } = await supabase.from('atendimentos').update({ comissao: x.nova }).eq('id', x.id)
      erro(error, `Erro ao recalcular (${feitos} de ${mudar.length} já foram salvos)`)
      feitos++
    }))
    progresso?.(feitos, mudar.length)
  }
  return mudar.length
}

// ---------- Configurações (procedimentos e formas personalizadas) ----------
// Ficam na coluna consultorios.config — valem em qualquer computador ou celular.
// Antes ficavam só no navegador: na primeira vez, o que estiver salvo no navegador é levado para o banco.
export async function carregarConfig(cid: string): Promise<Config> {
  const { data } = await supabase.from('consultorios').select('config').eq('id', cid).maybeSingle()
  let cfg = data?.config
  if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg) } catch { cfg = null } }
  const doNavegador = (k: string) => { try { return JSON.parse(localStorage.getItem(`${k}_${cid}`) || '[]') } catch { return [] } }
  const atual: Config = {
    procedimentos: cfg?.procedimentos ?? [],
    formas_custom: cfg?.formas_custom ?? [],
  }
  const procsNav: string[] = doNavegador('procedimentos'), formasNav: FormaCustom[] = doNavegador('formas_custom')
  const novosProcs = procsNav.filter(p => !atual.procedimentos.includes(p))
  const novasFormas = formasNav.filter(f => !atual.formas_custom.some(x => x.nome === f.nome))
  if (novosProcs.length || novasFormas.length) {
    const migrado = { procedimentos: [...atual.procedimentos, ...novosProcs], formas_custom: [...atual.formas_custom, ...novasFormas] }
    try { await salvarConfig(cid, migrado); return migrado } catch { return migrado }
  }
  return atual
}

export async function salvarConfig(cid: string, cfg: Config) {
  const { error } = await supabase.from('consultorios').update({ config: cfg }).eq('id', cid)
  erro(error, 'Erro ao salvar configurações')
  // cópia também no navegador, por segurança
  localStorage.setItem(`procedimentos_${cid}`, JSON.stringify(cfg.procedimentos))
  localStorage.setItem(`formas_custom_${cid}`, JSON.stringify(cfg.formas_custom))
}

// ---------- Usuários ----------
export interface UsuarioLinha { id: string; nome: string; email: string; perfil: string }

export async function listarUsuarios(cid: string): Promise<UsuarioLinha[]> {
  const { data, error } = await supabase.from('usuarios').select('id, nome, email, perfil').eq('consultorio_id', cid).order('nome')
  erro(error, 'Erro ao carregar usuários')
  return data as UsuarioLinha[]
}

export async function criarUsuario(cid: string, u: { nome: string; email: string; senha: string; perfil: string }) {
  if (!u.nome.trim() || !u.email.trim()) throw new Error('Preencha nome e email.')
  if (u.senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
  const { data: existe } = await supabase.from('usuarios').select('id').eq('email', u.email.trim()).maybeSingle()
  if (existe) throw new Error('Este email já está cadastrado.')
  const { error } = await supabase.from('usuarios').insert({ consultorio_id: cid, nome: u.nome.trim(), email: u.email.trim(), senha: u.senha, perfil: u.perfil })
  erro(error, 'Erro ao criar acesso')
}

export async function trocarSenha(id: string, senha: string) {
  if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
  const { error } = await supabase.from('usuarios').update({ senha }).eq('id', id)
  erro(error, 'Erro ao trocar a senha')
}

export async function removerUsuario(id: string) {
  const { error } = await supabase.from('usuarios').delete().eq('id', id)
  erro(error, 'Erro ao remover acesso')
}

// ---------- Cópia de segurança ----------
// Baixa um arquivo com tudo do consultório (atendimentos, dentistas e configurações).
export async function baixarCopia(u: Usuario) {
  const cid = u.consultorio_id
  const [atendimentos, dentistas, config] = await Promise.all([listarAtendimentos(cid), listarDentistas(cid), carregarConfig(cid)])
  const n = new Date(), p2 = (x: number) => String(x).padStart(2, '0')
  const nome = `copia-consultorio-${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())}-${p2(n.getHours())}h${p2(n.getMinutes())}.json`
  const conteudo = { gerado_em: n.toISOString(), consultorio: { id: cid, ...u.consultorios }, config, dentistas, atendimentos }
  const url = URL.createObjectURL(new Blob([JSON.stringify(conteudo, null, 1)], { type: 'application/json' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: nome })
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
  localStorage.setItem(`ultima_copia_${cid}`, n.toISOString())
  return { nome, atendimentos: atendimentos.length }
}

export function ultimaCopia(cid: string) {
  return typeof window === 'undefined' ? null : localStorage.getItem(`ultima_copia_${cid}`)
}
