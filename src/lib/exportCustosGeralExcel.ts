import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface CategoriaItem {
  key: string;
  label: string;
  previsto: number;
  realizado: number;
  diferenca: number;
}

interface LojaItem {
  nome: string;
  tipo: string;
  ano: number;
  area: number;
  meta: number;
  categorias: CategoriaItem[];
  previstoTotal: number;
  realizadoTotal: number;
  diferencaTotal: number;
  bateuTotal: boolean;
}

interface MesItem {
  mes: string;
  count: number;
  investido: number;
  area: number;
  avgM2: number;
  meta: number;
  bateu: boolean;
}

interface MensalPorTipo {
  tipo: string;
  meta: number;
  countTotal: number;
  totalInv: number;
  totalArea: number;
  mediaAnualM2: number;
  bateuAnual: boolean;
  meses: MesItem[];
}

export interface CustosGeralReportData {
  totalLojas: number;
  totalInvestido: number;
  totalArea: number;
  avgM2: number;
  ok: number;
  over: number;
  byLoja: LojaItem[];
  byRegional: { name: string; value: number; count: number }[];
  byCat: { name: string; value: number }[];
  byEstado: { estado: string; count: number; investido: number }[];
  mensalPorTipo: MensalPorTipo[];
}

// === Paleta corporativa Constance ===
const BRAND = "5C3A21";          // marrom café principal
const BRAND_DARK = "3E2817";     // marrom escuro (cabeçalho título)
const BRAND_LIGHT = "F5EFE7";    // marrom claro (zebra)
const HEADER_TXT = "FFFFFF";
const OK_BG = "D4EDDA";
const OVER_BG = "F8D7DA";
const OK_TXT = "1E8449";
const OVER_TXT = "C0392B";
const ZEBRA = "FAF7F2";
const SUBHEADER = "8B6F4E";      // marrom médio

const CURRENCY = '"R$" #,##0.00;[Red]("R$" #,##0.00);"-"';
const NUMBER = '#,##0.00;[Red](#,##0.00);"-"';
const INT = "#,##0;[Red](#,##0);0";
const PCT = "0.0%";

function styleHeaderRow(row: ExcelJS.Row, color = BRAND) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TXT }, size: 11, name: "Calibri" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BRAND_DARK } },
      bottom: { style: "thin", color: { argb: BRAND_DARK } },
      left: { style: "thin", color: { argb: BRAND_DARK } },
      right: { style: "thin", color: { argb: BRAND_DARK } },
    };
  });
  row.height = 28;
}

function styleTitleCell(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { name: "Calibri", bold: true, size: 16, color: { argb: HEADER_TXT } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_DARK } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

function applyBorderAll(ws: ExcelJS.Worksheet, startRow: number, endRow: number, startCol: number, endCol: number) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      const existing = cell.border || {};
      cell.border = {
        top: existing.top ?? { style: "thin", color: { argb: "D0CBC4" } },
        bottom: existing.bottom ?? { style: "thin", color: { argb: "D0CBC4" } },
        left: existing.left ?? { style: "thin", color: { argb: "D0CBC4" } },
        right: existing.right ?? { style: "thin", color: { argb: "D0CBC4" } },
      };
      if (!cell.font) cell.font = { name: "Calibri", size: 10 };
    }
  }
}

function zebraRows(ws: ExcelJS.Worksheet, startRow: number, endRow: number, startCol: number, endCol: number) {
  for (let r = startRow; r <= endRow; r++) {
    if ((r - startRow) % 2 === 1) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = ws.getCell(r, c);
        if (!cell.fill || (cell.fill as any).pattern === "none") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
        }
      }
    }
  }
}

