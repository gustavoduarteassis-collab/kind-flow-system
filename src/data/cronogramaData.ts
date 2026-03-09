export interface CronogramaItem {
  id: string;
  descricao: string;
  parentId?: string;
}

export interface CronogramaCategory {
  id: string;
  numero: number;
  nome: string;
  items: CronogramaItem[];
}

export type CronogramaDayStatus = "planned" | "done" | "delayed" | "none";

export interface CronogramaStore {
  cells: Record<string, CronogramaDayStatus>;
  startDate: string; // date when day 1 starts
  // key: itemId → { inicio, fim }
  itemDates: Record<string, { inicio: string; fim: string }>;
  // key: itemId → { inicioReal, fimReal }
  itemDatesReal: Record<string, { inicioReal: string; fimReal: string }>;
  // key: itemId → action plan text
  actionPlans: Record<string, string>;
}

export const TOTAL_DAYS = 30;

export const cronogramaCategorias: CronogramaCategory[] = [
  {
    id: "cron-1",
    numero: 1,
    nome: "DIVERSOS",
    items: [
      { id: "1.1", descricao: "Fornecimento de Seguro de Obra", parentId: "cron-1" },
      { id: "1.2", descricao: "Fornecimento de ART de Execução", parentId: "cron-1" },
      { id: "1.3", descricao: "Mobilização e Desmobilização", parentId: "cron-1" },
      { id: "1.4", descricao: "Equipe de gerenciamento de obra", parentId: "cron-1" },
    ],
  },
  {
    id: "cron-2",
    numero: 2,
    nome: "DEMOLIÇÃO",
    items: [
      { id: "2.1", descricao: "Demolição do Piso", parentId: "cron-2" },
      { id: "2.2", descricao: "Demolição do forro", parentId: "cron-2" },
      { id: "2.3", descricao: "Demolição de parede", parentId: "cron-2" },
      { id: "2.4", descricao: "Demolição da Fachada", parentId: "cron-2" },
      { id: "2.5", descricao: "Bota Fora", parentId: "cron-2" },
    ],
  },
  {
    id: "cron-3",
    numero: 3,
    nome: "DRYWALL",
    items: [
      { id: "3.1", descricao: "Paredes drywall", parentId: "cron-3" },
      { id: "3.2", descricao: "Forro drywall", parentId: "cron-3" },
      { id: "3.3", descricao: "Fechamento mezanino", parentId: "cron-3" },
    ],
  },
  {
    id: "cron-4",
    numero: 4,
    nome: "MEZANINO",
    items: [
      { id: "4.1", descricao: "Execução do mezanino com estrutura metálica (CONFORME PROJETO)", parentId: "cron-4" },
      { id: "4.2", descricao: "Execução da escada em estrutura metálica com chapa dobrada", parentId: "cron-4" },
    ],
  },
  {
    id: "cron-5",
    numero: 5,
    nome: "ELÉTRICA",
    items: [
      { id: "5.1", descricao: "Fornecimento e Instalação do QDC", parentId: "cron-5" },
      { id: "5.2", descricao: "Passagem de circuitos de iluminação e tomadas", parentId: "cron-5" },
      { id: "5.3", descricao: "Passagens de cabos e ligação do equipamento de som", parentId: "cron-5" },
      { id: "5.4", descricao: "Infra para dados e som", parentId: "cron-5" },
      { id: "5.5", descricao: "Passagens de cabos de dados", parentId: "cron-5" },
      { id: "5.6", descricao: "Fornecimento e instalação de luminárias de emergência", parentId: "cron-5" },
      { id: "5.7", descricao: "Instalações das eletrocalhas e luminárias", parentId: "cron-5" },
    ],
  },
  {
    id: "cron-6",
    numero: 6,
    nome: "AR CONDICIONADO",
    items: [
      { id: "6.1", descricao: "Fabricação e instalação de dutos", parentId: "cron-6" },
      { id: "6.2", descricao: "Instalação de fancoil", parentId: "cron-6" },
    ],
  },
  {
    id: "cron-7",
    numero: 7,
    nome: "INCÊNDIO",
    items: [
      { id: "7.1", descricao: "Execução da rede de Sprinklers (CONFORME PROJETO)", parentId: "cron-7" },
      { id: "7.2", descricao: "Execução do sistema de detecção (CONFORME PROJETO)", parentId: "cron-7" },
      { id: "7.3", descricao: "Fornecimento e instalação da sinalização de emergência", parentId: "cron-7" },
      { id: "7.4", descricao: "Fornecimento e instalação dos extintores de incêndio", parentId: "cron-7" },
    ],
  },
  {
    id: "cron-8",
    numero: 8,
    nome: "FACHADA",
    items: [
      { id: "8.1", descricao: "Estrutura metálica para sustentação do pórtico da fachada", parentId: "cron-8" },
      { id: "8.2", descricao: "Estrutura metálica inferior para sustentação do rodapé", parentId: "cron-8" },
      { id: "8.3", descricao: "Letreiro - letra caixa com profundidade de 40mm", parentId: "cron-8" },
      { id: "8.4", descricao: "Acabamento em ACM no pórtico", parentId: "cron-8" },
      { id: "8.5", descricao: "Fornecimento e instalação de porta automática transvisions", parentId: "cron-8" },
      { id: "8.6", descricao: "Pintura da porta automática", parentId: "cron-8" },
      { id: "8.7", descricao: "Perfil metálico de sustentação da porta de enrolar e vitrine", parentId: "cron-8" },
      { id: "8.8", descricao: "Rodapé e soleira em granito polido marrom absoluto", parentId: "cron-8" },
    ],
  },
  {
    id: "cron-9",
    numero: 9,
    nome: "PAREDES / REVESTIMENTOS / PINTURA",
    items: [
      { id: "9.1", descricao: "Regularização do contrapiso", parentId: "cron-9" },
      { id: "9.2", descricao: "Mão de obra para assentamento do porcelanato", parentId: "cron-9" },
      { id: "9.3", descricao: "Pintura das paredes em drywall na cor lebre", parentId: "cron-9" },
      { id: "9.4", descricao: "Pintura do teto", parentId: "cron-9" },
      { id: "9.5", descricao: "Instalação da teca lisa", parentId: "cron-9" },
      { id: "9.6", descricao: "Fornecimento e instalação de porta MDF branca", parentId: "cron-9" },
      { id: "9.7", descricao: "Fornecimento e instalação de espelhos", parentId: "cron-9" },
    ],
  },
  {
    id: "cron-10",
    numero: 10,
    nome: "LIMPEZA FINAL DA OBRA",
    items: [],
  },
  {
    id: "cron-11",
    numero: 11,
    nome: "ENTRADA DOS MÓVEIS",
    items: [],
  },
];

export function createDefaultCronograma(): CronogramaStore {
  return {
    cells: {},
    startDate: "",
    itemDates: {},
    itemDatesReal: {},
    actionPlans: {},
  };
}
