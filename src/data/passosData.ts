export type PassoItem = {
  id: string;
  titulo: string;
  descricao: string;
  oQueE?: string;
  quandoPedir?: string;
  importante?: string;
  passos: string[];
  emailPara?: string[];
  emailCopia?: string[];
  assunto?: string;
  corpoEmail?: string;
  anexos?: string[];
  observacoes?: string[];
};

export const passosData: PassoItem[] = [
  {
    id: "sankhya",
    titulo: "Abrir Pedido Sankhya",
    descricao: "Cadastro no sistema de gestão financeira da franqueadora",
    oQueE: "Sankhya é o software de gestão financeira da franqueadora. Nele são lançadas as taxas de cobranças para os franqueados, como royalties, taxa de franquias e venda dos produtos.",
    quandoPedir: "Assim que recebermos a documentação da loja (CNPJ, Contrato Social e I.E.).",
    importante: "Para pedir o cadastro é importante saber qual será o regime tributário da loja (simples nacional, presumido, lucro real). A maioria das lojas será no simples nacional. O cadastro no Sankhya é fundamental para assinatura do contrato de franquias e para pedir a mercadoria.",
    passos: [
      "Abrir o aplicativo Sistema de chamados GLPI ou acessar https://chamados.redectc.com.br/",
      "No lado direito acesse a árvore: Contabilidade → Cadastro parceiros → Contabilidade - Cadastro de Parceiros",
      "No sistema de cadastro do parceiro utilizar a opção: Sankhya",
      "Selecionar o tipo de parceiro: Cadastro de Cliente",
      "Escolher o perfil: Lojas Franqueadas (simples nacional) ou Lojas Alto Giro (lucro presumido/lojas próprias)",
      "Preencher dados do parceiro conforme CNPJ, IE fornecido. Nome fantasia: Filial XXX – XXXXXXXXX",
      "Preencher dados do contato de acordo com a planilha 'Funil'",
      "Apertar em enviar (não precisa preencher dados bancários)",
      "Após o envio, apertar em responder informando o número da filial e colocar em cópia: Mariana, Thainara, Gizelia, André e Gustavo",
    ],
  },
  {
    id: "cielo",
    titulo: "Cadastro Cielo e Maquininhas",
    descricao: "Solicitação de cadastro e maquininhas na adquirente Cielo",
    oQueE: "Cielo é a adquirente de cartões homologada pela franqueadora. Os franqueados não poderão ter outro tipo de adquirente na loja.",
    quandoPedir: "As maquininhas devem ser solicitadas assim que a obra tem início. Para lojas com FAMPE (empréstimo Bradesco), solicitar assim que os franqueados informarem o cadastro da conta.",
    importante: "PIN PAD: R$18,00/mês por maquininha (1 por PDX). LIO: R$60,00/mês por maquininha (sempre 02 por loja). Bradesco pode ter isenção da mensalidade LIO.",
    emailPara: ["atendimentoconstance@cielo.com.br", "isabelaf@cielo.com.br"],
    emailCopia: ["mariana@constance.com.br", "gizeliagomide@constance.com.br", "thainaraaraujo@constance.com.br", "josejunqueira@constance.com.br", "gustavo@constance.com.br", "email dos franqueados"],
    assunto: "Solicitação de cadastro e maquininhas Cielo - Filial XXX - (Nome CNPJ) - CNPJ: XXX",
    corpoEmail: `Prezados, boa tarde!

Seguem documentos e informações de nova franquia do Grupo Constance para:
- Cadastro Cielo
- Criação de Número Lógico
- Solicitação de equipamentos
- Cadastro Tivit
- Cadastro da Operação de Cancelamento e Estorno
- Cadastro da Alteração de Plano de Pagamento
- Cadastro para o Estabelecimento para Venda Link

CONTA CORRENTE – (banco escolhido pelo franqueado):
Ag: XXX / Conta: XXX

DADOS DA EMPRESA:
Razão Social: XXX / CNPJ: XXX / Contato: XXX / Telefone: XXX
Endereço de entrega: XXX

Prazo de Liberação de cadastro: 03 dias úteis após o email
Prazo para liberação das Maquininhas: 05 dias úteis após o email

EQUIPAMENTOS:
- 02 LIO (sempre solicitar por loja)
- XX PIN PADS (1 por PDX)`,
    passos: [
      "Enviar e-mail para: atendimentoconstance@cielo.com.br e isabelaf@cielo.com.br",
      "Colocar em cópia: mariana, gizelia, thainara, josejunqueira, gustavo e email dos franqueados",
      "Preencher assunto com dados da filial e CNPJ",
      "No corpo do e-mail incluir: dados bancários, dados da empresa, prazos e equipamentos necessários",
      "Enviar em anexo: CNPJ e Contrato Social",
    ],
    anexos: ["CNPJ", "Contrato Social"],
    observacoes: [
      "Certifique-se de que todas as taxas estejam dentro do acordado com a Rede Constance",
      "O novo estabelecimento deve vir habilitado para Amex e Hipercard",
      "Habilitar 3DS para vendas VISA, MASTER e ELO",
      "Os equipamentos LIO são isentos de aluguel para o Grupo Constance",
    ],
  },
  {
    id: "skytef",
    titulo: "Cadastro Skytef",
    descricao: "Cadastro e implantação do sistema TEF para conectividade de cartões",
    oQueE: "Skytef é a empresa responsável pela conectividade entre as vendas de cartões débito/crédito, entre sistema USE e Cielo.",
    quandoPedir: "Podemos pedir o cadastro assim que recebermos as informações da Cielo (estabelecimento e número lógico) e quando já tivermos a data de implantação em loja.",
    emailPara: ["preimplantacao@fiserv.com", "adm.tef@fiserv.com", "cristiany.gomes@fiserv.com", "willian.silva@fiserv.com", "jessica.lopes@fiserv.com"],
    emailCopia: ["mariana@constance.com.br", "arthurvidigal@constance.com.br", "gizeliagomide@constance.com.br", "thainaraaraujo@constance.com.br", "email da filial"],
    assunto: "Constance_Implantação Skytef - Filial XXX - (Nome CNPJ) – CNPJ: XXX",
    corpoEmail: `Prezados, bom dia!

Solicito por gentileza, a implantação para Filial XXX - (Nome do CNPJ) – CNPJ: XXX

Segue checklist em anexo.

Gentileza incluir a nova filial no grupo de acesso com os dados abaixo:
EMAIL: XXX
CNPJ PRINCIPAL DO GUARDA-CHUVA - Grupo CNPJ XXX

Contato para Implantação: XXX - tel: XXX

Precisamos fazer a implantação dia XX/XX/XX, no horário XXX, serão XXX PDVs

Horários disponíveis:
1º horário 09 às 12
2º horário 13 às 15
3º horário 14 às 16`,
    passos: [
      "Preencher o Check List Skytef com dados da loja, estabelecimento e número lógico da Cielo",
      "Enviar e-mail para: preimplantacao@fiserv.com, adm.tef@fiserv.com e demais contatos Fiserv",
      "Colocar em cópia: mariana, arthur, gizelia, thainara e email da filial",
      "No corpo incluir dados da filial, contato para implantação, data e horário",
      "Colocar em anexo o arquivo Check List Skytef da pasta da obra no drive",
    ],
    anexos: ["Check List Skytef (pasta da obra no drive)"],
  },
  {
    id: "cancelamento-skytef",
    titulo: "Cancelamento Contrato Skytef",
    descricao: "Processo de cancelamento de contrato Skytef em caso de troca de CNPJ",
    emailPara: ["cancelamento@fiserv.com", "preimplantacao@fiserv.com", "adm.tef@fiserv.com", "willian.silva@fiserv.com", "jessica.lopes@fiserv.com"],
    emailCopia: ["mariana@constance.com.br", "arthurvidigal@constance.com.br", "gizeliagomide@constance.com.br", "gustavo@constance.com.br", "thainaraaraujo@constance.com.br", "José Renato", "Kelen Bicalho"],
    assunto: "CANCELAMENTO Contrato Skytef - Filial XXX - (Nome CNPJ) - CNPJ: XXX",
    corpoEmail: `Prezados!

Solicito por gentileza o cancelamento de cadastro conforme informações abaixo.

Trata-se de uma troca de CNPJ da loja da franqueada (nome), onde o CNPJ novo foi implantado no dia XXX, CNPJ novo: XXX.

Filial antiga XXX
Razão Social: XXX
CNPJ: XXX
Contato: XXX
Telefone: XXX

Atenciosamente,`,
    passos: [
      "Enviar e-mail para: cancelamento@fiserv.com, preimplantacao@fiserv.com, adm.tef@fiserv.com e demais",
      "Colocar em cópia: mariana, arthur, gizelia, gustavo, thainara, José Renato e Kelen Bicalho",
      "Preencher assunto com CANCELAMENTO, dados da filial e CNPJ",
      "No corpo informar dados da filial antiga e o CNPJ novo",
    ],
  },
  {
    id: "cancelamento-datasystem",
    titulo: "Cancelamento Cobrança Data System",
    descricao: "Cancelamento de cobrança no sistema Data System em caso de troca de CNPJ",
    emailPara: ["atendimento@datasystem.com.br"],
    emailCopia: ["constancejc513@mznoperations.com.br", "mariana@constance.com.br", "arthurvidigal@constance.com.br", "gizeliagomide@constance.com.br", "gustavo@constance.com.br", "thainaraaraujo@constance.com.br"],
    assunto: "CANCELAMENTO de Cobrança Data System - Filial XXX – (Nome CNPJ) XXX",
    corpoEmail: `Prezados!

Solicito por gentileza o cancelamento de cobrança a partir da data XX/XX/XXXX conforme informações abaixo.

Trata-se de uma troca de CNPJ da loja da franqueada (nome), onde o CNPJ novo é: XXX.

FILIAL XXX
Razão Social: XXX
CNPJ: XXX
Contato: XXX

Atenciosamente`,
    passos: [
      "Enviar e-mail para: atendimento@datasystem.com.br",
      "Colocar em cópia: constancejc513@mznoperations.com.br, mariana, arthur, gizelia, gustavo e thainara",
      "Preencher assunto com CANCELAMENTO, dados da filial",
      "No corpo informar data do cancelamento, dados da filial antiga e CNPJ novo",
    ],
  },
  {
    id: "cancelamento-cielo",
    titulo: "Cancelamento Cielo e Recolhimento Maquininhas",
    descricao: "Cancelamento de cadastro Cielo e recolhimento de equipamentos",
    emailPara: ["atendimentoconstance@cielo.com.br"],
    emailCopia: ["constancejc513@mznoperations.com.br", "mariana@constance.com.br", "arthurvidigal@constance.com.br", "gizeliagomide@constance.com.br", "thainaraaraujo@constance.com.br"],
    assunto: "RECOLHIMENTO Maquininhas - Filial XXX – (Nome CNPJ) – CNPJ: XXX",
    corpoEmail: `Prezados, boa tarde!

Solicito por gentileza o cancelamento de cadastro e recolhimento de maquininhas da Cielo conforme informações abaixo:

Filial XXX
Razão Social: XXX
CNPJ: XXX
Contato: XXX
Telefone: XXX
Endereço de retirada: Constance Calçados - Rua XXX

EQUIPAMENTOS:
- XX PIN PADS
- XX LIO

Atenciosamente`,
    passos: [
      "Enviar e-mail para: atendimentoconstance@cielo.com.br",
      "Colocar em cópia: constancejc513@mznoperations.com.br, mariana, arthur, gizelia e thainara",
      "Preencher assunto com RECOLHIMENTO, dados da filial e CNPJ",
      "No corpo informar dados da filial, endereço de retirada e quantidade de equipamentos",
    ],
  },
  {
    id: "deskfy",
    titulo: "Cadastro Deskfy",
    descricao: "Cadastro no canal de comunicação entre franquias e franqueados",
    oQueE: "Deskfy é o canal de comunicação entre a franquias e os franqueados. Nele são divulgados as ações, campanhas, comunicados dos setores. Os franqueados também conseguem abrir chamado para produção de artes individuais (tapume, outdoor, convites de inauguração).",
    quandoPedir: "O Deskfy é feito um cadastro por franqueado (não por loja). Assim que um novo franqueado tem uma proposta aprovada e entra para o funil, já pode ser solicitado o cadastro.",
    emailPara: ["barbara@constance.com.br"],
    emailCopia: ["arthurvidigal@constance.com.br", "thainaraaraujo@constance.com.br", "gizeliagomide@constance.com.br"],
    assunto: "Filial XXX – NOME DA LOJA – solicitação de cadastro no Deskfy",
    corpoEmail: `Boa tarde Bárbara,

A filial XXX, (nome da loja), será (inaugurada/repassada) aos franqueados (nome) dia XX/XX/XXXX.

Por gentileza dar acesso ao Deskfy aos novos franqueados.

Email: XXX
Franqueado: XXX
Telefone: XXX
Razão Social: XXX
CNPJ: XXX

Atenciosamente,`,
    passos: [
      "Enviar e-mail para: barbara@constance.com.br (Bárbara do MKT)",
      "Colocar em cópia: arthur, thainara e gizelia",
      "Preencher assunto com dados da filial e nome da loja",
      "No corpo informar dados do franqueado: email, nome, telefone, razão social e CNPJ",
    ],
    observacoes: ["Os franqueados receberão um email com dados de login e senha e devem trocar a senha de acesso"],
  },
  {
    id: "kit-inauguracao",
    titulo: "Kit Inauguração / Kit VM",
    descricao: "Solicitação do kit de inauguração e visual merchandising",
    emailPara: ["thiagolima@constance.com.br", "hellensouza@constance.com.br"],
    emailCopia: ["arthurvidigal@constance.com.br", "gizeliagomide@constance.com.br", "thainaraaraujo@constance.com.br", "email da filial"],
    assunto: "Kit inauguração - Filial XXX - XXX / XX (nome e estado da filial)",
    corpoEmail: `Boa tarde Thiago/Hellen, tudo bem?

Gentileza desenvolver o kit de inauguração para a Filial XXX - XXX, dos franqueados XXX e XXX, que nos lê em cópia.

Planta de layout anexada.

- Suporte de bolsas: XX
- Suporte de sacolas: XX
- Placas de Numeração: XX - XX
- Curvas: XX

(quadro de comunicação visual que se encontra no projeto arquitetônico)
(foto da entrada do empreendimento, pegando toda frente da loja)`,
    passos: [
      "Enviar e-mail para: thiagolima@constance.com.br e hellensouza@constance.com.br",
      "Colocar em cópia: arthur, gizelia, thainara e email da filial",
      "Preencher assunto com dados da filial, nome e estado",
      "No corpo informar quantidades de suportes, placas e curvas",
      "Colocar em anexo as plantas do projeto arquitetônico",
    ],
    anexos: ["Plantas do projeto arquitetônico", "Foto da entrada do empreendimento"],
  },
  {
    id: "sacolas",
    titulo: "Quantitativo de Sacolas",
    descricao: "Pedido de quantitativo de sacolas para inauguração",
    emailPara: ["ana.chaves@printbag.com.br"],
    emailCopia: ["arthurvidigal@constance.com.br", "gizeliagomide@constance.com.br", "thainaraaraujo@constance.com.br", "email da filial"],
    assunto: "Quantitativo Sacolas - Filial XXX - (Nome CNPJ)",
    corpoEmail: `Prezados,

Previsão de Inauguração: XX/XX/XX
Contato dos franqueados: XXX e XXX
Telefone: (XXX) XXX-XXX
Email: XXX

Atenciosamente,`,
    passos: [
      "Enviar e-mail para: ana.chaves@printbag.com.br",
      "Colocar em cópia: arthur, gizelia, thainara e email da filial",
      "Preencher assunto com dados da filial e nome",
      "No corpo informar previsão de inauguração e contato dos franqueados",
      "Colocar em anexo o quantitativo de sacola do check list",
    ],
    anexos: ["Quantitativo de sacola (do check list)"],
    observacoes: [
      "Para preencher o quantitativo, analisar informações do funil da Mariana (faturamento, data de inauguração)",
      "Arredondar os valores para cima",
    ],
  },
];
