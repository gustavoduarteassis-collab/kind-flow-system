export type InaugStatusType = "NAO_ATENDIDO" | "EM_ANDAMENTO" | "TOTALMENTE_ATENDIDO" | "NAO_SE_APLICA";

export const inaugStatusLabels: Record<InaugStatusType, string> = {
  NAO_ATENDIDO: "Não Atendido",
  EM_ANDAMENTO: "Em Andamento",
  TOTALMENTE_ATENDIDO: "Realizado",
  NAO_SE_APLICA: "Não se Aplica",
};

export const inaugStatusColors: Record<InaugStatusType, string> = {
  NAO_ATENDIDO: "bg-[hsl(0,84%,60%)] text-white",
  EM_ANDAMENTO: "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  TOTALMENTE_ATENDIDO: "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]",
  NAO_SE_APLICA: "bg-muted text-muted-foreground",
};

export interface InaugItem {
  id: string;
  nome: string;
  impeditivo?: boolean;
}

export interface InaugCategory {
  id: string;
  nome: string;
  items: InaugItem[];
}

export interface InaugChecklist {
  tipo: "rua" | "shopping";
  categories: InaugCategory[];
}

const ruaCategories: InaugCategory[] = [
  {
    id: "rua-fachada",
    nome: "Fachada/Vitrine",
    items: [
      { id: "rua-1", nome: "Marcação de vagas: pintura, dimensão" },
      { id: "rua-2", nome: "Calçada: condições, pintura" },
      { id: "rua-3", nome: "Jardim: plantio, acabamento" },
      { id: "rua-4", nome: "Totem: acabamento, dimensão e iluminação" },
      { id: "rua-5", nome: "Toldo: fixação, material e cor" },
      { id: "rua-6", nome: "Tapete: dimensão" },
      { id: "rua-7", nome: "Brise: acabamento e espaçamento (conforme projeto)" },
      { id: "rua-8", nome: "ACM: instalação, pintura e acabamento" },
      { id: "rua-9", nome: "Pintura: textura" },
      { id: "rua-10", nome: "Vidro: verificar aplicação do silicone nas juntas" },
      { id: "rua-11", nome: "Vidro: perfil na cor bronze" },
      { id: "rua-12", nome: "Letreiro: acabamento" },
      { id: "rua-13", nome: "Letreiro: adesivo no verso" },
      { id: "rua-14", nome: "Letreiro: dimensão" },
      { id: "rua-15", nome: "Letreiro: iluminação (atenção: deixar o fio cristal esticado)" },
      { id: "rua-16", nome: "Bandeira fixa: iluminação, acabamento e dimensão" },
      { id: "rua-17", nome: "Rodapé: pedra, acabamento e rejunte" },
      { id: "rua-18", nome: "Soleira: acabamento e furo para instalação das antenas" },
      { id: "rua-19", nome: "Antena: instalação e teste" },
      { id: "rua-20", nome: "Portão de enrolar: instalação" },
      { id: "rua-21", nome: "Portão de enrolar: pintura do portão e perfil guia" },
      { id: "rua-22", nome: "Alçapão: acesso ao motor do portão de enrolar" },
      { id: "rua-23", nome: "Pintura interna: preenchimento lateral e forro (Cor: Branco Neve Suvinil)" },
      { id: "rua-24", nome: "Trilho VM: cor e local" },
      { id: "rua-25", nome: "Iluminação: refletor" },
      { id: "rua-26", nome: "Iluminação: forro" },
      { id: "rua-27", nome: "Torre de iluminação: local (na base e/ou na parede)" },
      { id: "rua-28", nome: "Contador de fluxo: ponto elétrico e instalação" },
      { id: "rua-29", nome: "Interruptor: porta de entrada" },
      { id: "rua-30", nome: "Painel Louro Freijó interno: meia parede (verificar acabamento superior)" },
      { id: "rua-31", nome: "Paisagismo: vaso e planta" },
      { id: "rua-32", nome: "Adesivo: 'Seja um franqueado'", impeditivo: true },
    ],
  },
  {
    id: "rua-terreo",
    nome: "Loja Térreo",
    items: [
      { id: "rua-33", nome: "Drywall: fechamentos (Light: arco da área do puff)" },
      { id: "rua-34", nome: "Rejunte: porcelanato" },
      { id: "rua-35", nome: "Ponto elétrico para PDX: ponto no piso" },
      { id: "rua-36", nome: "Teca" },
      { id: "rua-37", nome: "Virada da testeira com forro: acabamento" },
      { id: "rua-38", nome: "Pintura: forro" },
      { id: "rua-39", nome: "Pintura: paredes (Cor: Branco Neve Suvinil)" },
      { id: "rua-40", nome: "Perfil de iluminação: cor e dimensão nos closets" },
      { id: "rua-41", nome: "Spots: direcionamento" },
      { id: "rua-42", nome: "Luminárias de embutir: iluminar a teca e corredor da loja" },
      { id: "rua-43", nome: "Luminárias de emergência", impeditivo: true },
      { id: "rua-44", nome: "Ar condicionado: funcionamento e instalação das grelhas", impeditivo: true },
      { id: "rua-45", nome: "Caixa de som" },
      { id: "rua-46", nome: "Som amplificador" },
      { id: "rua-47", nome: "Roteador: ponto no entreforro" },
      { id: "rua-48", nome: "Câmeras: posicionamento e teste" },
      { id: "rua-49", nome: "Espelhos", impeditivo: true },
      { id: "rua-50", nome: "Cantoneiras para os espelhos: expositores cor branca, pilar alumínio" },
      { id: "rua-51", nome: "Portas: quantidade, sentido de abertura, acabamento, grelha de retorno" },
      { id: "rua-52", nome: "Extintor de incêndio: sinalização e posicionamento", impeditivo: true },
      { id: "rua-53", nome: "Sinalização de emergência: instalação", impeditivo: true },
      { id: "rua-54", nome: "Paisagismo: vaso e planta" },
      { id: "rua-55", nome: "Quadro elétrico: montagem, instalação e identificação", impeditivo: true },
    ],
  },
  {
    id: "rua-escada",
    nome: "Escada de Acesso ao Mezanino",
    items: [
      { id: "rua-56", nome: "Piso: rejunte, meia esquadria" },
      { id: "rua-57", nome: "Acabamento antiderrapante: tarja, friso ou desgaste na pedra" },
      { id: "rua-58", nome: "Rodapé: rejunte, meia esquadria" },
      { id: "rua-59", nome: "Adesivo vinílico: acabamento" },
      { id: "rua-60", nome: "Corrimão", impeditivo: true },
      { id: "rua-61", nome: "Acabamento escada/piso mezanino: cantoneira em alumínio" },
      { id: "rua-62", nome: "Iluminação" },
      { id: "rua-63", nome: "Caixa de som: instalação e teste" },
      { id: "rua-64", nome: "Câmeras: instalação e teste" },
    ],
  },
  {
    id: "rua-mezanino",
    nome: "Loja Mezanino",
    items: [
      { id: "rua-65", nome: "Drywall: fechamentos (Light: arco da área do puff)" },
      { id: "rua-66", nome: "Piso: acabamento" },
      { id: "rua-67", nome: "Cantoneira de acabamento mezanino/escada: cor bronze ou alumínio natural" },
      { id: "rua-68", nome: "Rodapé" },
      { id: "rua-69", nome: "Pintura: forro" },
      { id: "rua-70", nome: "Pintura: paredes" },
      { id: "rua-71", nome: "Guarda-corpo em vidro: acabamento, fixação" },
      { id: "rua-72", nome: "Roteador: ponto" },
      { id: "rua-73", nome: "Perfil de iluminação: cor e dimensão nos closets" },
      { id: "rua-74", nome: "Spots: direcionamento" },
      { id: "rua-75", nome: "Ar condicionado: funcionamento e instalação das grelhas", impeditivo: true },
      { id: "rua-76", nome: "Caixa de som" },
      { id: "rua-77", nome: "Câmeras: posicionamento e teste" },
      { id: "rua-78", nome: "Luminárias de embutir: iluminar a teca e corredor da loja" },
      { id: "rua-79", nome: "Luminárias de emergência", impeditivo: true },
      { id: "rua-80", nome: "Espelhos", impeditivo: true },
      { id: "rua-81", nome: "Cantoneiras para os espelhos" },
      { id: "rua-82", nome: "Portas: quantidade, sentido de abertura, acabamento, grelha de retorno" },
      { id: "rua-83", nome: "Extintor de incêndio: sinalização e posicionamento", impeditivo: true },
      { id: "rua-84", nome: "Sinalização de emergência: instalação", impeditivo: true },
      { id: "rua-85", nome: "Paisagismo: vaso e planta" },
    ],
  },
  {
    id: "rua-apoio",
    nome: "Área de Apoio",
    items: [
      { id: "rua-86", nome: "Pintura" },
      { id: "rua-87", nome: "Luminárias" },
      { id: "rua-88", nome: "Piso" },
      { id: "rua-89", nome: "Rack: instalação e organização", impeditivo: true },
      { id: "rua-90", nome: "Relógio de ponto: loja própria" },
    ],
  },
  {
    id: "rua-sanitario",
    nome: "Instalação Sanitária",
    items: [
      { id: "rua-91", nome: "Parede: pintura ou revestimento com porcelanato" },
      { id: "rua-92", nome: "Porta" },
      { id: "rua-93", nome: "Cuba" },
      { id: "rua-94", nome: "Vaso sanitário" },
      { id: "rua-95", nome: "Espelho" },
      { id: "rua-96", nome: "Itens de banheiro: papeleira, saboneteira, lixeira" },
    ],
  },
  {
    id: "rua-mobiliario",
    nome: "Acabamento Mobiliário",
    items: [
      { id: "rua-97", nome: "Painel Louro Freijó: vitrine" },
      { id: "rua-98", nome: "Estantes: vitrine, iluminação" },
      { id: "rua-99", nome: "Base: vitrine" },
      { id: "rua-100", nome: "Cubos" },
      { id: "rua-101", nome: "Aparadores" },
      { id: "rua-102", nome: "Bolseiro: iluminação na área dos ganchos" },
      { id: "rua-103", nome: "Chineleiro: iluminação na área dos ganchos" },
      { id: "rua-104", nome: "Ilha de encantamento: cubos, cachepô para árvore e puff baú" },
      { id: "rua-105", nome: "Expositores: dimensão, quantidade de prateleiras" },
      { id: "rua-106", nome: "PDX" },
      { id: "rua-107", nome: "Torre de acessórios: tipo de spot, iluminação" },
      { id: "rua-108", nome: "Painel Louro Freijó: interno na loja" },
      { id: "rua-109", nome: "Porta em Louro Freijó: puxador, alinhamento" },
      { id: "rua-110", nome: "Painel Louro Freijó: encosto do puff" },
      { id: "rua-111", nome: "Puff" },
      { id: "rua-112", nome: "Espelho com moldura" },
      { id: "rua-113", nome: "Banco em madeira: interno" },
      { id: "rua-114", nome: "Painel de ondas" },
    ],
  },
  {
    id: "rua-informatica",
    nome: "Informática e Sistema",
    items: [
      { id: "rua-115", nome: "CPU" },
      { id: "rua-116", nome: "Monitor: instalação" },
      { id: "rua-117", nome: "Nobreak" },
      { id: "rua-118", nome: "Leitores" },
      { id: "rua-119", nome: "Impressoras térmicas (Bematech/Elgin): instalação e teste", impeditivo: true },
      { id: "rua-120", nome: "Impressoras Zebras (etiquetas branca/amarela): instalação e teste", impeditivo: true },
      { id: "rua-121", nome: "Pin Pad", impeditivo: true },
      { id: "rua-122", nome: "LIO: quantidade e configuração", impeditivo: true },
      { id: "rua-123", nome: "Sistema USE: instalação", impeditivo: true },
      { id: "rua-124", nome: "SKYTEF (conciliadora de cartão): instalação", impeditivo: true },
      { id: "rua-125", nome: "Omnichannel", impeditivo: true },
      { id: "rua-126", nome: "Venda teste de cartão (crédito/débito)", impeditivo: true },
      { id: "rua-127", nome: "Venda link: configuração e conferir no portal da Cielo", impeditivo: true },
      { id: "rua-128", nome: "Venda PIX", impeditivo: true },
      { id: "rua-129", nome: "Venda por encomenda", impeditivo: true },
      { id: "rua-130", nome: "Dados da nota fiscal" },
      { id: "rua-131", nome: "Rolos de etiquetas e Ribbon", impeditivo: true },
      { id: "rua-132", nome: "Coletor de dados: para auditoria" },
      { id: "rua-133", nome: "Listenx", impeditivo: true },
    ],
  },
  {
    id: "rua-finalizacao",
    nome: "Finalização",
    items: [
      { id: "rua-134", nome: "Campanha vigente: validar com o Trade Marketing" },
      { id: "rua-135", nome: "Alarmagem dos produtos", impeditivo: true },
      { id: "rua-136", nome: "Reposição", impeditivo: true },
      { id: "rua-137", nome: "Kit Visual Merchandising: adesivos, placas de numeração, suporte e expositor acrílico", impeditivo: true },
      { id: "rua-138", nome: "Blocos expositores em MDF" },
      { id: "rua-139", nome: "Suportes metálicos" },
      { id: "rua-140", nome: "Precificadores: kit preto e vermelho", impeditivo: true },
      { id: "rua-141", nome: "Sacola Print Bag: modelo de papel", impeditivo: true },
      { id: "rua-142", nome: "Sacola trapézio: modelo de tecido preto", impeditivo: true },
      { id: "rua-143", nome: "Lixeiras: cor preto" },
      { id: "rua-144", nome: "Cartão de visita" },
      { id: "rua-145", nome: "Cartão de relacionamentos" },
      { id: "rua-146", nome: "Embalagem e-commerce (Coex, etiqueta, papel kraft)" },
      { id: "rua-147", nome: "Contrato com os Correios", impeditivo: true },
      { id: "rua-148", nome: "Uniforme", impeditivo: true },
      { id: "rua-149", nome: "Montagem da loja - enviar vídeo para validação da equipe de Trade", impeditivo: true },
      { id: "rua-150", nome: "Universidade Constance", impeditivo: true },
    ],
  },
];

