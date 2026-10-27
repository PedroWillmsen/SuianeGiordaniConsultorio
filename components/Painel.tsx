'use client'
import { CalendarCheck, Wallet, Users, TrendingUp, Plus, Inbox } from 'lucide-react'
import type { Atend, Usuario } from '@/lib/tipos'
import { brl, hj, dataBR, mesLbl } from '@/lib/regras'
import { Botao, Cabecalho, Cartao, Numero, Vazio } from './ui'

function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

export function Painel({ dados, usuario, onNovo }: { dados: Atend[]; usuario: Usuario; onNovo: () => void }) {
  const hoje = hj(), mes = hoje.slice(0, 7)
  const doDia = dados.filter(a => a.data === hoje)
  const doMes = dados.filter(a => a.data.startsWith(mes))
  const soma = (l: Atend[], k: 'valor_liquido' | 'comissao' | 'valor_cobrado') => l.reduce((s, a) => s + Number(a[k]), 0)

  const porDent = Object.entries(doMes.reduce((acc, a) => {
    const n = a.dentista || 'Sem dentista'
    acc[n] ??= { liq: 0, com: 0, n: 0 }
    acc[n].liq += Number(a.valor_liquido); acc[n].com += Number(a.comissao); acc[n].n++
    return acc
  }, {} as Record<string, { liq: number; com: number; n: number }>)).sort((a, b) => b[1].liq - a[1].liq)

  return (
    <div>
      <Cabecalho titulo={`${saudacao()}, ${usuario.nome.split(' ')[0]}`} ajuda={`Resumo de hoje (${dataBR(hoje)}) e de ${mesLbl(mes).toLowerCase()}. Os valores são líquidos: já descontam a taxa da maquininha.`}
        acao={<Botao icone={Plus} onClick={onNovo}>Novo atendimento</Botao>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Numero rotulo="Atendimentos hoje" valor={String(doDia.length)} sub={doDia.length ? `${brl(soma(doDia, 'valor_cobrado'))} cobrados` : 'nenhum ainda'} icone={CalendarCheck} />
        <Numero rotulo="Líquido hoje" valor={brl(soma(doDia, 'valor_liquido'))} sub="após taxas" icone={Wallet} tom="text-emerald-700" />
        <Numero rotulo="Atendimentos no mês" valor={String(doMes.length)} sub={mesLbl(mes)} icone={Users} />
        <Numero rotulo="Líquido no mês" valor={brl(soma(doMes, 'valor_liquido'))} sub={`comissões: ${brl(soma(doMes, 'comissao'))}`} icone={TrendingUp} tom="text-emerald-700" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Cartao className="lg:col-span-2" atraso={0.05}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">Por dentista</h2>
            <p className="text-xs text-slate-500">Valor líquido e comissão de cada um neste mês</p>
          </div>
          {!porDent.length ? <Vazio icone={Inbox} titulo="Nenhum atendimento este mês" /> : (
            <ul className="divide-y divide-slate-100">
              {porDent.map(([nome, d]) => (
                <li key={nome} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--marca-fundo)] text-xs font-semibold text-[var(--marca)]">{nome.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{nome}</p>
                    <p className="text-xs text-slate-400">{d.n} atendimento{d.n !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-semibold text-slate-800">{brl(d.liq)}</p>
                    <p className="text-xs text-violet-600">comissão {brl(d.com)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao className="lg:col-span-3" atraso={0.1}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">Últimos atendimentos</h2>
            <p className="text-xs text-slate-500">Os 8 registros mais recentes</p>
          </div>
          {!dados.length ? <Vazio icone={Inbox} titulo="Nenhum atendimento registrado" texto="Clique em “Novo atendimento” para começar." /> : (
            <ul className="divide-y divide-slate-100">
              {dados.slice(0, 8).map(a => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{a.paciente}</p>
                    <p className="truncate text-xs text-slate-400">{dataBR(a.data)} · {a.dentista || '—'} · {a.forma_pagamento}{a.procedimento ? ` · ${a.procedimento}` : ''}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700">{brl(Number(a.valor_liquido))}</p>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  )
}
