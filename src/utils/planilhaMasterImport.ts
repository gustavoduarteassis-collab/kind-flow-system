/**
 * Parser da planilha master da diretoria — abas FUNIL / INAUGURADAS / REFORMAS
 * / REPASSE-ENCERRAMENTO-TROCA.
 *
 * Objetivo: ler o .xlsx (usando exceljs para ter acesso às cores de fundo das
 * bolinhas de status) e devolver linhas normalizadas, prontas para conciliar
 * contra a tabela `stores`. Nunca sobrescreve dados existentes (regra
 * aditiva); a decisão fica na tela de prévia.
 */
import ExcelJS from "exceljs";
import { PLANILHA_STAGES } from "@/data/matrizStages";

export type Stage4Status = "nao_iniciado" | "em_andamento" | "com_problema" | "concluido";

export type SheetCategory = "funil" | "inaugurada" | "reforma" | "repasse";

export type StageCell = {
  stage_key: string;
  status: Stage4Status;
  comentario?: string;
};

export type ParsedRow = {
  sheet: string;
  category: SheetCategory;
  rowNum: number;
  filial?: string;
  nome?: string;
  fields: Record<string, any>;     // colunas mapeadas para public.stores
  statusText?: string;             // conteúdo da coluna "Status" → store_updates
  stages: StageCell[];             // bolinhas coloridas por etapa
  itensPendentes?: string;         // texto da coluna "Itens Pendentes"
};

// ---------------------------------------------------------------------------
// Utilidades de normalização
// ---------------------------------------------------------------------------

