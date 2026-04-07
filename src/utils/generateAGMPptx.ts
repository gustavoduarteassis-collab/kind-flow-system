import PptxGenJS from "pptxgenjs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type StoreAGMData = {
  nome: string; tipo: string; custoTotal: number; areaLoja: number;
  custoM2: number; metaCustoM2: number; inicioObra: string;
  dataInauguracao: string; prazoDias: number;
  dataLiberacaoOrcamento: string; prazoConclusaoOrcamento: string;
};

type ActionPlan = {
  indicador: string; causa: string; fenomeno: string; acao: string;
  como: string; responsavel: string; prazo_inicial: string;
  prazo_final: string; farol: string;
};

const DARK_BG = "3A3A3A";
const HEADER_BG = "333333";
const ACCENT_PINK = "D4A5A5";
const WHITE = "FFFFFF";
const LIGHT_GRAY = "F5F5F5";
const MID_GRAY = "CCCCCC";
const TABLE_HEADER_BG = "999999";
const GREEN = "22C55E";
const RED = "EF4444";

const METAS: Record<string, number> = { TRADICIONAL: 3250, LIGHT: 3500, OUTLET: 2900 };

function addDarkHeader(slide: PptxGenJS.Slide, title: string, subtitle?: string) {
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.9, fill: { color: HEADER_BG } });
  slide.addText(title, { x: 0.6, y: 0.15, w: 7, h: 0.35, fontSize: 16, bold: true, color: WHITE, fontFace: "Arial", charSpacing: 4 });
  if (subtitle) {
    slide.addText(subtitle, { x: 0.6, y: 0.5, w: 7, h: 0.25, fontSize: 10, color: MID_GRAY, fontFace: "Arial", charSpacing: 2 });
  }
  slide.addText("CONSTANCE", { x: 7.8, y: 0.15, w: 2, h: 0.35, fontSize: 16, bold: true, color: WHITE, fontFace: "Arial", align: "right", charSpacing: 3 });
  slide.addText("com você, onde você estiver.", { x: 7.8, y: 0.5, w: 2, h: 0.2, fontSize: 7, color: MID_GRAY, fontFace: "Arial", align: "right" });
  slide.addShape("rect", { x: 0, y: 7.2, w: "100%", h: 0.05, fill: { color: ACCENT_PINK } });
}