// ============================================================
// PLANILHA GERAL — TODAS AS LOJAS COM TODAS INFORMAÇÕES
// ============================================================
function buildGeralSheet(wb: ExcelJS.Workbook, reportData: CustosGeralReportData, filterAno: string, filterTipo: string) {
  const ws = wb.addWorksheet("Geral - Todas as Lojas", { views: [{ state: "frozen", ySplit: 4, xSplit: 1 }] });

  const HDR = [
    "Loja", "Modelo", "Ano", "Área (m²)", "Meta R$/m²",
    "Mão de Obra", "Móveis", "Piso", "Iluminação", "Informática", "Demais Itens",
    "Custo Total", "Custo R$/m²", "Diferença vs Meta", "% Variação", "Status",
  ];

  ws.mergeCells(1, 1, 1, HDR.length);
  styleTitleCell(ws.getCell(1, 1), "RELATÓRIO GERAL DE CUSTOS — TODAS AS LOJAS");
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, HDR.length);
  ws.getCell(2, 1).value = `Filtros — Ano: ${filterAno === "todos" ? "Todos" : filterAno}  •  Modelo: ${filterTipo === "todos" ? "Todos" : filterTipo}  •  Gerado em ${new Date().toLocaleString("pt-BR")}`;
  ws.getCell(2, 1).font = { name: "Calibri", italic: true, size: 10, color: { argb: "666666" } };
  ws.getCell(2, 1).alignment = { horizontal: "center" };
  ws.getCell(2, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_LIGHT } };

  ws.addRow([]); // linha vazia
  const headerRow = ws.addRow(HDR);
  styleHeaderRow(headerRow);

  reportData.byLoja.forEach((loja) => {
    const cats = loja.categorias;
    const get = (k: string) => cats.find((c) => c.key === k)?.realizado || 0;
    const realM2 = loja.area > 0 ? loja.realizadoTotal / loja.area : 0;
    const dif = realM2 - loja.meta;
    const pct = loja.meta > 0 ? dif / loja.meta : 0;
    const status = realM2 <= loja.meta ? "✓ NA META" : "✗ ESTOUROU";

    const r = ws.addRow([
      loja.nome, loja.tipo, loja.ano, loja.area, loja.meta,
      get("maoDeObra"), get("moveis"), get("piso"), get("iluminacao"), get("informatica"), get("demaisItens"),
      loja.realizadoTotal, realM2, dif, pct, status,
    ]);
    r.getCell(1).font = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND } };
    r.getCell(2).alignment = { horizontal: "center" };
    r.getCell(3).alignment = { horizontal: "center" };
    r.getCell(3).numFmt = "0";
    r.getCell(4).numFmt = NUMBER;
    r.getCell(5).numFmt = CURRENCY;
    for (let c = 6; c <= 14; c++) r.getCell(c).numFmt = CURRENCY;
    r.getCell(15).numFmt = PCT;

    // Custo total destacado
    r.getCell(12).font = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND } };
    // Custo R$/m² destacado
    r.getCell(13).font = { name: "Calibri", bold: true, size: 11, color: { argb: realM2 <= loja.meta ? OK_TXT : OVER_TXT } };
    // Diferença
    r.getCell(14).font = { name: "Calibri", bold: true, size: 10, color: { argb: dif <= 0 ? OK_TXT : OVER_TXT } };
    r.getCell(15).font = { name: "Calibri", bold: true, size: 10, color: { argb: dif <= 0 ? OK_TXT : OVER_TXT } };
    // Status badge
    const stCell = r.getCell(16);
    stCell.alignment = { horizontal: "center", vertical: "middle" };
    stCell.font = { name: "Calibri", bold: true, size: 10, color: { argb: HEADER_TXT } };
    stCell.fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: realM2 <= loja.meta ? OK_TXT : OVER_TXT },
    };
    r.height = 20;
  });

  // Linha TOTAL
  if (reportData.byLoja.length > 0) {
    const lastRow = ws.rowCount;
    const dataStart = 5;
    const totRow = ws.addRow([
      `TOTAL (${reportData.byLoja.length} lojas)`, "", "",
      { formula: `SUM(D${dataStart}:D${lastRow})` }, "",
      { formula: `SUM(F${dataStart}:F${lastRow})` },
      { formula: `SUM(G${dataStart}:G${lastRow})` },
      { formula: `SUM(H${dataStart}:H${lastRow})` },
      { formula: `SUM(I${dataStart}:I${lastRow})` },
      { formula: `SUM(J${dataStart}:J${lastRow})` },
      { formula: `SUM(K${dataStart}:K${lastRow})` },
      { formula: `SUM(L${dataStart}:L${lastRow})` },
      { formula: `IF(D${lastRow + 1}=0,0,L${lastRow + 1}/D${lastRow + 1})` },
      "", "",
      `${reportData.ok} OK / ${reportData.over} ESTOUROU`,
    ]);
    totRow.eachCell((cell, col) => {
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: HEADER_TXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_DARK } };
      cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle" };
      if (col === 4) cell.numFmt = NUMBER;
      else if (col >= 6 && col <= 13) cell.numFmt = CURRENCY;
    });
    totRow.height = 26;
  }

  zebraRows(ws, 5, ws.rowCount - 1, 1, HDR.length);
  applyBorderAll(ws, 4, ws.rowCount, 1, HDR.length);

  ws.columns.forEach((col, i) => {
    if (i === 0) col.width = 32;
    else if (i === 1 || i === 2) col.width = 13;
    else if (i === 15) col.width = 16;
    else col.width = 16;
  });

  // AutoFilter
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: HDR.length } };
}

