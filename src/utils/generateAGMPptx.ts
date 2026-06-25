import PptxGenJS from "pptxgenjs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Gerador AGM no padrão visual oficial Constance Expansão.
 * Espelha o modelo "AGM_MES_GUSTAVO.pptx" — capa escura, header preto com
 * "CONSTANCE / com você, onde você estiver", linha rosa accent na base.
 *
 * Estrutura espelhada:
 *  1.  Capa
 *  2.  Divisor IMPLANTAÇÃO / OBRA
 *  3.  ATA — ações do mês anterior
 *  4.  MATRIZ DE RESULTADOS – ANO
 *  5.  INDICADOR: ABERTURA DE NOVAS LOJAS GERAL
 *  6.  INDICADOR DO CUSTO/M² (resumo por tipo)
 *  7.  ANÁLISE DE CAUSA RAIZ: CUSTO/M² (PREVISTO x REALIZADO por loja)
 *  8.  ANÁLISE DE CAUSA RAIZ: fenômeno / causa / plano por indicador
 *  9.  INDICADOR: PRAZO MÉDIO (Construtoras x Junta-Junta)
 *  10. INDICADOR NOVOS FORNECEDORES
 *  11. PENDÊNCIAS LOJA – CHECKLIST FINAL (uma por loja inaugurada)
 *  12. AÇÃO DE MELHORIA
 *  13. Obrigado
 */

type StoreAGMData = {
  nome: string; tipo: string; custoTotal: number; areaLoja: number;
  custoM2: number; metaCustoM2: number; inicioObra: string;
  dataInauguracao: string; prazoDias: number;
  dataLiberacaoOrcamento: string; prazoConclusaoOrcamento: string;
  // Opcionais — quando presentes habilitam o detalhamento por loja
  filial?: string;
  origem?: string; // 'propria' | 'franqueado' | 'junta_junta'
  maoDeObra?: number; moveis?: number; piso?: number;
  iluminacao?: number; informatica?: number; demaisItens?: number;
  pendenciasIniciais?: string; pendenciasFinais?: string;
  checklistInicial?: number; checklistFinal?: number;
};

type ActionPlan = {
  indicador: string; causa: string; fenomeno: string; acao: string;
  como: string; responsavel: string; prazo_inicial: string;
  prazo_final: string; farol: string;
};

// Paleta oficial AGM
const DARK_BG = "3A3A3A";
const HEADER_BG = "2B2B2B";
const ACCENT_PINK = "D4A5A5";
const WHITE = "FFFFFF";
const LIGHT_GRAY = "F2F2F2";
const MID_GRAY = "BFBFBF";
const TABLE_HEADER_BG = "8C8C8C";
const SUB_HEADER_BG = "A6A6A6";
const GREEN = "22C55E";
const RED = "EF4444";
const AMBER = "EAB308";

const METAS: Record<string, number> = { TRADICIONAL: 3350, LIGHT: 3500, OUTLET: 2900 };

function addBrandFrame(slide: PptxGenJS.Slide, title: string, subtitle?: string) {
  // Header escuro com título à esquerda e marca à direita
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.95, fill: { color: HEADER_BG }, line: { color: HEADER_BG } });
  slide.addText(title, {
    x: 0.5, y: 0.18, w: 9, h: 0.38,
    fontSize: 18, bold: true, color: WHITE, fontFace: "Arial", charSpacing: 4,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.55, w: 9, h: 0.3,
      fontSize: 11, color: MID_GRAY, fontFace: "Arial", charSpacing: 2,
    });
  }
  slide.addText("CONSTANCE", {
    x: 10.4, y: 0.18, w: 2.5, h: 0.35,
    fontSize: 16, bold: true, color: WHITE, fontFace: "Arial", align: "right", charSpacing: 3,
  });
  slide.addText("com você, onde você estiver.", {
    x: 10.4, y: 0.55, w: 2.5, h: 0.25,
    fontSize: 8, color: MID_GRAY, fontFace: "Arial", align: "right",
  });
  // Linha rosa accent base
  slide.addShape("rect", { x: 0, y: 7.4, w: 13.33, h: 0.08, fill: { color: ACCENT_PINK }, line: { color: ACCENT_PINK } });
}

