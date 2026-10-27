import type { FormaCustom } from './tipos'

// Taxas da maquininha (%) por forma de pagamento.
export const TAXAS: Record<string, number> = { 'Dinheiro': 0, 'PIX': 0, 'Mastercard Debito': 1.99, 'Mastercard Credito a vista': 3.19, 'Mastercard Parcelado 2x-6x': 3.99, 'Mastercard Parcelado 7x-12x': 3.99, 'Mastercard Parcelado cliente': 3.19, 'Mastercard RePay': 3.19, 'Visa Debito': 1.99, 'Visa Credito a vista': 3.19, 'Visa Parcelado 2x-6x': 3.99, 'Visa Parcelado 7x-12x': 3.99, 'Visa Parcelado cliente': 3.19, 'Visa RePay': 3.19, 'Elo Debito': 1.99, 'Elo Credito a vista': 3.19, 'Elo Parcelado 2x-6x': 3.99, 'Elo Parcelado 7x-12x': 3.99, 'Elo Parcelado cliente': 3.19, 'Elo RePay': 3.19, 'Banricompras Debito': 1.99, 'Banricompras Pre-datado': 2.59, 'Banricompras Credito 1 minuto': 1.99, 'Banricompras Parcelado 2x-6x': 2.99, 'Banricompras Parcelado 7x-12x': 2.99, 'Mastercard Debito (Link)': 1.79, 'Mastercard Credito a vista (Link)': 3.09, 'Mastercard Parcelado 2x-6x (Link)': 3.59, 'Mastercard Parcelado 7x-12x (Link)': 3.59, 'Visa Debito (Link)': 1.79, 'Visa Credito a vista (Link)': 3.09, 'Visa Parcelado 2x-6x (Link)': 3.59, 'Visa Parcelado 7x-12x (Link)': 3.59, 'Elo Debito (Link)': 1.79, 'Elo Credito a vista (Link)': 3.09, 'Elo Parcelado 2x-6x (Link)': 3.59, 'Elo Parcelado 7x-12x (Link)': 3.59 }

export const GRUPOS_PADRAO = [
  { label: 'Dinheiro e PIX', formas: ['Dinheiro', 'PIX'] },
  { label: 'Mastercard', formas: ['Mastercard Debito', 'Mastercard Credito a vista', 'Mastercard Parcelado 2x-6x', 'Mastercard Parcelado 7x-12x', 'Mastercard Parcelado cliente', 'Mastercard RePay'] },
  { label: 'Visa', formas: ['Visa Debito', 'Visa Credito a vista', 'Visa Parcelado 2x-6x', 'Visa Parcelado 7x-12x', 'Visa Parcelado cliente', 'Visa RePay'] },
  { label: 'Elo', formas: ['Elo Debito', 'Elo Credito a vista', 'Elo Parcelado 2x-6x', 'Elo Parcelado 7x-12x', 'Elo Parcelado cliente', 'Elo RePay'] },
  { label: 'Banricompras', formas: ['Banricompras Debito', 'Banricompras Pre-datado', 'Banricompras Credito 1 minuto', 'Banricompras Parcelado 2x-6x', 'Banricompras Parcelado 7x-12x'] },
  { label: 'Mastercard (Link)', formas: ['Mastercard Debito (Link)', 'Mastercard Credito a vista (Link)', 'Mastercard Parcelado 2x-6x (Link)', 'Mastercard Parcelado 7x-12x (Link)'] },
  { label: 'Visa (Link)', formas: ['Visa Debito (Link)', 'Visa Credito a vista (Link)', 'Visa Parcelado 2x-6x (Link)', 'Visa Parcelado 7x-12x (Link)'] },
  { label: 'Elo (Link)', formas: ['Elo Debito (Link)', 'Elo Credito a vista (Link)', 'Elo Parcelado 2x-6x (Link)', 'Elo Parcelado 7x-12x (Link)'] },
]

export function calcTaxa(f: string, cx: FormaCustom[]) { const c = cx.find(x => x.nome === f); return c ? c.taxa : (TAXAS[f] ?? 0) }
export function isParc(f: string) { return f.includes('2x-6x') || f.includes('7x-12x') }
export function parcOpts(f: string): number[] { return f.includes('2x-6x') ? [2, 3, 4, 5, 6] : f.includes('7x-12x') ? [7, 8, 9, 10, 11, 12] : [] }
export function brl(v: number) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
export function arred(v: number) { return Math.round(v * 100) / 100 }

// Datas sempre no fuso local (o antigo sistema usava UTC e virava o dia às 21h).
export function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export function hj() { return iso(new Date()) }
export function dataBR(d: string) { const [a, m, dd] = d.split('-'); return `${dd}/${m}/${a}` }
function segunda(d: string) { const dt = new Date(d + 'T00:00:00'); const dia = dt.getDay(); dt.setDate(dt.getDate() - (dia === 0 ? 6 : dia - 1)); return dt }
export function semKey(d: string) { return iso(segunda(d)) }
export function semLbl(d: string) { const seg = segunda(d); const dom = new Date(seg); dom.setDate(seg.getDate() + 6); const f = (x: Date) => x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); return `${f(seg)} – ${f(dom)}` }
export function mesLbl(ym: string) { const [a, m] = ym.split('-').map(Number); const s = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1) }
