import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, Search, Info, X, AlertTriangle, Flame, Loader2, AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import { migrateInaugData, getAllInaugItems } from "@/data/inauguracaoChecklistData";
import { computeCriticality, highestSeverity, type CriticalReason } from "@/utils/storeCriticality";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// -------- Status de 4 níveis nas etapas da planilha --------
export type Stage4 = "nao_iniciado" | "em_andamento" | "com_problema" | "concluido";

const STAGE_ORDER: Stage4[] = ["nao_iniciado", "em_andamento", "com_problema", "concluido"];

/** Converte o valor cru vindo do JSON (bool antigo ou string nova) para Stage4. */
function normalizeStage(v: any): Stage4 {
  if (v === true || v === "concluido") return "concluido";
  if (v === "em_andamento") return "em_andamento";
  if (v === "com_problema") return "com_problema";
  return "nao_iniciado";
}

const nextStage = (s: Stage4): Stage4 =>
  STAGE_ORDER[(STAGE_ORDER.indexOf(s) + 1) % STAGE_ORDER.length];

const STAGE_META: Record<Stage4, { label: string; classes: string; icon: JSX.Element; short: string }> = {
  nao_iniciado: {
    label: "Não iniciada",
    short: "⏳ Não iniciada",
    classes: "bg-background text-muted-foreground border-border hover:bg-muted",
    icon: <Minus className="h-3 w-3" />,
  },
  em_andamento: {
    label: "Em andamento",
    short: "🟡 Em andamento",
    classes: "bg-[hsl(45,95%,55%)] text-black border-[hsl(45,95%,45%)]",
    icon: <Loader2 className="h-3.5 w-3.5" />,
  },
  com_problema: {
    label: "Com problema",
    short: "🔴 Com problema",
    classes: "bg-destructive text-destructive-foreground border-destructive",
    icon: <AlertOctagon className="h-3.5 w-3.5" />,
  },
  concluido: {
    label: "Concluída",
    short: "✅ Concluída",
    classes: "bg-[hsl(142,60%,45%)] text-white border-[hsl(142,60%,45%)]",
    icon: <Check className="h-4 w-4" />,
  },
};


const AUTO_PHASES = [
  { key: "funil", label: "Funil", tab: "dados", desc: "Loja cadastrada no funil de expansão. Marcada automaticamente para toda loja em andamento." },
  { key: "preobra", label: "Pré-Obra", tab: "obra", desc: "Existe visita técnica registrada ou pelo menos uma solicitação operacional cadastrada." },
  { key: "obra", label: "Obra", tab: "obra", desc: "Checklist de obra iniciado e todos os itens marcados como REALIZADO ou NÃO SE APLICA." },
  { key: "checklist", label: "Checklist Final", tab: "checklist-final", desc: "Ao menos uma rodada do checklist final de inauguração foi preenchida." },
  { key: "inaugurada", label: "Inaugurada", tab: "datas", desc: "Loja liberada pelo checklist final ou marcada como inaugurada no funil." },
] as const;

import { PLANILHA_STAGES, STAGE_GROUPS, deriveStagesFromChecklist, type PlanilhaStage } from "@/data/matrizStages";

type AutoKey = typeof AUTO_PHASES[number]["key"];

function computeAutoFlags(store: any, inauguradaInPipeline: boolean): Record<AutoKey, boolean> {
  const visitaCount = store.visitaTecnica ? Object.keys(store.visitaTecnica).length : 0;
  const solicitCount = store.solicitacoes ? Object.keys(store.solicitacoes).length : 0;
  const preObraDone = visitaCount > 0 || solicitCount > 0;

  const checklistItems = Object.values(store.checklist || {});
  const obraStarted = checklistItems.some((i: any) => i?.status && i.status !== "NÃO INICIADO");
  const allChecklistDone =
    checklistItems.length > 0 &&
    checklistItems.every((i: any) => i?.status === "REALIZADO" || i?.status === "NÃO SE APLICA");
  const obraDone = obraStarted && allChecklistDone;

  const inaugRaw: any = store.inauguracaoChecklist;
  let checklistFinalDone = false;
  if (inaugRaw && typeof inaugRaw === "object") {
    const rounds = inaugRaw.rounds;
    if (Array.isArray(rounds) && rounds.length > 0) {
      checklistFinalDone = rounds.some((r: any) => r?.items && Object.keys(r.items).length > 0);
    } else if (Object.keys(inaugRaw).length > 0) {
      checklistFinalDone = true;
    }
  }

  const inauguradaDone =
    inauguradaInPipeline || isStoreLiberated(store.inauguracaoChecklist, store.tipoLoja);

  return {
    funil: true,
    preobra: preObraDone,
    obra: obraDone,
    checklist: checklistFinalDone,
    inaugurada: inauguradaDone,
  };
}



