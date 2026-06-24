export const SOLICITACOES_ITEMS = [
  { id: "deskfy", label: "Acesso ao Deskfy" },
  { id: "sacolas", label: "Pedido de Sacolas" },
  { id: "kit_inauguracao", label: "Kit Inauguração" },
  { id: "sankhya", label: "Sankhya" },
  { id: "cielo", label: "Máquinas da Cielo" },
  { id: "cadastro_use", label: "Cadastro Use" },
  { id: "portal_ead", label: "Portal EAD" },
  { id: "pix", label: "Pix" },
  { id: "venda_link", label: "Venda Link" },
  { id: "closet_infinito", label: "Closet Infinito" },
] as const;

export type SolicitacaoStatus = "pendente" | "solicitado" | "concluido";

export type SolicitacaoItem = {
  status: SolicitacaoStatus;
  dataSolicitacao: string;
  dataConclusao: string;
  comentarios: string;
};

export type SolicitacoesData = Record<string, SolicitacaoItem>;

export const createDefaultSolicitacoes = (): SolicitacoesData => {
  const data: SolicitacoesData = {};
  SOLICITACOES_ITEMS.forEach((item) => {
    data[item.id] = { status: "pendente", dataSolicitacao: "", dataConclusao: "", comentarios: "" };
  });
  return data;
};
