
# Plano — Melhorias Profundas Constance Obra

Executarei na ordem de prioridade que você definiu (1 → 3 → 5 → 6 → 8 → 2 → 4 → 7 → 9 → 10), em **4 ondas** com aprovação entre elas. Nenhum campo existente será alterado ou apagado — todas as mudanças são aditivas.

---

## Onda A — Fundação de Dados (itens 1, 3, 5)

**1. Última Atualização Unificada**
- Nova tabela `store_updates` (id, store_id, texto, autor_nome, autor_user_id, created_at, deleted_at). RLS: leitura para time autorizado, escrita autenticada.
- View / campo derivado `stores.ultima_atualizacao` (última linha por `created_at`).
- Migração única (script SQL): para cada loja cujo `pipeline_stores.status_geral` contém texto livre, insere 1 registro em `store_updates` com autor "Histórico anterior" e data original — sem tocar no valor atual.
- UI: componente `<HistoricoAtualizacoes storeId>` dentro da aba **Diário de Obra** com feed cronológico + input "Nova atualização".
- Funil (Lojas Unificadas) e AGM passam a ler `ultima_atualizacao` (item 9 já preparado).

**3. Aba Datas expandida**
- Migration aditiva em `stores`: `data_contrato_locacao`, `data_liberacao_chaves`, `demolicao_prev`, `demolicao_real`, `obra_inicio_prev`, `obra_inicio_real`, `moveis_prev`, `moveis_real`, `produtos_prev`, `produtos_real`, `inauguracao_real`, `visita_tecnica_real` (todas `date NULL`).
- UI: `DatasTab.tsx` refeita com grid de pares Prev/Real + badge de desvio (`verde` adiantado, `vermelho` atrasado, calculado em dias).

**5. Tarefas da Loja**
- Nova aba **Tarefas** em `StoreDetail` reutilizando `tasks` existente (`related_store_id`).
- Lista + botão "+ Nova Tarefa" (dialog com Título, Responsável, Prazo, Prioridade, Status).
- Card de loja no Resumo/Painel exibe contagem de tarefas abertas e atrasadas.

---

## Onda B — Visualização (itens 6, 8)

**6. Mural de Obras (Painel > Resumo)**
- Nova seção `<MuralObras />` abaixo dos indicadores.
- Filtra lojas ativas (fase ≠ Inaugurada e com `inicio_obra` preenchido).
- Card: nome, % checklist, dias p/ inauguração, última atualização, fase (badge colorido), miniatura opcional da última foto do Diário.
- Ordenação por menor `dias_para_inauguracao`.

**8. Alertas na Matriz de Etapas**
- Coluna fixa **"Dias p/ Inauguração"** após o nome da loja.
- Cor de fundo da linha: `bg-red-50` se `<15d` e checklist `<70%`; `bg-yellow-50` se `<30d` e `<50%`.
- Filtro rápido **"Apenas críticas"** no header (soma aos filtros já existentes).
- Tooltip nas células de fase (auto) listando lojas concluídas/pendentes daquela coluna.

---

## Onda C — Cadastro e Etapas (itens 2, 4)

**2. Aba Dados expandida**
- Migration em `stores`: `cidade`, `estado_uf`, `endereco_completo`, `area_m2`, `tipo_localizacao`, `email_operacional`, `email_financeiro`, `telefone_franqueado`, `codigo_filial`, `responsavel_tecnico`, `observacao_geral`.
- UI: `DadosTab.tsx` seções agrupadas (Identificação, Localização, Contatos, Área/Responsável, Observações). Todos os campos existentes permanecem.

**4. Aba Etapas dentro da Loja**
- Reescrever `EtapasTab.tsx` para renderizar as 36 etapas da planilha (mesmos `PLANILHA_STAGES` da Matriz), filtradas para a loja atual.
- Toggle direto (com mesma regra `deriveStagesFromChecklist` e trava de itens derivados).
- Mantém timeline das 5 fases automáticas no topo como resumo.

---

## Onda D — Performance, Unificação e Equipe (itens 7, 9, 10)

**7. Métricas de Performance por Membro**
- Adicionar colunas: Lojas sob responsabilidade, Inauguradas no prazo (n e %), Custo/m² médio vs. meta, % médio checklist, Visitas técnicas no mês. Colunas atuais preservadas.

**9. Status AGM read-only**
- Campo "Status" no AGM torna-se leitura, exibindo `stores.ultima_atualizacao`. "5 Porquês" permanece editável.
- Se um AGM já tem texto próprio, migro-o para `store_updates` antes de tornar read-only.

**10. Sincronização Equipe ↔ Analistas**
- Job SQL: para cada `pipeline_stores.analista_obra` não vazio, garantir `team_members` com cargo "Analista de Obra" (upsert por nome normalizado, não duplica os já existentes: Gustavo, Deise, Thainara, Gizelia).
- Perfil do membro passa a mostrar: avatar, cargo, lista clicável de lojas sob responsabilidade, contagem de tarefas abertas/concluídas, hábitos configurados.

---

## Detalhes técnicos

- **Backend**: 4 migrations Supabase (Onda A: `store_updates` + colunas datas; Onda C: colunas dados; Onda D: nenhuma nova tabela, só sincronização via `supabase--insert`). Todas com `GRANT` + RLS (`is_authorized_team` para escrita, leitura autenticada).
- **Migração de dados legados**: 100% via `supabase--insert` (não `UPDATE` destrutivo). Nenhum campo é sobrescrito; apenas novos registros/colunas são criados.
- **Frontend**: novos componentes isolados (`HistoricoAtualizacoes`, `MuralObras`, `TarefasTab`, `DatePairField`, `CriticalRowHighlight`), edits pontuais em `StoreDetail`, `MatrizEtapas`, `Index`, `Performance`, `AGM`, `LojasUnificadas`.
- **Sem quebras de rota**: todas URLs atuais mantidas.

## Gate entre ondas

Ao final de cada onda paro e reporto o que ficou pronto para você validar antes de seguir. Onda A é a base (itens 1, 3, 5 dependem uns dos outros para o Mural e o AGM funcionarem).

## Riscos identificados

- **Duplicação de `store_updates`** na migração inicial: mitigo com `WHERE NOT EXISTS` na inserção histórica.
- **Analistas com grafia divergente** (ex.: "Gizelia" vs "Gizélia") na sincronização Equipe: normalizo por `lower(unaccent(trim(nome)))` antes do upsert.
- **Regra da célula derivada** na aba Etapas da loja: reutilizarei exatamente a lógica atual da Matriz para não abrir edição de campo derivado.

---

Posso iniciar a **Onda A** (Última Atualização + Datas expandidas + Tarefas da loja)?
