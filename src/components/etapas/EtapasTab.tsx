import { useCallback, useEffect, useMemo, useState } from "react";
import { Store } from "@/data/checklistData";
import { cronogramaCategorias } from "@/data/cronogramaData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import { formatBR } from "@/utils/safeDate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronDown, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PipelineRow = {
  id: string;
  projeto_arquitetonico?: string | null;
  projeto_eletrico?: string | null;
  projeto_incendio?: string | null;
  projeto_estrutural?: string | null;
  projeto_ar_condicionado?: string | null;
  orcamento_obra?: string | null;
  contratos?: string | null;
  observacoes?: string | null;
  status_geral?: string | null;
  previsao_inauguracao?: string | null;
  data_inauguracao?: string | null;
  inicio_obra?: string | null;
};

type LogRow = {
  id: string;
  project_key: string;
  status_anterior: string | null;
  status_novo: string;
  observacao: string | null;
  changed_by_name: string | null;
  created_at: string;
};

const FUNIL_PROJECTS: { key: keyof PipelineRow; label: string }[] = [
  { key: "projeto_arquitetonico", label: "Arquitetônico" },
  { key: "projeto_eletrico", label: "Elétrico" },
  { key: "projeto_incendio", label: "Incêndio" },
  { key: "projeto_estrutural", label: "Estrutural" },
  { key: "projeto_ar_condicionado", label: "Ar-Condicionado" },
  { key: "orcamento_obra", label: "Orçamento de Obra" },
  { key: "contratos", label: "Contratos" },
];

const STATUS_OPTIONS = ["Pendente", "Em Andamento", "Aprovado", "Não se Aplica"];

const statusColor = (s?: string | null) => {
  const v = (s || "").toLowerCase();
  if (v.includes("aprovado") || v.includes("ok")) return "bg-[hsl(142,60%,45%)] text-white";
  if (v.includes("andamento") || v.includes("elabor")) return "bg-[hsl(45,90%,55%)] text-[hsl(45,90%,15%)]";
  if (v.includes("não se aplica") || v.includes("nao se aplica") || v === "n/a") return "bg-[hsl(210,60%,60%)] text-white";
  return "bg-muted text-muted-foreground";
};

interface Props {
  store: Store;
  inauguradaInPipeline: boolean;
  doneItems: number;
  totalItems: number;
  atrasados: number;
  progress: number;
  onJumpTab: (tab: string) => void;
}

