
# Painel "Hoje" — Plano de Componentes

## Rota
- `/` → nova `HojePainel` (padrão)
- `/painel/detalhado` → visão antiga (Resumo + Alertas + Mural em 3 abas), acessível via botão "Ver detalhado" no topo do Hoje
- `/painel` também redireciona para `/`

## Arquivos a criar

```
src/
├─ pages/
│  ├─ Index.tsx                  ← passa a renderizar <HojePainel />
│  └─ PainelDetalhado.tsx        ← NOVO — recebe o JSX das 3 abas atuais (extraído de Index.tsx sem alteração de lógica)
├─ components/hoje/
│  ├─ HojePainel.tsx             ← NOVO — container + link "Ver detalhado"
│  ├─ AnalistaColuna.tsx         ← NOVO — grupo por analista (header com nome + contagem)
│  └─ LojaPendenteCard.tsx       ← NOVO — card individual (loja, pendência, dias, botão Cobrar)
└─ hooks/
   └─ useLojasPendentesHoje.ts   ← NOVO — query única + agrupamento
```

## Lógica do hook `useLojasPendentesHoje`

Uma query só, sem alterar tabelas nem inserir dados:

```ts
supabase.from("stores")
  .select("id, nome, franqueado, analista_obra, tipo_registro,
           ultima_atualizacao, ultima_atualizacao_at,
           inauguracao, inauguracao_real,
           demolicao_prev, demolicao_real,
           obra_inicio_prev, obra_inicio_real,
           moveis_prev, moveis_real,
           produtos_prev, produtos_real,
           checklist")
  .in("tipo_registro", ["nova","reforma","repasse","troca"])
  .is("deleted_at", null);
```

Para cada loja:
1. Calcula progresso do checklist (mesma função de `Index.tsx`).
2. Chama `computeCriticality()` de `src/utils/storeCriticality.ts` (já existe — reaproveita a mesma regra de Obras Críticas + Mural).
3. Se `reasons.length === 0` → descarta.
4. `pendenciaCurta` = `reasons[0].label` (a mais crítica). `diasParado` = `daysSince(ultima_atualizacao_at)` (fallback: sem update → 999).
5. `analistaKey` = `analista_obra` normalizado, ou `"Gustavo"` se vazio.
6. Agrupa por `analistaKey`, ordena cada grupo por `diasParado desc`.
7. Ordem das colunas fixa: **Deise, Thainara, Gizelia, Gustavo**.

Retorna:
```ts
{ grupos: Record<Analista, LojaPendente[]>, totalLojas: number, loading }
```

## Componentes

### `HojePainel.tsx`
Layout: header com título + total de lojas + botão `Ver detalhado` (link para `/painel/detalhado`). Grid responsivo 1/2/4 colunas — uma coluna por analista.

### `AnalistaColuna.tsx`
Header sticky com nome do analista, badge de contagem, e cor da marca. Lista vertical de `LojaPendenteCard`.

### `LojaPendenteCard.tsx`
```
┌──────────────────────────────────┐
│ Shopping Interlagos              │
│ 🔴 Início de obra atrasado 12d   │
│ Parado há 23d                    │
│               [ Cobrar ]         │
└──────────────────────────────────┘
```
Botão **Cobrar** → `navigator.clipboard.writeText()` com:
```
Oi {franqueado}: {pendenciaCurta} está parada há {diasParado} dias.
Pode me atualizar?
```
Se `franqueado` vazio → "Oi". Toast de confirmação.

## Estados de UI
- Loading: skeletons por coluna.
- Grupo vazio: card "Sem pendências ✅".
- Nenhuma pendência global: card centralizado grande.

## O que NÃO muda
- Banco: nenhuma migração, nenhum insert/update.
- Componentes antigos (`MuralObras`, blocos de Alertas Críticos, Resumo) permanecem intactos — apenas movem-se para `PainelDetalhado.tsx`.
- Rotas atuais continuam válidas via redirect.

## Relatório final
Ao final imprimo: rota, árvore de arquivos criados, e contagens reais por analista (executando `psql` read-only sobre `stores` para prever o que a UI vai mostrar).
