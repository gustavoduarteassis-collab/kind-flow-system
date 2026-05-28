export type VisitaStatusType = "NAO_INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO" | "NAO_SE_APLICA";

export const visitaStatusLabels: Record<VisitaStatusType, string> = {
  NAO_INICIADO: "Não Iniciado",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDO: "Concluído",
  NAO_SE_APLICA: "N/A",
};

export const visitaStatusColors: Record<VisitaStatusType, string> = {
  NAO_INICIADO: "bg-[hsl(0,84%,60%)] text-white",
  EM_ANDAMENTO: "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  CONCLUIDO: "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]",
  NAO_SE_APLICA: "bg-muted text-muted-foreground",
};

export interface VisitaItem {
  id: string;
  nome: string;
  orientacao: string;
}

export interface VisitaCategory {
  id: string;
  nome: string;
  items: VisitaItem[];
}

export interface VisitaItemData {
  status: VisitaStatusType;
  observacoes: string;
  photos: string[];
}

export interface VisitaSignatures {
  construtora: string;
  analista: string;
  franqueado: string;
}

export interface VisitaTecnicaData {
  dataVisita: string;
  dataInaugAposVisita: string;
  chegadaMoveis: string;
  chegadaProdutos: string;
  items: Record<string, VisitaItemData>;
  signatures: VisitaSignatures;
  // legacy fields kept for backwards compat
  dataInaugPrevista?: string;
  dataSkytef?: string;
  dataDatasystem?: string;
}

export const createDefaultVisitaTecnica = (): VisitaTecnicaData => ({
  dataVisita: "",
  dataInaugAposVisita: "",
  chegadaMoveis: "",
  chegadaProdutos: "",
  items: {},
  signatures: { construtora: "", analista: "", franqueado: "" },
});

