export type Doc = 'CPF' | 'CNPJ'
export type Perfil = 'admin' | 'secretaria' | 'dentista'

export interface FormaCustom { id: string; nome: string; taxa: number }
export interface PagSalvo { forma: string; valor: number; liquido: number; parcelas: string }

export interface Consultorio { nome: string; cor_primaria: string; cor_secundaria: string; logo_url: string | null }
export interface Usuario { id: string; nome: string; email: string; perfil: string; consultorio_id: string; consultorios: Consultorio }

export interface Dentista { id: string; consultorio_id: string; nome: string; comissao_percentual: number; ativo: boolean }

export interface Atend {
  id: string; consultorio_id: string; data: string; paciente: string; dentista: string
  valor_cobrado: number; forma_pagamento: string; parcelas: string; valor_liquido: number; comissao: number
  tipo_doc: Doc; documento: string; recibo: string; nf: string
  nome_pagador?: string | null; cpf_pagador?: string | null; procedimento?: string | null; pagamentos?: PagSalvo[] | null
}

export interface Config { procedimentos: string[]; formas_custom: FormaCustom[] }