const shoppingCategories: InaugCategory[] = [
  {
    id: "shop-fachada",
    nome: "Fachada/Vitrine",
    items: [
      { id: "shop-1", nome: "ACM: instalação, pintura e acabamento" },
      { id: "shop-2", nome: "Painel Louro Freijó externo: acabamento" },
      { id: "shop-3", nome: "Vidro: verificar aplicação do silicone nas juntas" },
      { id: "shop-4", nome: "Vidro: perfil na cor bronze" },
      { id: "shop-5", nome: "Letreiro: acabamento, fio sobre a letra" },
      { id: "shop-6", nome: "Letreiro: adesivo no verso" },
      { id: "shop-7", nome: "Letreiro: dimensão" },
      { id: "shop-8", nome: "Letreiro: iluminação (atenção: deixar o fio cristal esticado)" },
      { id: "shop-9", nome: "Rodapé: pedra, acabamento e rejunte" },
      { id: "shop-10", nome: "Soleira: acabamento e furo para instalação das antenas" },
      { id: "shop-11", nome: "Antena: instalação e teste" },
      { id: "shop-12", nome: "Portão de enrolar: instalação" },
      { id: "shop-13", nome: "Portão de enrolar: pintura do portão e perfil guia" },
      { id: "shop-14", nome: "Alçapão: acesso ao motor do portão de enrolar" },
      { id: "shop-15", nome: "Pintura" },
      { id: "shop-16", nome: "Trilho VM: cor e local" },
      { id: "shop-17", nome: "Iluminação" },
      { id: "shop-18", nome: "Torre de iluminação: local (na base e/ou na parede)" },
      { id: "shop-19", nome: "Contador de fluxo: ponto elétrico e instalação" },
      { id: "shop-20", nome: "Interruptor: porta de entrada" },
      { id: "shop-21", nome: "Painel Louro Freijó interno: meia parede (verificar acabamento superior)" },
      { id: "shop-22", nome: "Paisagismo: vaso e planta" },
      { id: "shop-23", nome: "Adesivo: 'Seja um franqueado'", impeditivo: true },
    ],
  },
  {
    id: "shop-terreo",
    nome: "Loja Térreo",
    items: [
      { id: "shop-24", nome: "Drywall: fechamentos (Light: arco da área do puff)" },
      { id: "shop-25", nome: "Rejunte: porcelanato" },
      { id: "shop-26", nome: "Ponto elétrico para PDX: ponto no piso" },
      { id: "shop-27", nome: "Teca" },
      { id: "shop-28", nome: "Virada da testeira com forro: acabamento" },
      { id: "shop-29", nome: "Pintura: forro" },
      { id: "shop-30", nome: "Pintura: paredes (Cor: Branco Neve Suvinil)" },
      { id: "shop-31", nome: "Perfil de iluminação: cor e dimensão nos closets" },
      { id: "shop-32", nome: "Spots: direcionamento" },
      { id: "shop-33", nome: "Luminárias de embutir: iluminar a teca e corredor da loja" },
      { id: "shop-34", nome: "Luminárias de emergência", impeditivo: true },
      { id: "shop-35", nome: "Ar condicionado: funcionamento e instalação das grelhas", impeditivo: true },
      { id: "shop-36", nome: "Caixa de som" },
      { id: "shop-37", nome: "Som amplificador" },
      { id: "shop-38", nome: "Roteador: ponto no entreforro" },
      { id: "shop-39", nome: "Câmeras: posicionamento e teste" },
      { id: "shop-40", nome: "Espelhos", impeditivo: true },
      { id: "shop-41", nome: "Cantoneiras para os espelhos: expositores cor branca, pilar alumínio" },
      { id: "shop-42", nome: "Portas: quantidade, sentido de abertura, acabamento, grelha de retorno" },
      { id: "shop-43", nome: "Extintor de incêndio: sinalização e posicionamento", impeditivo: true },
      { id: "shop-44", nome: "Sinalização de emergência: instalação", impeditivo: true },
      { id: "shop-45", nome: "Paisagismo: vaso e planta" },
      { id: "shop-46", nome: "Quadro elétrico: montagem, instalação e identificação", impeditivo: true },
    ],
  },
  {
    id: "shop-escada",
    nome: "Escada de Acesso ao Mezanino",
    items: [
      { id: "shop-47", nome: "Piso: rejunte, meia esquadria" },
      { id: "shop-48", nome: "Acabamento antiderrapante: tarja, friso ou desgaste na pedra" },
      { id: "shop-49", nome: "Rodapé: rejunte, meia esquadria" },
      { id: "shop-50", nome: "Adesivo vinílico: acabamento" },
      { id: "shop-51", nome: "Corrimão", impeditivo: true },
      { id: "shop-52", nome: "Acabamento escada/piso mezanino: cantoneira em alumínio" },
      { id: "shop-53", nome: "Iluminação" },
      { id: "shop-54", nome: "Caixa de som: instalação e teste" },
      { id: "shop-55", nome: "Câmeras: instalação e teste" },
    ],
  },
  {
    id: "shop-mezanino",
    nome: "Loja Mezanino",
    items: [
      { id: "shop-56", nome: "Drywall: fechamentos (Light: arco da área do puff)" },
      { id: "shop-57", nome: "Piso: acabamento" },
      { id: "shop-58", nome: "Cantoneira de acabamento mezanino/escada: cor bronze ou alumínio natural" },
      { id: "shop-59", nome: "Rodapé" },
      { id: "shop-60", nome: "Pintura: forro" },
      { id: "shop-61", nome: "Pintura: paredes" },
      { id: "shop-62", nome: "Guarda-corpo em vidro: acabamento, fixação" },
      { id: "shop-63", nome: "Roteador: ponto" },
      { id: "shop-64", nome: "Perfil de iluminação: cor e dimensão nos closets" },
      { id: "shop-65", nome: "Spots: direcionamento" },
      { id: "shop-66", nome: "Ar condicionado: funcionamento e instalação das grelhas", impeditivo: true },
      { id: "shop-67", nome: "Caixa de som" },
      { id: "shop-68", nome: "Câmeras: posicionamento e teste" },
      { id: "shop-69", nome: "Luminárias de embutir: iluminar a teca e corredor da loja" },
      { id: "shop-70", nome: "Luminárias de emergência", impeditivo: true },
      { id: "shop-71", nome: "Espelhos", impeditivo: true },
      { id: "shop-72", nome: "Cantoneiras para os espelhos" },
      { id: "shop-73", nome: "Portas: quantidade, sentido de abertura, acabamento, grelha de retorno" },
      { id: "shop-74", nome: "Extintor de incêndio: sinalização e posicionamento", impeditivo: true },
      { id: "shop-75", nome: "Sinalização de emergência: instalação", impeditivo: true },
      { id: "shop-76", nome: "Paisagismo: vaso e planta" },
    ],
  },
  {
    id: "shop-apoio",
    nome: "Área de Apoio",
    items: [
      { id: "shop-77", nome: "Pintura" },
      { id: "shop-78", nome: "Luminárias" },
      { id: "shop-79", nome: "Piso" },
      { id: "shop-80", nome: "Rack: instalação e organização", impeditivo: true },
      { id: "shop-81", nome: "Relógio de ponto: loja própria" },
    ],
  },
  {
    id: "shop-maquina",
    nome: "Casa de Máquina",
    items: [
      { id: "shop-82", nome: "Pintura" },
      { id: "shop-83", nome: "Porta" },
      { id: "shop-84", nome: "Fancoil: circulação entorno do equipamento" },
    ],
  },
  {
    id: "shop-mobiliario",
    nome: "Acabamento Mobiliário",
    items: [
      { id: "shop-85", nome: "Painel Louro Freijó: vitrine" },
      { id: "shop-86", nome: "Estantes: vitrine, iluminação" },
      { id: "shop-87", nome: "Base: vitrine" },
      { id: "shop-88", nome: "Cubos" },
      { id: "shop-89", nome: "Aparadores" },
      { id: "shop-90", nome: "Bolseiro: iluminação na área dos ganchos" },
      { id: "shop-91", nome: "Chineleiro: iluminação na área dos ganchos" },
      { id: "shop-92", nome: "Ilha de encantamento: cubos, cachepô para árvore e puff baú" },
      { id: "shop-93", nome: "Expositores: dimensão, quantidade de prateleiras" },
      { id: "shop-94", nome: "PDX" },
      { id: "shop-95", nome: "Torre de acessórios: tipo de spot, iluminação" },
      { id: "shop-96", nome: "Painel Louro Freijó: interno na loja" },
      { id: "shop-97", nome: "Porta em Louro Freijó: puxador, alinhamento" },
      { id: "shop-98", nome: "Painel Louro Freijó: encosto do puff" },
      { id: "shop-99", nome: "Puff" },
      { id: "shop-100", nome: "Espelho com moldura" },
      { id: "shop-101", nome: "Banco em madeira: interno" },
      { id: "shop-102", nome: "Painel de ondas" },
    ],
  },
  {
    id: "shop-informatica",
    nome: "Informática e Sistema",
    items: [
      { id: "shop-103", nome: "CPU" },
      { id: "shop-104", nome: "Monitor: instalação" },
      { id: "shop-105", nome: "Nobreak" },
      { id: "shop-106", nome: "Leitores" },
      { id: "shop-107", nome: "Impressoras térmicas (Bematech/Elgin): instalação e teste", impeditivo: true },
      { id: "shop-108", nome: "Impressoras Zebras (etiquetas branca/amarela): instalação e teste", impeditivo: true },
      { id: "shop-109", nome: "Pin Pad", impeditivo: true },
      { id: "shop-110", nome: "LIO: quantidade e configuração", impeditivo: true },
      { id: "shop-111", nome: "Sistema USE: instalação", impeditivo: true },
      { id: "shop-112", nome: "SKYTEF (conciliadora de cartão): instalação", impeditivo: true },
      { id: "shop-113", nome: "Omnichannel", impeditivo: true },
      { id: "shop-114", nome: "Venda teste de cartão (crédito/débito)", impeditivo: true },
      { id: "shop-115", nome: "Venda link: configuração e conferir no portal da Cielo", impeditivo: true },
      { id: "shop-116", nome: "Venda PIX", impeditivo: true },
      { id: "shop-117", nome: "Venda por encomenda", impeditivo: true },
      { id: "shop-118", nome: "Dados da nota fiscal" },
      { id: "shop-119", nome: "Rolos de etiquetas e Ribbon", impeditivo: true },
      { id: "shop-120", nome: "Coletor de dados: para auditoria" },
      { id: "shop-121", nome: "Listenx", impeditivo: true },
    ],
  },
  {
    id: "shop-finalizacao",
    nome: "Finalização",
    items: [
      { id: "shop-122", nome: "Campanha vigente: validar com o Trade Marketing" },
      { id: "shop-123", nome: "Alarmagem dos produtos", impeditivo: true },
      { id: "shop-124", nome: "Reposição", impeditivo: true },
      { id: "shop-125", nome: "Kit Visual Merchandising: adesivos, placas de numeração, suporte e expositor acrílico", impeditivo: true },
      { id: "shop-126", nome: "Blocos expositores em MDF" },
      { id: "shop-127", nome: "Suportes metálicos" },
      { id: "shop-128", nome: "Precificadores: kit preto e vermelho", impeditivo: true },
      { id: "shop-129", nome: "Sacola Print Bag: modelo de papel", impeditivo: true },
      { id: "shop-130", nome: "Sacola trapézio: modelo de tecido preto", impeditivo: true },
      { id: "shop-131", nome: "Lixeiras: cor preto" },
      { id: "shop-132", nome: "Cartão de visita" },
      { id: "shop-133", nome: "Cartão de relacionamentos" },
      { id: "shop-134", nome: "Embalagem e-commerce (Coex, etiqueta, papel kraft)" },
      { id: "shop-135", nome: "Contrato com os Correios", impeditivo: true },
      { id: "shop-136", nome: "Uniforme", impeditivo: true },
      { id: "shop-137", nome: "Montagem da loja - enviar vídeo para validação da equipe de Trade", impeditivo: true },
      { id: "shop-138", nome: "Universidade Constance", impeditivo: true },
    ],
  },
];

