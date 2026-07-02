// Etapas da planilha (Funil 2026) — ordem, agrupamento e descrições fiéis à planilha.
// Compartilhado entre a Matriz de Etapas e o Painel da Loja.
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import { migrateInaugData, getAllInaugItems } from "@/data/inauguracaoChecklistData";

export type PlanilhaStage = { key: string; label: string; group: string; desc: string; sub?: boolean };

export const PLANILHA_STAGES: PlanilhaStage[] = [
  { key: "docs", label: "Docs", group: "Documentação", desc: "Documentação inicial da loja/franqueado enviada e conferida." },
  { key: "cof", label: "COF", group: "Documentação", desc: "Circular de Oferta de Franquia entregue ao franqueado (prazo legal de 10 dias)." },
  { key: "contr_franquia", label: "Contr. Franquia", group: "Documentação", desc: "Contrato de franquia assinado entre franqueado e franqueadora." },
  { key: "contrato_locacao", label: "Contrato Locação", group: "Documentação", desc: "Contrato de locação do ponto assinado (loja de rua ou shopping)." },
  { key: "fampe", label: "FAMPE / Plano de Negócios", group: "Documentação", desc: "Plano de negócios pronto e FAMPE (garantia SEBRAE) aprovado/dispensado." },
  { key: "dre", label: "DRE", group: "Documentação", desc: "DRE projetada da loja validada." },
  { key: "conta_bancaria", label: "Conta Bancária", group: "Documentação", desc: "Conta bancária PJ aberta e vinculada ao CNPJ da loja." },
  { key: "projetos", label: "Projetos", group: "Projetos & Obras", desc: "Projetos arquitetônico e complementares aprovados." },
  { key: "obras", label: "Obras", group: "Projetos & Obras", desc: "Obra em execução conforme cronograma." },
  { key: "contrato_obras", label: "Contrato de Obras", group: "Projetos & Obras", desc: "Contrato com a construtora fechado e assinado." },
  { key: "sankya", label: "Sankya", group: "Sistemas & Pagamentos", desc: "Cadastro da loja no ERP Sankhya concluído (pedidos, filial, estoque)." },
  { key: "use", label: "USE", group: "Sistemas & Pagamentos", desc: "Cadastro/liberação no sistema USE (frente de caixa)." },
  { key: "implantacao_use", label: "Implantação USE", group: "Sistemas & Pagamentos", sub: true, desc: "Implantação técnica do USE na loja concluída (instalação, treinamento, testes)." },
  { key: "skytef", label: "Skytef", group: "Sistemas & Pagamentos", desc: "Skytef (TEF) cadastrado e ativo para as maquininhas." },
  { key: "cielo_lio", label: "Cielo / LIO", group: "Sistemas & Pagamentos", desc: "Maquininhas Cielo/LIO solicitadas, recebidas e habilitadas." },
  { key: "pix", label: "PIX", group: "Sistemas & Pagamentos", desc: "PIX configurado e testado na loja." },
  { key: "boa_vista", label: "Boa Vista", group: "Sistemas & Pagamentos", desc: "Boa Vista (consulta de crédito) contratada e liberada." },
  { key: "venda_link", label: "Venda Link", group: "Sistemas & Pagamentos", desc: "Venda por link de pagamento habilitada." },
  { key: "loja_apoio", label: "Loja de Apoio", group: "Operação", desc: "Loja-apoio definida para suporte operacional durante a inauguração." },
  { key: "loja_liberada", label: "Loja Liberada", group: "Operação", desc: "Loja formalmente liberada para inauguração (checklist final aprovado)." },
  { key: "grupo_wpp", label: "Grupo WPP", group: "Operação", desc: "Grupo de WhatsApp da loja criado com franqueado, equipe interna e fornecedores-chave." },
  { key: "info_sistema", label: "Info e Sistema", group: "Operação", desc: "Configurações de sistema e informações da loja cadastradas (parâmetros, impressoras, etc.)." },
  { key: "lancamento_tx", label: "Lançamento de Tx no Financeiro", group: "Operação", desc: "Taxas e faturamentos da loja lançados no financeiro." },
  { key: "produtos_cds", label: "Produtos / Informar CDs", group: "Operação", desc: "CDs de origem informados e mercadoria da inauguração faturada." },
  { key: "equipe", label: "Equipe", group: "Operação", desc: "Equipe da loja contratada e treinada." },
  { key: "mkt_loja", label: "MKT Loja / Site", group: "Operação", desc: "Ações de marketing da inauguração e cadastro da loja no site." },
  { key: "internet_telefonia", label: "Internet e Telefonia", group: "Operação", desc: "Internet e telefonia instaladas e testadas na loja." },
  { key: "ecommerce", label: "Ecommerce", group: "Operação", desc: "Loja habilitada como ponto de retirada / integração com ecommerce." },
  { key: "itens_pendentes", label: "Itens Pendentes (Checklist)", group: "Entrega Final", desc: "Todos os itens pendentes do checklist de inauguração resolvidos." },
  { key: "marcenaria", label: "Marcenaria e Status", group: "Entrega Final", desc: "Marcenaria entregue e instalada; status final validado." },
  { key: "sacolas", label: "Aquisição Sacolas Trapézio", group: "Entrega Final", desc: "Sacolas trapézio adquiridas e entregues à loja." },
];

export const STAGE_GROUPS = PLANILHA_STAGES.reduce<{ name: string; stages: PlanilhaStage[] }[]>((acc, s) => {
  const last = acc[acc.length - 1];
  if (last && last.name === s.group) last.stages.push(s);
  else acc.push({ name: s.group, stages: [s] });
  return acc;
}, []);

/**
 * Deriva marcações da planilha a partir do Checklist Final para manter Matriz e Checklist sincronizados.
 */
export function deriveStagesFromChecklist(store: any): Record<string, boolean> {
  const derived: Record<string, boolean> = {};
  const inaugRaw: any = store.inauguracaoChecklist;
  if (!inaugRaw || typeof inaugRaw !== "object" || Object.keys(inaugRaw).length === 0) return derived;

  const tipo: "rua" | "shopping" = (store.tipoLoja || "").toUpperCase().includes("SHOPPING") ? "shopping" : "rua";
  const data = migrateInaugData(inaugRaw, tipo);
  if (!data.rounds || data.rounds.length === 0) return derived;

  const currentRound = data.rounds[data.rounds.length - 1];
  const allItems = getAllInaugItems(tipo);

  const pendentes = allItems.filter((i) => {
    const s = currentRound.items[i.id]?.status;
    return s !== "TOTALMENTE_ATENDIDO" && s !== "NAO_SE_APLICA";
  }).length;
  derived.itens_pendentes = allItems.length > 0 && pendentes === 0;
  derived.loja_liberada = isStoreLiberated(inaugRaw, store.tipoLoja);

  return derived;
}
