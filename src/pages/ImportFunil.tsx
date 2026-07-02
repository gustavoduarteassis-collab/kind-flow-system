import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Plus, RefreshCw, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ============================================================
// Field mapping: spreadsheet header → pipeline_stores column
// ============================================================
const FIELD_MAP: Record<string, string> = {
  "filial": "filial",
  "local": "local",
  "cidade": "cidade",
  "estado": "estado",
  "uf": "estado",
  "padrao": "padrao",
  "padrão": "padrao",
  "localizacao": "localizacao",
  "localização": "localizacao",
  "franqueado": "franqueado",
  "razao social": "razao_social",
  "razão social": "razao_social",
  "cnpj": "cnpj",
  "endereco": "endereco",
  "endereço": "endereco",
  "cep": "cep",
  "contato franqueados": "contato_franqueado",
  "contato franqueado": "contato_franqueado",
  "telefone": "telefone_franqueado",
  "telefone franqueado": "telefone_franqueado",
  "celular": "telefone_franqueado",
  "e-mail": "email_franqueado",
  "email": "email_franqueado",
  "previsao inicial de inauguracao": "previsao_inauguracao",
  "previsão inicial de inauguração": "previsao_inauguracao",
  "data de inauguracao": "data_inauguracao",
  "data de inauguração": "data_inauguracao",
  "inicio da obra": "inicio_obra",
  "início da obra": "inicio_obra",
  "data do contrato": "data_contrato_franquia",
  "data contrato franquia": "data_contrato_franquia",
  "status": "status_geral",
  "cd de origem": "cd_origem",
  "area total": "area_total",
  "área total": "area_total",
  "capex": "capex_previsto",
  "capex previsto": "capex_previsto",
  "investimento": "capex_previsto",
  "valor investimento": "capex_previsto",
  "gerente regional": "gerente_regional",
  "analista de arquitetura": "analista_arquitetura",
  "responsavel interno": "responsavel_interno",
  "responsável interno": "responsavel_interno",
  "implantadora": "implantadora",
  "construtora": "construtora",
  "empreiteira": "construtora",
  "reforma": "reforma",
  "é reforma": "reforma",
  "e reforma": "reforma",
};

const TRUTHY = new Set(["sim", "s", "x", "true", "yes", "y", "1", "reforma"]);
const parseBool = (v: string) => TRUTHY.has(v.toLowerCase().trim());

// Fields the importer is allowed to fill (ONLY when empty in DB — never overwrites existing data)
const FILLABLE_FIELDS = [
  "filial", "local", "cidade", "estado", "padrao", "localizacao",
  "franqueado", "contato_franqueado", "telefone_franqueado", "email_franqueado",
  "cnpj", "razao_social", "endereco", "cep",
  "area_total", "capex_previsto",
  "gerente_regional", "analista_arquitetura", "responsavel_interno",
  "implantadora", "construtora",
  "previsao_inauguracao", "data_inauguracao", "inicio_obra",
  "data_contrato_franquia", "status_geral", "cd_origem",
] as const;

const FIELD_LABELS: Record<string, string> = {
  filial: "Filial", local: "Local", cidade: "Cidade", estado: "Estado",
  padrao: "Padrão", localizacao: "Localização", franqueado: "Franqueado",
  contato_franqueado: "Contato", telefone_franqueado: "Telefone",
  email_franqueado: "E-mail", cnpj: "CNPJ", razao_social: "Razão Social",
  endereco: "Endereço", cep: "CEP",
  area_total: "Área Total", capex_previsto: "CAPEX Previsto",
  gerente_regional: "Gerente Regional", analista_arquitetura: "Analista Arquitetura",
  responsavel_interno: "Responsável Interno",
  implantadora: "Implantadora", construtora: "Construtora",
  previsao_inauguracao: "Previsão Inauguração", data_inauguracao: "Data Inauguração",
  inicio_obra: "Início Obra", data_contrato_franquia: "Data Contrato",
  status_geral: "Status", cd_origem: "CD de Origem", reforma: "Reforma",
};

const normalizeKey = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[\r\n]/g, " ");

const normalizeValue = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    const dd = String(v.getDate()).padStart(2, "0");
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const yy = String(v.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }
  return String(v).trim();
};

const isEmpty = (v: unknown): boolean => {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s === "" || s.toLowerCase() === "aguardando";
};

type ParsedRow = {
  filial: string;
  data: Record<string, string>;
  isInaugurada: boolean;
};

type PreviewItem = {
  row: ParsedRow;
  existingId: string | null;
  action: "create" | "fill" | "noop";
  fieldsToFill: string[];
};

type LogEntry = {
  id: string;
  file_name: string;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  ignored_count: number;
  created_at: string;
};

