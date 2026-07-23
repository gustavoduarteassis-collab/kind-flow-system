# Unificar Obras + Lojas em uma navegação só

## Diagnóstico
Hoje o menu tem dois itens que confundem a equipe:
- **Obras** (`/obras`) — dashboard com KPIs e as abas Funil / Reformas / Repasses (painel gerencial)
- **Lojas** (`/lojas` → `LojasUnificadas`) — abas Funil / Em Obra / Inauguradas com cards clicáveis que abrem a loja com todos os checklists

Na prática são a **mesma base de dados** (stores + pipeline_stores), mostradas de dois jeitos. A equipe quer **uma lista só, clicável, que abre a loja com tudo** (checklist, custos, pendências, etc.).

## O que vou fazer

1. **Deixar `Lojas` como entrada única e principal** no sidebar (é a que já tem cards clicáveis abrindo `/loja/:id` com todas as abas).
2. **Remover "Obras" do sidebar** — sem apagar a página. `/obras` continua existindo e passa a ser um atalho interno acessível via botão "📊 Ver painel gerencial" dentro da tela de Lojas, para quem quiser os KPIs.
3. **Renomear a entrada** no sidebar de "Lojas" para **"Lojas & Obras"** para eliminar a dúvida "onde vejo obra?".
4. **Rota `/`**: hoje aponta para "Hoje". Mantenho igual. `/obras` continua respondendo (nada é excluído).

## Arquivos alterados

- `src/components/layout/AppSidebar.tsx` — remover item "Obras", renomear "Lojas" → "Lojas & Obras", garantir ícone único.
- `src/pages/LojasUnificadas.tsx` — adicionar botão discreto "📊 Painel gerencial" ao lado do "📥 Atualizar via Excel", navegando para `/obras`.

## O que NÃO muda
- Nenhuma tabela, coluna, RLS ou dado é tocado.
- Página `/obras` continua funcionando (só sai do menu).
- Rotas, componentes e arquivos permanecem.
- Dashboard "Hoje" (`/`) intacto.

## Resultado
Um único ponto de entrada no menu (**Lojas & Obras**) com Funil / Em Obra / Inauguradas, cards clicáveis abrindo a loja completa. O painel gerencial vira um atalho secundário, sem ocupar espaço no menu principal.