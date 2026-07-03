# Plano — Módulo Pendências

## 1. Schema (migration única)

### Enums novos
- `pendencia_aguardando` — `franqueado | juridico | fornecedor | shopping | interno`
- `pendencia_status` — `aberta | cobrada | resolvida`

### Tabela `public.pendencias`
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `store_id` | uuid NOT NULL | FK → `public.stores(id)` ON DELETE CASCADE |
| `descricao` | text NOT NULL | |
| `aguardando_quem` | `pendencia_aguardando` NOT NULL | |
| `responsavel_interno` | text | nome do analista (mesmo padrão de `stores.analista_obra`) |
| `prazo_cobranca` | date | opcional |
| `status` | `pendencia_status` NOT NULL default `'aberta'` | |
| `resolvido_em` | timestamptz | preenchido quando `status='resolvida'` |
| `criado_em` | timestamptz NOT NULL default `now()` | |
| `criado_por` | uuid | `auth.uid()` no insert |
| `updated_at` | timestamptz NOT NULL default `now()` | trigger `update_updated_at_column` |
| `deleted_at` | timestamptz | soft-delete (padrão do projeto) |

Índices: `store_id`, `(status, store_id)`, `responsavel_interno`.

### GRANTs
`SELECT, INSERT, UPDATE, DELETE` → `authenticated`; `ALL` → `service_role`. Sem `anon`.

### RLS
- **SELECT**: qualquer autenticado (`auth.uid() IS NOT NULL`) — leitura ampla igual às outras tabelas operacionais.
- **INSERT / UPDATE / DELETE**: só quando o usuário for
  - Gustavo (via `team_members.name = 'Gustavo'` ligado ao `auth.uid()`), **OU**
  - o próprio `responsavel_interno` (match por nome em `team_members` do `auth.uid()`).

Implementado via função `SECURITY DEFINER` `public.can_edit_pendencia(_responsavel text)` que retorna `true` se `current_actor_name() = 'Gustavo'` ou `= _responsavel`. Evita recursão.

## 2. Frontend

### Nova aba "Pendências" em `/loja/:id`
- Componente `src/components/loja/PendenciasTab.tsx`.
- Hook `src/hooks/usePendencias.ts` — `list`, `create`, `update`, `markResolved`, `markCobrada`.
- Registrar a aba em `src/pages/LojaDetalhe.tsx` (ou arquivo equivalente das tabs da loja — vou localizar no momento da execução).
- Formulário (dialog): descrição (textarea), aguardando quem (select), responsável interno (select com analistas), prazo de cobrança (date, opcional).
- Lista: cards agrupados por status (Aberta / Cobrada / Resolvida), com ações "Cobrar" (status→cobrada), "Resolver" (status→resolvida + resolvido_em=now()), "Editar", "Excluir" (soft-delete).

### Painel "Hoje" — nova fonte de verdade
Refatorar `src/hooks/useLojasPendentesHoje.ts`:
- Query nova: `pendencias` com `status IN ('aberta','cobrada')` + join client-side com `stores` (`deleted_at IS NULL`, `tipo_registro IN (...)`, `inauguracao_real IS NULL`).
- `pendenciaCurta` = `descricao` da pendência mais antiga da loja (truncada).
- `diasParado` = `now() - pendencias.criado_em` (dias corridos).
- Se uma loja tiver >1 pendência aberta, o card mostra a mais antiga + badge "+N".
- Agrupamento por `responsavel_interno` (fallback `stores.analista_obra` → `Gustavo`) mantido; ordem `Deise, Thainara, Gizelia, Gustavo` preservada.
- Seção "Em acompanhamento" continua funcionando (lojas ativas **sem** pendência aberta).

Botão "Cobrar" no card agora:
1. Copia mensagem pro clipboard (como já faz).
2. Atualiza `status → 'cobrada'` na pendência exibida.

## 3. Migração de dados
Nenhuma. Pendências antigas em texto livre continuam visíveis no histórico da loja como estão hoje. A partir da entrada em produção, só o que for cadastrado em `pendencias` alimenta o painel Hoje.

## 4. Impacto em código existente
- **Alterado**: `useLojasPendentesHoje.ts`, `LojaPendenteCard.tsx` (para chamar update de status), arquivo de tabs da loja.
- **Criado**: migration, `usePendencias.ts`, `PendenciasTab.tsx`, `PendenciaFormDialog.tsx`, `PendenciaCard.tsx`.
- **Intocado**: tabelas existentes, `computeCriticality`, seção detalhado (`/painel/detalhado`), demais páginas.

## Ordem de execução
1. Aplicar migration (aguarda aprovação).
2. Criar hook + componentes da aba Pendências.
3. Refatorar `useLojasPendentesHoje` + `LojaPendenteCard`.
4. Verificar build e rota.

Confirma pra eu disparar a migration?