const ImportFunil = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Load history log
  useEffect(() => {
    if (!user) return;
    supabase
      .from("funil_import_logs")
      .select("id, file_name, created_count, updated_count, skipped_count, ignored_count, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setLogs((data as LogEntry[]) || []));
  }, [user]);

  // -------- Parse XLSX --------
  const handleFile = async (file: File) => {
    setFileName(file.name);
    setPreview([]);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const rows: ParsedRow[] = [];
    let ignored = 0;

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const isInaug = /inaugura/i.test(sheetName);
      const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
      // find header row (contains "Filial")
      const headerIdx = raw.findIndex((r) =>
        Array.isArray(r) && r.some((c) => typeof c === "string" && normalizeKey(c) === "filial")
      );
      if (headerIdx < 0) continue;
      const headers = (raw[headerIdx] as unknown[]).map((c) => (typeof c === "string" ? normalizeKey(c) : ""));

      for (let i = headerIdx + 1; i < raw.length; i++) {
        const row = raw[i];
        if (!Array.isArray(row)) continue;
        const data: Record<string, string> = {};
        headers.forEach((h, idx) => {
          const target = FIELD_MAP[h];
          if (!target) return;
          const val = normalizeValue(row[idx]);
          if (val) data[target] = val;
        });
        const filial = data.filial?.replace(/\D/g, "");
        if (!filial) { ignored++; continue; }
        data.filial = filial;
        if (isInaug) {
          data.status_geral = data.status_geral || "Inaugurada";
        }
        rows.push({ filial, data, isInaugurada: isInaug });
      }
    }

    setParsedRows(rows);
    setIgnoredCount(ignored);
    await buildPreview(rows);
  };

  // -------- Build preview against current DB --------
  const buildPreview = async (rows: ParsedRow[]) => {
    setPreviewing(true);
    try {
      const filiais = Array.from(new Set(rows.map((r) => r.filial)));
      const items: PreviewItem[] = [];
      // Fetch existing pipeline_stores by filial in chunks
      const existingByFilial = new Map<string, any>();
      if (filiais.length) {
        const { data } = await supabase
          .from("pipeline_stores")
          .select("*")
          .is("deleted_at", null)
          .in("filial", filiais);
        (data || []).forEach((s: any) => existingByFilial.set(String(s.filial), s));
      }

      for (const row of rows) {
        const existing = existingByFilial.get(row.filial) || null;
        const wantsReforma = parseBool(row.data.reforma || "");
        if (!existing) {
          // Nova loja: também espelha a previsão como data de inauguração.
          if (row.data.previsao_inauguracao && !row.data.data_inauguracao) {
            row.data.data_inauguracao = row.data.previsao_inauguracao;
          }
          const fieldsToFill = Object.keys(row.data).filter((k) => (FILLABLE_FIELDS as readonly string[]).includes(k));
          if (wantsReforma) fieldsToFill.push("reforma");
          items.push({ row, existingId: null, action: "create", fieldsToFill });
          continue;
        }
        const fieldsToFill: string[] = [];
        for (const key of FILLABLE_FIELDS) {
          const newVal = row.data[key];
          if (!newVal) continue; // planilha vazia nunca apaga dado existente
          // Planilha vence: se valor difere do banco, sobrescreve.
          const current = existing[key] == null ? "" : String(existing[key]).trim();
          if (current !== newVal) fieldsToFill.push(key);
        }
        // Espelha previsão → data_inauguracao quando data ainda vazia no banco.
        if (row.data.previsao_inauguracao && isEmpty(existing.data_inauguracao)
            && !fieldsToFill.includes("data_inauguracao")) {
          row.data.data_inauguracao = row.data.previsao_inauguracao;
          fieldsToFill.push("data_inauguracao");
        }
        // reforma: additive only — false → true never the other way
        if (wantsReforma && existing.reforma !== true) fieldsToFill.push("reforma");
        items.push({
          row,
          existingId: existing.id,
          action: fieldsToFill.length > 0 ? "fill" : "noop",
          fieldsToFill,
        });
      }

      setPreview(items);
    } finally {
      setPreviewing(false);
    }
  };

  // -------- Apply changes --------
  const confirmImport = async () => {
    if (!user) return;
    setImporting(true);
    let created = 0, updated = 0, skipped = 0;
    try {
      for (const item of preview) {
        if (item.action === "noop") { skipped++; continue; }
        if (item.action === "create") {
          const insertData: Record<string, any> = { user_id: user.id };
          for (const key of FILLABLE_FIELDS) {
            if (item.row.data[key]) insertData[key] = item.row.data[key];
          }
          if (item.fieldsToFill.includes("reforma")) insertData.reforma = true;
          const { error } = await supabase.from("pipeline_stores").insert(insertData as any);
          if (!error) created++;
        } else if (item.action === "fill") {
          const updateData: Record<string, any> = {};
          for (const key of item.fieldsToFill) {
            if (key === "reforma") updateData.reforma = true;
            else updateData[key] = item.row.data[key];
          }
          const { error } = await supabase
            .from("pipeline_stores")
            .update(updateData as any)
            .eq("id", item.existingId!);
          if (!error) updated++;
        }
      }

      await supabase.from("funil_import_logs").insert({
        user_id: user.id,
        file_name: fileName,
        created_count: created,
        updated_count: updated,
        skipped_count: skipped,
        ignored_count: ignoredCount,
        details: preview.map((p) => ({
          filial: p.row.filial,
          action: p.action,
          fields: p.fieldsToFill,
        })),
      } as any);

      toast({
        title: "Importação concluída!",
        description: `${created} criadas, ${updated} preenchidas, ${skipped} sem alteração.`,
      });

      // refresh logs
      const { data } = await supabase
        .from("funil_import_logs")
        .select("id, file_name, created_count, updated_count, skipped_count, ignored_count, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setLogs((data as LogEntry[]) || []);

      // reset
      setParsedRows([]);
      setPreview([]);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      toast({ title: "Erro durante importação", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const counts = {
    create: preview.filter((p) => p.action === "create").length,
    fill: preview.filter((p) => p.action === "fill").length,
    noop: preview.filter((p) => p.action === "noop").length,
  };

  return (
    <div className="bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Funil 2026</h1>
          <p className="text-xs text-muted-foreground">Planilha vence — sobrescreve valores divergentes; células vazias não apagam dados</p>
        </div>

        {/* Upload area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Selecione o arquivo .xlsx
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> Importar Funil (.xlsx)
              </Button>
              {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
            </div>
            <div className="rounded-md bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p>• Modo <strong>"planilha vence"</strong>: valores da planilha sobrescrevem os do sistema quando diferentes.</p>
              <p>• Células vazias na planilha <strong>nunca apagam</strong> dados já preenchidos.</p>
              <p>• Lojas são identificadas pelo número da <strong>Filial</strong>.</p>
              <p>• Linhas sem Filial são ignoradas silenciosamente.</p>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {previewing && (
          <Card><CardContent className="py-8 text-center text-muted-foreground gap-2 flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin" /> Analisando planilha...
          </CardContent></Card>
        )}

        {preview.length > 0 && !previewing && (
          <>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Plus className="h-3.5 w-3.5" /> Novas lojas</div>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.create}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="h-3.5 w-3.5" /> Campos a preencher</div>
                <p className="text-2xl font-bold text-amber-600 mt-1">{counts.fill}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Sem alteração</div>
                <p className="text-2xl font-bold text-muted-foreground mt-1">{counts.noop}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Minus className="h-3.5 w-3.5" /> Linhas ignoradas</div>
                <p className="text-2xl font-bold text-muted-foreground mt-1">{ignoredCount}</p>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Pré-visualização ({preview.length} lojas)</CardTitle>
                <Button onClick={confirmImport} disabled={importing || (counts.create === 0 && counts.fill === 0)} className="gap-2">
                  {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirmar Importação
                </Button>
              </CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Filial</TableHead>
                        <TableHead>Loja</TableHead>
                        <TableHead className="w-[180px]">Ação</TableHead>
                        <TableHead>Campos a preencher</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{p.row.filial}</TableCell>
                          <TableCell className="text-sm">
                            {p.row.data.local || "—"}
                            {p.row.isInaugurada && <Badge variant="secondary" className="ml-2 text-[10px]">Inaugurada</Badge>}
                          </TableCell>
                          <TableCell>
                            {p.action === "create" && <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><Plus className="h-3 w-3" /> Nova loja</Badge>}
                            {p.action === "fill" && <Badge className="bg-amber-500 hover:bg-amber-500 gap-1"><RefreshCw className="h-3 w-3" /> Preencher {p.fieldsToFill.length}</Badge>}
                            {p.action === "noop" && <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Nenhuma</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.fieldsToFill.length === 0
                              ? "—"
                              : p.fieldsToFill.map((f) => FIELD_LABELS[f] || f).join(", ")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Importações</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma importação realizada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-center">Criadas</TableHead>
                    <TableHead className="text-center">Preenchidas</TableHead>
                    <TableHead className="text-center">Sem alteração</TableHead>
                    <TableHead className="text-center">Ignoradas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-sm">{l.file_name}</TableCell>
                      <TableCell className="text-center text-emerald-600 font-medium">{l.created_count}</TableCell>
                      <TableCell className="text-center text-amber-600 font-medium">{l.updated_count}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{l.skipped_count}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{l.ignored_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ImportFunil;
