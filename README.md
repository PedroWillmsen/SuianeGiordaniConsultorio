# Sistema do Consultório

Gestão de atendimentos, pagamentos (taxas de maquininha) e comissões de dentistas.
Next.js no Vercel + banco no Supabase. Acesso de qualquer lugar (clínica, casa, celular).

## Estrutura

```
app/            login (page.tsx) e painel (dashboard/page.tsx)
components/     telas do painel e componentes visuais (ui.tsx)
lib/
  dados.ts      todas as leituras/gravações no Supabase
  regras.ts     taxas da maquininha, cálculos e datas
  tipos.ts      tipos das tabelas
.github/workflows/manter-supabase-ativo.yml   consulta o banco a cada 2 dias (evita a pausa do plano grátis)
```

## Variáveis de ambiente (Vercel e `.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Desenvolvimento

```bash
npm install
npm run dev
```

## Observações

- Procedimentos e formas de pagamento personalizadas ficam em `consultorios.config` (jsonb).
  Na primeira abertura, o que estiver salvo no navegador (versão antiga) é levado para o banco.
- Atendimentos são carregados em páginas de 1000 (limite do Supabase).
- Comissão retroativa: Dentistas → Alterar comissão → "Também os anteriores" / "A partir de uma data".
- A versão que roda localmente com SQLite está no branch `versao-local`.
