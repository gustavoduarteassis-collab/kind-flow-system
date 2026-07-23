export type StatusType =
  | "NÃO INICIADO"
  | "EM COTAÇÃO"
  | "EM TRANSPORTE"
  | "REALIZADO"
  | "REALIZANDO"
  | "ATRASADO"
  | "NÃO SE APLICA"
  | "CONSTRUTORA"
  | "EM ELABORAÇÃO"
  | "EM ANÁLISE"
  | "EM CONTRATAÇÃO"
  | "EM ANDAMENTO";

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
    descricao?: string;
    atividade?: string;
  }>;
  cronograma: CronogramaStore;
  inauguracaoChecklist: InaugChecklistData;
  custos?: any;
  solicitacoes?: any;
  visitaTecnica?: any;
  isReforma?: boolean;
  // Datas expandidas (Onda A)
  dataContratoLocacao?: string;
  dataLiberacaoChaves?: string;
  demolicaoPrev?: string;
  demolicaoReal?: string;
  obraInicioPrev?: string;
  obraInicioReal?: string;
  moveisPrev?: string;
  moveisReal?: string;
  produtosPrev?: string;
  produtosReal?: string;
  inauguracaoReal?: string;
  visitaTecnicaReal?: string;
  // Última atualização em cache
  ultimaAtualizacao?: string;
  ultimaAtualizacaoAt?: string;
  ultimaAtualizacaoAutor?: string;
  // Dados expandidos (Onda C)
  cidade?: string;
  uf?: string;
  endereco?: string;
  cep?: string;
  telefone?: string;
  emailLoja?: string;
  cnpj?: string;
  razaoSocial?: string;
  marca?: string;
  shoppingNome?: string;
  metragemM2?: number | null;
  observacoesGerais?: string;
  porte?: string;
  localizacao?: string;
  stageStatus?: Record<string, boolean>;
  tipoRegistro?: string;
}

const defaultStatusOptions: StatusType[] = [
  "NÃO INICIADO", "EM COTAÇÃO", "EM TRANSPORTE", "REALIZADO", "REALIZANDO", "ATRASADO", "NÃO SE APLICA", "CONSTRUTORA"
];

const burocraticStatusOptions: StatusType[] = [
  "NÃO INICIADO", "EM ANDAMENTO", "EM TRANSPORTE", "REALIZADO", "REALIZANDO", "ATRASADO", "NÃO SE APLICA", "CONSTRUTORA"
];

const obraExecucaoStatusOptions: StatusType[] = [
  "NÃO INICIADO", "EM ANDAMENTO", "EM COTAÇÃO", "EM TRANSPORTE", "REALIZADO", "REALIZANDO", "ATRASADO", "NÃO SE APLICA", "CONSTRUTORA"
];