function farolHex(f: string) {
  if (f === "verde") return GREEN;
  if (f === "vermelho") return RED;
  return AMBER;
}

function fmtBRL(v: number) {
  return `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(v: number, dec = 2) {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
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
  },
) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.author = "Constance Expansão";

  const mesDate = new Date(mesRef + "-01");
  const mesLabel = format(mesDate, "MMMM yyyy", { locale: ptBR });
  const mesLabelUp = mesLabel.toUpperCase();
  const anoRef = format(mesDate, "yyyy");
  pptx.title = `AGM ${mesLabelUp} — Expansão`;

  // =============================================================
  // SLIDE 1 — CAPA
  // =============================================================
  const s1 = pptx.addSlide();
  s1.background = { fill: DARK_BG };
  s1.addText("CONSTANCE", {
    x: 0.8, y: 1.6, w: 8, h: 1.1,
    fontSize: 60, bold: true, color: WHITE, fontFace: "Arial", charSpacing: 8,
  });
  s1.addText("com você, onde você estiver.", {
    x: 0.85, y: 2.7, w: 8, h: 0.5,
    fontSize: 20, color: MID_GRAY, fontFace: "Arial", italic: true,
  });
  s1.addShape("line", {
    x: 8.6, y: 0.8, w: 0, h: 5.9, line: { color: ACCENT_PINK, width: 1.8 },
  });
  s1.addText(
    [
      { text: "AGM ", options: { color: ACCENT_PINK } },
      { text: mesLabelUp, options: { color: WHITE } },
    ],
    { x: 9.0, y: 1.6, w: 4, h: 0.7, fontSize: 30, bold: true, fontFace: "Arial", charSpacing: 4 },
  );
  const capaInfo = [
    `Setor: Expansão`,
    `Responsável: Gustavo Duarte`,
    `Data da apresentação: ${format(new Date(), "dd/MM/yyyy")}`,
  ];
  s1.addText(capaInfo.join("\n"), {
    x: 9.0, y: 3.0, w: 4, h: 1.6,
    fontSize: 14, color: MID_GRAY, fontFace: "Arial", lineSpacingMultiple: 1.6, charSpacing: 1,
  });
  s1.addShape("rect", { x: 0, y: 7.2, w: 13.33, h: 0.1, fill: { color: ACCENT_PINK }, line: { color: ACCENT_PINK } });

  // =============================================================
  // SLIDE 2 — DIVISOR IMPLANTAÇÃO / OBRA
  // =============================================================
  const s2 = pptx.addSlide();
  s2.background = { fill: DARK_BG };
  s2.addText("CONSTANCE", {
    x: 0, y: 1.0, w: 13.33, h: 0.9,
    fontSize: 32, bold: true, color: WHITE, fontFace: "Arial", align: "center", charSpacing: 6,
  });
  s2.addText("com você, onde você estiver.", {
    x: 0, y: 1.85, w: 13.33, h: 0.4,
    fontSize: 14, color: MID_GRAY, fontFace: "Arial", align: "center", italic: true,
  });
  s2.addShape("line", { x: 4.5, y: 3.0, w: 4.3, h: 0, line: { color: ACCENT_PINK, width: 1.5 } });
  s2.addText("IMPLANTAÇÃO", {
    x: 0, y: 3.3, w: 13.33, h: 1.0,
    fontSize: 54, bold: true, color: WHITE, fontFace: "Arial", align: "center", charSpacing: 10,
  });
  s2.addText("OBRA", {
    x: 0, y: 4.4, w: 13.33, h: 0.8,
    fontSize: 36, bold: true, color: ACCENT_PINK, fontFace: "Arial", align: "center", charSpacing: 10,
  });
  s2.addShape("rect", { x: 0, y: 7.2, w: 13.33, h: 0.1, fill: { color: ACCENT_PINK }, line: { color: ACCENT_PINK } });

  // =============================================================
  // SLIDE 3 — ATA (planos do mês anterior / pendências)
  // =============================================================
  const sATA = pptx.addSlide();
  addBrandFrame(sATA, "ATA", `Status das ações do mês anterior — referência ${mesLabel}`);
  if (plans.length > 0) {
    const ataRows: PptxGenJS.TableRow[] = [
      [
        { text: "Causa", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
        { text: "Ação", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
        { text: "Como", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
        { text: "Responsável", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: "Prazo Inicial", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: "Prazo Final", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: "Farol", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
      ],
    ];
    plans.forEach((p, i) => {
      const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
      ataRows.push([
        { text: p.causa, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", valign: "middle" } },
        { text: p.acao, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", valign: "middle" } },
        { text: p.como, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", valign: "middle" } },
        { text: p.responsavel, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", align: "center", valign: "middle" } },
        { text: p.prazo_inicial, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", align: "center", valign: "middle" } },
        { text: p.prazo_final, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", align: "center", valign: "middle" } },
        { text: "●", options: { fill: { color: bg }, fontSize: 16, fontFace: "Arial", align: "center", valign: "middle", color: farolHex(p.farol) } },
      ]);
    });
    sATA.addTable(ataRows, { x: 0.4, y: 1.3, w: 12.5, colW: [2.6, 2.4, 2.8, 1.3, 1.2, 1.2, 1.0], border: { type: "solid", pt: 0.5, color: MID_GRAY } });
  } else {
    sATA.addText("Nenhuma ação registrada no mês anterior.", {
      x: 0.5, y: 3.2, w: 12.3, h: 0.6, fontSize: 16, color: "888888", fontFace: "Arial", italic: true, align: "center",
    });
  }

  // =============================================================
  // SLIDE 4 — MATRIZ DE RESULTADOS
  // =============================================================
  const sMat = pptx.addSlide();
  addBrandFrame(sMat, `MATRIZ DE RESULTADOS – ${anoRef}`, `Farol consolidado de ${mesLabel}`);

  const matRows: PptxGenJS.TableRow[] = [
    [
      { text: "Indicador", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 13, fontFace: "Arial" } },
      { text: "Resultado", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 13, fontFace: "Arial", align: "center" } },
      { text: "Farol", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 13, fontFace: "Arial", align: "center" } },
    ],
  ];
  const indicators: Array<[string, string, string]> = [
    ["Lojas Inauguradas", String(summary.totalLojas), "verde"],
    ["Prazo Médio de Implantação", `${summary.prazoMedio} dias`, summary.prazoMedio > 0 && summary.prazoMedio <= 45 ? "verde" : "vermelho"],
    ["Novos Fornecedores Prospectados", String(fornecedoresCount), fornecedoresCount >= 5 ? "verde" : "amarelo"],
  ];
  Object.entries(summary.custoMediaByTipo).forEach(([tipo, media]) => {
    const meta = METAS[tipo] || 3350;
    indicators.push([`Custo/m² (${tipo})`, fmtBRL(media), media <= meta ? "verde" : "vermelho"]);
  });
  indicators.forEach(([ind, val, farol], i) => {
    const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
    matRows.push([
      { text: ind, options: { fill: { color: bg }, fontSize: 12, fontFace: "Arial" } },
      { text: val, options: { fill: { color: bg }, fontSize: 12, fontFace: "Arial", align: "center", bold: true } },
      { text: "●", options: { fill: { color: bg }, fontSize: 20, fontFace: "Arial", align: "center", color: farolHex(farol) } },
    ]);
  });
  sMat.addTable(matRows, { x: 1.5, y: 1.5, w: 10.3, colW: [5.5, 3, 1.8], border: { type: "solid", pt: 0.5, color: MID_GRAY } });

  // =============================================================
  // SLIDE 5 — INDICADOR ABERTURA DE NOVAS LOJAS
  // =============================================================
  const sAb = pptx.addSlide();
  addBrandFrame(sAb, "INDICADOR: ABERTURA DE NOVAS LOJAS", "CONSTANCE GERAL");
  sAb.addText(`Previsão de inauguração para o mês de ${mesLabelUp}`, {
    x: 0.5, y: 1.2, w: 12.3, h: 0.4, fontSize: 16, bold: true, color: "333333", fontFace: "Arial",
  });
  if (storesData.length > 0) {
    const abRows: PptxGenJS.TableRow[] = [
      [
        { text: "Filial", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 12, fontFace: "Arial", align: "center" } },
        { text: "Loja", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 12, fontFace: "Arial" } },
        { text: "Tipo", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 12, fontFace: "Arial", align: "center" } },
        { text: "Inauguração", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 12, fontFace: "Arial", align: "center" } },
      ],
    ];
    storesData.forEach((s, i) => {
      const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
      abRows.push([
        { text: s.filial || "-", options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial", align: "center" } },
        { text: s.nome, options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial" } },
        { text: s.tipo, options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial", align: "center" } },
        { text: s.dataInauguracao || "A definir", options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial", align: "center" } },
      ]);
    });
    sAb.addTable(abRows, { x: 1.5, y: 1.8, w: 10.3, colW: [1.5, 4.8, 2, 2], border: { type: "solid", pt: 0.5, color: MID_GRAY } });
  } else {
    sAb.addText("Nenhuma loja prevista no período.", {
      x: 0.5, y: 3.0, w: 12.3, h: 0.5, fontSize: 14, color: "888888", fontFace: "Arial", italic: true, align: "center",
    });
  }

  // =============================================================
  // SLIDES 6+ — INDICADOR CUSTO/M² (resumo por tipo)
  // =============================================================
  const byTipo: Record<string, StoreAGMData[]> = {};
  storesData.forEach((s) => {
    if (!byTipo[s.tipo]) byTipo[s.tipo] = [];
    byTipo[s.tipo].push(s);
  });

  Object.entries(byTipo).forEach(([tipo, stores]) => {
    const sCT = pptx.addSlide();
    addBrandFrame(sCT, "INDICADOR DO CUSTO/M²", `${tipo}`);
    const meta = METAS[tipo] || 3350;
    const tipoLabel = tipo === "LIGHT"
      ? "LOJA LIGHT — LOJA FRANQUEADO"
      : tipo === "OUTLET"
        ? "LOJA OUTLET"
        : "LOJA TRADICIONAL";

    const rows: PptxGenJS.TableRow[] = [
      [{ text: tipoLabel, options: { fill: { color: HEADER_BG }, color: WHITE, bold: true, fontSize: 13, fontFace: "Arial", colspan: 4, align: "center" } }],
      [
        { text: "LOJA", options: { fill: { color: SUB_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial" } },
        { text: "CUSTO TOTAL", options: { fill: { color: SUB_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial", align: "center" } },
        { text: "ÁREA", options: { fill: { color: SUB_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial", align: "center" } },
        { text: "CUSTO/M²", options: { fill: { color: SUB_HEADER_BG }, color: WHITE, bold: true, fontSize: 11, fontFace: "Arial", align: "center" } },
      ],
    ];
    let totC = 0, totA = 0;
    stores.forEach((s, i) => {
      const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
      totC += s.custoTotal; totA += s.areaLoja;
      const over = s.custoM2 > meta;
      rows.push([
        { text: s.nome, options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial" } },
        { text: fmtBRL(s.custoTotal), options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial", align: "center" } },
        { text: fmtNum(s.areaLoja), options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial", align: "center" } },
        { text: fmtBRL(s.custoM2), options: { fill: { color: bg }, fontSize: 11, fontFace: "Arial", align: "center", color: over ? RED : GREEN, bold: true } },
      ]);
    });
    const avg = totA > 0 ? totC / totA : 0;
    rows.push([
      { text: "TOTAL", options: { fill: { color: "E0E0E0" }, bold: true, fontSize: 11, fontFace: "Arial" } },
      { text: fmtBRL(totC), options: { fill: { color: "E0E0E0" }, bold: true, fontSize: 11, fontFace: "Arial", align: "center" } },
      { text: fmtNum(totA), options: { fill: { color: "E0E0E0" }, bold: true, fontSize: 11, fontFace: "Arial", align: "center" } },
      { text: fmtBRL(avg), options: { fill: { color: "E0E0E0" }, bold: true, fontSize: 12, fontFace: "Arial", align: "center", color: avg > meta ? RED : GREEN } },
    ]);
    sCT.addTable(rows, { x: 1.2, y: 1.4, w: 10.9, colW: [4.5, 2.5, 1.4, 2.5], border: { type: "solid", pt: 0.5, color: MID_GRAY } });

    sCT.addText(`Meta para ${tipo}: ${fmtBRL(meta)} / m²`, {
      x: 1.2, y: 5.2, w: 10.9, h: 0.4, fontSize: 12, color: "333333", fontFace: "Arial", italic: true, align: "center",
    });
  });

  // =============================================================
  // PER-LOJA — ANÁLISE CAUSA RAIZ: CUSTO/M² (PREVISTO x REALIZADO)
  // =============================================================
  storesData.forEach((store) => {
    if (store.custoTotal <= 0) return;
    const sl = pptx.addSlide();
    addBrandFrame(sl, "ANÁLISE DE CAUSA RAIZ: CUSTO/M²", `${store.filial ? store.filial + " — " : ""}${store.nome}`);

    const previstoTotal = store.metaCustoM2 * store.areaLoja;

    // Estimativa de breakdown PREVISTO (proporcional ao realizado se existir)
    const realizado = {
      "Mão de obra": store.maoDeObra ?? 0,
      "Móveis": store.moveis ?? 0,
      "Piso": store.piso ?? 0,
      "Iluminação": store.iluminacao ?? 0,
      "Informática": store.informatica ?? 0,
      "Demais itens": store.demaisItens ?? 0,
    };
    const totalDetalhado = Object.values(realizado).reduce((a, b) => a + b, 0);

    const buildBlock = (title: string, total: number, m2: number, items: Record<string, number>, isPrevisto: boolean): PptxGenJS.TableRow[] => {
      const accent = isPrevisto ? "555555" : HEADER_BG;
      const blockRows: PptxGenJS.TableRow[] = [
        [{ text: title, options: { fill: { color: accent }, color: WHITE, bold: true, fontSize: 12, fontFace: "Arial", colspan: 2, align: "center" } }],
        [{ text: "CUSTOS POR LOJA", options: { fill: { color: SUB_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", colspan: 2, align: "center" } }],
        [
          { text: "LOJA", options: { fontSize: 10, fontFace: "Arial", bold: true } },
          { text: store.nome, options: { fontSize: 10, fontFace: "Arial", align: "right" } },
        ],
        [
          { text: "Metragem", options: { fontSize: 10, fontFace: "Arial" } },
          { text: fmtNum(store.areaLoja), options: { fontSize: 10, fontFace: "Arial", align: "right" } },
        ],
        [
          { text: "Valor total da Loja", options: { fontSize: 10, fontFace: "Arial", bold: true } },
          { text: fmtBRL(total), options: { fontSize: 10, fontFace: "Arial", align: "right", bold: true } },
        ],
        [
          { text: "Valor m² obra", options: { fontSize: 10, fontFace: "Arial", bold: true } },
          { text: fmtBRL(m2), options: { fontSize: 10, fontFace: "Arial", align: "right", bold: true, color: isPrevisto ? "333333" : (m2 > store.metaCustoM2 ? RED : GREEN) } },
        ],
      ];
      Object.entries(items).forEach(([k, v]) => {
        if (v > 0 || isPrevisto) {
          blockRows.push([
            { text: k, options: { fontSize: 9, fontFace: "Arial", fill: { color: LIGHT_GRAY } } },
            { text: fmtBRL(v), options: { fontSize: 9, fontFace: "Arial", align: "right", fill: { color: LIGHT_GRAY } } },
          ]);
        }
      });
      return blockRows;
    };

    // Coluna REALIZADO
    const realizadoBlock = buildBlock("REALIZADO", store.custoTotal, store.custoM2, realizado, false);
    sl.addTable(realizadoBlock, { x: 0.5, y: 1.2, w: 6.0, colW: [3.2, 2.8], border: { type: "solid", pt: 0.5, color: MID_GRAY } });

    // Coluna PREVISTO (proporcional se houver breakdown)
    const ratio = totalDetalhado > 0 ? previstoTotal / totalDetalhado : 1;
    const previsto = Object.fromEntries(
      Object.entries(realizado).map(([k, v]) => [k, v * ratio]),
    ) as Record<string, number>;
    const previstoBlock = buildBlock("PREVISTO", previstoTotal, store.metaCustoM2, previsto, true);
    sl.addTable(previstoBlock, { x: 6.8, y: 1.2, w: 6.0, colW: [3.2, 2.8], border: { type: "solid", pt: 0.5, color: MID_GRAY } });

    // Indicador delta abaixo
    const delta = store.custoM2 - store.metaCustoM2;
    sl.addText(
      [
        { text: "Variação vs meta: ", options: { color: "333333" } },
        { text: `${delta > 0 ? "+" : ""}${fmtBRL(delta)} / m²`, options: { color: delta > 0 ? RED : GREEN, bold: true } },
      ],
      { x: 0.5, y: 6.8, w: 12.3, h: 0.4, fontSize: 13, fontFace: "Arial", align: "center" },
    );
  });

  // =============================================================
  // PLANOS DE AÇÃO — agrupados por indicador
  // =============================================================
  if (plans.length > 0) {
    const plansByInd: Record<string, ActionPlan[]> = {};
    plans.forEach((p) => {
      if (!plansByInd[p.indicador]) plansByInd[p.indicador] = [];
      plansByInd[p.indicador].push(p);
    });
    Object.entries(plansByInd).forEach(([indicador, indPlans]) => {
      const sp = pptx.addSlide();
      addBrandFrame(sp, "ANÁLISE DE CAUSA RAIZ", indicador.toUpperCase());
      const r: PptxGenJS.TableRow[] = [
        [
          { text: "Causa", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
          { text: "Ação", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
          { text: "Como", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
          { text: "Responsável", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
          { text: "Prazo Inicial", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
          { text: "Prazo Final", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
          { text: "Farol", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
        ],
      ];
      indPlans.forEach((p, i) => {
        const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
        r.push([
          { text: p.causa, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", valign: "middle" } },
          { text: p.acao, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", valign: "middle" } },
          { text: p.como, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", valign: "middle" } },
          { text: p.responsavel, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", align: "center", valign: "middle" } },
          { text: p.prazo_inicial, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", align: "center", valign: "middle" } },
          { text: p.prazo_final, options: { fill: { color: bg }, fontSize: 9, fontFace: "Arial", align: "center", valign: "middle" } },
          { text: "●", options: { fill: { color: bg }, fontSize: 16, fontFace: "Arial", align: "center", valign: "middle", color: farolHex(p.farol) } },
        ]);
      });
      sp.addTable(r, { x: 0.4, y: 1.3, w: 12.5, colW: [2.6, 2.4, 2.8, 1.3, 1.2, 1.2, 1.0], border: { type: "solid", pt: 0.5, color: MID_GRAY } });
    });
  }

  // =============================================================
  // SLIDE — INDICADOR: PRAZO MÉDIO (Construtoras x Junta-Junta)
  // =============================================================
  const sPrazo = pptx.addSlide();
  addBrandFrame(sPrazo, "INDICADOR: PRAZO MÉDIO DE IMPLANTAÇÃO", `Referência ${mesLabel}`);

  const construtoras = storesData.filter((s) => (s.origem || "").toLowerCase() !== "junta_junta" && s.prazoDias > 0);
  const juntaJunta = storesData.filter((s) => (s.origem || "").toLowerCase() === "junta_junta" && s.prazoDias > 0);

  const buildPrazoTable = (titulo: string, lojas: StoreAGMData[]): PptxGenJS.TableRow[] => {
    const r: PptxGenJS.TableRow[] = [
      [{ text: titulo, options: { fill: { color: HEADER_BG }, color: WHITE, bold: true, fontSize: 12, fontFace: "Arial", colspan: 4, align: "center" } }],
      [
        { text: "Loja", options: { fill: { color: SUB_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
        { text: "Início da Obra", options: { fill: { color: SUB_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: "Inauguração", options: { fill: { color: SUB_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: "Duração (dias)", options: { fill: { color: SUB_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
      ],
    ];
    lojas.forEach((s, i) => {
      const bg = i % 2 === 0 ? LIGHT_GRAY : WHITE;
      r.push([
        { text: s.nome, options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial" } },
        { text: s.inicioObra || "-", options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: s.dataInauguracao || "-", options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial", align: "center" } },
        { text: String(s.prazoDias), options: { fill: { color: bg }, fontSize: 10, fontFace: "Arial", align: "center" } },
      ]);
    });
    const avg = lojas.length > 0 ? Math.round(lojas.reduce((a, s) => a + s.prazoDias, 0) / lojas.length) : 0;
    r.push([
      { text: "TOTAL", options: { fill: { color: "E0E0E0" }, bold: true, fontSize: 10, fontFace: "Arial", colspan: 3, align: "right" } },
      { text: String(avg), options: { fill: { color: "E0E0E0" }, bold: true, fontSize: 11, fontFace: "Arial", align: "center" } },
    ]);
    return r;
  };

  let y = 1.2;
  if (construtoras.length > 0) {
    sPrazo.addTable(buildPrazoTable("LOJAS — CONSTRUTORAS", construtoras), {
      x: 0.5, y, w: 12.3, colW: [5.5, 2.2, 2.2, 2.4], border: { type: "solid", pt: 0.5, color: MID_GRAY },
    });
    y += 0.4 * (construtoras.length + 3) + 0.4;
  }
  if (juntaJunta.length > 0) {
    sPrazo.addTable(buildPrazoTable("LOJAS — JUNTA-JUNTA", juntaJunta), {
      x: 0.5, y, w: 12.3, colW: [5.5, 2.2, 2.2, 2.4], border: { type: "solid", pt: 0.5, color: MID_GRAY },
    });
  }
  if (construtoras.length === 0 && juntaJunta.length === 0) {
    sPrazo.addText("Nenhum dado de prazo disponível.", {
      x: 0.5, y: 3.2, w: 12.3, h: 0.5, fontSize: 14, color: "888888", fontFace: "Arial", italic: true, align: "center",
    });
  }

  // =============================================================
  // SLIDE — INDICADOR NOVOS FORNECEDORES
  // =============================================================
  const sFor = pptx.addSlide();
  addBrandFrame(sFor, "INDICADOR: NOVOS FORNECEDORES", `Meta: 5 por analista`);
  sFor.addText(`${fornecedoresCount}`, {
    x: 0, y: 2.4, w: 13.33, h: 2.0, fontSize: 120, bold: true, color: HEADER_BG, fontFace: "Arial", align: "center",
  });
  sFor.addText("novos fornecedores prospectados no período", {
    x: 0, y: 4.6, w: 13.33, h: 0.5, fontSize: 18, color: "555555", fontFace: "Arial", align: "center", italic: true,
  });

  // =============================================================
  // SLIDES — PENDÊNCIAS LOJA – CHECKLIST FINAL (por loja inaugurada)
  // =============================================================
  storesData
    .filter((s) => s.dataInauguracao)
    .forEach((store) => {
      const sp = pptx.addSlide();
      addBrandFrame(sp, "PENDÊNCIAS LOJA – CHECKLIST FINAL", `${store.filial ? store.filial + " — " : ""}${store.nome}`);
      const rows: PptxGenJS.TableRow[] = [
        [
          { text: "LOJA", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
          { text: "INAUGURAÇÃO", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
          { text: "PENDÊNCIAS INICIAIS", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
          { text: "PENDÊNCIAS FINAIS", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial" } },
          { text: "CHECK INICIAL", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
          { text: "CHECK FINAL", options: { fill: { color: TABLE_HEADER_BG }, color: WHITE, bold: true, fontSize: 10, fontFace: "Arial", align: "center" } },
        ],
        [
          { text: store.nome, options: { fontSize: 10, fontFace: "Arial", fill: { color: LIGHT_GRAY } } },
          { text: store.dataInauguracao || "-", options: { fontSize: 10, fontFace: "Arial", align: "center", fill: { color: LIGHT_GRAY } } },
          { text: store.pendenciasIniciais || "—", options: { fontSize: 9, fontFace: "Arial", fill: { color: LIGHT_GRAY }, valign: "middle" } },
          { text: store.pendenciasFinais || "—", options: { fontSize: 9, fontFace: "Arial", fill: { color: LIGHT_GRAY }, valign: "middle" } },
          { text: store.checklistInicial != null ? `${store.checklistInicial}%` : "—", options: { fontSize: 11, fontFace: "Arial", align: "center", bold: true, fill: { color: LIGHT_GRAY } } },
          { text: store.checklistFinal != null ? `${store.checklistFinal}%` : "—", options: { fontSize: 11, fontFace: "Arial", align: "center", bold: true, fill: { color: LIGHT_GRAY }, color: (store.checklistFinal ?? 0) >= 95 ? GREEN : AMBER } },
        ],
      ];
      sp.addTable(rows, { x: 0.4, y: 1.3, w: 12.5, colW: [2.4, 1.6, 3.5, 3.5, 0.75, 0.75], border: { type: "solid", pt: 0.5, color: MID_GRAY }, rowH: [0.5, 4.5] });
    });

  // =============================================================
  // SLIDE — AÇÃO DE MELHORIA
  // =============================================================
  const sAm = pptx.addSlide();
  addBrandFrame(sAm, "AÇÃO DE MELHORIA", "Sugestões para arquitetura, implantação e marcenaria");
  sAm.addText(
    "• À equipe de arquitetura: prever recortes proporcionais no piso abaixo da escada;\n\n" +
    "• À equipe de implantação: alinhar fornecedores para luminárias de sobrepor mais delicadas;\n\n" +
    "• À equipe de marcenaria: melhorar acabamento entre lateral do painel e expositor de calçados.\n\n" +
    "(edite este slide manualmente para incluir as ações de melhoria do mês)",
    {
      x: 0.8, y: 1.6, w: 11.7, h: 5,
      fontSize: 16, color: "333333", fontFace: "Arial", lineSpacingMultiple: 1.4,
    },
  );

  // =============================================================
  // SLIDE FINAL — OBRIGADO
  // =============================================================
  const sEnd = pptx.addSlide();
  sEnd.background = { fill: DARK_BG };
  sEnd.addText("CONSTANCE", {
    x: 0, y: 2.0, w: 13.33, h: 1.0, fontSize: 48, bold: true, color: WHITE, fontFace: "Arial", align: "center", charSpacing: 8,
  });
  sEnd.addText("com você, onde você estiver.", {
    x: 0, y: 3.0, w: 13.33, h: 0.5, fontSize: 16, color: MID_GRAY, fontFace: "Arial", align: "center", italic: true,
  });
  sEnd.addShape("line", { x: 4.5, y: 4.0, w: 4.3, h: 0, line: { color: ACCENT_PINK, width: 1.5 } });
  sEnd.addText("Obrigado!", {
    x: 0, y: 4.4, w: 13.33, h: 0.8, fontSize: 36, color: ACCENT_PINK, fontFace: "Arial", align: "center", charSpacing: 6, bold: true,
  });
  sEnd.addShape("rect", { x: 0, y: 7.2, w: 13.33, h: 0.1, fill: { color: ACCENT_PINK }, line: { color: ACCENT_PINK } });

  pptx.writeFile({ fileName: `AGM_${mesRef.replace("-", "_")}_EXPANSAO.pptx` });
}
