## Plano — Painel unificado + Matriz interativa + Import Funil "planilha vence"

### 1. Painel com abas "Resumo | Matriz"
Em `src/pages/Index.tsx`, envolver o conteúdo atual em uma aba **Resumo** e adicionar a aba **Matriz** que renderiza o `MatrizEtapas` já existente (import como componente, sem duplicar). Persistir a aba escolhida via `?tab=` na URL + `sessionStorage`.

Rota `/matriz-etapas` continua funcionando (redireciona pra `/?tab=matriz`) — não quebra links salvos.

### 2. Matriz interativa — clique curto edita, clique no nome abre loja

Em `src/pages/MatrizEtapas.tsx`:

- **Coluna "Loja"**: já é `Link` — manter, leva pra `/loja/:id` (aba Dados).
- **Células de etapa**: substituir o toggle atual por botão que abre um **Drawer lateral** (`@/components/ui/sheet`) com:
  - Título da etapa + tooltip explicativo
  - Editor apropriado:
    - Etapas derivadas do Checklist (`Itens Pendentes`, `Loja Liberada`) → read-only, com botão "Abrir Checklist Final" que leva a `/loja/:id?tab=checklist-final`
    - Etapas manuais (Docs, Sankya, COF, USE, etc.) → 3 status (Pendente / Em andamento / Concluído) + campo de observação livre. Salva em `stores.stage_status` (JSONB já existente).
    - Etapas vindas do Funil (Analista, Construtor, Início Obra, Previsão Inauguração) → campos correspondentes de `pipeline_stores`, com botão "Abrir no Funil" secundário.
  - Ao salvar, célula atualiza otimisticamente e o drawer fecha.
- **Célula clicável tem 2 gestos**:
  - Clique curto → drawer
  - Ícone de "abrir" (ExternalLink) no canto da célula → navega direto pra `/loja/:id?tab=etapas&stage=<id>` (scroll até o campo).

Nenhum dado existente é apagado — todos os toggles atuais viram edições ricas, mas gravam nos mesmos campos.

### 3. Importação do Funil — planilha vence

Reforçar `src/pages/ImportFunil.tsx` (que já existe):

- Manter o parse XLSX atual.
- **Regra de merge**: quando `filial` bate com registro existente, `UPDATE` sobrescreve todos os campos vindos da planilha (analista, construtor, datas, status_geral, previsão, etc.). Campos que **não estão na planilha** (`stage_status`, notas internas, tarefas auto-geradas) ficam intocados.
- **Preview antes do commit**: tabela mostrando `N novos + M atualizados`, com resumo "vai sobrescrever esses campos:" — usuário confirma uma vez, sem diff linha-a-linha (evita fricção).
- **Log em `funil_import_logs`** (tabela já existe): registra qual arquivo, quantas linhas, quem importou, quantos updates. Serve pra rollback futuro se necessário.
- Após importar, dispara refresh dos hooks `useStores` e da Matriz.

### 4. Trilha de segurança (sem tocar em dados)

- Migração adiciona `stage_status_updated_at` e `stage_status_updated_by` (nullable) em `stores` — só pra rastrear quem mexeu no drawer da matriz. Nenhum backfill.
- Nenhum `DROP`, nenhum `DELETE`, nenhum default destrutivo.
- RLS já existente em `stores` e `pipeline_stores` continua valendo.

### Detalhes técnicos

- **Drawer**: `<Sheet>` do shadcn, side="right", `w-[420px]`.
- **Estado otimista na matriz**: `useState` local + `queryClient.invalidateQueries` só se erro.
- **Deep-link `?stage=`**: em `StoreDetail.tsx` aba Etapas, `useEffect` faz `scrollIntoView` no `data-stage-id={id}`.
- **Import overwrite**: `UPSERT` via `.upsert(..., { onConflict: 'filial' })` com todos os campos da planilha; campos ausentes na planilha ficam de fora do payload (Postgres preserva).
- **Nenhum arquivo removido** — `MatrizEtapas.tsx` continua respondendo em `/matriz-etapas` além de virar aba do Painel.

### Ordem de execução
1. Migração leve (2 colunas de auditoria em `stores`).
2. Painel com abas (Index.tsx + redirect da rota).
3. Drawer interativo na Matriz (novo componente `MatrizCellDrawer.tsx`).
4. Deep-link `?stage=` em StoreDetail.
5. Reforço do ImportFunil (preview + overwrite explícito + log).

Posso começar?