export default function EtapasTab({
  store,
  inauguradaInPipeline,
  doneItems,
  totalItems,
  atrasados,
  progress,
  onJumpTab,
}: Props) {
  const { user } = useAuth();
  const [pipeline, setPipeline] = useState<PipelineRow | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [openPhase, setOpenPhase] = useState<string | null>("funil");

  const fetchPipeline = useCallback(async () => {
    if (!store.filial) return;
    const { data } = await supabase
      .from("pipeline_stores")
      .select("*")
      .eq("filial", store.filial)
      .maybeSingle();
    setPipeline((data as PipelineRow) || null);
    if (data?.id) {
      const { data: log } = await supabase
        .from("pipeline_project_log")
        .select("id,project_key,status_anterior,status_novo,observacao,changed_by_name,created_at")
        .eq("pipeline_store_id", data.id)
        .order("created_at", { ascending: false });
      setLogs((log as LogRow[]) || []);
    }
  }, [store.filial]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // --- Phase computation (mirrors StorePhaseProgress) ---
  const phases = useMemo(() => {
    const visitaCount = store.visitaTecnica ? Object.keys(store.visitaTecnica).length : 0;
    const solicitCount = store.solicitacoes ? Object.keys(store.solicitacoes).length : 0;
    const preObraDone = visitaCount > 0 || solicitCount > 0;
    const items = Object.values(store.checklist || {});
    const obraStarted = items.some((i: any) => i?.status && i.status !== "NÃO INICIADO");
    const allDone =
      items.length > 0 &&
      items.every((i: any) => i?.status === "REALIZADO" || i?.status === "NÃO SE APLICA");
    const inaugRaw: any = store.inauguracaoChecklist;
    let checklistFinalStarted = false;
    if (inaugRaw && typeof inaugRaw === "object") {
      const rounds = inaugRaw.rounds;
      if (Array.isArray(rounds) && rounds.length > 0) {
        checklistFinalStarted = rounds.some((r: any) => r?.items && Object.keys(r.items).length > 0);
      } else if (Object.keys(inaugRaw).length > 0) {
        checklistFinalStarted = true;
      }
    }
    const inauguradaDone =
      inauguradaInPipeline || isStoreLiberated(store.inauguracaoChecklist, store.tipoLoja);

    // Fase 1 done = all aplicáveis aprovados
    const funilApproved = FUNIL_PROJECTS.every((p) => {
      const v = (pipeline?.[p.key] as string) || "";
      const lv = v.toLowerCase();
      return lv.includes("aprovado") || lv.includes("não se aplica") || lv.includes("nao se aplica");
    });
    const funilDone = !!pipeline && funilApproved;

    const list = [
      { key: "funil", label: "Funil", icon: "🎯", color: "bg-[hsl(217,91%,60%)]", done: funilDone },
      { key: "preobra", label: "Pré-Obra", icon: "📋", color: "bg-[hsl(25,95%,53%)]", done: preObraDone },
      { key: "obra", label: "Obra", icon: "🏗️", color: "bg-[hsl(48,96%,53%)]", done: obraStarted && allDone },
      { key: "checklist", label: "Checklist Final", icon: "✅", color: "bg-[hsl(160,84%,39%)]", done: checklistFinalStarted },
      { key: "inaugurada", label: "Inaugurada", icon: "🎉", color: "bg-[hsl(160,84%,32%)]", done: inauguradaDone },
    ];
    const firstPending = list.findIndex((p) => !p.done);
    return list.map((p, i) => ({ ...p, active: i === firstPending }));
  }, [pipeline, store, inauguradaInPipeline]);

  // --- Fase 1: update project status + append log ---
  const updateProjectStatus = async (key: keyof PipelineRow, newStatus: string) => {
    if (!pipeline) {
      toast.error("Loja não encontrada no Funil.");
      return;
    }
    const previous = (pipeline[key] as string) || null;
    if (previous === newStatus) return;

    // optimistic
    setPipeline({ ...pipeline, [key]: newStatus } as PipelineRow);

    const { error: upErr } = await supabase
      .from("pipeline_stores")
      .update({ [key]: newStatus })
      .eq("id", pipeline.id);
    if (upErr) {
      toast.error("Erro ao atualizar status: " + upErr.message);
      setPipeline(pipeline);
      return;
    }

    const { error: logErr } = await supabase.from("pipeline_project_log").insert({
      pipeline_store_id: pipeline.id,
      store_id: store.id,
      project_key: String(key),
      status_anterior: previous,
      status_novo: newStatus,
      changed_by: user?.id,
      changed_by_name: user?.email || null,
    });
    if (logErr) {
      console.warn("log insert failed", logErr);
    } else {
      fetchPipeline();
    }
    toast.success("Status atualizado e registrado no histórico.");
  };

  const addProjectObservation = async (key: keyof PipelineRow, text: string) => {
    if (!pipeline || !text.trim()) return;
    const current = (pipeline[key] as string) || "Pendente";
    const { error } = await supabase.from("pipeline_project_log").insert({
      pipeline_store_id: pipeline.id,
      store_id: store.id,
      project_key: String(key),
      status_anterior: current,
      status_novo: current,
      observacao: text.trim(),
      changed_by: user?.id,
      changed_by_name: user?.email || null,
    });
    if (error) {
      toast.error("Erro ao salvar observação: " + error.message);
      return;
    }
    fetchPipeline();
    toast.success("Observação adicionada (histórico imutável).");
  };

  // --- helpers for other phases ---
  const cronogramaSummary = useMemo(() => {
    const cron: any = store.cronograma || {};
    const planned = cron.itemDates || {};
    const real = cron.itemDatesReal || {};
    const today = new Date().toISOString().slice(0, 10);
    let total = 0;
    let done = 0;
    let late = 0;
    cronogramaCategorias.forEach((g) => {
      g.items.forEach((it) => {
        total += 1;
        if (real[it.id]?.fimReal) done += 1;
        else if (planned[it.id]?.fim && planned[it.id].fim < today) late += 1;
      });
    });
    return { total, done, late };
  }, [store.cronograma]);

  const groupsProgress = useMemo(() => {
    const cron: any = store.cronograma || {};
    const real = cron.itemDatesReal || {};
    return cronogramaCategorias.map((g) => {
      const total = g.items.length;
      const done = g.items.filter((it) => !!real[it.id]?.fimReal).length;
      return { id: g.id, nome: g.nome, total, done };
    });
  }, [store.cronograma]);

  // --- pendências (gate de avanço) por fase ---
  const pendingByPhase = useMemo(() => {
    const out: Record<string, string[]> = {};
    out.funil = FUNIL_PROJECTS.filter((p) => {
      const v = ((pipeline?.[p.key] as string) || "").toLowerCase();
      return !(v.includes("aprovado") || v.includes("não se aplica") || v.includes("nao se aplica"));
    }).map((p) => `${p.label}: aguardando aprovação`);
    out.preobra = [];
    if (Object.keys(store.visitaTecnica || {}).length === 0) out.preobra.push("Preencher Visita Técnica");
    if (Object.keys(store.solicitacoes || {}).length === 0) out.preobra.push("Registrar Solicitações iniciais");
    out.obra = [];
    const items = Object.values(store.checklist || {});
    const pendentes = items.filter(
      (i: any) => i?.status && i.status !== "REALIZADO" && i.status !== "NÃO SE APLICA"
    ).length;
    if (pendentes > 0) out.obra.push(`${pendentes} itens do checklist ainda não finalizados`);
    if (cronogramaSummary.late > 0)
      out.obra.push(`${cronogramaSummary.late} atividades atrasadas no cronograma`);
    out.checklist = [];
    const inaugRaw: any = store.inauguracaoChecklist;
    const hasRounds =
      inaugRaw && Array.isArray(inaugRaw.rounds) && inaugRaw.rounds.length > 0;
    if (!hasRounds && !(inaugRaw && Object.keys(inaugRaw).length > 0)) {
      out.checklist.push("Iniciar Checklist de Inauguração");
    }
    out.inaugurada = [];
    return out;
  }, [pipeline, store, cronogramaSummary]);


  return (
    <div className="space-y-4">
      {/* === Sticky stepper === */}
      <div className="sticky top-[64px] z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center justify-between gap-2">
          {phases.map((p, idx) => (
            <div key={p.key} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => setOpenPhase(p.key)}
                className="flex flex-col items-center gap-1 flex-shrink-0 group"
                title={p.label}
              >
                <div
                  className={cn(
                    "h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                    p.done
                      ? "bg-[hsl(142,60%,45%)] text-white border-[hsl(142,60%,45%)]"
                      : p.active
                      ? "bg-[hsl(45,90%,90%)] text-[hsl(28,40%,25%)] border-[hsl(28,55%,45%)] animate-pulse"
                      : "bg-muted text-muted-foreground border-dashed border-border",
                    openPhase === p.key && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  {p.done ? <Check className="h-4 w-4" /> : <span>{p.icon}</span>}
                </div>
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] font-medium whitespace-nowrap",
                    p.done
                      ? "text-[hsl(142,60%,35%)]"
                      : p.active
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {p.label}
                </span>
              </button>
              {idx < phases.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 sm:mx-2 -mt-4",
                    phases[idx + 1].done || p.done
                      ? "bg-[hsl(142,60%,45%)]"
                      : "border-t border-dashed border-border bg-transparent h-0"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <div className="md:col-span-2">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              ✓ {doneItems} concluídos / {totalItems} total
              {atrasados > 0 && <span className="text-destructive font-semibold"> · ⚠ {atrasados} atrasados</span>}
            </div>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Previsão: </span>
            <strong className="text-foreground">
              {formatBR(pipeline?.previsao_inauguracao || store.inauguracao) || "—"}
            </strong>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Analista: </span>
            <strong className="text-foreground">{store.analistaObra || "—"}</strong>
          </div>
        </div>
      </div>

      {/* === Phase cards === */}
      {phases.map((p) => {
        const isOpen = openPhase === p.key;
        return (
          <Card key={p.key} className={cn("overflow-hidden", isOpen && "ring-1 ring-primary/30")}>
            <Collapsible open={isOpen} onOpenChange={(o) => setOpenPhase(o ? p.key : null)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-white text-lg", p.color)}>
                      {p.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.done ? "Concluída" : p.active ? "Em andamento" : "Não iniciada"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.done && <Badge className="bg-[hsl(142,60%,45%)] text-white">✓ OK</Badge>}
                    {p.active && !p.done && <Badge variant="secondary">Atual</Badge>}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 space-y-3">
                  {p.key === "funil" && (
                    <FunilPhase
                      pipeline={pipeline}
                      logs={logs}
                      onChange={updateProjectStatus}
                      onAddObservation={addProjectObservation}
                    />
                  )}
                  {p.key === "preobra" && (
                    <PhaseLink
                      title="Pré-Obra usa Visita Técnica + Solicitações"
                      bullets={[
                        `Visita Técnica: ${Object.keys(store.visitaTecnica || {}).length} itens preenchidos`,
                        `Solicitações: ${Object.keys(store.solicitacoes || {}).length} itens preenchidos`,
                      ]}
                      actions={[
                        { label: "Abrir Visita Técnica", onClick: () => onJumpTab("visita-tecnica") },
                        { label: "Abrir Solicitações", onClick: () => onJumpTab("solicitacoes") },
                      ]}
                    />
                  )}
                  {p.key === "obra" && (
                    <ObraPhase
                      summary={cronogramaSummary}
                      groups={groupsProgress}
                      onOpenCronograma={() => onJumpTab("cronograma")}
                      onOpenDiario={() => onJumpTab("diario")}
                    />
                  )}
                  {p.key === "checklist" && (
                    <PhaseLink
                      title="Checklist Final de Inauguração"
                      bullets={[`Status: ${p.done ? "Iniciado" : "Não iniciado"}`]}
                      actions={[{ label: "Abrir Checklist Inauguração", onClick: () => onJumpTab("inauguracao") }]}
                    />
                  )}
                  {p.key === "inaugurada" && (
                    <InauguradaPhase store={store} pipeline={pipeline} done={p.done} />
                  )}

                  {/* Gate de avanço — apenas para fase atual com pendências */}
                  {p.active && !p.done && (pendingByPhase[p.key]?.length || 0) > 0 && (
                    <div className="rounded-md border border-[hsl(45,90%,55%)]/40 bg-[hsl(45,90%,55%)]/10 p-3">
                      <p className="text-xs font-semibold text-[hsl(28,40%,25%)] dark:text-[hsl(45,90%,80%)] mb-1">
                        ⚠ Falta para avançar para a próxima fase:
                      </p>
                      <ul className="text-xs list-disc list-inside space-y-0.5">
                        {pendingByPhase[p.key].map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- Fase 1: Funil ---------------- */
function FunilPhase({
  pipeline,
  logs,
  onChange,
  onAddObservation,
}: {
  pipeline: PipelineRow | null;
  logs: LogRow[];
  onChange: (key: keyof PipelineRow, newStatus: string) => void;
  onAddObservation: (key: keyof PipelineRow, text: string) => void;
}) {
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [obsDraft, setObsDraft] = useState<Record<string, string>>({});
  if (!pipeline) {
    return (
      <p className="text-sm text-muted-foreground px-2">
        Loja não encontrada no Funil. Cadastre a loja no Funil para gerir os projetos aqui.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {FUNIL_PROJECTS.map((p) => {
        const current = (pipeline[p.key] as string) || "Pendente";
        const projLogs = logs.filter((l) => l.project_key === p.key);
        const isOpen = showHistory === p.key;
        return (
          <div key={String(p.key)} className="border rounded-md p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-[180px]">
                <Badge className={statusColor(current)}>{current || "Pendente"}</Badge>
                <span className="font-medium text-sm">{p.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={STATUS_OPTIONS.includes(current) ? current : "Pendente"}
                  onValueChange={(v) => onChange(p.key, v)}
                >
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setShowHistory(isOpen ? null : String(p.key))}
                >
                  <History className="h-3.5 w-3.5 mr-1" />
                  {projLogs.length}
                </Button>
              </div>
            </div>

            {/* Add observation (append-only) */}
            <div className="mt-2 flex gap-2 items-start">
              <textarea
                value={obsDraft[String(p.key)] || ""}
                onChange={(e) => setObsDraft((d) => ({ ...d, [String(p.key)]: e.target.value }))}
                placeholder="Adicionar observação (registrada no histórico, não sobrescreve)"
                className="flex-1 text-xs rounded-md border bg-background p-2 min-h-[36px] resize-y"
                rows={1}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!(obsDraft[String(p.key)] || "").trim()}
                onClick={() => {
                  onAddObservation(p.key, obsDraft[String(p.key)] || "");
                  setObsDraft((d) => ({ ...d, [String(p.key)]: "" }));
                }}
              >
                Adicionar
              </Button>
            </div>

            {isOpen && (
              <div className="mt-2 pt-2 border-t text-xs space-y-1.5">
                {projLogs.length === 0 && <p className="text-muted-foreground">Sem alterações registradas.</p>}
                {projLogs.map((l) => (
                  <div key={l.id} className="text-muted-foreground">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px]">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                      <span>·</span>
                      <span>{l.changed_by_name || "—"}</span>
                      {l.status_anterior !== l.status_novo && (
                        <>
                          <span>·</span>
                          <span className="text-foreground">
                            {l.status_anterior || "—"} → <strong>{l.status_novo}</strong>
                          </span>
                        </>
                      )}
                    </div>
                    {l.observacao && (
                      <p className="text-foreground whitespace-pre-line pl-1 border-l-2 border-primary/40 ml-1 mt-0.5">
                        {l.observacao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Fase 3: Obra ---------------- */
function ObraPhase({
  summary,
  groups,
  onOpenCronograma,
  onOpenDiario,
}: {
  summary: { total: number; done: number; late: number };
  groups: { id: string; nome: string; total: number; done: number }[];
  onOpenCronograma: () => void;
  onOpenDiario: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md border p-2">
          <div className="text-lg font-bold">{summary.done}</div>
          <div className="text-muted-foreground">Concluídas</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-lg font-bold">{summary.total}</div>
          <div className="text-muted-foreground">Total</div>
        </div>
        <div className="rounded-md border p-2">
          <div className={cn("text-lg font-bold", summary.late > 0 && "text-destructive")}>{summary.late}</div>
          <div className="text-muted-foreground">Atrasadas</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {groups.map((g) => {
          const pct = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
          return (
            <div key={g.id} className="flex items-center gap-2 text-xs">
              <span className="w-40 truncate">{g.nome}</span>
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="w-16 text-right tabular-nums text-muted-foreground">
                {g.done}/{g.total}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={onOpenCronograma}>
          Abrir Cronograma
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenDiario}>
          Diário de Obra
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Fase 5: Inaugurada ---------------- */
function InauguradaPhase({
  store,
  pipeline,
  done,
}: {
  store: Store;
  pipeline: PipelineRow | null;
  done: boolean;
}) {
  if (!done) {
    return (
      <p className="text-sm text-muted-foreground">
        A loja ainda não foi inaugurada. Ao concluir o Checklist Final esta seção será preenchida automaticamente.
      </p>
    );
  }
  return (
    <div className="text-sm space-y-1">
      <div>
        <strong>Data de inauguração: </strong>
        {formatBR(pipeline?.data_inauguracao || store.inauguracao) || "—"}
      </div>
      <div>
        <strong>Início da obra: </strong>
        {formatBR(pipeline?.inicio_obra) || "—"}
      </div>
      <div>
        <strong>Analista responsável: </strong>
        {store.analistaObra || "—"}
      </div>
      <div>
        <strong>Franqueado: </strong>
        {store.franqueado || "—"}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Dados desta fase são somente leitura. O histórico completo é imutável e preservado para auditoria.
      </p>
    </div>
  );
}

/* ---------------- Generic link card ---------------- */
function PhaseLink({
  title,
  bullets,
  actions,
}: {
  title: string;
  bullets: string[];
  actions: { label: string; onClick: () => void }[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      <div className="flex gap-2 pt-1 flex-wrap">
        {actions.map((a, i) => (
          <Button key={i} size="sm" variant="outline" onClick={a.onClick}>
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