export const inaugChecklistRua: InaugChecklist = {
  tipo: "rua",
  categories: ruaCategories,
};

export const inaugChecklistShopping: InaugChecklist = {
  tipo: "shopping",
  categories: shoppingCategories,
};

export function getInaugChecklist(tipo: "rua" | "shopping"): InaugChecklist {
  return tipo === "rua" ? inaugChecklistRua : inaugChecklistShopping;
}

export function getAllInaugItems(tipo: "rua" | "shopping"): InaugItem[] {
  const checklist = getInaugChecklist(tipo);
  return checklist.categories.flatMap((c) => c.items);
}

// Item data within a single round
export type InaugItemData = {
  status: InaugStatusType;
  observacoes: string;
  photos: string[]; // storage URLs
  prazo?: string; // ISO date - prazo de conclusão per item
};

// Signatures for a round
export type InaugSignatures = {
  franqueado?: string;
  analistaObra?: string;
  construtor?: string;
};

// A single checklist round/conferência
export type InaugRound = {
  id: string;
  date: string; // ISO date string - when this round was done
  deadline: string; // ISO date string - prazo de conclusão
  label: string; // e.g. "1ª Conferência"
  items: Record<string, InaugItemData>;
  signatures?: InaugSignatures;
  ressalva?: string; // Observação para liberação com ressalva
};

