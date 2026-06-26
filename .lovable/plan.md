
## Escopo

Aplicar TODAS as correções pedidas em uma sequência de fases para evitar regressão. Total estimado: ~18 arquivos editados, 1 componente novo, 1 hook novo.

---

## Fase 1 — Críticos (bloqueia uso diário)

### 1.1 Bug do "espaço em branco" no scroll
Causa provável: combinação de `min-h-screen` em páginas internas (já dentro do `<main>` do `AppLayout`) + `SidebarProvider` que usa flex. Isso cria altura inflada e gaps quando a viewport rola.

**Ações:**
- `AppLayout.tsx`: trocar `<main className="flex-1 min-w-0">` por `<main className="flex-1 min-w-0 overflow-x-hidden">` e garantir que o wrapper raiz não force `min-h-screen` duplicado.
- Em `Pipeline.tsx`, `Lojas.tsx`, `StoreDetail.tsx`, `Index.tsx`, `CustosGeral.tsx`, `AGM.tsx`, `Equipe.tsx`: remover `min-h-screen` dos divs internos (o `AppLayout` já garante altura). Trocar por `min-h-full` quando necessário.
- Kanban do Funil: ajustar coluna do Kanban para usar altura natural (sem `h-screen`) e wrapper `overflow-x-auto`.

### 1.2 Componente reutilizável `ConfirmDeleteModal`
Criar `src/components/ConfirmDeleteModal.tsx` baseado em `AlertDialog` da shadcn. Props: `open`, `onOpenChange`, `itemName`, `description?`, `onConfirm`. Botões "Cancelar" e "Excluir" (variant destructive).

**Aplicar nos pontos:**
- `Pipeline.tsx` — botão lixeira do card.
- `Equipe.tsx` — exclusão de membros / tarefas / hábitos.
- `Acessos.tsx` — substituir `confirm()` nativo.
- Tarefas dentro de `Equipe.tsx` — botão lixeira da linha.

### 1.3 Botão "Duplicatas" do Funil
Já existe modal de preview. Adicionar checkbox por item antes de aplicar a remoção (default desmarcado) + botão "Remover selecionados".

---

## Fase 2 — Importante (UX visível)

### 2.1 Breadcrumb com nome da loja
- `AppLayout.tsx` → `Breadcrumbs`: detectar padrão `/loja/:id` e buscar o nome via `useStores()` (ou cache do `pipeline_stores`). Mostrar nome em vez do UUID. Atualizar `labelMap` para `lojas → "Lojas"` no segundo nível.

### 2.2 Tooltips no Funil
- `Pipeline.tsx`: envolver os 5 ícones do card em `<Tooltip>` (já temos o componente). Textos: Editar / Ver detalhes / Marcar como inaugurada / Fixar / Excluir.

### 2.3 Lojas — cards mais legíveis
- `Lojas.tsx`: substituir mini-dots por barra tricolor de 8px (verde feitos / vermelho atrasados / cinza restante), itens com bolinha colorida à esquerda. Limitar a 6 itens + "Ver mais (N)".

### 2.4 Detalhe da loja
- `StoreDetail.tsx` / `CronogramaObra.tsx`: substituir `<input type="date">` por shadcn DatePicker (Popover + Calendar) onde aparecem datas.
- Realçar TabsTrigger ativa (fundo marrom/`bg-primary` + `text-primary-foreground`).
- Wrapper das abas com `overflow-x-auto` + setas ‹ › nas bordas quando overflowing.

---

## Fase 3 — Melhorias

### 3.1 Equipe — carga por analista
- `Equipe.tsx` aba Equipe: para cada membro, calcular a partir do estado já carregado (`stores`, `tasks`): nº lojas ativas (where `responsavel`/analista == membro), nº tarefas pendentes, progresso médio. Renderizar como mini-stats + barra.

### 3.2 Tarefas vencidas
- `Equipe.tsx` aba Tarefas: helper `isOverdue(prazo, status)`. Aplicar `text-destructive font-bold`, ícone `AlertTriangle`, badge "Pendente" com `border-destructive`.

### 3.3 AGM — filtro de mês corrigido
- `AGM.tsx`: revisar filtro de `data_inauguracao` para usar range `[firstOfMonth, lastOfMonth]` em vez de string match. Adicionar botões ← → ao lado do `<input type="month">` (avançar/retroceder 1 mês). Garantir que "Custo/m² médio" é calculado a partir das lojas inauguradas do mês.

### 3.4 Sidebar — "Constance Obra"
- `AppSidebar.tsx`: aumentar largura mínima da área do logo ou colocar "Constance Obra" em uma única linha (`whitespace-nowrap text-[11px]`).

### 3.5 Home — Resumo das Lojas
- `Index.tsx`: mostrar todas as lojas ativas (não filtrar por analista atribuído) OU exibir contagem clara "Mostrando X de Y". Padronizar "Atrasados > 0" em vermelho+negrito. Tornar cabeçalhos da tabela clicáveis para ordenar (estado local de sort).

### 3.6 Consistência visual + mobile
- `AppLayout.tsx` header: adicionar `border-b-2 border-primary/40` (faixa marrom) ou um `bg-gradient` sutil para conectar à identidade.
- Confirmar que `SidebarProvider` com `collapsible="icon"` colapsa via `SidebarTrigger`. Em mobile (`<768px`), usar `collapsible="offcanvas"` adaptado via `useIsMobile`.

---

## Detalhes técnicos

**Arquivos editados:**
- `src/components/layout/AppLayout.tsx`, `src/components/layout/AppSidebar.tsx`
- `src/pages/Pipeline.tsx`, `src/pages/Lojas.tsx`, `src/pages/StoreDetail.tsx`, `src/pages/Index.tsx`, `src/pages/AGM.tsx`, `src/pages/Equipe.tsx`, `src/pages/Acessos.tsx`, `src/pages/CustosGeral.tsx`
- `src/components/CronogramaObra.tsx`

**Arquivos novos:**
- `src/components/ConfirmDeleteModal.tsx`
- `src/hooks/useStoreNameById.ts` (para breadcrumb)

**Sem mudanças de schema/RLS.** Sem novas dependências.

---

## Ordem de execução

1. Fase 1 inteira (críticos) em 1 batch.
2. Validação pelo usuário (rolagem + exclusões).
3. Fase 2 + Fase 3 em batches paralelos.
4. Typecheck final.

Confirma para eu começar pela Fase 1?