const norm = (s: string) =>
  s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.\-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toDateStr = (v: any): string => {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  // dd/mm/yyyy → yyyy-mm-dd
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const y = br[3].length === 2 ? "20" + br[3] : br[3];
    return `${y}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return "";
};

const cellText = (cell: ExcelJS.Cell): string => {
  const v: any = cell.value;
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text.trim();
    if ("richText" in v && Array.isArray(v.richText)) {
      return v.richText.map((r: any) => r.text ?? "").join("").trim();
    }
    if ("result" in v) return String(v.result ?? "").trim();
  }
  return String(v).trim();
};

// ---------------------------------------------------------------------------
// Cores → status. Reconhece verde/amarelo/vermelho pelo ARGB do fill OU pelo
// texto/emoji da célula.
// ---------------------------------------------------------------------------

function argbToStatus(argb?: string): Stage4Status | null {
  if (!argb) return null;
  const rgb = argb.length === 8 ? argb.slice(2) : argb;
  if (rgb.length !== 6) return null;
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  // ignora branco / muito claro / preto
  if (r > 240 && g > 240 && b > 240) return null;
  if (r < 30 && g < 30 && b < 30) return null;
  // verde: g dominante
  if (g > 130 && g > r + 20 && g > b + 20) return "concluido";
  // vermelho: r dominante
  if (r > 130 && r > g + 30 && r > b + 30) return "com_problema";
  // amarelo/laranja: r e g altos, b baixo
  if (r > 180 && g > 140 && b < 120) return "em_andamento";
  return null;
}

function textToStatus(text: string): Stage4Status | null {
  const t = norm(text);
  if (!t) return null;
  if (/✅|check|ok\b|concl|feito|realiz/i.test(text) || t === "sim" || t === "x") return "concluido";
  if (/🟡|andament|em curso|progresso/i.test(text) || t === "and") return "em_andamento";
  if (/🔴|❌|problema|travad|bloque|atras/i.test(text)) return "com_problema";
  return null;
}

function cellToStageStatus(cell: ExcelJS.Cell): Stage4Status {
  const fill: any = cell.fill;
  if (fill && fill.type === "pattern" && fill.fgColor?.argb) {
    const s = argbToStatus(fill.fgColor.argb);
    if (s) return s;
  }
  const s = textToStatus(cellText(cell));
  return s ?? "nao_iniciado";
}

// ---------------------------------------------------------------------------
// Mapeamento de headers da planilha → colunas de public.stores
// ---------------------------------------------------------------------------

const FIELD_MAP: Record<string, string> = {
  // identificação
  "filial": "filial",
  "local": "nome",
  "razao social": "razao_social",
  "ie": "inscricao_estadual",
  "inscricao estadual": "inscricao_estadual",
  "cd de origem": "cd_origem",
  "cd origem": "cd_origem",
  // localização
  "cidade": "cidade",
  "estado": "uf",
  "uf": "uf",
  "endereco": "endereco",
  "endereco completo": "endereco",
  "localizacao": "tipo_localizacao",
  "tipo de localizacao": "tipo_localizacao",
  "area total": "area_m2",
  "area": "area_m2",
  "area total m2": "area_m2",
  "numero pisos": "num_pisos",
  "numero de pisos": "num_pisos",
  "horario": "horario_funcionamento",
  "horario funcionamento": "horario_funcionamento",
  "horario de funcionamento": "horario_funcionamento",
  // contatos
  "e mail": "email_operacional",
  "email": "email_operacional",
  "e mail operacional": "email_operacional",
  "e mail financeiro": "email_financeiro",
  "email financeiro": "email_financeiro",
  "contato franqueado": "telefone_franqueado",
  "contato franqueados": "telefone_franqueado",
  "telefone franqueado": "telefone_franqueado",
  "franqueado": "franqueado",
  // equipe & gestão
  "gerente regional": "gerente_regional",
  "analista arquit": "analista_arquitetura",
  "analista de arquitetura": "analista_arquitetura",
  "analista arquitetura": "analista_arquitetura",
  "analista obra": "analista_obra",
  "analista de obra": "analista_obra",
  "implantadora": "implantadora",
  "grade": "grade_produtos",
  "grade produtos": "grade_produtos",
  // comercial
  "prev faturamento": "previsao_faturamento",
  "previsao faturamento": "previsao_faturamento",
  "faturamento mercadoria": "status_faturamento",
  "faturamento mercad": "status_faturamento",
  "status faturamento": "status_faturamento",
  // datas gerais
  "previsao inicial": "inauguracao",
  "previsao inicial de inauguracao": "inauguracao",
  "data de inauguracao": "inauguracao_real",
  "data inauguracao": "inauguracao_real",
  "inicio da obra": "obra_inicio_real",
  "inicio obra": "obra_inicio_real",
  "data do contrato": "contrato_locacao_real",
  "data contrato locacao": "contrato_locacao_real",
  "contrato de locacao": "contrato_locacao_real",
  "chaves": "chaves_real",
  "liberacao chaves": "chaves_real",
  "liberacao da loja": "chaves_real",
  "demolicao": "demolicao_real",
  "moveis": "moveis_real",
  "marcenaria": "moveis_real",
  "chegada produtos": "produtos_chegada_real",
  "produtos na loja": "produtos_chegada_real",
  "visita tecnica": "visita_tecnica_realizada",
  // outros
  "padrao": "tipo_loja",
  "tipo": "tipo_loja",
};

// Campos que aceitam data (yyyy-mm-dd)
const DATE_FIELDS = new Set([
  "inauguracao",
  "inauguracao_real",
  "obra_inicio_real",
  "contrato_locacao_real",
  "chaves_real",
  "demolicao_real",
  "moveis_real",
  "produtos_chegada_real",
  "visita_tecnica_realizada",
  "previsao_faturamento",
]);

const NUMBER_FIELDS = new Set(["area_m2", "num_pisos"]);

// Headers das etapas (bolinhas) — ordem coincide com PLANILHA_STAGES pelo label
const STAGE_HEADER_MAP: Record<string, string> = {};
for (const st of PLANILHA_STAGES) STAGE_HEADER_MAP[norm(st.label)] = st.key;
// aliases conhecidos
Object.assign(STAGE_HEADER_MAP, {
  [norm("Contr Franquia")]: "contr_franquia",
  [norm("Contr Obras")]: "contrato_obras",
  [norm("Contrato Franquia")]: "contr_franquia",
  [norm("Contrato Obras")]: "contrato_obras",
  [norm("Cielo LIO")]: "cielo_lio",
  [norm("FAMPE")]: "fampe",
  [norm("FAMPE Plano de Negocios")]: "fampe",
  [norm("Conta Banc")]: "conta_bancaria",
  [norm("Implant USE")]: "implantacao_use",
  [norm("Loja Apoio")]: "loja_apoio",
  [norm("Info Sist")]: "info_sistema",
  [norm("Info e Sistema")]: "info_sistema",
  [norm("Lanc Tx")]: "lancamento_tx",
  [norm("Lanc Tx Financeiro")]: "lancamento_tx",
  [norm("Produtos CDs")]: "produtos_cds",
  [norm("MKT Loja Site")]: "mkt_loja",
  [norm("Internet")]: "internet_telefonia",
  [norm("Itens Pend")]: "itens_pendentes",
  [norm("Itens Pendentes")]: "itens_pendentes",
});

const SHEET_CATEGORY: Record<string, SheetCategory> = {
  [norm("FUNIL 2026")]: "funil",
  [norm("FUNIL")]: "funil",
  [norm("INAUGURADAS 2026")]: "inaugurada",
  [norm("INAUGURADAS")]: "inaugurada",
  [norm("REFORMAS 2026")]: "reforma",
  [norm("REFORMAS")]: "reforma",
  [norm("REPASSE ENCERRAMENTO TROCA 2026")]: "repasse",
  [norm("REPASSE ENCERRAMENTO TROCA")]: "repasse",
  [norm("REPASSE")]: "repasse",
};

// ---------------------------------------------------------------------------
// Localiza a linha de cabeçalho (heurística: linha com mais matches contra
// nossos mapeamentos, entre as 6 primeiras).
// ---------------------------------------------------------------------------

function findHeaderRow(ws: ExcelJS.Worksheet): {
  headerRow: number;
  headers: { colNum: number; text: string; normalized: string }[];
} {
  let best = { row: 1, score: 0, headers: [] as any[] };
  const scan = Math.min(6, ws.rowCount);
  for (let r = 1; r <= scan; r++) {
    const row = ws.getRow(r);
    const headers: { colNum: number; text: string; normalized: string }[] = [];
    let score = 0;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell);
      if (!text) return;
      const n = norm(text);
      headers.push({ colNum: colNumber, text, normalized: n });
      if (FIELD_MAP[n] || STAGE_HEADER_MAP[n] || n === "status" || n.startsWith("comentario") || n.includes("pendencia")) {
        score++;
      }
    });
    if (score > best.score) best = { row: r, score, headers };
  }
  return { headerRow: best.row, headers: best.headers };
}

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------

export async function parsePlanilhaMaster(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const rows: ParsedRow[] = [];

  wb.eachSheet((ws) => {
    const nname = norm(ws.name);
    const category = SHEET_CATEGORY[nname];
    if (!category) return;

    const { headerRow, headers } = findHeaderRow(ws);
    if (headers.length === 0) return;

    // Pré-classifica colunas
    type ColKind =
      | { kind: "field"; field: string }
      | { kind: "stage"; stageKey: string }
      | { kind: "status" }
      | { kind: "pendencias" }
      | { kind: "comentario"; ownerStage?: string }
      | { kind: "ignore" };

    const colKinds: Record<number, ColKind> = {};
    let lastStageKey: string | undefined;

    for (const h of headers) {
      const n = h.normalized;
      if (FIELD_MAP[n]) {
        colKinds[h.colNum] = { kind: "field", field: FIELD_MAP[n] };
      } else if (STAGE_HEADER_MAP[n]) {
        colKinds[h.colNum] = { kind: "stage", stageKey: STAGE_HEADER_MAP[n] };
        lastStageKey = STAGE_HEADER_MAP[n];
      } else if (n === "status") {
        colKinds[h.colNum] = { kind: "status" };
      } else if (n.startsWith("comentario") || n.startsWith("comentarios") || n.startsWith("obs")) {
        colKinds[h.colNum] = { kind: "comentario", ownerStage: lastStageKey };
      } else if (n.includes("pendencia") && n.includes("pos")) {
        colKinds[h.colNum] = { kind: "pendencias" };
      } else if (n.includes("pendencia")) {
        // "Itens Pendentes"
        colKinds[h.colNum] = { kind: "stage", stageKey: "itens_pendentes" };
        lastStageKey = "itens_pendentes";
      } else {
        colKinds[h.colNum] = { kind: "ignore" };
      }
    }

    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const parsed: ParsedRow = {
        sheet: ws.name,
        category,
        rowNum: r,
        fields: {},
        stages: [],
      };
      let hasAny = false;

      // acumula comentários por etapa e junta no final
      const commentBuffer: Record<string, string[]> = {};

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const kind = colKinds[colNumber];
        if (!kind || kind.kind === "ignore") return;
        const text = cellText(cell);

        if (kind.kind === "field") {
          if (!text && !(cell.fill as any)?.fgColor) return;
          let value: any = text;
          if (DATE_FIELDS.has(kind.field)) value = toDateStr(cell.value) || null;
          else if (NUMBER_FIELDS.has(kind.field)) {
            const n = Number(String(text).replace(",", "."));
            value = Number.isFinite(n) ? n : null;
          }
          if (value === "" || value == null) return;
          parsed.fields[kind.field] = value;
          if (kind.field === "filial") parsed.filial = String(value).trim();
          if (kind.field === "nome") parsed.nome = String(value).trim();
          hasAny = true;
        } else if (kind.kind === "stage") {
          const status = cellToStageStatus(cell);
          parsed.stages.push({ stage_key: kind.stageKey, status });
          if (status !== "nao_iniciado") hasAny = true;
        } else if (kind.kind === "status") {
          if (text) {
            parsed.statusText = text;
            hasAny = true;
          }
        } else if (kind.kind === "comentario") {
          if (text && kind.ownerStage) {
            (commentBuffer[kind.ownerStage] ||= []).push(text);
            hasAny = true;
          }
        } else if (kind.kind === "pendencias") {
          if (text) {
            parsed.itensPendentes = text;
            hasAny = true;
          }
        }
      });

      // aplica comentários acumulados
      for (const [stage_key, notes] of Object.entries(commentBuffer)) {
        const joined = notes.join(" · ");
        // acha primeira ocorrência da stage e mescla, ou anexa nova
        const existing = parsed.stages.find((s) => s.stage_key === stage_key);
        if (existing) existing.comentario = joined;
        else parsed.stages.push({ stage_key, status: "nao_iniciado", comentario: joined });
      }

      if (!hasAny) continue;
      if (!parsed.filial && !parsed.nome) continue;

      rows.push(parsed);
    }
  });

  return rows;
}

// ---------------------------------------------------------------------------
// Conciliação com stores existentes
// ---------------------------------------------------------------------------

export type StoreLite = {
  id: string;
  filial: string | null;
  nome: string;
  [k: string]: any;
};

export type MatchResult = {
  parsed: ParsedRow;
  match?: StoreLite;
  fieldChanges: { field: string; from: any; to: any }[];
  newStageComments: number;
  hasStatusText: boolean;
  action: "create" | "update" | "noop";
};

const normName = (s: string) =>
  norm(String(s || "")).replace(/\s+/g, " ");

export function reconcile(rows: ParsedRow[], stores: StoreLite[]): MatchResult[] {
  const byFilial = new Map<string, StoreLite>();
  const byNome = new Map<string, StoreLite>();
  for (const s of stores) {
    if (s.filial) byFilial.set(String(s.filial).trim(), s);
    if (s.nome) byNome.set(normName(s.nome), s);
  }

  return rows.map((row) => {
    let match: StoreLite | undefined;
    if (row.filial && byFilial.has(row.filial)) match = byFilial.get(row.filial);
    if (!match && row.nome) match = byNome.get(normName(row.nome));

    const fieldChanges: { field: string; from: any; to: any }[] = [];
    if (match) {
      for (const [field, val] of Object.entries(row.fields)) {
        if (val === null || val === "" || val === undefined) continue;
        const current = (match as any)[field];
        if (current === null || current === undefined || current === "") {
          fieldChanges.push({ field, from: current, to: val });
        }
      }
    }
    const hasStatusText = !!row.statusText;
    const newStageComments = row.stages.filter((s) => s.comentario).length;
    let action: MatchResult["action"] = "noop";
    if (!match) action = "create";
    else if (fieldChanges.length > 0 || hasStatusText || newStageComments > 0 || row.stages.some((s) => s.status !== "nao_iniciado")) {
      action = "update";
    }

    return { parsed: row, match, fieldChanges, newStageComments, hasStatusText, action };
  });
}
