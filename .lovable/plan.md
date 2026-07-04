# Plano de correções — Constance Obra

Vou trabalhar em 3 ondas. Cada onda entrega um lote testável antes de seguir.

## Onda 1 — Bugs de dados e roteamento (prioridade máxima)

### 1. Sincronização Painel × Funil (fonte única de verdade)
- **Diagnóstico:** hoje `stores.inauguracao_real` (Painel) e `pipeline_stores.data_inauguracao` (Funil) são salvos separadamente. Alguns campos têm 2 valores concatenados ("15/04/2026 08/04/2026") — provavelmente vindos de importação da planilha sem sanitização.
- **Correção:**
  - Criar **trigger no banco** em `pipeline_stores` e `stores` que, ao gravar `previsao_inauguracao`/`data_inauguracao`/`inauguracao`/`inauguracao_real`, valida formato (regex DD/MM/AAAA ou ISO) e rejeita valores com espaço/duplicação.
  - Criar trigger de sincronização bidirecional: quando `pipeline_stores.data_inauguracao` muda, atualizar `stores.inauguracao_real` da loja correspondente (match por `pipeline_store_id` se existir, senão por filial+nome). Mesma coisa para `previsao_inauguracao`.
  - **Migração de limpeza única:** normalizar os 33 valores atualmente divergentes escolhendo o mais recente (`updated_at`) e regravando ambos os lados.
  - Manter `/validacao-datas` como monitor pós-fix (deve zerar).
- **Nota:** não vou remover uma das tabelas — o desacoplamento existe por razão histórica. A trigger garante consistência sem quebrar código existente.

### 2. Menu "Matriz de Etapas" roteia errado
- Em `App.tsx`, `/matriz-etapas` redireciona para `/?tab=matriz`, mas `Index.tsx` não trata `tab=matriz`. Vou adicionar handling desse tab em `Index.tsx` renderizando `<MatrizAnalistas />` (ou o componente correto de matriz) quando `tab=matriz`.

### 3. Banner × aba "Pend. Inauguradas" divergentes
- O banner conta lojas inauguradas com **planilha de custo ausente** ou **contrato ausente** (via `useInauguracoesPendentes`).
- A aba conta lojas inauguradas com registros na tabela `pendencias`.
- **São regras diferentes.** Vou renomear o banner para "**Lojas inauguradas com custo/contrato pendente**" e a aba para "**Pendências registradas em lojas inauguradas**", deixando claro que são medidas distintas. Isso é honesto e evita esconder informação. Alternativa (mais invasiva): unificar tudo em `pendencias` e criar 2 pendências automáticas por loja inaugurada sem custo/contrato — vou pedir sua escolha se preferir.

### 4. "Itens Excluídos" quebrado (colunas inexistentes)
- Em `list_soft_deleted` (SECURITY DEFINER), as queries usam `s.name` e `p.nome_loja` que não existem — o correto é `s.nome` e `p.local`/`p.filial`. Vou corrigir a função e envolver o hook em `try/catch` para mostrar mensagem amigável ("Erro ao carregar. Tente novamente.") em vez de expor SQL.

### 5. Contagem "Inauguradas (25)" vs "(23)"
- A aba superior conta por `stores.inauguracao_real not null`, a sub-aba do Funil conta por `pipeline_stores.status = 'Inaugurada'`. Vou unificar usando a mesma fonte (stores, após aplicar o fix 1) e re-exibir o mesmo número.

### 6. Notificações duplicadas
- Adicionar deduplicação no `useNotifications`: agrupar por `(type, title, message, related_id)` mantendo a mais recente. E criar índice único parcial no banco para prevenir novas duplicatas (`type, related_id, title, user_id`) onde `read_at IS NULL`.

### 7. Item "Performance" some do menu
- Em `AppSidebar.tsx` provavelmente há renderização condicional baseada em role/permissão que resolve de forma assíncrona. Vou verificar e ou remover o item (rota já redireciona para `/`) ou fixá-lo até a checagem terminar. Confirmação: você quer o item Performance ativo ou pode remover de vez, já que a rota já está desativada?

## Onda 2 — UX (após bugs)

### 8. Skeletons de carregamento
Adicionar `<Skeleton />` nos 3 pontos: Painel Resumo, Mural de Obras, Pend. Inauguradas. Enquanto `loading=true`, renderizar skeleton em vez do estado vazio.

### 9. Saudação inconsistente
Trocar o texto do cabeçalho para usar `useUserDisplayName()` (já existe) e mostrar `—` durante o carregamento, nunca o e-mail bruto.

### 10. "Alguém criou tarefa…" → nome real
A função `current_actor_name()` já busca de `team_members`. O problema é que as linhas antigas do `activity_log` foram gravadas com `actor_name=NULL`. Vou:
- Ajustar `log_task_activity()` para nunca gravar "Alguém" — usar fallback `team_members.name` por `user_id`.
- Migração única para preencher `actor_name` histórico onde possível (via `team_members.user_id`).

### 11. Card "Investido" cortado
Formatar valores >= 1M como "R$ 27,4 mi" / >= 1k como "R$ 27,4k" no card, com `<Tooltip>` mostrando o valor exato.

## Ordem de execução

1. Migração DB (fixes 1, 4, 6, 10) — vou submeter para sua aprovação.
2. Fixes de front dos bugs 2, 3, 5, 7.
3. Melhorias 8, 9, 11.

## Perguntas antes de começar

- **Fix 3:** prefere unificar tudo em `pendencias` (mais invasivo) ou apenas renomear rótulos (rápido e honesto)?
- **Fix 7:** remover "Performance" do menu de vez, ou mantê-lo estável?
- **Fix 1:** ok criar triggers de sync bidirecional entre `stores` e `pipeline_stores`? Isso muda comportamento silenciosamente para quem edita o Funil.

Aguardo aprovação (ou ajustes) para começar pela Onda 1.
