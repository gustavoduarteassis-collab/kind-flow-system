## Visão geral

Transformar o prompt da AGM em três módulos integrados dentro da página **AGM**, reutilizando dados já existentes (lojas, custos, fornecedores, checklist).

---

## 1. Módulo de Planos de Ação acumulados

**Nova tabela `agm_planos_acao`** (acumulada entre meses, separada de `agm_action_plans` que é por entrada mensal):

- `id` (uuid), `codigo` (text, ex: "PA-001", auto-incrementado)
- `origem` (text — loja ou indicador)
- `mes_criacao` (text, "YYYY-MM")
- `causa`, `acao`, `como` (text)
- `responsavel` (text)
- `prazo_inicial`, `prazo_final` (date)
- `status` (enum: aberto | em_andamento | concluido | atrasado)
- `data_conclusao` (date, nullable)
- `ultima_atualizacao_data` (date) + `ultima_atualizacao_texto` (text)
- `created_by`, timestamps, RLS por equipe autorizada
- `GRANT` para `authenticated` + `service_role`

**Tabela `agm_plano_updates`** — histórico de atualizações (id, plano_id, data, texto, autor).

**Farol calculado em runtime:**
- 🟢 concluído OU prazo > 7 dias
- 🟡 prazo ≤ 7 dias OU sem update há 14-30 dias
- 🔴 atrasado OU sem update há >30 dias

**UI — nova aba "Planos de Ação" em `src/pages/AGM.tsx`:**
- Lista com filtros (status, farol, responsável)
- Botão "Novo plano" (modal com formulário)
- Card por plano com farol, botão "Atualizar" (abre modal pedindo texto), botão "Concluir"
- Banner topo: "⚠️ X planos sem atualização há +2 semanas"
- Parsing rápido: textarea aceita formato `PA-003: Concluído em 25/06` e aplica em lote

---

## 2. Assistente IA da AGM

**Nova Edge Function `agm-assistant`** (streaming chat):
- Valida JWT, system prompt = o prompt completo do usuário
- Antes de chamar o modelo, **anexa contexto do banco**: lojas inauguradas do mês selecionado, custos vs metas, prazos, planos de ação abertos, fornecedores novos
- AI SDK `streamText` via Lovable AI Gateway (`google/gemini-3-flash-preview`)

**UI — nova aba "Assistente" em AGM:**
- Seletor de mês (define contexto)
- Chat com AI Elements (markdown, message.parts)
- Persistência: localStorage por mês (uma conversa por mês ref)
- Composer focado, status submitted/streaming desabilita envio

---

## 3. Gerador automático de PPTX

**Atualizar `src/utils/generateAGMPptx.ts`** com as 11 seções do prompt seguindo o template visual dos PPTs anexados (capa escura, header preto, accent rosa, "CONSTANCE com você, onde você estiver"):

1. Capa
2. Ata mês anterior (planos do mês anterior com status)
3. Matriz de resultados (OTIF, custo/m², prazo, store-ready, fornecedores)
4. Abertura de novas lojas
5. Custo/m² previsto x realizado por categoria
6. Causa raiz — custo (planos novos)
7. Prazo médio (construtoras vs junta junta)
8. Causa raiz — prazo
9. Novos fornecedores
10. Pendências checklist
11. Ações de melhoria
12. Encerramento

**Botão "Gerar AGM completa"** em `AGM.tsx` que puxa todos os dados do mês + planos ativos e gera o `.pptx`.

---

## Detalhes técnicos

- Migration cria tabelas + RLS + GRANT (padrão do projeto via `is_authorized_team`)
- Edge function adicionada em `supabase/config.toml` se necessário
- Reutiliza `useAuth`, padrão Marrom Café + dourado, sem react-markdown (regex)
- Nenhuma alteração nos dados existentes

---

## Fora de escopo (confirmar se precisa depois)

- Cálculo automático de OTIF e checklist store-ready (depende de definição de "no prazo")
- Importação dos PPTs antigos para popular histórico
- Notificações por email de planos atrasados
