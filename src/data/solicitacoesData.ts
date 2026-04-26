export const SOLICITACOES_ITEMS = [
  { id: "docs", label: "Docs" },
  { id: "cof", label: "COF" },
  { id: "contrato_franquia", label: "Contr. Franquia" },
  { id: "contrato_locacao", label: "Contrato Locação" },
  { id: "fampe_dre", label: "FAMPE DRE" },
  { id: "conta_bancaria", label: "Conta Bancária" },
  { id: "projetos", label: "Projetos" },
  { id: "obras", label: "Obras" },
  { id: "contrato_obras", label: "Contrato de Obras" },
  { id: "sankhya", label: "Sankhya" },
  { id: "use", label: "USE" },
  { id: "implantacao_use", label: "Implantação USE" },
  { id: "skytef", label: "Skytef" },
  { id: "cielo_lio", label: "Cielo LIO" },
  { id: "pix", label: "PIX" },
  { id: "boa_vista", label: "Boa Vista" },
  { id: "venda_link", label: "Venda Link" },
  { id: "loja_apoio", label: "Loja de apoio" },
  { id: "loja_liberada", label: "Loja Liberada" },
  { id: "grupo_wpp", label: "Grupo wpp" },
  { id: "info_sistema", label: "Info e Sistema" },
  { id: "tx_financeiro", label: "Tx no financeiro" },
  { id: "produtos_cd", label: "Produtos CDs" },
  { id: "equipe", label: "Equipe" },
  { id: "mkt_site", label: "MKT Loja site" },
  { id: "internet_telefonia", label: "Internet e Telefonia" },
  { id: "ecommerce", label: "Ecommerce" },
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