// ============================================================
// PLANILHAS POR MODELO (LIGHT / TRADICIONAL / OUTLET)
// ============================================================
function buildModeloSheet(wb: ExcelJS.Workbook, modelo: string, lojas: LojaItem[], meta: number) {
  const ws = wb.addWorksheet(`Modelo - ${modelo}`, { views: [{ state: "frozen", ySplit: 4, xSplit: 1 }] });

  const HDR = [
    "Loja", "Ano", "Área (m²)",
    "Mão de Obra", "Móveis", "Piso", "Iluminação", "Informática", "Demais Itens",
    "Custo Total", "Custo R$/m²", "Meta R$/m²", "Diferença R$/m²", "Status",
  ];

  ws.mergeCells(1, 1, 1, HDR.length);
  styleTitleCell(ws.getCell(1, 1), `MODELO ${modelo} — ANÁLISE DETALHADA`);
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, HDR.length);
  const totalLojas = lojas.length;
  const totalInv = lojas.reduce((s, l) => s + l.realizadoTotal, 0);
  const totalArea = lojas.reduce((s, l) => s + l.area, 0);
  const mediaM2 = totalArea > 0 ? totalInv / totalArea : 0;
  const okCount = lojas.filter((l) => l.area > 0 && l.realizadoTotal / l.area <= meta).length;
  ws.getCell(2, 1).value =
    `${totalLojas} loja(s)  •  Investido: ${totalInv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}  •  Área total: ${totalArea.toLocaleString("pt-BR")} m²  •  Média geral: ${mediaM2.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/m²  •  Meta: ${meta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/m²  •  ${okCount} na meta / ${totalLojas - okCount} estourou`;
  ws.getCell(2, 1).font = { name: "Calibri", italic: true, size: 10, color: { argb: BRAND_DARK } };
  ws.getCell(2, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ws.getCell(2, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_LIGHT } };
  ws.getRow(2).height = 32;

  ws.addRow([]);
  const headerRow = ws.addRow(HDR);
  styleHeaderRow(headerRow);

  lojas.forEach((loja) => {
    const get = (k: string) => loja.categorias.find((c) => c.key === k)?.realizado || 0;
    const realM2 = loja.area > 0 ? loja.realizadoTotal / loja.area : 0;
    const dif = realM2 - meta;
    const bateu = realM2 <= meta && realM2 > 0;
    const r = ws.addRow([
      loja.nome, loja.ano, loja.area,
      get("maoDeObra"), get("moveis"), get("piso"), get("iluminacao"), get("informatica"), get("demaisItens"),
      loja.realizadoTotal, realM2, meta, dif,
      bateu ? "✓ NA META" : "✗ ESTOUROU",
    ]);
    r.getCell(1).font = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND } };
    r.getCell(2).alignment = { horizontal: "center" };
    r.getCell(2).numFmt = "0";
    r.getCell(3).numFmt = NUMBER;
    for (let c = 4; c <= 13; c++) r.getCell(c).numFmt = CURRENCY;
    r.getCell(10).font = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND } };
    r.getCell(11).font = { name: "Calibri", bold: true, size: 11, color: { argb: bateu ? OK_TXT : OVER_TXT } };
    r.getCell(11).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bateu ? OK_BG : OVER_BG } };
    r.getCell(13).font = { name: "Calibri", bold: true, size: 10, color: { argb: dif <= 0 ? OK_TXT : OVER_TXT } };
    const st = r.getCell(14);
    st.alignment = { horizontal: "center", vertical: "middle" };
    st.font = { name: "Calibri", bold: true, size: 10, color: { argb: HEADER_TXT } };
    st.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bateu ? OK_TXT : OVER_TXT } };
    r.height = 20;
  });

  // TOTAL
  if (lojas.length > 0) {
    const lastRow = ws.rowCount;
    const dataStart = 5;
    const totRow = ws.addRow([
      `TOTAL ${modelo}`, "",
      { formula: `SUM(C${dataStart}:C${lastRow})` },
      { formula: `SUM(D${dataStart}:D${lastRow})` },
      { formula: `SUM(E${dataStart}:E${lastRow})` },
      { formula: `SUM(F${dataStart}:F${lastRow})` },
      { formula: `SUM(G${dataStart}:G${lastRow})` },
      { formula: `SUM(H${dataStart}:H${lastRow})` },
      { formula: `SUM(I${dataStart}:I${lastRow})` },
      { formula: `SUM(J${dataStart}:J${lastRow})` },
      { formula: `IF(C${lastRow + 1}=0,0,J${lastRow + 1}/C${lastRow + 1})` },
      meta,
      { formula: `K${lastRow + 1}-L${lastRow + 1}` },
      okCount === lojas.length ? "✓ NA META" : "✗ ESTOUROU",
    ]);
    totRow.eachCell((cell, col) => {
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: HEADER_TXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_DARK } };
      cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle" };
      if (col === 3) cell.numFmt = NUMBER;
      else if (col >= 4 && col <= 13) cell.numFmt = CURRENCY;
    });
    totRow.height = 26;
  }

  zebraRows(ws, 5, ws.rowCount - 1, 1, HDR.length);
  applyBorderAll(ws, 4, ws.rowCount, 1, HDR.length);

  ws.columns.forEach((col, i) => {
    if (i === 0) col.width = 32;
    else if (i === 1) col.width = 10;
    else col.width = 16;
  });

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: HDR.length } };
}

