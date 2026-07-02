/**
 * Atualizar via Excel — importa a planilha master da diretoria (4 abas) e
 * concilia com os dados atuais das lojas, respeitando a regra aditiva:
 * nenhum campo já preenchido é sobrescrito.
 */
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import {
  parsePlanilhaMaster,
  reconcile,
  type MatchResult,
  type ParsedRow,
  type StoreLite,
  type SheetCategory,
} from "@/utils/planilhaMasterImport";

const CATEGORY_LABEL: Record<SheetCategory, string> = {
  funil: "Funil",
  inaugurada: "Inauguradas",
  reforma: "Reformas",
  repasse: "Repasse/Encerramento/Troca",
};

const CATEGORY_TIPO_LOJA: Record<SheetCategory, string> = {
  funil: "",
  inaugurada: "",
  reforma: "REFORMA",
  repasse: "REPASSE",
};

const AtualizarPlanilha = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [preview, setPreview] = useState<MatchResult[]>([]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParsing(true);
    setPreview([]);
    try {
      const parsed = await parsePlanilhaMaster(file);
      setRows(parsed);

      const { data: stores } = await supabase
        .from("stores")
        .select("*")
        .is("deleted_at", null);
      const result = reconcile(parsed, (stores as StoreLite[]) || []);
      setPreview(result);

      toast({
        title: "Planilha analisada",
        description: `${parsed.length} lojas lidas em ${new Set(parsed.map((r) => r.sheet)).size} abas.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao ler planilha",
        description: err?.message || "Falha ao processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const summary = useMemo(() => {
    const by: Record<
      SheetCategory,
      { total: number; novas: number; atualizar: number; noop: number; fieldChanges: number; stageChanges: number; commentChanges: number }
    > = {
      funil: { total: 0, novas: 0, atualizar: 0, noop: 0, fieldChanges: 0, stageChanges: 0, commentChanges: 0 },
      inaugurada: { total: 0, novas: 0, atualizar: 0, noop: 0, fieldChanges: 0, stageChanges: 0, commentChanges: 0 },
      reforma: { total: 0, novas: 0, atualizar: 0, noop: 0, fieldChanges: 0, stageChanges: 0, commentChanges: 0 },
      repasse: { total: 0, novas: 0, atualizar: 0, noop: 0, fieldChanges: 0, stageChanges: 0, commentChanges: 0 },
    };
    for (const p of preview) {
      const c = p.parsed.category;
      by[c].total++;
      if (p.action === "create") by[c].novas++;
      else if (p.action === "update") by[c].atualizar++;
      else by[c].noop++;
      by[c].fieldChanges += p.fieldChanges.length;
      by[c].stageChanges += p.parsed.stages.filter((s) => s.status !== "nao_iniciado").length;
      by[c].commentChanges += p.newStageComments + (p.hasStatusText ? 1 : 0);
    }
    return by;
  }, [preview]);

  const apply = async () => {
    if (!user) {
      toast({ title: "Faça login para importar.", variant: "destructive" });
      return;
    }
    setApplying(true);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let comments = 0;
    let statusUpdates = 0;

    try {
      for (const item of preview) {
        if (item.action === "noop") { skipped++; continue; }
        const { parsed, match } = item;

        let storeId = match?.id;

        // 1) CREATE quando não há match
        if (!storeId) {
          const insertPayload: Record<string, any> = {
            user_id: user.id,
            nome: parsed.fields.nome || parsed.nome || "(sem nome)",
            filial: parsed.fields.filial ?? parsed.filial ?? "",
            franqueado: parsed.fields.franqueado ?? "",
            construtor: "",
            analista_obra: parsed.fields.analista_obra ?? "",
            inauguracao: parsed.fields.inauguracao ?? "",
            tipo_loja: parsed.fields.tipo_loja || CATEGORY_TIPO_LOJA[parsed.category] || "",
            is_reforma: parsed.category === "reforma",
          };
          for (const [k, v] of Object.entries(parsed.fields)) {
            if (!(k in insertPayload) && v != null && v !== "") insertPayload[k] = v;
          }
          if (parsed.category === "repasse") insertPayload.status_geral = "Repasse em andamento";

          const { data: ins, error: insErr } = await supabase
            .from("stores")
            .insert(insertPayload as any)
            .select("id")
            .single();
          if (insErr || !ins) {
            console.error("insert store falhou", insErr, insertPayload);
            continue;
          }
          storeId = ins.id;
          created++;
        } else {
          // 2) UPDATE aditivo (apenas campos vazios recebem valor)
          const updatePayload: Record<string, any> = {};
          for (const ch of item.fieldChanges) updatePayload[ch.field] = ch.to;
          if (Object.keys(updatePayload).length > 0) {
            const { error: upErr } = await supabase
              .from("stores")
              .update(updatePayload as any)
              .eq("id", storeId);
            if (upErr) console.error("update store falhou", upErr);
            else updated++;
          }
        }

        if (!storeId) continue;

        // 3) STAGE_STATUS — mescla sem sobrescrever concluídos existentes
        const nonEmptyStages = parsed.stages.filter((s) => s.status !== "nao_iniciado");
        if (nonEmptyStages.length > 0) {
          const { data: cur } = await supabase
            .from("stores")
            .select("stage_status")
            .eq("id", storeId)
            .maybeSingle();
          const currentStages: Record<string, any> = (cur?.stage_status as any) || {};
          const merged = { ...currentStages };
          for (const s of nonEmptyStages) {
            const existing = merged[s.stage_key];
            // Nunca rebaixar concluído; nunca sobrescrever se já existe status igual/superior
            if (existing === "concluido" || existing === true) continue;
            merged[s.stage_key] = s.status;
          }
          await supabase.from("stores").update({ stage_status: merged } as any).eq("id", storeId);
        }

        // 4) COMENTÁRIOS por etapa
        for (const s of parsed.stages) {
          if (!s.comentario) continue;
          const { error: cErr } = await supabase.from("stage_comments").insert({
            store_id: storeId,
            stage_key: s.stage_key,
            texto: s.comentario,
            autor_nome: "Importado via Excel",
            autor_user_id: user.id,
          } as any);
          if (!cErr) comments++;
        }

        // 5) STATUS TEXT → store_updates (nunca sobrescreve o histórico anterior)
        if (parsed.statusText) {
          const { error: uErr } = await supabase.from("store_updates").insert({
            store_id: storeId,
            texto: `[Planilha] ${parsed.statusText}`,
            autor_user_id: user.id,
            autor_nome: "Importado via Excel",
          } as any);
          if (!uErr) statusUpdates++;
        }

        // 6) PENDÊNCIAS PÓS INAUGURAÇÃO
        if (parsed.itensPendentes && parsed.category === "inaugurada") {
          const itens = parsed.itensPendentes
            .split(/[·•\n;]/)
            .map((s) => s.trim())
            .filter(Boolean);
          for (const desc of itens) {
            await (supabase as any).from("pendencias_pos_inauguracao").insert({
              store_id: storeId,
              descricao: desc,
              status: "pendente",
              criado_por: user.id,
            });
          }
        }
      }

      toast({
        title: "Importação concluída",
        description: `${created} criadas · ${updated} atualizadas · ${skipped} sem mudança · ${comments} comentários · ${statusUpdates} status.`,
      });
      setPreview([]);
      setRows([]);
      setFileName("");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro na importação",
        description: err?.message || "Falha inesperada.",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/lojas")} className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Atualizar via Excel</h1>
            <p className="text-xs text-muted-foreground">
              Importa a planilha master (Funil, Inauguradas, Reformas e Repasse). Nenhum dado existente é sobrescrito.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> 1. Selecionar arquivo .xlsx
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            <div className="flex items-center gap-3">
              <Button onClick={() => inputRef.current?.click()} disabled={parsing || applying}>
                <Upload className="h-4 w-4 mr-2" />
                {parsing ? "Analisando…" : "Escolher planilha"}
              </Button>
              {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
              {parsing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Abas suportadas: <strong>FUNIL 2026</strong>, <strong>INAUGURADAS 2026</strong>, <strong>REFORMAS 2026</strong>, <strong>REPASSE-ENCERRAMENTO-TROCA 2026</strong>.
            </p>
          </CardContent>
        </Card>

        {preview.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Prévia da importação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(Object.keys(summary) as SheetCategory[]).map((cat) => {
                    const s = summary[cat];
                    if (s.total === 0) return null;
                    return (
                      <div key={cat} className="rounded-lg border p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {CATEGORY_LABEL[cat]}
                        </div>
                        <div className="mt-1 text-2xl font-bold">{s.total}</div>
                        <div className="mt-2 space-y-0.5 text-xs">
                          <div className="text-emerald-600">+ {s.novas} novas</div>
                          <div className="text-blue-600">↻ {s.atualizar} atualizadas</div>
                          <div className="text-muted-foreground">— {s.noop} sem mudança</div>
                        </div>
                        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-0.5">
                          <div>{s.fieldChanges} campos a preencher</div>
                          <div>{s.stageChanges} etapas com status</div>
                          <div>{s.commentChanges} comentários</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setPreview([]); setRows([]); setFileName(""); }} disabled={applying}>
                    Cancelar
                  </Button>
                  <Button onClick={apply} disabled={applying}>
                    {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirmar importação
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Detalhe por loja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Aba</th>
                        <th className="text-left p-2">Filial</th>
                        <th className="text-left p-2">Loja</th>
                        <th className="text-left p-2">Ação</th>
                        <th className="text-left p-2">Campos</th>
                        <th className="text-left p-2">Etapas</th>
                        <th className="text-left p-2">Comentários</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 text-muted-foreground">{p.parsed.sheet}</td>
                          <td className="p-2 font-mono">{p.parsed.filial || "—"}</td>
                          <td className="p-2">{p.parsed.fields.nome || p.parsed.nome || "—"}</td>
                          <td className="p-2">
                            {p.action === "create" && <Badge className="bg-emerald-600">Criar</Badge>}
                            {p.action === "update" && <Badge className="bg-blue-600">Atualizar</Badge>}
                            {p.action === "noop" && <Badge variant="secondary">Sem mudança</Badge>}
                          </td>
                          <td className="p-2">
                            {p.fieldChanges.length > 0
                              ? <span title={p.fieldChanges.map((c) => c.field).join(", ")}>{p.fieldChanges.length}</span>
                              : "—"}
                          </td>
                          <td className="p-2">
                            {p.parsed.stages.filter((s) => s.status !== "nao_iniciado").length}
                          </td>
                          <td className="p-2">
                            {p.newStageComments + (p.hasStatusText ? 1 : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total: {rows.length} linhas · Campos existentes preenchidos nunca são sobrescritos.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AtualizarPlanilha;