export const visitaTecnicaCategories: VisitaCategory[] = [
  {
    id: "vt-geral",
    nome: "Geral / Alinhamento",
    items: [
      { id: "vt-01", nome: "Agendar visita", orientacao: "Agendar com o franqueado e construtora a data de visita em loja." },
      { id: "vt-02", nome: "Projetos", orientacao: "Conferir se os projetos na loja estão com a revisão correta. Deixar o arquitetônico impresso na parede." },
      { id: "vt-03", nome: "Cronograma da loja", orientacao: "Repassar toda a parte de obra com etapas para saber sobre a data de inauguração." },
      { id: "vt-04", nome: "Alinhamento da loja", orientacao: "Verificar alinhamento com a rua/mall. Estrutura 2cm recuada da fachada para rodapé/ACM." },
      { id: "vt-05", nome: "Pé direito", orientacao: "Verificar a altura do pé direito e orientar a altura mínima das instalações." },
      { id: "vt-06", nome: "Paredes em drywall", orientacao: "Conferir junto com o construtor toda a medida final da loja." },
    ],
  },
  {
    id: "vt-estrutura",
    nome: "Estrutura",
    items: [
      { id: "vt-07", nome: "Estrutura do mezanino", orientacao: "Verificar quantidade de vigas, tamanho, tipo, pilares, piso wall e estabilidade." },
      { id: "vt-08", nome: "Estrutura da fachada e vidro", orientacao: "Verificar altura da estrutura do vidro e metalon para ACM, alinhado com rodapé." },
      { id: "vt-09", nome: "Vão da escada", orientacao: "Conferir a largura. Orientar sobre cuidado de vistoria e bombeiro." },
      { id: "vt-10", nome: "Escada e rodapé", orientacao: "Orientar rodapé conforme projeto e frisos nos degraus." },
      { id: "vt-11", nome: "Corrimão", orientacao: "Orientar instalação e reforço nas paredes." },
    ],
  },
  {
    id: "vt-fachada",
    nome: "Fachada",
    items: [
      { id: "vt-12", nome: "Letreiro (cor, tamanho, acabamento, iluminação)", orientacao: "Verificar letra e cor do ACM, pintura automotiva. Letreiro em vidro: adesivo no verso." },
      { id: "vt-13", nome: "ACM (cor, tamanho, acabamento)", orientacao: "Verificar cor e aprovação, se finaliza no rodapé da fachada e dimensões conforme projeto." },
      { id: "vt-14", nome: "Vidro", orientacao: "Vidro 10mm temperado. Verificar data de entrega. Silicone com fita crepe nas juntas." },
      { id: "vt-15", nome: "Rodapé (tamanho e acabamento)", orientacao: "Verificar onde solicita no projeto e acabamento laterais." },
      { id: "vt-16", nome: "Soleira", orientacao: "Lembrar do corte para as antenas. Pontos antes da soleira." },
      { id: "vt-17", nome: "Perfil do vidro bronze", orientacao: "Verificar a canaleta para tampar a base da vitrine." },
      { id: "vt-18", nome: "Pintura Externa", orientacao: "Verificar se tem pintura de arenato e disponibilidade na cidade." },
      { id: "vt-19", nome: "Portão de enrolar", orientacao: "Verificar portinhola, alçapão, acabamento embutido e pintura automotiva." },
    ],
  },
  {
    id: "vt-eletrica",
    nome: "Elétrica e Instalações",
    items: [
      { id: "vt-20", nome: "Instalações para antena", orientacao: "Cobrar projeto checkpoint. Mostrar pontos e mangueiras. 1 ponto elétrico + 1 rede." },
      { id: "vt-21", nome: "Antena", orientacao: "Verificar prazo de entrega. Normalmente 1-2 dias antes da inauguração." },
      { id: "vt-22", nome: "Iluminação estantes de vitrine", orientacao: "Verificar pontos conforme elétrica abaixo da base da vitrine." },
      { id: "vt-23", nome: "Torre de iluminação", orientacao: "Verificar pontos elétricos, ponto de embutir e ponto de bolseiro." },
      { id: "vt-24", nome: "Alçapão de acesso ao portão", orientacao: "Verificar ponto na porta de enrolar. Evitar interferência com luminárias e vigas." },
      { id: "vt-25", nome: "Ponto elétrico para contator de fluxo", orientacao: "Conferir ponto e rede. Tomada no forro, altura 2,5m a 5,5m." },
      { id: "vt-26", nome: "Contador de fluxo", orientacao: "Verificar envio para Virtual Gate. Foto do modem e forro de instalação." },
      { id: "vt-27", nome: "Interruptor na porta de entrada", orientacao: "Verificar local de instalação. Se ruim, verificar com arquitetura." },
      { id: "vt-28", nome: "Ponto elétrico no piso para PDX", orientacao: "Conferir pontos conforme projeto arquitetônico do piso." },
      { id: "vt-29", nome: "Quadro elétrico (Montagem e instalação)", orientacao: "Conferir conforme projeto. Ver contator, timer e circuitos." },
      { id: "vt-30", nome: "Ponto para roteador", orientacao: "Conferir e orientar local. Deixar no forro." },
      { id: "vt-31", nome: "Luminárias", orientacao: "Verificar projeto elétrico dos pontos no forro, vitrine e externa. Data de entrega." },
      { id: "vt-32", nome: "Iluminação torre de acessórios", orientacao: "Verificar se o ponto foi instalado no piso." },
      { id: "vt-33", nome: "Luminária de emergência", orientacao: "Conferir cabos passados. Sempre ter acima do PDX." },
      { id: "vt-34", nome: "Iluminação escada", orientacao: "Verificar ponto de iluminação na escada." },
      { id: "vt-35", nome: "Som amplificador", orientacao: "Conferir pontos de caixa de som. Deixar 1,5m de sobra no cabo. Ponto PDX ao fundo." },
      { id: "vt-36", nome: "Caixa de som escada", orientacao: "Ponto de som na escada." },
    ],
  },
  {
    id: "vt-acabamento",
    nome: "Acabamento e Revestimento",
    items: [
      { id: "vt-37", nome: "Meia parede para painel de louro freijó", orientacao: "Orientar execução estruturada devido ao peso. Verificar altura (200cm do chão)." },
      { id: "vt-38", nome: "Porcelanato", orientacao: "Iniciar alinhado com a soleira do granito. Atentar com perdas nos cortes." },
      { id: "vt-39", nome: "Pintura geral", orientacao: "Repassar áreas e cores conforme projeto. Verificar textura." },
      { id: "vt-40", nome: "Eco granito", orientacao: "No caso de outlet, verificar se foi solicitado e a área." },
      { id: "vt-41", nome: "Portas de MDF e porta com espelho/pintura", orientacao: "Portas de espelho faceadas com parede drywall, sem marco. Conferir tamanho MDF." },
      { id: "vt-42", nome: "Espelhos", orientacao: "Repassar todos os espelhos. Cantoneiras 45° branca nos móveis e aço escovado nos pilares." },
      { id: "vt-43", nome: "Boneca para prateleira 32cm", orientacao: "Conferir parede de acoplamento do mobiliário para não ter dente." },
      { id: "vt-44", nome: "Papel vinílico", orientacao: "Orientar parede sem detalhes para acabamento perfeito." },
      { id: "vt-45", nome: "Piso laminado", orientacao: "Orientar paginação e verificar se o piso foi encontrado." },
      { id: "vt-46", nome: "Pintura área de apoio", orientacao: "Orientar pinturas. Se alterar cor para economia, aprovar com arquitetura." },
      { id: "vt-47", nome: "Piso área de apoio", orientacao: "Verificar se está em bom estado e se vão alterar." },
    ],
  },
  {
    id: "vt-climatizacao",
    nome: "Climatização e Segurança",
    items: [
      { id: "vt-48", nome: "Ar condicionado", orientacao: "Verificar pontos, grelhas, posições, tipo de grelha e equipamento. Conferir medidas da sanca." },
      { id: "vt-49", nome: "Câmeras", orientacao: "Conferir pontos e cabos. DVR com portas disponíveis. Loja de rua: 2 externas. Posicionar para closets e PDX." },
      { id: "vt-50", nome: "Extintor de incêndio", orientacao: "Repassar quantidade e tipo conforme projeto." },
      { id: "vt-51", nome: "Sinalização de emergência", orientacao: "Repassar todas as placas de sinalização para compra." },
    ],
  },
  {
    id: "vt-outros",
    nome: "Outros / Finalizações",
    items: [
      { id: "vt-52", nome: "Cuba", orientacao: "Verificar se foi comprado (se aplicável)." },
      { id: "vt-53", nome: "Rack (Instalação e organização)", orientacao: "Orientar local e cabos. Som ficará no PDX." },
      { id: "vt-54", nome: "Bancada em granito", orientacao: "Conferir se foi solicitado e local de instalação (se aplicável)." },
      { id: "vt-55", nome: "Vaso de planta vitrine", orientacao: "Verificar se já foi comprado." },
      { id: "vt-56", nome: "Planta vitrine", orientacao: "Verificar se comprou, onde instalar e se tem quem faça." },
      { id: "vt-57", nome: "Móveis", orientacao: "Conferir recebimento dos móveis." },
      { id: "vt-58", nome: "Checklist final", orientacao: "Repassar todo checklist pessoalmente: o que falta comprar e andamento das compras." },
    ],
  },
];