function farolColor(f: string) {
  if (f === "verde") return GREEN;
  if (f === "vermelho") return RED;
  return "EAB308";
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateAGMPptx(
  mesRef: string,
  storesData: StoreAGMData[],
  plans: ActionPlan[],
  fornecedoresCount: number,
  summary: {
    totalLojas: number;
    prazoMedio: number;
    custoMediaByTipo: Record<string, number>;
  }
) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Constance Expansão";
  const mesLabel = format(new Date(mesRef + "-01"), "MMMM yyyy", { locale: ptBR });
  const mesLabelUpper = mesLabel.toUpperCase();
  pptx.title = `AGM ${mesLabelUpper} — Expansão`;

  // ===== SLIDE 1: COVER =====
  const s1 = pptx.addSlide();
  s1.background = { fill: DARK_BG };
  s1.addText("CONSTANCE", { x: 0.8, y: 1.5, w: 6, h: 1, fontSize: 48, bold: true, color: WHITE, fontFace: "Arial", charSpacing: 6 });
  s1.addText("com você, onde você estiver.", { x: 0.8, y: 2.5, w: 6, h: 0.5, fontSize: 18, color: MID_GRAY, fontFace: "Arial" });
  const infoRows = [
    `Setor: Expansão`,
    `Responsável: Gustavo Duarte`,
    `Data da apresentação: ${format(new Date(), "dd/MM/yyyy")}`,
  ];
  s1.addText(infoRows.join("\n"), { x: 0.8, y: 4.2, w: 5, h: 1.2, fontSize: 13, color: MID_GRAY, fontFace: "Arial", charSpacing: 2, lineSpacingMultiple: 1.5 });
  s1.addShape("line", { x: 6, y: 0.5, w: 0, h: 6.5, line: { color: ACCENT_PINK, width: 1.5 } });

  // ===== SLIDE 2: SECTION - IMPLANTAÇÃO / OBRA =====
  const s2 = pptx.addSlide();
  s2.background = { fill: DARK_BG };
  s2.addText("CONSTANCE", { x: 1, y: 1, w: 8, h: 0.8, fontSize: 28, bold: true, color: WHITE, fontFace: "Arial", align: "center", charSpacing: 4 });
  s2.addText("com você, onde você estiver", { x: 1, y: 1.8, w: 8, h: 0.4, fontSize: 12, color: MID_GRAY, fontFace: "Arial", align: "center" });
  s2.addText("IMPLANTAÇÃO", { x: 1, y: 3.2, w: 8, h: 0.8, fontSize: 36, bold: true, color: WHITE, fontFace: "Arial", align: "center", charSpacing: 8 });
  s2.addText("OBRA", { x: 1, y: 4.0, w: 8, h: 0.6, fontSize: 28, bold: true, color: WHITE, fontFace: "Arial", align: "center", charSpacing: 8 });

  // ===== SLIDE 3: ABERTURA DE NOVAS LOJAS =====
  const s3 = pptx.addSlide();
  addDarkHeader(s3, "INDICADOR: ABERTURA DE NOVAS LOJAS", "CONSTANCE GERAL");
  s3.addText(`Previsão de inauguração para o mês de ${mesLabelUpper}`, { x: 0.6, y: 1.2, w: 9, h: 0.4, fontSize: 14, bold: true, color: "333333", fontFace: "Arial" });

  if (storesData.length > 0) {
    const tableRows: PptxGenJS.TableRow[] = [
      [
        { text: "Loja", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
        { text: "Tipo", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
        { text: "Inauguração", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
      ],
    ];
    storesData.forEach((s, i) => {
      const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
      tableRows.push([
        { text: s.nome, options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial" } },
        { text: s.tipo, options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial" } },
        { text: s.dataInauguracao || "A definir", options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial" } },
      ]);
    });
    s3.addTable(tableRows, { x: 0.6, y: 1.8, w: 8.8, colW: [4, 2, 2.8], border: { type: "solid", pt: 0.5, color: MID_GRAY } });
  } else {
    s3.addText("Nenhuma loja inaugurada neste mês.", { x: 0.6, y: 2.5, w: 9, h: 0.5, fontSize: 14, color: "888888", fontFace: "Arial", italic: true });
  }

  // ===== SLIDE 4: CUSTO/M² RESUMO =====
  const s4 = pptx.addSlide();
  addDarkHeader(s4, "ANÁLISE DE CAUSA RAIZ: CUSTO/M²");

  const byTipo: Record<string, StoreAGMData[]> = {};
  storesData.forEach((s) => {
    if (!byTipo[s.tipo]) byTipo[s.tipo] = [];
    byTipo[s.tipo].push(s);
  });

  let yPos = 1.3;
  Object.entries(byTipo).forEach(([tipo, stores]) => {
    const meta = METAS[tipo] || 3250;
    const tipoLabel = tipo === "LIGHT" ? "LOJA LIGHT - LOJA FRANQUEADO" : tipo === "OUTLET" ? "LOJA OUTLET" : "LOJA TRADICIONAL - LOJA PRÓPRIA";

    const rows: PptxGenJS.TableRow[] = [
      [{ text: tipoLabel, options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial", colspan: 4, align: "center" } }],
      [
        { text: "LOJA", options: { fill: { color: "BBBBBB" }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
        { text: "CUSTO TOTAL", options: { fill: { color: "BBBBBB" }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: "ÁREA", options: { fill: { color: "BBBBBB" }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: "CUSTO TOTAL P/M²", options: { fill: { color: "BBBBBB" }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
      ],
    ];

    let totalCusto = 0, totalArea = 0;
    stores.forEach((s, i) => {
      const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
      totalCusto += s.custoTotal;
      totalArea += s.areaLoja;
      rows.push([
        { text: s.nome, options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial" } },
        { text: fmt(s.custoTotal), options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: s.areaLoja.toFixed(2), options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: fmt(s.custoM2), options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial", align: "center" } },
      ]);
    });

    const avgM2 = totalArea > 0 ? totalCusto / totalArea : 0;
    const isOver = avgM2 > meta;
    rows.push([
      { text: "TOTAL", options: { fill: { color: LIGHT_GRAY }, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: fmt(totalCusto), options: { fill: { color: LIGHT_GRAY }, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: totalArea.toFixed(2), options: { fill: { color: LIGHT_GRAY }, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
      { text: fmt(avgM2), options: { fill: { color: LIGHT_GRAY }, bold: true, fontSize: 10, fontFace: "Arial", align: "center", color: isOver ? RED : GREEN } },
    ]);

    s4.addTable(rows, { x: 0.6, y: yPos, w: 8.8, colW: [3.2, 2, 1.6, 2], border: { type: "solid", pt: 0.5, color: MID_GRAY } });
    yPos += 0.35 * (rows.length + 1) + 0.4;
  });

  if (storesData.length === 0) {
    s4.addText("Nenhum dado de custo disponível.", { x: 0.6, y: 2, w: 9, h: 0.5, fontSize: 14, color: "888888", fontFace: "Arial", italic: true });
  }

  // ===== SLIDE 5: CUSTO POR LOJA DETALHADO =====
  storesData.forEach((store) => {
    if (store.custoTotal <= 0) return;
    const sl = pptx.addSlide();
    addDarkHeader(sl, `ANÁLISE DE CAUSA RAIZ: CUSTO/M²`, store.nome.toUpperCase());

    sl.addText(`${store.nome}`, { x: 0.6, y: 1.2, w: 9, h: 0.4, fontSize: 16, bold: true, color: "333333", fontFace: "Arial" });

    const detailRows: PptxGenJS.TableRow[] = [
      [{ text: "CUSTOS POR LOJA", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial", colspan: 2, align: "center" } }],
      [{ text: "Metragem", options: { fontSize: 10, fontFace: "Arial" } }, { text: store.areaLoja.toFixed(2), options: { fontSize: 10, fontFace: "Arial", align: "right" } }],
      [{ text: "Valor total da Loja", options: { fontSize: 10, fontFace: "Arial" } }, { text: fmt(store.custoTotal), options: { fontSize: 10, fontFace: "Arial", align: "right" } }],
      [{ text: "Valor m² obra", options: { fontSize: 10, fontFace: "Arial" } }, { text: fmt(store.custoM2), options: { fontSize: 10, fontFace: "Arial", align: "right", color: store.custoM2 > store.metaCustoM2 ? RED : GREEN } }],
      [{ text: `Meta (${store.tipo})`, options: { fontSize: 10, fontFace: "Arial" } }, { text: fmt(store.metaCustoM2), options: { fontSize: 10, fontFace: "Arial", align: "right" } }],
      [{ text: "Prazo de Obra", options: { fontSize: 10, fontFace: "Arial" } }, { text: `${store.prazoDias} dias`, options: { fontSize: 10, fontFace: "Arial", align: "right" } }],
    ];

    sl.addTable(detailRows, { x: 0.6, y: 1.8, w: 4, colW: [2.3, 1.7], border: { type: "solid", pt: 0.5, color: MID_GRAY } });
  });

  // ===== SLIDE: PRAZO MÉDIO DE IMPLANTAÇÃO =====
  const sPrazo = pptx.addSlide();
  addDarkHeader(sPrazo, "INDICADOR: PRAZO MÉDIO DE IMPLANTAÇÃO");

  if (storesData.some((s) => s.prazoDias > 0)) {
    const prazoRows: PptxGenJS.TableRow[] = [
      [
        { text: "Loja", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
        { text: "Início da Obra", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial", align: "center" } },
        { text: "Inauguração", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial", align: "center" } },
        { text: "Duração (dias)", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial", align: "center" } },
      ],
    ];
    storesData.forEach((s, i) => {
      const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
      prazoRows.push([
        { text: s.nome, options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial" } },
        { text: s.inicioObra || "-", options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: s.dataInauguracao || "-", options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: s.prazoDias > 0 ? String(s.prazoDias) : "-", options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial", align: "center" } },
      ]);
    });
    prazoRows.push([
      { text: "TOTAL (Médio)", options: { fill: { color: LIGHT_GRAY }, bold: true, fontSize: 10, fontFace: "Arial" } },
      { text: "", options: { fill: { color: LIGHT_GRAY } } },
      { text: "", options: { fill: { color: LIGHT_GRAY } } },
      { text: String(summary.prazoMedio), options: { fill: { color: LIGHT_GRAY }, bold: true, fontSize: 12, fontFace: "Arial", align: "center", color: "333333" } },
    ]);
    sPrazo.addTable(prazoRows, { x: 0.6, y: 1.3, w: 8.8, colW: [3.5, 2, 2, 1.3], border: { type: "solid", pt: 0.5, color: MID_GRAY } });
  } else {
    sPrazo.addText("Nenhum dado de prazo disponível.", { x: 0.6, y: 2, w: 9, h: 0.5, fontSize: 14, color: "888888", fontFace: "Arial", italic: true });
  }

  // ===== SLIDE: PLANOS DE AÇÃO =====
  if (plans.length > 0) {
    // Group plans by indicador
    const plansByInd: Record<string, ActionPlan[]> = {};
    plans.forEach((p) => {
      if (!plansByInd[p.indicador]) plansByInd[p.indicador] = [];
      plansByInd[p.indicador].push(p);
    });

    Object.entries(plansByInd).forEach(([indicador, indPlans]) => {
      const sPlano = pptx.addSlide();
      addDarkHeader(sPlano, "ANÁLISE DE CAUSA RAIZ:", indicador.toUpperCase());

      const planRows: PptxGenJS.TableRow[] = [
        [
          { text: "Causa", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 9, fontFace: "Arial" } },
          { text: "Ação", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 9, fontFace: "Arial" } },
          { text: "Como", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 9, fontFace: "Arial" } },
          { text: "Responsável", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
          { text: "Prazo Inicial", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
          { text: "Prazo Final", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
          { text: "Farol", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 9, fontFace: "Arial", align: "center" } },
        ],
      ];

      indPlans.forEach((p, i) => {
        const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
        planRows.push([
          { text: p.causa, options: { fill: { color: bg }, fontSize: 8, fontFace: "Arial", valign: "middle" } },
          { text: p.acao, options: { fill: { color: bg }, fontSize: 8, fontFace: "Arial", valign: "middle" } },
          { text: p.como, options: { fill: { color: bg }, fontSize: 8, fontFace: "Arial", valign: "middle" } },
          { text: p.responsavel, options: { fill: { color: bg }, fontSize: 8, fontFace: "Arial", align: "center", valign: "middle" } },
          { text: p.prazo_inicial, options: { fill: { color: bg }, fontSize: 8, fontFace: "Arial", align: "center", valign: "middle" } },
          { text: p.prazo_final, options: { fill: { color: bg }, fontSize: 8, fontFace: "Arial", align: "center", valign: "middle" } },
          { text: "●", options: { fill: { color: bg }, fontSize: 14, fontFace: "Arial", align: "center", valign: "middle", color: farolColor(p.farol) } },
        ]);
      });

      sPlano.addTable(planRows, { x: 0.3, y: 1.3, w: 9.4, colW: [2.2, 1.8, 2.2, 0.9, 0.8, 0.8, 0.7], border: { type: "solid", pt: 0.5, color: MID_GRAY } });
    });
  }

  // ===== SLIDE: RESUMO / MATRIZ DE RESULTADOS =====
  const sResumo = pptx.addSlide();
  addDarkHeader(sResumo, `MATRIZ DE RESULTADOS — ${new Date().getFullYear()}`);

  const resumoData = [
    ["Lojas Inauguradas", String(summary.totalLojas)],
    ["Prazo Médio de Implantação", `${summary.prazoMedio} dias`],
    ["Novos Fornecedores Prospectados", String(fornecedoresCount)],
    ...Object.entries(summary.custoMediaByTipo).map(([tipo, media]) => [
      `Custo/m² Médio (${tipo})`,
      `R$ ${media.toLocaleString("pt-BR")}`,
    ]),
  ];

  const resumoRows: PptxGenJS.TableRow[] = [
    [
      { text: "Indicador", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 12, fontFace: "Arial" } },
      { text: "Resultado", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 12, fontFace: "Arial", align: "center" } },
    ],
  ];

  resumoData.forEach(([ind, val], i) => {
    const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
    resumoRows.push([
      { text: ind, options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial" } },
      { text: val, options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial", align: "center", bold: true } },
    ]);
  });

  sResumo.addTable(resumoRows, { x: 1.5, y: 1.5, w: 7, colW: [4.5, 2.5], border: { type: "solid", pt: 0.5, color: MID_GRAY } });

  // ===== SLIDE: OBRIGADO =====
  const sEnd = pptx.addSlide();
  sEnd.background = { fill: DARK_BG };
  sEnd.addText("CONSTANCE", { x: 1, y: 2, w: 8, h: 0.8, fontSize: 36, bold: true, color: WHITE, fontFace: "Arial", align: "center", charSpacing: 5 });
  sEnd.addText("com você, onde você estiver", { x: 1, y: 2.8, w: 8, h: 0.4, fontSize: 14, color: MID_GRAY, fontFace: "Arial", align: "center" });
  sEnd.addText("Obrigado!", { x: 1, y: 4.2, w: 8, h: 0.6, fontSize: 28, color: WHITE, fontFace: "Arial", align: "center", charSpacing: 6 });

  pptx.writeFile({ fileName: `AGM_${mesRef.replace("-", "_")}_EXPANSAO.pptx` });
}
