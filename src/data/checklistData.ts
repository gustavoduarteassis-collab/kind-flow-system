export type StatusType =
  | "NÃO INICIADO"
  | "EM COTAÇÃO"
  | "EM TRANSPORTE"
  | "REALIZADO"
  | "ATRASADO"
  | "NÃO SE APLICA"
  | "CONSTRUTORA"
  | "EM ELABORAÇÃO"
  | "EM ANÁLISE"
  | "EM CONTRATAÇÃO";

export interface ChecklistItem {
  id: number;
  atividade: string;
  preRequisito?: string;
  responsavel: string;
  observacoes?: string;
  descricao?: string;
}

export interface ChecklistCategory {
  id: string;
  nome: string;
  items: ChecklistItem[];
  statusOptions: StatusType[];
}

import { CronogramaStore } from "./cronogramaData";
import { InaugChecklistData } from "./inauguracaoChecklistData";

export interface Store {
  id: string;
  nome: string;
  filial: string;
  franqueado: string;
  construtor: string;
  analistaObra: string;
  inauguracao: string;
  tipoLoja: "rua" | "shopping" | "";
  checklist: Record<number, {
    status: StatusType;
    prazoInicial: string;
    prazoFinal: string;
    observacoes: string;
  }>;
  cronograma: CronogramaStore;
  inauguracaoChecklist: InaugChecklistData;
}

const defaultStatusOptions: StatusType[] = [
  "NÃO INICIADO", "EM COTAÇÃO", "EM TRANSPORTE", "REALIZADO", "ATRASADO", "NÃO SE APLICA", "CONSTRUTORA"
];

