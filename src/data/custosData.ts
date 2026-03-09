export interface CustoItem {
  id: string;
  nome: string;
  fornecedor: string;
  valorPrevisto: number;
  valorRealizado: number;
  proposta: string; // storage file path
}

export interface CustoCategoria {
  id: string;
  nome: string;
  items: CustoItem[];
}

export interface CustosData {
  areaMt2: number;
  categorias: CustoCategoria[];
}

export const custosCategoriasTemplate: { id: string; nome: string; subitens: string[] }[] = [
  {
    id: "execucao",
    nome: "Mão de Obra (Execução)",
    subitens: ["Tapume e adesivo", "Demolição (Se houver)", "Mão de obra (Construtor)", "Outros"],
  },
  {
    id: "moveis",
    nome: "Móveis",
    subitens: ["Material / Mão de Obra"],
  },
  {
    id: "piso",
    nome: "Piso",
    subitens: ["Porcelanato + frete", "Piso vinílico"],
  },
  {
    id: "iluminacao",
    nome: "Iluminação",
    subitens: ["Luminárias", "Lâmpadas"],
  },
  {
    id: "informatica",
    nome: "Informática",
    subitens: [
      "Serviço de informática (TI + instalação câmeras)",
      "Câmeras",
      "Computadores",
      "Impressoras bematech",
      "Impressoras zebra",
      "Impressora laser multifuncional",
      "Leitor de código de barras",
      "Aparelho celular",
      "Coletor de dados (Auditoria)",
    ],
  },
  {
    id: "demais",
    nome: "Demais Itens",
    subitens: [
      "Teca Lascada - Material",
      "Som - Equipamentos",
      "Som - Mão de obra",
      "Ar Condicionado - Equipamento",
      "Checkpoint (Antenas) - Antena + alarme + frete",
      "Kit VM - Gráfica + acrílico",
      "Kit VM - Metálicos",
      "Kit VM - Display Calegari",
      "Uniformes",
      "Embalagem correios (Coex)",
      "Cabides chinelo",
      "Vegetação - Planta",
      "Vegetação - Vaso",
      "Sistemas - Data System",
      "Sistemas - F360",
      "Sistemas - Virtual Gate",
      "Multi Etiquetas",
      "Printbag",
      "Bag preta",
      "Papel Kraft",
      "Itens para apoio (cadeira/mesa/frigobar/filtro/escaninho)",
      "Limpeza Loja",
      "Limpeza Vitrine",
      "Outros",
    ],
  },
];

export function createDefaultCustos(): CustosData {
  return {
    areaMt2: 0,
    categorias: custosCategoriasTemplate.map((cat) => ({
      id: cat.id,
      nome: cat.nome,
      items: cat.subitens.map((sub, idx) => ({
        id: `${cat.id}-${idx}`,
        nome: sub,
        fornecedor: "",
        valorPrevisto: 0,
        valorRealizado: 0,
        proposta: "",
      })),
    })),
  };
}
