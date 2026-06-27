# Plano — Módulo "Equipe & Tarefas" (/equipe)

Trabalho grande (6 blocos). Vou entregar em 4 ondas, parando entre elas para você validar. Nada será deletado do banco — apenas soft delete e arquivamento.

## Ondas de entrega

### Onda 1 — Fundação de dados (migração única)
- Nova tabela `activity_log` (append-only, RLS, sem DELETE/UPDATE permitido).
- Nova tabela `task_updates` (histórico de comentários por tarefa, append-only).
- Tabela `tasks`: adicionar `priority` (baixa/media/alta/urgente), `start_date`, `task_type` (geral/loja/habito), `store_id`, `recurrence` (nao/diaria/semanal/mensal), `subtasks` (jsonb array), `archived_at`.
- Tabela `habit_completions`: adicionar `note` (text, opcional) — já tem o resto.
- Triggers automáticos: registrar em `activity_log` quando tarefa for criada/concluída, hábito for marcado, e status de loja mudar.
- GRANTs + RLS para todas (autorizados leem tudo; membros leem o que lhes pertence).

### Onda 2 — Visão Geral + Atividades + alertas (Blocos 1, 4, 6)
- Nova aba **"Visão Geral"** como padrão em `/equipe`:
  - Cards horizontais por membro (avatar com cor única, tarefas ativas/atrasadas, hábitos hoje X/Y, % médio de lojas, status semafórico).
  - Painel "O que está acontecendo hoje" agrupado por membro (atrasadas + vencendo hoje, badge piscante > 3 dias).
  - Feed das últimas 20 atividades.
- Nova aba **"Atividades"** ao final, com filtros (membro, tipo, período, busca) e scroll infinito de 20 em 20.
- Alertas visuais no card de cada membro na aba Equipe: banner vermelho de atrasadas, sino amarelo se sem hábito hoje, badge verde "Em dia".

### Onda 3 — Tarefas reformuladas (Bloco 2 + Bloco 5)
- Modal "Nova Tarefa" com todos os campos novos (prioridade, datas, tipo, loja, recorrência, até 5 subtarefas, observações).
- Toggle Tabela ↔ Kanban; Kanban com 4 colunas (Pendente / Em Andamento / Concluída / Atrasada) e drag-and-drop atualizando status no banco.
- Tabela: novas colunas Tipo e Progresso (subtarefas).
- Drawer lateral de detalhe: campos completos, checklist de subtarefas interativo, histórico de `task_updates`, campo de comentário (INSERT-only), botão "Concluir" com modal "O que foi feito?", botão "Arquivar" (nunca delete), confirmação dupla em qualquer destrutivo.
- Botão "+ Nova tarefa" no card de membro pré-preenchendo o responsável.

### Onda 4 — Hábitos aprimorados (Bloco 3)
- Clique no dia abre mini modal de confirmação com campo opcional de nota → grava em `habit_completions.note` e em `activity_log`.
- Linha de resumo mensal por hábito com barra colorida (verde ≥80, amarelo 50-79, vermelho <50).
- Botão "Adicionar hábito" dentro do card de cada membro (além do global).

## Regras aplicadas em todas as ondas
- Soft delete obrigatório (`archived_at` / `deleted_at`).
- Modal de confirmação em qualquer exclusão/arquivamento.
- Cada ação relevante gera linha em `activity_log` (via trigger no banco quando possível, via insert no client quando não).
- Notificação interna automática ao atribuir tarefa (já existe trigger `notify_task_assigned` — reaproveitar).
- Abas existentes preservadas; ordem final: **Visão Geral · Tarefas · Hábitos · Programação · Calendário · Equipe · Atividades**.

## Detalhes técnicos
- Stack: React + Tailwind + shadcn já no projeto; Kanban com `@dnd-kit` (leve, sem dependências pesadas).
- Roteamento de aba via query param `?tab=` já existe — preservado.
- Realtime no `activity_log` para o feed atualizar sozinho.
- Subtarefas como `jsonb` (`[{id, text, done}]`) — sem nova tabela, mais simples.
- Cor única por membro: hash do `id` → paleta fixa (10 cores derivadas dos tokens do design system).

Posso começar pela **Onda 1** (migração de banco) assim que você aprovar.