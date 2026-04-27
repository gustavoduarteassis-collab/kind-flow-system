import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";

// === Paleta corporativa Constance ===
const BRAND = "5C3A21";          // marrom café principal
const BRAND_DARK = "3E2817";     // marrom escuro (cabeçalho título)
const BRAND_LIGHT = "F5EFE7";    // marrom claro (zebra)
const HEADER_TXT = "FFFFFF";
const OK_TXT = "1E8449";
const OVER_TXT = "C0392B";
const ZEBRA = "FAF7F2";

const CURRENCY = '"R$" #,##0.00;[Red]("R$" #,##0.00);"-"';
const NUMBER = '#,##0.00;[Red](#,##0.00);"-"';

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
      cell.border = {
        top: { style: "thin", color: { argb: "D0CBC4" } },
        bottom: { style: "thin", color: { argb: "D0CBC4" } },
        left: { style: "thin", color: { argb: "D0CBC4" } },
        right: { style: "thin", color: { argb: "D0CBC4" } },
      };
      if (!cell.font) cell.font = { name: "Calibri", size: 10 };
    }
  }
}

export const exportFeriasGustavoExcel = async (stores: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Pendências Férias", { 
    views: [{ state: "frozen", ySplit: 4, xSplit: 1 }] 
  });

  const HDR = [
    "Loja", "Responsável", "Inauguração",
    "Arquitetônico", "Ação Arquitetônico",
    "Elétrico", "Ação Elétrico",
    "Incêndio", "Ação Incêndio",
    "Ar Condic.", "Ação Ar Condic.",
    "Orçamentos", "Ação Orçamentos",
    "Demolição", "Ação Demolição",
    "Obra Início", "Contrato Obra", "Ação Contrato",
    "Apres. Proj.", "Móveis", "Piso", "Luminárias"
  ];

  // Título
  ws.mergeCells(1, 1, 1, HDR.length);
  styleTitleCell(ws.getCell(1, 1), "RELATÓRIO DE PENDÊNCIAS E STATUS — FÉRIAS GUSTAVO");
  ws.getRow(1).height = 35;

  // Subtítulo / Info
  ws.mergeCells(2, 1, 2, HDR.length);
  ws.getCell(2, 1).value = `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} • Total de ${stores.length} lojas em acompanhamento`;
  ws.getCell(2, 1).font = { name: "Calibri", italic: true, size: 11, color: { argb: BRAND_DARK } };
  ws.getCell(2, 1).alignment = { horizontal: "center" };
  ws.getCell(2, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_LIGHT } };
  ws.getRow(2).height = 25;

  ws.addRow([]); // Espaço

  // Cabeçalho
  const headerRow = ws.addRow(HDR);
  styleHeaderRow(headerRow);

  // Dados
  stores.forEach((store) => {
    const checklist = store.checklist || {};
    const solicitacoes = (store as any).solicitacoes || {};
    
    const row = ws.addRow([
      store.nome,
      store.analistaObra || "Não definido",
      (store as any).dataInauguracao || "",
      checklist[28]?.status || "NÃO INICIADO",
      checklist[28]?.observacoes || "",
      checklist[31]?.status || "NÃO INICIADO",
      checklist[31]?.observacoes || "",
      checklist[32]?.status || "NÃO INICIADO",
      checklist[32]?.observacoes || "",
      checklist[33]?.status || "NÃO INICIADO",
      checklist[33]?.observacoes || "",
      checklist[36]?.status || "NÃO INICIADO",
      checklist[36]?.observacoes || "",
      checklist[61]?.status || "NÃO INICIADO",
      checklist[61]?.observacoes || "",
      checklist[40]?.status === "REALIZADO" ? "Iniciada" : "Aguardando",
      solicitacoes["contrato_obras"]?.status || "pendente",
      solicitacoes["contrato_obras"]?.comentarios || "",
      checklist[27]?.status || "NÃO INICIADO",
      checklist[44]?.status || "NÃO INICIADO",
      checklist[46]?.status || "NÃO INICIADO",
      checklist[47]?.status || "NÃO INICIADO"
    ]);

    // Estilização condicional para Status
    const statusCols = [4, 6, 8, 10, 12, 14, 16, 17, 19, 20, 21, 22];
    statusCols.forEach(colIdx => {
      const cell = row.getCell(colIdx);
      const val = String(cell.value || "").toUpperCase();
      if (val === "REALIZADO" || val === "CONCLUIDO" || val === "INICIADA" || val === "SIM") {
        cell.font = { bold: true, color: { argb: OK_TXT } };
      } else if (val === "NÃO INICIADO" || val === "PENDENTE" || val === "AGUARDANDO" || val === "NÃO") {
        cell.font = { bold: true, color: { argb: OVER_TXT } };
      }
    });

    row.getCell(1).font = { bold: true, color: { argb: BRAND } };
  });

  // Ajuste de colunas
  ws.columns.forEach((col, i) => {
    if (i === 0) col.width = 30; // Loja
    else if ([4, 6, 8, 10, 12, 14, 17].includes(i + 1)) col.width = 40; // Ações
    else col.width = 18;
  });

  applyBorderAll(ws, 4, ws.actualRowCount, 1, HDR.length);

  // Salvar
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Relatorio_Ferias_Gustavo_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
};