export default function MatrizEtapas() {
  const { stores, loading } = useStores();
  const [pipelineInaug, setPipelineInaug] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [stageStatus, setStageStatus] = useState<Record<string, Record<string, Stage4>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  // Filtros avançados
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [progressFilter, setProgressFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [criticalFilter, setCriticalFilter] = useState<string>("all");


  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pipeline_stores")
        .select("local, filial, status_geral")
        .is("deleted_at", null);
      const set = new Set<string>();
      (data || []).forEach((r: any) => {
        if ((r.status_geral || "").toString().toLowerCase().startsWith("inaugurada")) {
          [r.local, r.filial].filter(Boolean).forEach((v: string) =>
            set.add(v.toString().trim().toLowerCase())
          );
        }
      });
      setPipelineInaug(set);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stores").select("id, stage_status");
      const map: Record<string, Record<string, Stage4>> = {};
      (data || []).forEach((r: any) => {
        const raw = (r.stage_status && typeof r.stage_status === "object") ? r.stage_status : {};
        const norm: Record<string, Stage4> = {};
        for (const [k, v] of Object.entries(raw)) norm[k] = normalizeStage(v);
        map[r.id] = norm;
      });
      setStageStatus(map);
    })();
  }, []);

  /** Avança sequencialmente o status da célula (nao_iniciado → em_andamento → com_problema → concluido → …). */
  const cycle = async (storeId: string, stageKey: string) => {
    const current = stageStatus[storeId] || {};
    const currentVal = normalizeStage(current[stageKey]);
    const nextVal = nextStage(currentVal);
    const next = { ...current, [stageKey]: nextVal };
    setStageStatus((s) => ({ ...s, [storeId]: next }));
    setSaving(storeId + stageKey);
    const { error } = await supabase.from("stores").update({ stage_status: next as any }).eq("id", storeId);
    setSaving(null);
    if (error) {
      toast.error("Erro ao salvar etapa");
      setStageStatus((s) => ({ ...s, [storeId]: current }));
    }
  };


  const totalStagesAll = AUTO_PHASES.length + PLANILHA_STAGES.length;
  const visibleGroups = useMemo(
    () => (groupFilter === "all" ? STAGE_GROUPS : STAGE_GROUPS.filter((g) => g.name === groupFilter)),
    [groupFilter]
  );

  const clearFilters = () => {
    setSearch(""); setPhaseFilter("all"); setProgressFilter("all"); setGroupFilter("all"); setStageFilter("all"); setCriticalFilter("all");
  };
  const hasFilters = search || phaseFilter !== "all" || progressFilter !== "all" || groupFilter !== "all" || stageFilter !== "all" || criticalFilter !== "all";

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores
      .filter((s) => !q || s.nome.toLowerCase().includes(q) || (s.filial || "").toLowerCase().includes(q))
      .map((s) => {
        const inPipeline =
          pipelineInaug.has((s.nome || "").trim().toLowerCase()) ||
          pipelineInaug.has((s.filial || "").trim().toLowerCase());
        const flags = computeAutoFlags(s, inPipeline);
        const derived = deriveStagesFromChecklist(s);
        const st = stageStatus[s.id] || {};
        const autoDone = AUTO_PHASES.filter((p) => flags[p.key]).length;
        const planDone = PLANILHA_STAGES.filter(
          (ps) => derived[ps.key] || normalizeStage(st[ps.key]) === "concluido"
        ).length;
        const pct = ((autoDone + planDone) / totalStagesAll) * 100;
        const reasons: CriticalReason[] = computeCriticality(s, {
          progressPct: pct,
          inaugurada: flags.inaugurada,
        });
        const severity = highestSeverity(reasons);
        return { store: s, flags, derived, pct, reasons, severity };
      })
      .filter((r) => !r.flags.inaugurada)
      .filter((r) => {
        // filtro fase automática
        if (phaseFilter !== "all") {
          const [mode, key] = phaseFilter.split(":") as [string, AutoKey];
          const v = r.flags[key];
          if (mode === "done" && !v) return false;
          if (mode === "pending" && v) return false;
        }
        // filtro etapa planilha (done = concluído; pending = qualquer coisa diferente)
        if (stageFilter !== "all") {
          const [mode, key] = stageFilter.split(":");
          const st = stageStatus[r.store.id] || {};
          const isConcluido = r.derived[key] === true || normalizeStage(st[key]) === "concluido";
          if (mode === "done" && !isConcluido) return false;
          if (mode === "pending" && isConcluido) return false;
        }

        // filtro progresso
        if (progressFilter !== "all") {
          if (progressFilter === "low" && r.pct >= 30) return false;
          if (progressFilter === "mid" && (r.pct < 30 || r.pct > 70)) return false;
          if (progressFilter === "high" && r.pct <= 70) return false;
        }
        // filtro criticidade
        if (criticalFilter !== "all") {
          if (criticalFilter === "any" && r.severity === null) return false;
          if (criticalFilter === "alta" && r.severity !== "alta") return false;
          if (criticalFilter === "media" && r.severity !== "media") return false;
          if (criticalFilter === "ok" && r.severity !== null) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Críticas primeiro quando o filtro não força uma ordem específica
        const sev = (x: typeof a) => (x.severity === "alta" ? 0 : x.severity === "media" ? 1 : 2);
        if (sev(a) !== sev(b)) return sev(a) - sev(b);
        return a.store.nome.localeCompare(b.store.nome, "pt-BR");
      });
  }, [stores, pipelineInaug, search, phaseFilter, stageFilter, progressFilter, criticalFilter, stageStatus, totalStagesAll]);

  const criticalCount = useMemo(
    () => rows.filter((r) => r.severity !== null).length,
    [rows]
  );

  const autoTotals = useMemo(() => {
    const t: Record<AutoKey, number> = { funil: 0, preobra: 0, obra: 0, checklist: 0, inaugurada: 0 };
    rows.forEach((r) => AUTO_PHASES.forEach((p) => { if (r.flags[p.key]) t[p.key]++; }));
    return t;
  }, [rows]);

  const planilhaTotals = useMemo(() => {
    const t: Record<string, number> = {};
    PLANILHA_STAGES.forEach((s) => { t[s.key] = 0; });
    rows.forEach((r) => {
      const st = stageStatus[r.store.id] || {};
      PLANILHA_STAGES.forEach((s) => {
        const isDone = r.derived[s.key] === true || normalizeStage(st[s.key]) === "concluido";
        if (isDone) t[s.key]++;
      });
    });
    return t;
  }, [rows, stageStatus]);


  const totalStages = AUTO_PHASES.length + PLANILHA_STAGES.length;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Matriz de Etapas</h1>
          <p className="text-sm text-muted-foreground">
            Fases automáticas + etapas da planilha. <strong>Clique em cada bolinha</strong> para avançar sequencialmente entre os 4 status: Não iniciada → Em andamento → Com problema → Concluída. As etapas <strong>Itens Pendentes</strong> e <strong>Loja Liberada</strong> continuam sincronizadas com o Checklist Final (travadas em Concluída).
          </p>
        </div>

        {/* Legenda */}
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Info className="h-4 w-4 text-muted-foreground" /> Legenda — clique para avançar status
              </div>
              {(["nao_iniciado","em_andamento","com_problema","concluido"] as Stage4[]).map((k) => {
                const m = STAGE_META[k];
                return (
                  <div key={k} className="flex items-center gap-2">
                    <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full border", m.classes)}>
                      {m.icon}
                    </span>
                    <span>{m.label}</span>
                  </div>
                );
              })}

              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded bg-muted/40 border" />
                <span><span className="font-medium">Fases (auto):</span> marcadas pelo sistema conforme o avanço da loja.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded bg-background border" />
                <span><span className="font-medium">Etapas da planilha:</span> clique para marcar/desmarcar manualmente.</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground italic">
                <span>↳ Subetapa</span>
                <span>de uma etapa principal (ex.: Implantação USE → USE)</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">X/Y</span> abaixo de cada coluna = lojas concluídas / total em andamento.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">
                {rows.length} loja{rows.length !== 1 ? "s" : ""} {hasFilters ? "filtrada(s)" : "em andamento"}
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="ml-2 gap-1 text-[10px]">
                    <Flame className="h-3 w-3" /> {criticalCount} com alerta
                  </Badge>
                )}
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar loja ou filial..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Fase (auto)</label>
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="h-9 w-[210px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fases</SelectItem>
                    {AUTO_PHASES.filter((p) => p.key !== "funil" && p.key !== "inaugurada").map((p) => [
                      <SelectItem key={`p-${p.key}`} value={`pending:${p.key}`}>Pendente em {p.label}</SelectItem>,
                      <SelectItem key={`d-${p.key}`} value={`done:${p.key}`}>Concluíram {p.label}</SelectItem>,
                    ])}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Etapa da planilha</label>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="h-9 w-[240px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    <SelectItem value="all">Todas as etapas</SelectItem>
                    {PLANILHA_STAGES.map((s) => [
                      <SelectItem key={`sp-${s.key}`} value={`pending:${s.key}`}>Pendente: {s.label}</SelectItem>,
                      <SelectItem key={`sd-${s.key}`} value={`done:${s.key}`}>Concluída: {s.label}</SelectItem>,
                    ])}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Progresso</label>
                <Select value={progressFilter} onValueChange={setProgressFilter}>
                  <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer progresso</SelectItem>
                    <SelectItem value="low">Baixo (&lt; 30%)</SelectItem>
                    <SelectItem value="mid">Médio (30–70%)</SelectItem>
                    <SelectItem value="high">Alto (&gt; 70%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Grupo (colunas)</label>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {STAGE_GROUPS.map((g) => (
                      <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Criticidade</label>
                <Select value={criticalFilter} onValueChange={setCriticalFilter}>
                  <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="any">🔥 Com alerta ({criticalCount})</SelectItem>
                    <SelectItem value="alta">Crítica (alta)</SelectItem>
                    <SelectItem value="media">Atenção (média)</SelectItem>
                    <SelectItem value="ok">Sem alertas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                  <X className="h-4 w-4 mr-1" /> Limpar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhuma loja encontrada.</div>
            ) : (
              <Table>
                <TableHeader>
                  {/* Linha de grupos */}
                  <TableRow>
                    <TableHead rowSpan={2} className="sticky left-0 bg-background z-10 min-w-[220px] align-bottom">Loja</TableHead>
                    <TableHead colSpan={AUTO_PHASES.length} className="text-center bg-muted/60 text-[11px] uppercase tracking-wide border-l">
                      Fases (auto)
                    </TableHead>
                    {visibleGroups.map((g) => (
                      <TableHead
                        key={g.name}
                        colSpan={g.stages.length}
                        className="text-center text-[11px] uppercase tracking-wide bg-muted/30 border-l"
                      >
                        {g.name}
                      </TableHead>
                    ))}
                    <TableHead rowSpan={2} className="text-center whitespace-nowrap align-bottom border-l">Progresso</TableHead>
                  </TableRow>
                  {/* Linha de etapas */}
                  <TableRow>
                    {AUTO_PHASES.map((p, i) => (
                      <TableHead key={p.key} className={cn("text-center whitespace-nowrap bg-muted/40", i === 0 && "border-l")}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted underline-offset-2">{p.label}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="font-semibold">{p.label} (automática)</div>
                            <div className="text-xs mt-1">{p.desc}</div>
                          </TooltipContent>
                        </Tooltip>
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {autoTotals[p.key]}/{rows.length}
                        </div>
                      </TableHead>
                    ))}
                    {visibleGroups.map((g) =>
                      g.stages.map((s, i) => (
                        <TableHead
                          key={s.key}
                          className={cn(
                            "text-center whitespace-nowrap",
                            i === 0 && "border-l",
                            s.sub && "bg-muted/10"
                          )}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn("text-[11px] cursor-help underline decoration-dotted underline-offset-2", s.sub && "pl-2 italic text-muted-foreground")}>
                                {s.sub ? "↳ " : ""}{s.label}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{g.name}</div>
                              <div className="font-semibold">{s.label}{s.sub && " (subetapa)"}</div>
                              <div className="text-xs mt-1">{s.desc}</div>
                            </TooltipContent>
                          </Tooltip>
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {planilhaTotals[s.key]}/{rows.length}
                          </div>
                        </TableHead>
                      ))
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ store, flags, derived, reasons, severity }) => {
                    const st = stageStatus[store.id] || {};
                    const autoDone = AUTO_PHASES.filter((p) => flags[p.key]).length;
                    const planDone = PLANILHA_STAGES.filter(
                      (s) => derived[s.key] === true || normalizeStage(st[s.key]) === "concluido"
                    ).length;
                    const done = autoDone + planDone;

                    return (
                      <TableRow
                        key={store.id}
                        className={cn(
                          severity === "alta" && "bg-destructive/[0.06] hover:bg-destructive/10",
                          severity === "media" && "bg-[hsl(var(--accent))]/[0.06]"
                        )}
                      >
                        <TableCell className={cn(
                          "sticky left-0 font-medium",
                          severity === "alta" ? "bg-destructive/[0.06]" : severity === "media" ? "bg-[hsl(var(--accent))]/[0.06]" : "bg-background"
                        )}>
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <Link to={`/loja/${store.id}`} className="hover:underline">
                                {store.nome}
                              </Link>
                              {store.filial && (
                                <div className="text-[11px] text-muted-foreground">{store.filial}</div>
                              )}
                            </div>
                            {severity && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={severity === "alta" ? "destructive" : "secondary"}
                                    className="shrink-0 gap-1 text-[10px] px-1.5 py-0 h-5"
                                  >
                                    {severity === "alta" ? <Flame className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                    {reasons.length}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="font-semibold mb-1">Alertas ({reasons.length})</div>
                                  <ul className="text-xs space-y-0.5">
                                    {reasons.map((r, i) => (
                                      <li key={i} className={cn(r.severity === "alta" && "text-destructive font-medium")}>
                                        • {r.label}
                                      </li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        {AUTO_PHASES.map((p, i) => (
                          <TableCell key={p.key} className={cn("text-center bg-muted/20", i === 0 && "border-l")}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  to={`/loja/${store.id}?tab=${p.tab}`}
                                  className={cn(
                                    "inline-flex h-7 w-7 items-center justify-center rounded-full border transition hover:scale-110",
                                    flags[p.key]
                                      ? "bg-[hsl(142,60%,45%)] text-white border-[hsl(142,60%,45%)]"
                                      : "bg-muted text-muted-foreground border-border"
                                  )}
                                >
                                  {flags[p.key] ? <Check className="h-4 w-4" /> : <Minus className="h-3 w-3" />}
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="font-semibold">{store.nome} — {p.label}</div>
                                <div className="text-xs mt-1">
                                  {flags[p.key] ? "✅ Concluída automaticamente pelo sistema." : "⏳ Pendente — critério ainda não atendido."}
                                </div>
                                <div className="text-xs mt-1 text-muted-foreground">{p.desc}</div>
                                <div className="text-[10px] mt-2 text-muted-foreground italic">Clique para abrir a loja na aba correspondente.</div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        ))}
                        {visibleGroups.map((g) =>
                          g.stages.map((s, i) => {
                            const isDerived = derived[s.key] === true;
                            const rawStatus: Stage4 = isDerived ? "concluido" : normalizeStage(st[s.key]);
                            const meta = STAGE_META[rawStatus];
                            const isSaving = saving === store.id + s.key;
                            const upcoming = STAGE_META[nextStage(rawStatus)];
                            return (
                              <TableCell
                                key={s.key}
                                className={cn("text-center", i === 0 && "border-l", s.sub && "bg-muted/10")}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      disabled={isSaving || isDerived}
                                      onClick={() => !isDerived && cycle(store.id, s.key)}
                                      aria-label={`${s.label}: ${meta.label}${isDerived ? " (bloqueada)" : ""}`}
                                      className={cn(
                                        "inline-flex h-7 w-7 items-center justify-center rounded-full border transition",
                                        !isDerived && "hover:scale-110",
                                        meta.classes,
                                        isDerived && "ring-2 ring-[hsl(142,60%,45%)]/40 cursor-not-allowed",
                                        isSaving && "opacity-50",
                                        rawStatus === "em_andamento" && isSaving && "animate-spin"
                                      )}
                                    >
                                      {meta.icon}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{g.name}</div>
                                    <div className="font-semibold">{store.nome} — {s.label}</div>
                                    <div className="text-xs mt-1">
                                      {isDerived
                                        ? "🔒 Sincronizada automaticamente pelo Checklist Final — status travado em Concluída."
                                        : (
                                          <>
                                            Status atual: <strong>{meta.short}</strong>.
                                            <br />
                                            Clique para mudar para <strong>{upcoming.short}</strong>.
                                          </>
                                        )}
                                    </div>
                                    <div className="text-xs mt-1 text-muted-foreground">{s.desc}</div>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            );

                          })
                        )}
                        <TableCell className="text-center text-sm tabular-nums whitespace-nowrap border-l">
                          {done}/{totalStages}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
