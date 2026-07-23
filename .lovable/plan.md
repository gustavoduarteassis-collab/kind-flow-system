
## Objetivo
Sincronizar a tabela `stores` com a planilha **Funil_2026_R01.xlsx** classificando corretamente cada loja e ordenando a UI por data de inauguração. **Nenhum registro será excluído** — checklists, custos, cronograma, comentários e demais campos permanecem intactos.

## Fonte dos dados (planilha)
| Aba | Nº lojas | Destino |
|---|---|---|
| FUNIL 2026 | 27 | Aba **🆕 Novas Lojas** (tipo_registro = `nova`) |
| INAUGURADAS 2026 | 22 | Aba **🎉 Inauguradas** (tipo_registro = `inaugurada`) |
| REFORMAS 2026 | 32 | Aba **🔨 Reformas** (tipo_registro = `reforma`) |
| REPASSE-ENCERRAMENTO-TROCA | 10 | Página separada, fora das 3 abas |

## Estratégia de merge (aditiva)

**Chave de match:** `filial` (número). Se filial já existir em `stores` → `UPDATE`. Se não existir → `INSERT`.

Para cada loja da planilha, aplicar `UPDATE` apenas em campos identificadores/comerciais:
- `nome`, `cidade`, `uf`, `franqueado`, `telefone_franqueado`, `analista_arquitetura`,
- `tipo_localizacao` (Rua/Shopping), `porte` (Light/Tradicional),
- `previsao_inauguracao` (data prevista), `inauguracao_real` (só na aba Inauguradas),
- `tipo_registro` conforme a aba.

**Preservado (nunca sobrescrito):** `checklist`, `inauguracao_checklist`, `custos`, `cronograma`, `comentarios_obras`, `visita_tecnica`, `solicitacoes`, `action_plans`, `observacoes_gerais`, `stage_status`, todas as datas *_real já preenchidas fora da aba Inauguradas.

## Novo valor de tipo_registro: `inaugurada`
Hoje as lojas inauguradas ficam como `tipo_registro='nova'` + status no `pipeline_stores`. Vou introduzir `tipo_registro='inaugurada'` para as 22 lojas da aba Inauguradas 2026 (mais claro e independente do pipeline). O filtro visual da aba **🎉 Inauguradas** passa a considerar `tipo_registro='inaugurada'` OU o status no pipeline (compatibilidade retroativa).

## Repasse / Encerramento / Troca
As 10 lojas da 4ª aba **não vão** para Novas/Reformas/Inauguradas. Mantêm `tipo_registro='repasse' | 'troca' | 'encerramento'` e continuam acessíveis pela página dedicada. Vou garantir que `LojasUnificadas.tsx` **exclua** esses tipos das três abas principais.

## Ordenação por data de inauguração
Em `src/pages/Lojas.tsx` a ordenação padrão passa a ser por data de inauguração (`inauguracao_real` quando presente, senão `previsao_inauguracao`), do mais próximo para o mais distante. Cabeçalhos clicáveis continuam funcionando.

## Passos técnicos
1. **Migração SQL** aditiva: `UPDATE`s por filial + `INSERT`s das lojas novas (identificadas: nenhuma da planilha, todas já existem por filial — a confirmar após diff detalhado).
2. **Ajuste UI** em `LojasUnificadas.tsx` para excluir `repasse/troca/encerramento` das 3 abas e reconhecer `tipo_registro='inaugurada'`.
3. **Ajuste ordenação** em `src/pages/Lojas.tsx` (default = data inauguração asc).
4. Nenhum `DROP`, nenhum `DELETE`.

## Confirmação antes de aplicar
Antes de rodar o SQL final, vou gerar o **diff loja-a-loja** (o que muda em cada filial) para você validar. Só executo depois do seu OK.
