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

const BRAND = "5C3A21"; // marrom café
const BRAND_LIGHT = "F5EFE7";
const HEADER_TXT = "FFFFFF";
const OK_BG = "D4EDDA";
const OVER_BG = "F8D7DA";
const ZEBRA = "FAF7F2";

const CURRENCY = '"R$" #,##0.00;[Red]("R$" #,##0.00);"-"';
const NUMBER = '#,##0.00;[Red](#,##0.00);"-"';
const INT = "#,##0;[Red](#,##0);0";

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TXT }, size: 11, name: "Arial" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BRAND } },
      bottom: { style: "thin", color: { argb: BRAND } },
      left: { style: "thin", color: { argb: BRAND } },
      right: { style: "thin", color: { argb: BRAND } },
    };
  });
  row.height = 24;
}

function applyBorderAll(ws: ExcelJS.Worksheet, startRow: number, endRow: number, startCol: number, endCol: number) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      cell.border = {
        top: { style: "thin", color: { argb: "D0CBC4" } },
        bottom: { style: "thin", color: { argb: "D0CBC4" } },
        left: { style: "thin", color: { argb: "D0CBC4" } },
        right: { style: "thin", color: { argb: "D0CBC4" } },
      };
      if (!cell.font) cell.font = { name: "Arial", size: 10 };
      else cell.font = { name: "Arial", size: 10, ...cell.font };
    }
  }
}

function zebraRows(ws: ExcelJS.Worksheet, startRow: number, endRow: number, startCol: number, endCol: number) {
  for (let r = startRow; r <= endRow; r++) {
    if ((r - startRow) % 2 === 1) {
      for (let c = startCol; c <= endCol; c++) {
        ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      }
    }
  }
}

