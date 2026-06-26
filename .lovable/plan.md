## Plano de Melhorias — Constance Obra

Escopo grande (7 módulos + globais). Proponho executar em **fases sequenciais**, cada uma entregue e validada antes de seguir. Você aprova fase a fase.

---

### Fase 0 — Fundação Global (base para todas as outras)
- Criar **AppLayout** com sidebar fixa (shadcn `Sidebar`) contendo: Home, Funil, Lojas, Custos Geral, AGM, Equipe, Diversos, Próprias, Acessos.
- Cabeçalho global com **nome completo do usuário** (busca em `team_members` pelo email; fallback no email).
- **Breadcrumb** automático baseado na rota.
- Hook `usePageTitle` para atualizar `<title>` por página.
- Padronizar paleta de status (verde/amarelo/vermelho/cinza) como tokens semânticos em `index.css` (`--status-done`, `--status-progress`, `--status-late`, `--status-idle`).
- Decisão de tema: **manter marrom/escuro em todo o sistema** (Core memory já indica identidade Marrom Café). Aplicar nas subpáginas.
- Skeletons globais (`<ListSkeleton />`, `<CardSkeleton />`).
- Corrigir rotas: `/custos` → redirect `/custos-geral`; `/lojas/:id` aceitar tanto id quanto slug (alias para `/loja/:id`).

### Fase 1 — Painel Executivo (`/`)
- Grade de cards `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.
- KPIs no topo: Lojas ativas, Inauguradas no mês, Tarefas urgentes, Progresso geral (número + cor dinâmica).
- Card destacado para "Progresso Geral".
- Mover seção "Acesso de Franqueados" para nova rota `/acessos`.

### Fase 2 — Funil de Lojas (`/pipeline`)
- Filtros pill (Analista, Status, Tipo, Mês inauguração) com contadores.
- Barra de busca (nome/cidade/franqueado).
- Barra de progresso tricolor (cinza/laranja/verde).
- Ícone ⚠️ para projeto atrasado/sem prazo.
- Notas com quebra de linha + datas em bold (regex `DD/MM:`).
- Modal de pré-visualização antes de "Remover Duplicatas".
- Toggle Lista/Kanban (5 colunas por fase).
- Header com resumo "X Prontas | X Em Andamento | X Atrasadas".

### Fase 3 — Lojas (`/lojas`)
- **Bug "Invalid Date"**: parser tolerante (DD/MM/YYYY, ISO, timestamp).
- Filtros: Analista, faixa de progresso, lojas com atrasados.
- Barra de progresso segmentada (verde/vermelho/cinza) com tooltip.
- Legenda global ✓ / ! / ○.
- Paginação client-side (10/página).
- Corrigir rota `/loja/serrinha-542` (resolver por slug filial-nome).

### Fase 4 — Custos Geral (`/custos-geral`)
- Aba ativa com underline + fundo destacado.
- Tooltips interativos nos gráficos (Recharts `<Tooltip>`).
- Grid `md:grid-cols-3` nos cards de resumo.
- Botões "Exportar PDF/Excel" no Dashboard.
- Seletor de ano como segmented control.
- Gráfico de linha: evolução custo/m² por mês.

### Fase 5 — AGM (`/agm`)
- Debug do filtro de mês — garantir que `mesRef` (formato `YYYY-MM`) bate com `created_at` das fontes.
- Navegação ← / → ao lado do seletor.
- Badges com contadores nas abas.
- Empty state amigável quando não há dados.

### Fase 6 — Equipe (`/equipe`)
- Remover destaque permanente "Férias Gustavo" (condicional por período).
- Avatares com iniciais coloridas nos filtros.
- Tarefas vencidas em vermelho + ⚠️.
- Card por analista (lojas ativas, tarefas pendentes, progresso médio).
- Tarefas concluídas com `line-through`.

### Fase 7 — Polish & QA
- Verificar overflow-x em todas as tabelas.
- Validar dark/marrom consistente.
- Testar todas as rotas/redirects.
- Rodar checagem de segurança.

---

### Notas técnicas
- Sidebar via `@/components/ui/sidebar` (shadcn) com `collapsible="icon"`.
- Sem nova migração de banco prevista (apenas leitura/UX).
- Reaproveitar `useStores`, filtros já existentes em `inauguradaFilter.ts`.
- Skeleton via `@/components/ui/skeleton`.
- Kanban: implementação simples por colunas (sem drag-and-drop nesta entrega — pode vir depois se quiser).

---

**Posso começar pela Fase 0 + Fase 1 juntas** (são a fundação visível imediata) e seguir nas próximas após sua validação. Confirma esse plano e essa ordem?