export const checklistCategories: ChecklistCategory[] = [
  {
    id: "documental-fiscal",
    nome: "Processos Documental e Fiscal",
    statusOptions: burocraticStatusOptions,
    items: [
      { id: 1, atividade: "Contratar a contabilidade que prestará serviços para a loja", responsavel: "Franqueado" },
      { id: 2, atividade: "Providenciar abertura da empresa - Contrato Social e CNPJ", preRequisito: "60 dias mínimo para início da obra", responsavel: "Franqueado" },
      { id: 3, atividade: "Solicitar enquadramento no Simples Nacional", preRequisito: "Item 2", responsavel: "Franqueado" },
      { id: 4, atividade: "Inscrição Estadual", preRequisito: "Item 2", responsavel: "Franqueado" },
      { id: 5, atividade: "Criação da filial no Sankya", preRequisito: "Itens 2, 3 e 4", responsavel: "Mariana Coutinho / Implantadoras" },
      { id: 6, atividade: "Criação da filial no USE na Data System.", preRequisito: "Itens 2 e 4", responsavel: "Mariana Coutinho / Implantadoras" },
      { id: 7, atividade: "Cadastro do franqueado ao portal EAD da Data System/Instalação da USE no computador do franqueado.", responsavel: "Implantadoras" },
      { id: 8, atividade: "Certificado Digital (A1) em formato .pxf com senha", preRequisito: "Itens 2 e 4", responsavel: "Franqueado" },
      { id: 9, atividade: "Solicitar o credenciamento junto a SEFAZ do Estado para emissão da NFE e enviar o Código CSC de Produção", preRequisito: "Item 8", responsavel: "Franqueado" },
      { id: 10, atividade: "Inscrição municipal", preRequisito: "Item 2", responsavel: "Franqueado" },
      { id: 11, atividade: "Verificar a disponibilidade (consulta prévia) de alvará de localização e funcionamento", preRequisito: "Inscrição Municipal, IPTU, DAE, Contrato de locação", responsavel: "Franqueado" },
      { id: 12, atividade: "Abrir contas bancárias", preRequisito: "Item 2", responsavel: "Franqueado" },
      { id: 13, atividade: "FAMPE", preRequisito: "Item 14", responsavel: "Gerente de Expansão", observacoes: "Conta Bradesco precisará ser aberta em BH" },
      { id: 14, atividade: "Solicitar maquininhas da Cielo, número do estabelecimento, número lógico e cadastro Tivit", preRequisito: "Itens 2 e 12", responsavel: "Implantadoras", observacoes: "Franqueado deverá conferir as taxas lançadas dentro do seu portal a Cielo" },
      { id: 15, atividade: "Cadastro na SKYTEF", preRequisito: "Item 14", responsavel: "Mariana e Implantadoras" },
      { id: 16, atividade: "Fazer o cadastro na maquininha LIO após o recebimento em loja", preRequisito: "Item 16", responsavel: "Franqueado" },
      { id: 17, atividade: "Cadastro estabelecimento para venda link", preRequisito: "Item 16", responsavel: "Franqueado" },
      { id: 18, atividade: "Cadastro de venda para Closet Infinito", responsavel: "Franqueado" },
      { id: 19, atividade: "Conferir todo o percurso financeiro da venda através da venda teste (Cielo, Bradesco, Skytef e dados do cupom fiscal)", responsavel: "Franqueado" },
      { id: 20, atividade: "Cadastro PIX", responsavel: "Implantadoras" },
      { id: 21, atividade: "Cadastro Boa Vista", responsavel: "Implantadoras" },
      { id: 22, atividade: "Liberação de produto e acessórios", responsavel: "Mariana Coutinho" },
    ],
  },
  {
    id: "projetos",
    nome: "Projetos",
    statusOptions: ["NÃO INICIADO", "EM ELABORAÇÃO", "EM ANÁLISE", "REALIZADO", "REALIZANDO", "ATRASADO", "NÃO SE APLICA", "CONSTRUTORA"],
    items: [
      { id: 23, atividade: "Solicitar ao shopping/proprietário a planta da loja e caderno técnico", responsavel: "Supervisor de Projetos" },
      { id: 24, atividade: "Medição da Loja in-loco", responsavel: "Supervisor de Projetos" },
      { id: 25, atividade: "Solicitar ao marketing da Constance a arte do adesivo do tapume a provar com o shopping", responsavel: "Franqueado" },
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
      { id: 52, atividade: "Granito branco siena (somente quando a escada for de acesso aos clientes)", responsavel: "Franqueado" },
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
    statusOptions: obraExecucaoStatusOptions,
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
      { id: 86, atividade: "Fixação das placas de bombeiros (extintor, saídas de emergência), luminárias de emergência e fita antiderrapante no piso escada", responsavel: "Construtora" },
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
      { id: 90, atividade: "Comprar aparelho celular para a loja usar para WhatsApp (vendas delivery) - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado" },
      { id: 91, atividade: "Contratar técnico em informática para instalar equipamentos", responsavel: "Franqueado" },
      { id: 92, atividade: "Comprar armário do rack de servidor e materiais - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado", observacoes: "Agopal ou fornecedor local" },
      { id: 93, atividade: "Sistema de circuito interno (câmeras)", responsavel: "Franqueado", observacoes: "Agopal ou fornecedor local" },
      { id: 94, atividade: "Som amplificador", responsavel: "Franqueado", observacoes: "Agopal ou fornecedor local" },
      { id: 95, atividade: "Switch Gigabit", responsavel: "Franqueado" },
      { id: 96, atividade: "Computador padrão SFF, com os seguintes requisitos: I3 10ª geração com 8 GB SSD 256 - Windows Pro 64bits", responsavel: "Franqueado" },
      { id: 97, atividade: "Monitor 19'' furação padrão vesa e fonte interna", responsavel: "Franqueado" },
      { id: 98, atividade: "Nobreak - OBRIGATÓRIO", responsavel: "Franqueado", observacoes: "Obrigatório nobreak em cada PDX e RACK" },
      { id: 99, atividade: "Leitor com fio de código de Barras Elgin Bematech EL250 1D e 2D C/ pedestal OU Leitor de código de Barras Elgin Bematech BR520 1D e 2D C/ pedestal", responsavel: "Franqueado" },
      { id: 100, atividade: "Leitor sem fio Marca Zebra Modelo DS2278 - OPCIONAL", responsavel: "Franqueado" },
      { id: 101, atividade: "Impressora de etiquetas marca Zebra modelo ZD230", responsavel: "Franqueado" },
      { id: 102, atividade: "Impressora Térmica não fiscal marca Bematech modelo MP 4200", responsavel: "Franqueado" },
      { id: 103, atividade: "Impressora laser Multifuncional HP modelo 127FN (Verificar tensão 110 ou 220 V e comprar transformador se necessário)", responsavel: "Franqueado" },
      { id: 138, atividade: "TV 65''", responsavel: "Franqueado" },
      { id: 104, atividade: "Coletor de Dados - C3tech leitor de código de barras s/ fio LB-W300BK CCD Ergônomico automático Wireless 2.4GHz sensor CCD 1D 300 scans - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado" },
      { id: 105, atividade: "Configuração da rede de internet e montagem do rack - C/ NO MÍNIMO 1 SEMANA ANTES DA DATA DA ANALISTA DE IMPLANTAÇÃO CHEGAR", responsavel: "Franqueado" },
      { id: 106, atividade: "Configuração do sistema USE pelo responsável da implantação da Data System", responsavel: "Implantadoras" },
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
      { id: 139, atividade: "Comprar sacolas interna Trapezio, para os clientes colocarem os produtos. (20 unidades) - Fornecedor Exclusivo - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado" },
    ],
  },
  {
    id: "marketing",
    nome: "Marketing",
    statusOptions: defaultStatusOptions,
    items: [
      { id: 132, atividade: "Solicitar arte do adesivo de tapume ao marketing Constance", responsavel: "Franqueado" },
      { id: 135, atividade: "Compra do Kit VM (ACRÍLICO E GRÁFICA) - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado", observacoes: "Acrílico e gráfica - Novo de Novo BH" },
      { id: 136, atividade: "Compra do Kit VM (SUPORTES METÁLICOS) - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado", observacoes: "Metálicos - João Instanshop" },
      { id: 137, atividade: "Compra do Kit VM (PRECIFICADORES) - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado", observacoes: "Precificadores - Callegari" },
      { id: 140, atividade: "Compra do Kit VM (CABIDES) - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado" },
      { id: 141, atividade: "Itens opcionais para Visual Merchandising", responsavel: "Franqueado" },
      { id: 142, atividade: "Tapete - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado" },
      { id: 143, atividade: "Trilho Sulço Simples Alumínio (verificar especificação no projeto)", responsavel: "Franqueado" },
      { id: 144, atividade: "Livro Procon", responsavel: "Franqueado" },
      { id: 145, atividade: "Divulgação da nova loja nas redes sociais", responsavel: "Franqueado / Marketing" },
      { id: 146, atividade: "Contratar ListenX para sonorização da loja - IMPEDITIVO DE INAUGURAÇÃO", responsavel: "Franqueado" },
      { id: 147, atividade: "VENDA SITE e GOOGLE MEU NEGÓCIO", responsavel: "Franqueado" },
      { id: 148, atividade: "Validar campanha vigente com o Trade Marketing", responsavel: "Franqueado / Marketing" },
      { id: 149, atividade: "Entrar em contato com o Marketing para suporte e assessoria", responsavel: "Franqueado / Marketing" },
      { id: 150, atividade: "Uniformes", responsavel: "Franqueado", observacoes: "Camiseta preta bordada CONSTANCE + calça preta alfaiataria" },
    ],
  },
  {
    id: "contratacao-pessoal",
    nome: "Contratação Pessoal",
    statusOptions: ["NÃO INICIADO", "EM CONTRATAÇÃO", "REALIZADO", "REALIZANDO", "ATRASADO", "NÃO SE APLICA"],
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

/**
 * Categorias do Checklist que representam AQUISIÇÃO (compra de itens/serviços).
 * Ao fechar (ou preencher valor em) itens dessas categorias, os valores fluem
 * automaticamente para a aba "Custos de Obra".
 *
 * Cada entrada mapeia para o `id` da categoria em CustosData (execucao, moveis,
 * piso, iluminacao, informatica, demais).
 */
export const AQUISICAO_CATEGORIES_DEFAULT: Record<string, string> = {
  "obra-aquisicao": "demais",
  informatica: "informatica",
  "mobiliario-apoio": "demais",
  "papelaria-contratos": "demais",
  marketing: "demais",
};

// Override por item (dentro de obra-aquisicao) para caírem na categoria correta
export const ITEM_CUSTOS_CATEGORIA: Record<number, string> = {
  36: "execucao", 37: "execucao", 38: "execucao", 39: "execucao", 40: "execucao",
  41: "execucao", // tapume + adesivo
  42: "demais", 43: "demais", // ar condicionado / cortina de ar
  44: "moveis", // marcenaria
  45: "demais",
  46: "piso", 47: "piso",
  48: "demais", 49: "demais", 50: "demais", 51: "demais", 52: "demais",
  53: "iluminacao", 54: "iluminacao",
  55: "demais", 56: "demais",
  57: "informatica", // contador de fluxo
  58: "demais", 59: "demais", 60: "demais",
};

export function getCustosCategoria(categoriaChecklist: string, itemId: number): string | null {
  if (ITEM_CUSTOS_CATEGORIA[itemId]) return ITEM_CUSTOS_CATEGORIA[itemId];
  return AQUISICAO_CATEGORIES_DEFAULT[categoriaChecklist] || null;
}