export async function exportCustosGeralExcel(
  reportData: CustosGeralReportData,
  filterAno: string,
  filterTipo: string
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Constance — Gestão de Obras";
  wb.created = new Date();

  // ============ RESUMO ============
  const wsResumo = wb.addWorksheet("Resumo", { views: [{ state: "frozen", ySplit: 5 }] });
  wsResumo.columns = [
    { width: 32 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 },
  ];

  wsResumo.mergeCells("A1:E1");
  wsResumo.getCell("A1").value = "RELATÓRIO DE CUSTOS GERAL — CONSTANCE";
  wsResumo.getCell("A1").font = { name: "Arial", bold: true, size: 16, color: { argb: BRAND } };
  wsResumo.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  wsResumo.getRow(1).height = 30;

  wsResumo.mergeCells("A2:E2");
  const sub = `Filtros — Ano: ${filterAno === "todos" ? "Todos" : filterAno}  •  Tipo: ${filterTipo === "todos" ? "Todos" : filterTipo}  •  Gerado em ${new Date().toLocaleString("pt-BR")}`;
  wsResumo.getCell("A2").value = sub;
  wsResumo.getCell("A2").font = { name: "Arial", italic: true, size: 10, color: { argb: "666666" } };
  wsResumo.getCell("A2").alignment = { horizontal: "center" };

  wsResumo.addRow([]);
  const kpiHeader = wsResumo.addRow(["Indicador", "Valor", "", "Indicador", "Valor"]);
  styleHeaderRow(kpiHeader);

  const kpis: Array<[string, string | number, string, string, string | number]> = [
    ["Total de Lojas", reportData.totalLojas, INT, "", ""],
    ["Total Investido", reportData.totalInvestido, CURRENCY, "Lojas na Meta", reportData.ok],
    ["Área Total (m²)", reportData.totalArea, NUMBER, "Lojas Estouradas", reportData.over],
    ["Média Geral R$/m²", reportData.avgM2, CURRENCY, "% Atingimento", reportData.totalLojas > 0 ? reportData.ok / reportData.totalLojas : 0],
  ];
  kpis.forEach(([l1, v1, fmt1, l2, v2]) => {
    const r = wsResumo.addRow([l1, v1, "", l2, v2]);
    r.getCell(1).font = { name: "Arial", bold: true, size: 10 };
    r.getCell(2).numFmt = fmt1;
    r.getCell(2).font = { name: "Arial", bold: true, size: 11, color: { argb: BRAND } };
    r.getCell(4).font = { name: "Arial", bold: true, size: 10 };
    if (l2 === "Lojas Estouradas") {
      r.getCell(5).numFmt = INT;
      r.getCell(5).font = { name: "Arial", bold: true, size: 11, color: { argb: "C0392B" } };
    } else if (l2 === "Lojas na Meta") {
      r.getCell(5).numFmt = INT;
      r.getCell(5).font = { name: "Arial", bold: true, size: 11, color: { argb: "1E8449" } };
    } else if (l2 === "% Atingimento") {
      r.getCell(5).numFmt = "0.0%";
      r.getCell(5).font = { name: "Arial", bold: true, size: 11, color: { argb: BRAND } };
    }
  });
  applyBorderAll(wsResumo, 4, 8, 1, 5);

  // ============ LOJAS — REALIZADO X PREVISTO ============
  const wsLojas = wb.addWorksheet("Lojas — Realizado", { views: [{ state: "frozen", ySplit: 2, xSplit: 2 }] });
  const headerLojas = [
    "Loja", "Tipo", "Ano", "Área (m²)", "Meta R$/m²",
    "Mão de Obra Prev.", "Mão de Obra Real.",
    "Móveis Prev.", "Móveis Real.",
    "Piso Prev.", "Piso Real.",
    "Iluminação Prev.", "Iluminação Real.",
    "Informática Prev.", "Informática Real.",
    "Demais Prev.", "Demais Real.",
    "Previsto Total", "Realizado Total", "Diferença", "R$/m² Realizado", "Status",
  ];
  wsLojas.mergeCells(1, 1, 1, headerLojas.length);
  wsLojas.getCell(1, 1).value = "LOJAS — PREVISTO X REALIZADO POR CATEGORIA";
  wsLojas.getCell(1, 1).font = { name: "Arial", bold: true, size: 13, color: { argb: BRAND } };
  wsLojas.getCell(1, 1).alignment = { horizontal: "center" };
  wsLojas.getRow(1).height = 26;

  const headerRow = wsLojas.addRow(headerLojas);
  styleHeaderRow(headerRow);

  reportData.byLoja.forEach((loja) => {
    const cats = loja.categorias;
    const get = (k: string) => cats.find((c) => c.key === k);
    const moa = get("maoDeObra")!;
    const mov = get("moveis")!;
    const pis = get("piso")!;
    const ilu = get("iluminacao")!;
    const inf = get("informatica")!;
    const dem = get("demaisItens")!;
    const realM2 = loja.area > 0 ? loja.realizadoTotal / loja.area : 0;
    const r = wsLojas.addRow([
      loja.nome, loja.tipo, loja.ano, loja.area, loja.meta,
      moa.previsto, moa.realizado,
      mov.previsto, mov.realizado,
      pis.previsto, pis.realizado,
      ilu.previsto, ilu.realizado,
      inf.previsto, inf.realizado,
      dem.previsto, dem.realizado,
      loja.previstoTotal, loja.realizadoTotal, loja.diferencaTotal, realM2,
      loja.bateuTotal ? "✓ Na meta" : "✗ Estourou",
    ]);
    r.getCell(4).numFmt = NUMBER;
    r.getCell(5).numFmt = CURRENCY;
    for (let c = 6; c <= 21; c++) r.getCell(c).numFmt = CURRENCY;
    // Color the diferença
    const difCell = r.getCell(20);
    difCell.font = {
      name: "Arial", size: 10, bold: true,
      color: { argb: loja.diferencaTotal <= 0 ? "1E8449" : "C0392B" },
    };
    // Status badge
    const stCell = r.getCell(22);
    stCell.alignment = { horizontal: "center" };
    stCell.font = { name: "Arial", bold: true, size: 10, color: { argb: HEADER_TXT } };
    stCell.fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: loja.bateuTotal ? "1E8449" : "C0392B" },
    };
    // Realizado bold (linha do realizado destacada)
    [7, 9, 11, 13, 15, 17, 19].forEach((c) => {
      r.getCell(c).font = { name: "Arial", bold: true, size: 10, color: { argb: BRAND } };
    });
  });

  // Totais
  if (reportData.byLoja.length > 0) {
    const lastDataRow = wsLojas.rowCount;
    const totRow = wsLojas.addRow([
      "TOTAL", "", "", { formula: `SUM(D3:D${lastDataRow})` }, "",
      { formula: `SUM(F3:F${lastDataRow})` }, { formula: `SUM(G3:G${lastDataRow})` },
      { formula: `SUM(H3:H${lastDataRow})` }, { formula: `SUM(I3:I${lastDataRow})` },
      { formula: `SUM(J3:J${lastDataRow})` }, { formula: `SUM(K3:K${lastDataRow})` },
      { formula: `SUM(L3:L${lastDataRow})` }, { formula: `SUM(M3:M${lastDataRow})` },
      { formula: `SUM(N3:N${lastDataRow})` }, { formula: `SUM(O3:O${lastDataRow})` },
      { formula: `SUM(P3:P${lastDataRow})` }, { formula: `SUM(Q3:Q${lastDataRow})` },
      { formula: `SUM(R3:R${lastDataRow})` }, { formula: `SUM(S3:S${lastDataRow})` },
      { formula: `SUM(T3:T${lastDataRow})` },
      { formula: `IF(D${lastDataRow + 1}=0,0,S${lastDataRow + 1}/D${lastDataRow + 1})` },
      "",
    ]);
    totRow.eachCell((cell, col) => {
      cell.font = { name: "Arial", bold: true, size: 11, color: { argb: HEADER_TXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
      if (col === 4) cell.numFmt = NUMBER;
      else if (col >= 6 && col <= 21) cell.numFmt = CURRENCY;
    });
    totRow.height = 22;
  }

  zebraRows(wsLojas, 3, wsLojas.rowCount - 1, 1, headerLojas.length);
  applyBorderAll(wsLojas, 2, wsLojas.rowCount, 1, headerLojas.length);

  wsLojas.columns.forEach((col, i) => {
    if (i === 0) col.width = 28;
    else if (i === 1 || i === 2) col.width = 12;
    else col.width = 16;
  });

  // ============ ANDAMENTO MENSAL POR TIPO ============
  const wsMensal = wb.addWorksheet("Andamento Mensal", { views: [{ state: "frozen", ySplit: 3 }] });
  const MES_HDR = ["Tipo de Loja", "Meta R$/m²", ...["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"], "Lojas Ano", "Investido Ano", "Área Ano", "Média Anual R$/m²", "Status Anual"];
  wsMensal.mergeCells(1, 1, 1, MES_HDR.length);
  wsMensal.getCell(1, 1).value = "ANDAMENTO MENSAL POR TIPO DE LOJA — MÉDIA DE CUSTO POR M²";
  wsMensal.getCell(1, 1).font = { name: "Arial", bold: true, size: 13, color: { argb: BRAND } };
  wsMensal.getCell(1, 1).alignment = { horizontal: "center" };
  wsMensal.getRow(1).height = 26;
  wsMensal.mergeCells(2, 1, 2, MES_HDR.length);
  wsMensal.getCell(2, 1).value = "Cada célula mensal = média R$/m² das lojas cadastradas no mês. Verde = na meta • Vermelho = estourou.";
  wsMensal.getCell(2, 1).font = { name: "Arial", italic: true, size: 9, color: { argb: "666666" } };
  wsMensal.getCell(2, 1).alignment = { horizontal: "center" };

  const mensalHdr = wsMensal.addRow(MES_HDR);
  styleHeaderRow(mensalHdr);

  reportData.mensalPorTipo.forEach((t) => {
    const row: any[] = [t.tipo, t.meta];
    t.meses.forEach((m) => row.push(m.avgM2));
    row.push(t.countTotal, t.totalInv, t.totalArea, t.mediaAnualM2, t.bateuAnual ? "✓ Na meta" : (t.mediaAnualM2 > 0 ? "✗ Estourou" : "—"));
    const r = wsMensal.addRow(row);
    r.getCell(1).font = { name: "Arial", bold: true, size: 11, color: { argb: BRAND } };
    r.getCell(2).numFmt = CURRENCY;
    r.getCell(2).font = { name: "Arial", bold: true, size: 10 };
    // Meses (cols 3-14)
    t.meses.forEach((m, idx) => {
      const cell = r.getCell(3 + idx);
      cell.numFmt = CURRENCY;
      if (m.avgM2 > 0) {
        cell.fill = {
          type: "pattern", pattern: "solid",
          fgColor: { argb: m.bateu ? OK_BG : OVER_BG },
        };
        cell.font = {
          name: "Arial", size: 10, bold: true,
          color: { argb: m.bateu ? "1E8449" : "C0392B" },
        };
      } else {
        cell.value = "—";
        cell.alignment = { horizontal: "center" };
        cell.font = { name: "Arial", size: 10, color: { argb: "999999" } };
      }
    });
    r.getCell(15).numFmt = INT;
    r.getCell(16).numFmt = CURRENCY;
    r.getCell(17).numFmt = NUMBER;
    r.getCell(18).numFmt = CURRENCY;
    r.getCell(18).font = {
      name: "Arial", bold: true, size: 11,
      color: { argb: t.bateuAnual ? "1E8449" : (t.mediaAnualM2 > 0 ? "C0392B" : "666666") },
    };
    const st = r.getCell(19);
    st.alignment = { horizontal: "center" };
    if (t.mediaAnualM2 > 0) {
      st.font = { name: "Arial", bold: true, size: 10, color: { argb: HEADER_TXT } };
      st.fill = {
        type: "pattern", pattern: "solid",
        fgColor: { argb: t.bateuAnual ? "1E8449" : "C0392B" },
      };
    }
    r.height = 22;
  });
  applyBorderAll(wsMensal, 3, wsMensal.rowCount, 1, MES_HDR.length);
  wsMensal.columns.forEach((col, i) => {
    if (i === 0) col.width = 16;
    else if (i >= 2 && i <= 13) col.width = 12;
    else col.width = 16;
  });

  // ============ DETALHE MENSAL POR TIPO (uma aba por tipo) ============
  reportData.mensalPorTipo.forEach((t) => {
    const ws = wb.addWorksheet(`Detalhe ${t.tipo}`.slice(0, 31), { views: [{ state: "frozen", ySplit: 3 }] });
    ws.mergeCells(1, 1, 1, 7);
    ws.getCell(1, 1).value = `${t.tipo} — Acompanhamento Mensal Detalhado`;
    ws.getCell(1, 1).font = { name: "Arial", bold: true, size: 13, color: { argb: BRAND } };
    ws.getCell(1, 1).alignment = { horizontal: "center" };
    ws.getRow(1).height = 26;
    ws.mergeCells(2, 1, 2, 7);
    ws.getCell(2, 1).value = `Meta: ${t.meta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/m²  •  Lojas no ano: ${t.countTotal}  •  Média anual: ${t.mediaAnualM2.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/m²`;
    ws.getCell(2, 1).font = { name: "Arial", italic: true, size: 10, color: { argb: "666666" } };
    ws.getCell(2, 1).alignment = { horizontal: "center" };

    const hdr = ws.addRow(["Mês", "Lojas", "Investido", "Área (m²)", "Média R$/m²", "Meta R$/m²", "Status"]);
    styleHeaderRow(hdr);
    t.meses.forEach((m) => {
      const r = ws.addRow([
        m.mes, m.count, m.investido, m.area, m.avgM2, m.meta,
        m.avgM2 === 0 ? "—" : (m.bateu ? "✓ Na meta" : "✗ Estourou"),
      ]);
      r.getCell(2).numFmt = INT;
      r.getCell(3).numFmt = CURRENCY;
      r.getCell(4).numFmt = NUMBER;
      r.getCell(5).numFmt = CURRENCY;
      r.getCell(6).numFmt = CURRENCY;
      if (m.avgM2 > 0) {
        const c = r.getCell(5);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: m.bateu ? OK_BG : OVER_BG } };
        c.font = { name: "Arial", bold: true, size: 11, color: { argb: m.bateu ? "1E8449" : "C0392B" } };
        const st = r.getCell(7);
        st.alignment = { horizontal: "center" };
        st.font = { name: "Arial", bold: true, size: 10, color: { argb: HEADER_TXT } };
        st.fill = { type: "pattern", pattern: "solid", fgColor: { argb: m.bateu ? "1E8449" : "C0392B" } };
      }
    });
    // Total
    const lastRow = ws.rowCount;
    const tot = ws.addRow([
      "TOTAL ANO", t.countTotal, t.totalInv, t.totalArea, t.mediaAnualM2, t.meta,
      t.mediaAnualM2 === 0 ? "—" : (t.bateuAnual ? "✓ Na meta" : "✗ Estourou"),
    ]);
    tot.eachCell((cell, col) => {
      cell.font = { name: "Arial", bold: true, size: 11, color: { argb: HEADER_TXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
      if (col === 2) cell.numFmt = INT;
      else if (col === 3 || col === 5 || col === 6) cell.numFmt = CURRENCY;
      else if (col === 4) cell.numFmt = NUMBER;
    });
    tot.height = 22;
    zebraRows(ws, 4, lastRow, 1, 7);
    applyBorderAll(ws, 3, ws.rowCount, 1, 7);
    ws.columns = [
      { width: 14 }, { width: 10 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 16 }, { width: 16 },
    ];
  });

  // ============ REGIONAL / ESTADO / CATEGORIA ============
  const wsAux = wb.addWorksheet("Quebras", { views: [{ state: "frozen", ySplit: 1 }] });
  wsAux.columns = [
    { width: 28 }, { width: 16 }, { width: 22 },
    { width: 4 },
    { width: 28 }, { width: 16 }, { width: 22 },
    { width: 4 },
    { width: 28 }, { width: 22 },
  ];

  const auxHdr = wsAux.addRow([
    "Regional", "Lojas", "Investido", "",
    "Estado", "Lojas", "Investido", "",
    "Categoria", "Total Realizado",
  ]);
  styleHeaderRow(auxHdr);
  // remove fill from spacer cols
  [4, 8].forEach((c) => {
    auxHdr.getCell(c).fill = { type: "pattern", pattern: "none" } as any;
    auxHdr.getCell(c).border = {} as any;
  });

  const maxRows = Math.max(reportData.byRegional.length, reportData.byEstado.length, reportData.byCat.length);
  for (let i = 0; i < maxRows; i++) {
    const reg = reportData.byRegional[i];
    const est = reportData.byEstado[i];
    const cat = reportData.byCat[i];
    const r = wsAux.addRow([
      reg?.name || "", reg?.count ?? "", reg?.value ?? "",
      "",
      est?.estado || "", est?.count ?? "", est?.investido ?? "",
      "",
      cat?.name || "", cat?.value ?? "",
    ]);
    if (reg) { r.getCell(2).numFmt = INT; r.getCell(3).numFmt = CURRENCY; }
    if (est) { r.getCell(6).numFmt = INT; r.getCell(7).numFmt = CURRENCY; }
    if (cat) { r.getCell(10).numFmt = CURRENCY; }
  }
  applyBorderAll(wsAux, 1, wsAux.rowCount, 1, 3);
  applyBorderAll(wsAux, 1, wsAux.rowCount, 5, 7);
  applyBorderAll(wsAux, 1, wsAux.rowCount, 9, 10);

  // ============ Save ============
  const filename = `Custos_Geral_Relatorio_${filterAno === "todos" ? "Geral" : filterAno}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