// V2 data format: multiple rounds
export type InaugChecklistDataV2 = {
  rounds: InaugRound[];
};

// Legacy flat format (for backward compatibility)
export type InaugChecklistDataLegacy = Record<string, {
  status: InaugStatusType;
  observacoes: string;
  data: string;
  prazo: string;
}>;

// The actual type stored in the DB (can be either)
export type InaugChecklistData = InaugChecklistDataV2;

// Migration helper: convert legacy data to v2
export function migrateInaugData(raw: any, tipo: "rua" | "shopping"): InaugChecklistDataV2 {
  if (!raw || (typeof raw === "object" && Object.keys(raw).length === 0)) {
    return { rounds: [] };
  }
  // Already v2 format
  if (raw.rounds && Array.isArray(raw.rounds)) {
    return raw as InaugChecklistDataV2;
  }
  // Legacy format: convert to single round
  const items: Record<string, InaugItemData> = {};
  for (const [key, val] of Object.entries(raw as InaugChecklistDataLegacy)) {
    items[key] = {
      status: (val as any).status || "NAO_ATENDIDO",
      observacoes: (val as any).observacoes || "",
      photos: [],
    };
  }
  return {
    rounds: [{
      id: "migrated-1",
      date: new Date().toISOString().split("T")[0],
      deadline: "",
      label: "1ª Conferência",
      items,
    }],
  };
}

export function createNewRound(tipo: "rua" | "shopping", roundNumber: number, previousRound?: InaugRound): InaugRound {
  const allItems = getAllInaugItems(tipo);
  const items: Record<string, InaugItemData> = {};
  allItems.forEach((item) => {
    const prev = previousRound?.items[item.id];
    if (prev) {
      // Carry forward ALL statuses as-is from the previous round
      // Items already completed stay completed; pending items keep their status for review
      items[item.id] = {
        status: prev.status,
        observacoes: prev.observacoes || "",
        photos: [],
        prazo: prev.prazo,
      };
    } else {
      items[item.id] = {
        status: "NAO_ATENDIDO",
        observacoes: "",
        photos: [],
      };
    }
  });
  return {
    id: `round-${Date.now()}`,
    date: new Date().toISOString().split("T")[0],
    deadline: "",
    label: `${roundNumber}ª Conferência`,
    items,
  };
}

// Keep old export name for compatibility but redirect
export function createDefaultInaugChecklist(tipo: "rua" | "shopping"): InaugChecklistDataV2 {
  return { rounds: [] };
}
