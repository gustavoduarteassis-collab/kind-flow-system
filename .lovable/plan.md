
# Plano — Melhorias Profundas Constance Obra

**Regra absoluta:** todas as mudanças são **aditivas**. Nada existente é apagado, renomeado ou sobrescrito. Novas colunas são opcionais/nullable; novos componentes convivem com os atuais.

Executarei na ordem sugerida (5 → 3 → 4 → 1 → 2 → 7 → 6 → 8), em 8 ondas independentes, cada uma entregável e testável. Aprove uma por vez.

---

## Onda 1 — Importação Excel completa (Bloco 5)

Alimenta todas as ondas seguintes.

- Nova página `/importar-planilha` (mantém `/importar-funil` intacta) com botão **📥 Atualizar via Excel** na tela `Lojas`.
- Leitura das 4 abas: `FUNIL 2026`, `INAUGURADAS 2026`, `REFORMAS 2026`, `REPASSE-ENCERRAMENTO-TROCA 2026`.
- Parser (`src/utils/planilhaMasterImport.ts`) faz o mapeamento completo Excel → sistema (todas as colunas listadas no Bloco 5.C).
- Match por **Filial** (fallback Nome). Colunas vazias **nunca** sobrescrevem.
- Tela de prévia (diff): novas × existentes × campos alterados por loja, com checkbox por linha.
- Bolinhas coloridas convertidas para estados da matriz (verde=Concluído, amarelo=Em andamento, vermelho=Problema, vazio=Não iniciado).
- Coluna "Comentários" ao lado de cada etapa vira registro em `stage_comments` com autor "Importado via Excel".
- Coluna "Status" (texto livre) é **adicionada** em `store_updates` (nunca substitui).
- Log em `funil_import_logs` reutilizando estrutura existente.

## Onda 2 — Matriz de 4 estados (Bloco 3)

- Novo tipo `StageStatus4 = 'nao_iniciado' | 'em_andamento' | 'com_problema' | 'concluido'` em `src/data/matrizStages.ts`.
- Célula clicável cicla os 4 estados. Cores: cinza / amarelo / vermelho / verde. Legenda atualizada.
- Contador X/Y conta apenas `concluido`.
- Migração de dados: booleans atuais viram `concluido` (true) ou `nao_iniciado` (false) automaticamente na leitura — sem alterar o JSONB gravado.

## Onda 3 — Comentários por etapa (Bloco 4)

- Nova tabela `stage_comments` (store_id, stage_key, texto, autor, created_at) com RLS por `is_authorized_team`.
- Ícone 💬 na célula da matriz com contador quando >0 comentários.
- Popover ao clicar: campo texto + histórico cronológico reverso "DD/MM: [texto] — [autor]".
- Mesmos comentários exibidos na aba `Etapas` do Painel da Loja (reusa `EtapasPlanilhaLoja.tsx`).

## Onda 4 — Expansão do cadastro da loja (Bloco 1)

- Migração aditiva: novas colunas nullable em `stores` (razao_social, ie, cd_origem, tipo_localizacao, area_m2, num_pisos, horario, email_operacional, email_financeiro, telefone_franqueado, gerente_regional, analista_arquitetura, implantadora, grade_produtos, previsao_faturamento, status_faturamento).
- Alguns campos já existem (`metragem_m2`, `endereco`, `cep`, `telefone`, `email_loja`, `cnpj`, `shopping_nome`) — serão reaproveitados com aliases; nada removido.
- `DadosTab.tsx` reorganizado em 5 seções: **Identificação**, **Localização**, **Contatos**, **Equipe e Gestão**, **Comercial**. Campos antigos preservados dentro das seções.

## Onda 5 — Expansão da aba Datas (Bloco 2)

- Migração aditiva: pares `contrato_locacao_prev/real`, `chaves_prev/real`, `demolicao_prev/real` (já existe), `obra_inicio_prev/real` (já existe), `moveis_prev/real` (já existe), `faturamento_mercadoria_prev/real`, `produtos_chegada_prev/real`, `inauguracao_real` (já existe), `visita_tecnica_realizada`.
- Componente `PrevRealField` reutilizável com badge de desvio automático (verde/vermelho + dias).
- `DatasTab.tsx` recebe as novas linhas mantendo as atuais.

## Onda 6 — Pendências pós-inauguração (Bloco 7)

- Nova tabela `pendencias_pos_inauguracao` (store_id, descricao, responsavel, prazo, status).
- Seção condicional na aba Dados/Datas quando `inaugurada = true`.
- Bloco na Home "⚠️ Pendências pós inauguração" agregando por loja.

## Onda 7 — Categoria Repasse/Encerramento/Troca (Bloco 6)

- Novo valor de `categoria` sem migrar dados existentes; enum já é texto livre em `status_geral`.
- Aba **Repasse** adicionada em `LojasUnificadas.tsx` ao lado de `Inauguradas`.
- Status específicos: "Repasse em andamento", "Encerrada", "Troca concluída".
- Reutiliza o mesmo cadastro/painel das demais.

## Onda 8 — Melhorias de UX/Liderança (Bloco 8)

- **8.1** Filtro por analista na `MatrizEtapas.tsx` (dropdown reutilizando `analista_obra`).
- **8.2** Coluna "Dias para inauguração" após o nome, cor automática (verde >30, amarelo 15–30, vermelho <15).
- **8.3** Campo `status_geral_manual` (`no_prazo | atencao | critico | paralisado`) exibido como badge colorido em Matriz, Funil (`LojasUnificadas`), AGM e Home. **Não** substitui o `status_geral` atual — é um campo paralelo.
- **8.4** Botão "📤 Exportar para Excel" em `Lojas` gerando `.xlsx` no formato da planilha da diretora via `exceljs` (util `exportPlanilhaMaster.ts`).

---

## Detalhes Técnicos

**Banco (migrações aditivas, todas nullable):**
- `stores`: +16 colunas do Bloco 1, +8 pares prev/real do Bloco 2, +`status_geral_manual`.
- `stage_comments`: nova tabela com RLS + GRANT + índices por `(store_id, stage_key)`.
- `pendencias_pos_inauguracao`: nova tabela com RLS + GRANT + soft delete.
- Reutiliza `store_updates`, `funil_import_logs`, `stage_status` JSONB existentes.

**Frontend:**
- Novos: `src/utils/planilhaMasterImport.ts`, `src/utils/exportPlanilhaMaster.ts`, `src/components/store/PrevRealField.tsx`, `src/components/store/PendenciasPosInauguracao.tsx`, `src/components/matriz/StageCommentPopover.tsx`, `src/pages/AtualizarPlanilha.tsx`.
- Editados aditivamente: `DadosTab.tsx`, `DatasTab.tsx`, `MatrizEtapas.tsx`, `EtapasPlanilhaLoja.tsx`, `LojasUnificadas.tsx`, `Index.tsx`, `matrizStages.ts`.

**Segurança:**
- Toda tabela nova com RLS + GRANT + policies via `is_authorized_team`.
- Import Excel valida tamanho/tipo no cliente antes de processar.

---

**Como quer prosseguir?**  
Confirmo com "**pode seguir Onda 1**" (ou a que preferir) e sigo entregando uma por vez.