// ============================================================
// PLANILHA RESUMO / MÉDIAS — Nome | Custo Total | Área | R$/m²
// + Média mensal por modelo
// ============================================================
function buildResumoSheet(wb: ExcelJS.Workbook, reportData: CustosGeralReportData) {
  const ws = wb.addWorksheet("Resumo e Médias", { views: [{ state: "frozen", ySplit: 4 }] });

  // Título
  ws.mergeCells(1, 1, 1, 6);
  styleTitleCell(ws.getCell(1, 1), "RESUMO GERAL — CUSTO POR LOJA E MÉDIAS");
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, 6);
  ws.getCell(2, 1).value =
    `Total: ${reportData.totalLojas} lojas  •  Investimento: ${reportData.totalInvestido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}  •  Área total: ${reportData.totalArea.toLocaleString("pt-BR")} m²  •  Média geral: ${reportData.avgM2.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/m²`;
  ws.getCell(2, 1).font = { name: "Calibri", italic: true, size: 11, color: { argb: BRAND_DARK }, bold: true };
  ws.getCell(2, 1).alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell(2, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_LIGHT } };
  ws.getRow(2).height = 26;

  ws.addRow([]);

  // ====== Tabela 1: Loja | Modelo | Custo Total | Área | R$/m² | Status ======
  const HDR1 = ["Loja", "Modelo", "Custo Total", "Área (m²)", "Custo R$/m²", "Status"];
  const headerRow = ws.addRow(HDR1);
  styleHeaderRow(headerRow);
  const t1Start = ws.rowCount + 1;

  reportData.byLoja.forEach((loja) => {
    const realM2 = loja.area > 0 ? loja.realizadoTotal / loja.area : 0;
    const bateu = realM2 <= loja.meta && realM2 > 0;
    const r = ws.addRow([
      loja.nome, loja.tipo, loja.realizadoTotal, loja.area, realM2,
      bateu ? "✓ NA META" : "✗ ESTOUROU",
    ]);
    r.getCell(1).font = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND } };
    r.getCell(2).alignment = { horizontal: "center" };
    r.getCell(3).numFmt = CURRENCY;
    r.getCell(3).font = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND } };
    r.getCell(4).numFmt = NUMBER;
    r.getCell(5).numFmt = CURRENCY;
    r.getCell(5).font = { name: "Calibri", bold: true, size: 11, color: { argb: bateu ? OK_TXT : OVER_TXT } };
    r.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bateu ? OK_BG : OVER_BG } };
    const st = r.getCell(6);
    st.alignment = { horizontal: "center" };
    st.font = { name: "Calibri", bold: true, size: 10, color: { argb: HEADER_TXT } };
    st.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bateu ? OK_TXT : OVER_TXT } };
  });
  const t1End = ws.rowCount;

  // Total geral
  if (reportData.byLoja.length > 0) {
    const tot = ws.addRow([
      "TOTAL GERAL", "",
      { formula: `SUM(C${t1Start}:C${t1End})` },
      { formula: `SUM(D${t1Start}:D${t1End})` },
      { formula: `IF(D${t1End + 1}=0,0,C${t1End + 1}/D${t1End + 1})` },
      "",
    ]);
    tot.eachCell((cell, col) => {
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: HEADER_TXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_DARK } };
      cell.alignment = { horizontal: col === 1 ? "left" : "center" };
      if (col === 3) cell.numFmt = CURRENCY;
      else if (col === 4) cell.numFmt = NUMBER;
      else if (col === 5) cell.numFmt = CURRENCY;
    });
    tot.height = 24;
  }

  zebraRows(ws, t1Start, t1End, 1, 6);
  applyBorderAll(ws, t1Start - 1, ws.rowCount, 1, 6);

  // ====== Espaçamento ======
  ws.addRow([]);
  ws.addRow([]);

  // ====== Tabela 2: Média geral por modelo (separado por modelo) ======
  const sectionRow = ws.rowCount + 1;
  ws.mergeCells(sectionRow, 1, sectionRow, 6);
  styleTitleCell(ws.getCell(sectionRow, 1), "MÉDIA GERAL POR MODELO DE LOJA");
  ws.getRow(sectionRow).height = 28;

  const HDR2 = ["Modelo", "Lojas", "Custo Total", "Área Total (m²)", "Média R$/m²", "Meta R$/m²"];
  const h2 = ws.addRow(HDR2);
  styleHeaderRow(h2, SUBHEADER);
  const t2Start = ws.rowCount + 1;

  reportData.mensalPorTipo.forEach((t) => {
    const bateu = t.mediaAnualM2 > 0 && t.mediaAnualM2 <= t.meta;
    const r = ws.addRow([
      t.tipo, t.countTotal, t.totalInv, t.totalArea, t.mediaAnualM2, t.meta,
    ]);
    r.getCell(1).font = { name: "Calibri", bold: true, size: 11, color: { argb: BRAND } };
    r.getCell(2).numFmt = INT;
    r.getCell(3).numFmt = CURRENCY;
    r.getCell(3).font = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND } };
    r.getCell(4).numFmt = NUMBER;
    r.getCell(5).numFmt = CURRENCY;
    r.getCell(5).font = { name: "Calibri", bold: true, size: 12, color: { argb: bateu ? OK_TXT : (t.mediaAnualM2 > 0 ? OVER_TXT : "666666") } };
    if (t.mediaAnualM2 > 0) {
      r.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bateu ? OK_BG : OVER_BG } };
    }
    r.getCell(6).numFmt = CURRENCY;
    r.height = 22;
  });
  applyBorderAll(ws, t2Start - 1, ws.rowCount, 1, 6);

  // ====== Espaçamento ======
  ws.addRow([]);
  ws.addRow([]);

  // ====== Tabela 3: Média MENSAL por modelo (somando mês a mês / dividindo pela área) ======
  const sectionRow2 = ws.rowCount + 1;
  ws.mergeCells(sectionRow2, 1, sectionRow2, 15);
  styleTitleCell(ws.getCell(sectionRow2, 1), "MÉDIA MENSAL DE CUSTO POR M² — POR MODELO DE LOJA");
  ws.getRow(sectionRow2).height = 28;

  ws.mergeCells(sectionRow2 + 1, 1, sectionRow2 + 1, 15);
  ws.getCell(sectionRow2 + 1, 1).value = "Cada célula = soma dos custos do mês / soma da área do mês  •  Verde = na meta  •  Vermelho = estourou";
  ws.getCell(sectionRow2 + 1, 1).font = { name: "Calibri", italic: true, size: 9, color: { argb: "666666" } };
  ws.getCell(sectionRow2 + 1, 1).alignment = { horizontal: "center" };

  const MES_HDR = ["Modelo", "Meta R$/m²", "Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez", "Média Anual"];
  const h3 = ws.addRow(MES_HDR);
  styleHeaderRow(h3, SUBHEADER);

  reportData.mensalPorTipo.forEach((t) => {
    const row: any[] = [t.tipo, t.meta];
    t.meses.forEach((m) => row.push(m.avgM2));
    row.push(t.mediaAnualM2);
    const r = ws.addRow(row);
    r.getCell(1).font = { name: "Calibri", bold: true, size: 11, color: { argb: BRAND } };
    r.getCell(2).numFmt = CURRENCY;
    t.meses.forEach((m, idx) => {
      const cell = r.getCell(3 + idx);
      cell.numFmt = CURRENCY;
      if (m.avgM2 > 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: m.bateu ? OK_BG : OVER_BG } };
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: m.bateu ? OK_TXT : OVER_TXT } };
      } else {
        cell.value = "—";
        cell.alignment = { horizontal: "center" };
        cell.font = { name: "Calibri", size: 10, color: { argb: "BBBBBB" } };
      }
    });
    const annCell = r.getCell(15);
    annCell.numFmt = CURRENCY;
    annCell.font = { name: "Calibri", bold: true, size: 11, color: { argb: t.bateuAnual ? OK_TXT : (t.mediaAnualM2 > 0 ? OVER_TXT : "666666") } };
    if (t.mediaAnualM2 > 0) {
      annCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: t.bateuAnual ? OK_BG : OVER_BG } };
    }
    r.height = 22;
  });
  applyBorderAll(ws, sectionRow2 + 2, ws.rowCount, 1, 15);

  // Larguras
  ws.columns.forEach((col, i) => {
    if (i === 0) col.width = 32;
    else if (i === 1) col.width = 14;
    else if (i >= 2 && i <= 13) col.width = 12;
    else col.width = 16;
  });
}

// ============================================================
// MAIN EXPORT
// ============================================================
export async function exportCustosGeralExcel(
  reportData: CustosGeralReportData,
  filterAno: string,
  filterTipo: string
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Constance — Gestão de Obras";
  wb.created = new Date();
  wb.company = "Constance";

  // 1. PLANILHA GERAL
  buildGeralSheet(wb, reportData, filterAno, filterTipo);

  // 2. PLANILHAS POR MODELO (separadas)
  const MODELOS = ["LIGHT", "TRADICIONAL", "OUTLET"] as const;
  const META_DEFAULT: Record<string, number> = { LIGHT: 3500, TRADICIONAL: 3250, OUTLET: 2900 };
  MODELOS.forEach((modelo) => {
    const lojas = reportData.byLoja.filter((l) => l.tipo === modelo);
    if (lojas.length > 0) {
      const meta = lojas[0].meta || META_DEFAULT[modelo];
      buildModeloSheet(wb, modelo, lojas, meta);
    }
  });

  // 3. PLANILHA RESUMO + MÉDIAS
  buildResumoSheet(wb, reportData);

  // Save
  const filename = `Custos_Geral_Constance_${filterAno === "todos" ? "Geral" : filterAno}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