export const checklistCategories: ChecklistCategory[] = [
  {
    id: "documental-fiscal",
    nome: "Processos Documental e Fiscal",
    statusOptions: defaultStatusOptions,
    items: [
      { id: 1, atividade: "Contratar a contabilidade que prestará serviços para a loja", responsavel: "Franqueado" },
      { id: 2, atividade: "Providenciar abertura da empresa - Contrato Social e CNPJ", preRequisito: "60 dias mínimo para início da obra", responsavel: "Franqueado" },
      { id: 3, atividade: "Solicitar enquadramento no Simples Nacional", preRequisito: "Item 2", responsavel: "Franqueado" },
      { id: 4, atividade: "Inscrição Estadual", preRequisito: "Item 2", responsavel: "Franqueado" },
      { id: 5, atividade: "Criação da filial no Sankya", preRequisito: "Itens 2, 3 e 4", responsavel: "Mariana Coutinho / Implantadoras" },
      { id: 6, atividade: "Criação da filial no USE na Data System", preRequisito: "Itens 2 e 4", responsavel: "Mariana Coutinho / Implantadoras" },
      { id: 7, atividade: "Cadastro do franqueado ao portal EAD da Data System / Instalação da USE", responsavel: "Implantadoras" },
      { id: 8, atividade: "Certificado Digital (A1) em formato .pxf com senha", preRequisito: "Itens 2 e 4", responsavel: "Franqueado" },
      { id: 9, atividade: "Solicitar credenciamento junto a SEFAZ para emissão da NFE e enviar Código CSC", preRequisito: "Item 8", responsavel: "Franqueado" },
      { id: 10, atividade: "Inscrição municipal", preRequisito: "Item 2", responsavel: "Franqueado" },
      { id: 11, atividade: "Verificar disponibilidade de alvará de localização e funcionamento", preRequisito: "Inscrição Municipal, IPTU, DAE, Contrato de locação", responsavel: "Franqueado" },
      { id: 12, atividade: "Abrir contas bancárias", preRequisito: "Item 2", responsavel: "Franqueado" },
      { id: 13, atividade: "FAMPE", preRequisito: "Item 14", responsavel: "Gerente de Expansão", observacoes: "Conta Bradesco precisará ser aberta em BH" },
      { id: 14, atividade: "Solicitar maquininhas da Cielo, número do estabelecimento, número lógico e cadastro Tivit", preRequisito: "Itens 2 e 12", responsavel: "Implantadoras" },
      { id: 15, atividade: "Cadastro na SKYTEF", preRequisito: "Item 14", responsavel: "Mariana e Implantadoras" },
      { id: 16, atividade: "Fazer cadastro na maquininha LIO após recebimento em loja", preRequisito: "Item 16", responsavel: "Franqueado" },
      { id: 17, atividade: "Cadastro estabelecimento para venda link", preRequisito: "Item 16", responsavel: "Franqueado" },
      { id: 18, atividade: "Cadastro de venda para Closet Infinito", responsavel: "Franqueado" },
      { id: 19, atividade: "Conferir todo o percurso financeiro da venda através da venda teste", responsavel: "Franqueado" },
      { id: 20, atividade: "Cadastro PIX", responsavel: "Implantadoras" },
      { id: 21, atividade: "Cadastro Boa Vista", responsavel: "Implantadoras" },
      { id: 22, atividade: "Liberação de produto e acessórios", responsavel: "Mariana Coutinho" },
    ],
  },
  {
    id: "projetos",
    nome: "Projetos",
    statusOptions: ["NÃO INICIADO", "EM ELABORAÇÃO", "EM ANÁLISE", "REALIZADO", "ATRASADO", "NÃO SE APLICA", "CONSTRUTORA"],
    items: [
      { id: 23, atividade: "Solicitar ao shopping/proprietário a planta da loja e caderno técnico", responsavel: "Supervisor de Projetos" },
      { id: 24, atividade: "Medição da Loja in-loco", responsavel: "Supervisor de Projetos" },
      { id: 25, atividade: "Solicitar ao marketing da Constance a arte do adesivo do tapume", responsavel: "Franqueado" },
      { id: 26, atividade: "Elaborar Layout da Loja e aprovar em diretoria", responsavel: "Supervisor de Projetos" },
      { id: 27, atividade: "Reunião de alinhamento de projetos com o franqueado / construtora", responsavel: "Supervisor de Projetos" },
      { id: 28, atividade: "Elaboração do projeto arquitetônico e luminotécnico", responsavel: "Analista de arquitetura" },
      { id: 29, atividade: "Envio e aprovação do projeto arquitetônico para Shopping / Proprietário", responsavel: "Supervisor de Projetos" },
      { id: 30, atividade: "Projeto estrutural", responsavel: "Analista de arquitetura" },
      { id: 31, atividade: "Projeto elétrico", responsavel: "Analista de arquitetura" },
      { id: 32, atividade: "Projeto incêndio", responsavel: "Analista de arquitetura" },
      { id: 33, atividade: "Projeto Ar condicionado", responsavel: "Analista de arquitetura" },
      { id: 34, atividade: "Medição da Loja pós finalização de Drywall (móveis)", responsavel: "Franqueado" },
      { id: 35, atividade: "Detalhamento de Móveis (após medidas finais)", responsavel: "Analista de arquitetura" },
    ],
  },
  {
    id: "obra-aquisicao",
    nome: "Processos Obra (Aquisição)",
    statusOptions: defaultStatusOptions,
    items: [
      { id: 36, atividade: "Cotação de Construtora", responsavel: "Franqueado" },
      { id: 37, atividade: "Documentação para início de obras", responsavel: "Franqueado", observacoes: "Contrato de locação e contrato de obras" },
      { id: 38, atividade: "Contratar seguro da obra - OBRIGATÓRIO", responsavel: "Franqueado" },
      { id: 39, atividade: "Providenciar ART da obra - OBRIGATÓRIO", responsavel: "Franqueado" },
      { id: 40, atividade: "Providenciar cronograma de obras - OBRIGATÓRIO", responsavel: "Franqueado" },
      { id: 41, atividade: "Instalação do Tapume e Adesivo", responsavel: "Franqueado" },
      { id: 42, atividade: "Cortina de ar - LOJA DE RUA E/OU GALERIA", responsavel: "Franqueado" },
      { id: 43, atividade: "Ar-condicionado - SPLIT OU FANCOIL", responsavel: "Franqueado" },
      { id: 44, atividade: "Marcenaria - Mobiliário (Móveis geral, puffs, painéis, cubos, cachepôs, aparadores e led + drive)", responsavel: "Franqueado", observacoes: "Thiago ART Estofados / Victor Agopal / Osmair / leda SP" },
      { id: 45, atividade: "Porta de aço automática (transvision)", responsavel: "Franqueado" },
      { id: 46, atividade: "Porcelanato", responsavel: "Franqueado", observacoes: "Porcelanato Eliane" },
      { id: 47, atividade: "Piso vinílico", responsavel: "Franqueado", observacoes: "Porcelanato Eliane" },
      { id: 48, atividade: "Vidros (vitrine, estrutura da vitrine, guarda corpo e espelhos)", responsavel: "Franqueado" },
      { id: 49, atividade: "Teca lisa", responsavel: "Franqueado", observacoes: "TW Brasil UPM Eireli" },
      { id: 50, atividade: "Sistema anti-furto (antenas, bolachas, agulhas, cordinha, extrator)", responsavel: "Franqueado", observacoes: "Checkpoint" },
      { id: 51, atividade: "Granito marrom absoluto (soleira e rodapé da fachada)", responsavel: "Franqueado" },
      { id: 52, atividade: "Granito branco siena (escada de acesso aos clientes)", responsavel: "Franqueado" },
      { id: 53, atividade: "Contratar luminárias", responsavel: "Franqueado", observacoes: "Jose Silvino e Thor Iluminação" },
      { id: 54, atividade: "Lâmpadas", responsavel: "Franqueado", observacoes: "Thor Iluminação, Agopal ou fornecedor local" },
      { id: 55, atividade: "Portas em MDF", responsavel: "Franqueado" },
      { id: 56, atividade: "Letreiros + ACM fachada", responsavel: "Franqueado" },
      { id: 57, atividade: "Aquisição do Contador de Fluxo - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado", observacoes: "Virtual Gate" },
      { id: 58, atividade: "Extintores e placas de sinalização", responsavel: "Franqueado" },
      { id: 59, atividade: "Vaso - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado" },
      { id: 60, atividade: "Planta - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado" },
    ],
  },
  {
    id: "obra-execucao",
    nome: "Processos Obra (Execução)",
    statusOptions: defaultStatusOptions,
    items: [
      { id: 61, atividade: "Demolição", responsavel: "Construtora" },
      { id: 62, atividade: "Execução da estrutura do mezanino", responsavel: "Construtora" },
      { id: 63, atividade: "Execução da estrutura vitrine", responsavel: "Construtora" },
      { id: 64, atividade: "Elétrica", responsavel: "Construtora" },
      { id: 65, atividade: "Instalação do rack + energia", responsavel: "Construtora" },
      { id: 66, atividade: "Instalação porta de aço automática (transvision)", responsavel: "Construtora" },
      { id: 67, atividade: "Incêndio (spk)", responsavel: "Construtora" },
      { id: 68, atividade: "Instalação ar condicionado", responsavel: "Construtora" },
      { id: 69, atividade: "Drywall e forro em gesso", responsavel: "Construtora" },
      { id: 70, atividade: "Assentamento porcelanato (Piso Eliane)", responsavel: "Construtora" },
      { id: 71, atividade: "Assentamento piso vinílico", responsavel: "Construtora" },
      { id: 72, atividade: "Pintura", responsavel: "Construtora" },
      { id: 73, atividade: "Instalação luminárias e alto falantes", responsavel: "Construtora" },
      { id: 74, atividade: "Instalação vidros vitrine", responsavel: "Construtora" },
      { id: 75, atividade: "Instalação do adesivo vinílico", responsavel: "Construtora" },
      { id: 76, atividade: "Corrimão e guarda corpo Inox", responsavel: "Construtora" },
      { id: 77, atividade: "Granito branco siena (escada e rodapé escada)", responsavel: "Construtora" },
      { id: 78, atividade: "Soleira e rodapé no granito marrom absoluto", responsavel: "Construtora" },
      { id: 79, atividade: "Instalação portas em MDF", responsavel: "Construtora" },
      { id: 80, atividade: "Instalação Teca Lisa", responsavel: "Construtora" },
      { id: 81, atividade: "Instalação Antenas", responsavel: "Construtora" },
      { id: 82, atividade: "Montagem dos Móveis", responsavel: "Construtora" },
      { id: 83, atividade: "Sistema de circuito interno (câmeras)", responsavel: "Construtora" },
      { id: 84, atividade: "Instalação letreiro e fachada", responsavel: "Construtora" },
      { id: 85, atividade: "Espelhos e cantoneiras - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Construtora" },
      { id: 86, atividade: "Fixação das placas de bombeiros, luminárias de emergência e fita antiderrapante", responsavel: "Construtora" },
    ],
  },
  {
    id: "informatica",
    nome: "Processos Informática",
    statusOptions: defaultStatusOptions,
    items: [
      { id: 87, atividade: "Providenciar Notebook com VPN e sistema USE configurados", responsavel: "Franqueado" },
      { id: 88, atividade: "Contratar um plano de internet", responsavel: "Franqueado" },
      { id: 89, atividade: "Contratar linha telefônica Siemens ou IntelBras - OPCIONAL", responsavel: "Franqueado" },
      { id: 90, atividade: "Comprar aparelho celular para WhatsApp (vendas delivery) - IMPEDITIVO", responsavel: "Franqueado" },
      { id: 91, atividade: "Contratar técnico em informática para instalar equipamentos", responsavel: "Franqueado" },
      { id: 92, atividade: "Comprar armário do rack de servidor e materiais - IMPEDITIVO", responsavel: "Franqueado", observacoes: "Agopal ou fornecedor local" },
      { id: 93, atividade: "Sistema de circuito interno (câmeras)", responsavel: "Franqueado", observacoes: "Agopal ou fornecedor local" },
      { id: 94, atividade: "Som amplificador", responsavel: "Franqueado", observacoes: "Agopal ou fornecedor local" },
      { id: 95, atividade: "Switch Gigabit", responsavel: "Franqueado" },
      { id: 96, atividade: "Computador padrão SFF (I3 10ª geração, 8GB, SSD 256, Windows Pro 64bits)", responsavel: "Franqueado" },
      { id: 97, atividade: "Monitor 19'' furação padrão vesa e fonte interna", responsavel: "Franqueado" },
      { id: 98, atividade: "Nobreak - OBRIGATÓRIO", responsavel: "Franqueado", observacoes: "Obrigatório nobreak em cada PDX e RACK" },
      { id: 99, atividade: "Leitor com fio de código de Barras Elgin Bematech EL250", responsavel: "Franqueado" },
      { id: 100, atividade: "Leitor sem fio Marca Zebra Modelo DS2278 - OPCIONAL", responsavel: "Franqueado" },
      { id: 101, atividade: "Impressora de etiquetas marca Zebra modelo ZD230", responsavel: "Franqueado" },
      { id: 102, atividade: "Impressora Térmica não fiscal Bematech MP 4200", responsavel: "Franqueado" },
      { id: 103, atividade: "Impressora laser Multifuncional HP modelo 127FN", responsavel: "Franqueado" },
      { id: 104, atividade: "Coletor de Dados - C3tech leitor wireless - IMPEDITIVO", responsavel: "Franqueado" },
      { id: 105, atividade: "Configuração da rede de internet e montagem do rack", responsavel: "Franqueado" },
      { id: 106, atividade: "Configuração do sistema USE pela Data System", responsavel: "Implantadoras" },
    ],
  },
  {
    id: "mobiliario-apoio",
    nome: "Mobiliário e Apoio",
    statusOptions: defaultStatusOptions,
    items: [
      { id: 107, atividade: "Armário de pertences (escaninho)", responsavel: "Franqueado" },
      { id: 108, atividade: "Prateleira de aço", responsavel: "Franqueado" },
      { id: 109, atividade: "Lixeiras conforme padrão", responsavel: "Franqueado" },
      { id: 110, atividade: "Lixeira para apoio", responsavel: "Franqueado" },
      { id: 111, atividade: "Lousa média", responsavel: "Franqueado" },
      { id: 112, atividade: "Aplicador de fita adesiva para embalagens", responsavel: "Franqueado" },
      { id: 113, atividade: "Mesa e banquetas para apoio", responsavel: "Franqueado" },
      { id: 114, atividade: "Cadeira escritório preta", responsavel: "Franqueado" },
      { id: 115, atividade: "Frigobar", responsavel: "Franqueado" },
      { id: 116, atividade: "Bebedouro / Purificador de água", responsavel: "Franqueado" },
      { id: 117, atividade: "Microondas (somente para lojas de rua)", responsavel: "Franqueado" },
    ],
  },
  {
    id: "papelaria-contratos",
    nome: "Papelaria e Contratos",
    statusOptions: defaultStatusOptions,
    items: [
      { id: 118, atividade: "E-Commerce: Etiqueta de produto removível 108x138 branca - IMPEDITIVO", responsavel: "Franqueado", observacoes: "Multi Etiquetas" },
      { id: 119, atividade: "Comercial: Etiquetas de produtos - IMPEDITIVO", responsavel: "Franqueado", observacoes: "Multi Etiquetas" },
      { id: 120, atividade: "Bobina térmica para impressora e Ribbon para Zebra - IMPEDITIVO", responsavel: "Franqueado", observacoes: "Multi Etiquetas" },
      { id: 121, atividade: "E-Commerce: Coex (embalagem ecommerce) - IMPEDITIVO", responsavel: "Franqueado" },
      { id: 122, atividade: "E-Commerce: Rolo de papel pardo - Papel kraft 80g 60cmx150m", responsavel: "Franqueado" },
      { id: 123, atividade: "Comercial: Cadastrar na Printbag e pedir sacolas de papel - IMPEDITIVO", responsavel: "Franqueado" },
      { id: 124, atividade: "E-Commerce: Contrato Total Express - IMPEDITIVO (20 dias antes)", responsavel: "Franqueado" },
      { id: 125, atividade: "E-Commerce: Contrato Correios - IMPEDITIVO (30 dias antes)", responsavel: "Franqueado" },
      { id: 126, atividade: "Preencher e assinar termo CTC Performance", responsavel: "Franqueado" },
      { id: 127, atividade: "Comercial: Parceria com sapateiro local para assistência técnica", responsavel: "Franqueado" },
    ],
  },
  {
    id: "marketing",
    nome: "Marketing",
    statusOptions: defaultStatusOptions,
    items: [
      { id: 132, atividade: "Solicitar arte do adesivo de tapume ao marketing Constance", responsavel: "Franqueado" },
      { id: 133, atividade: "Planejamento de inauguração e divulgação - IMPEDITIVO", responsavel: "Franqueado / Marketing" },
      { id: 134, atividade: "Material de PDV (banners, displays, adesivos)", responsavel: "Marketing" },
      { id: 135, atividade: "Ativação de redes sociais da loja", responsavel: "Franqueado / Marketing" },
      { id: 136, atividade: "Cadastro Google Meu Negócio", responsavel: "Franqueado" },
      { id: 137, atividade: "Fachada e comunicação visual conforme padrão", responsavel: "Franqueado" },
    ],
  },
  {
    id: "contratacao-pessoal",
    nome: "Contratação Pessoal",
    statusOptions: ["NÃO INICIADO", "EM CONTRATAÇÃO", "REALIZADO", "ATRASADO", "NÃO SE APLICA"],
    items: [
      { id: 128, atividade: "Verificar convenção coletiva da cidade", responsavel: "Franqueado" },
      { id: 129, atividade: "Recrutar e admitir equipe da loja - IMPEDITIVO", responsavel: "Franqueado" },
      { id: 130, atividade: "Universidade Constance - IMPEDITIVO", responsavel: "Franqueado / Comercial" },
      { id: 131, atividade: "Agendar treinamento com consultora 7 dias antes - IMPEDITIVO", responsavel: "Franqueado / Comercial" },
    ],
  },
];

export const allItems = checklistCategories.flatMap((c) => c.items);

export function createDefaultChecklist(): Store["checklist"] {
  const checklist: Store["checklist"] = {};
  allItems.forEach((item) => {
    checklist[item.id] = {
      status: "NÃO INICIADO",
      prazoInicial: "",
      prazoFinal: "",
      observacoes: item.observacoes || "",
    };
  });
  return checklist;
}
