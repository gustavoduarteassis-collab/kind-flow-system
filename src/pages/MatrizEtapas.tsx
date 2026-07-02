import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AUTO_PHASES = [
  { key: "funil", label: "Funil" },
  { key: "preobra", label: "Pré-Obra" },
  { key: "obra", label: "Obra" },
  { key: "checklist", label: "Checklist Final" },
  { key: "inaugurada", label: "Inaugurada" },
] as const;

// Etapas da planilha (Funil 2026) — ordem e agrupamento fiéis à planilha,
// mantidos idênticos entre todas as lojas para consistência visual.
type PlanilhaStage = { key: string; label: string; group: string; sub?: boolean };
const PLANILHA_STAGES: PlanilhaStage[] = [
  // Documentação
  { key: "docs", label: "Docs", group: "Documentação" },
  { key: "cof", label: "COF", group: "Documentação" },
  { key: "contr_franquia", label: "Contr. Franquia", group: "Documentação" },
  { key: "contrato_locacao", label: "Contrato Locação", group: "Documentação" },
  { key: "fampe", label: "FAMPE / Plano de Negócios", group: "Documentação" },
  { key: "dre", label: "DRE", group: "Documentação" },
  { key: "conta_bancaria", label: "Conta Bancária", group: "Documentação" },
  // Projetos & Obras
  { key: "projetos", label: "Projetos", group: "Projetos & Obras" },
  { key: "obras", label: "Obras", group: "Projetos & Obras" },
  { key: "contrato_obras", label: "Contrato de Obras", group: "Projetos & Obras" },
  // Sistemas & Meios de Pagamento
  { key: "sankya", label: "Sankya", group: "Sistemas & Pagamentos" },
  { key: "use", label: "USE", group: "Sistemas & Pagamentos" },
  { key: "implantacao_use", label: "Implantação USE", group: "Sistemas & Pagamentos", sub: true },
  { key: "skytef", label: "Skytef", group: "Sistemas & Pagamentos" },
  { key: "cielo_lio", label: "Cielo / LIO", group: "Sistemas & Pagamentos" },
  { key: "pix", label: "PIX", group: "Sistemas & Pagamentos" },
  { key: "boa_vista", label: "Boa Vista", group: "Sistemas & Pagamentos" },
  { key: "venda_link", label: "Venda Link", group: "Sistemas & Pagamentos" },
  // Operação
  { key: "loja_apoio", label: "Loja de Apoio", group: "Operação" },
  { key: "loja_liberada", label: "Loja Liberada", group: "Operação" },
  { key: "grupo_wpp", label: "Grupo WPP", group: "Operação" },
  { key: "info_sistema", label: "Info e Sistema", group: "Operação" },
  { key: "lancamento_tx", label: "Lançamento de Tx no Financeiro", group: "Operação" },
  { key: "produtos_cds", label: "Produtos / Informar CDs", group: "Operação" },
  { key: "equipe", label: "Equipe", group: "Operação" },
  { key: "mkt_loja", label: "MKT Loja / Site", group: "Operação" },
  { key: "internet_telefonia", label: "Internet e Telefonia", group: "Operação" },
  { key: "ecommerce", label: "Ecommerce", group: "Operação" },
  // Entrega Final
  { key: "itens_pendentes", label: "Itens Pendentes (Checklist)", group: "Entrega Final" },
  { key: "marcenaria", label: "Marcenaria e Status", group: "Entrega Final" },
  { key: "sacolas", label: "Aquisição Sacolas Trapézio", group: "Entrega Final" },
];

// Agrupa mantendo a ordem original
const STAGE_GROUPS = PLANILHA_STAGES.reduce<{ name: string; stages: PlanilhaStage[] }[]>((acc, s) => {
  const last = acc[acc.length - 1];
  if (last && last.name === s.group) last.stages.push(s);
  else acc.push({ name: s.group, stages: [s] });
  return acc;
}, []);

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
  const [stageStatus, setStageStatus] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState<string | null>(null);

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
      const map: Record<string, Record<string, boolean>> = {};
      (data || []).forEach((r: any) => {
        map[r.id] = (r.stage_status && typeof r.stage_status === "object") ? r.stage_status : {};
      });
      setStageStatus(map);
    })();
  }, []);

  const toggle = async (storeId: string, stageKey: string) => {
    const current = stageStatus[storeId] || {};
    const next = { ...current, [stageKey]: !current[stageKey] };
    setStageStatus((s) => ({ ...s, [storeId]: next }));
    setSaving(storeId + stageKey);
    const { error } = await supabase.from("stores").update({ stage_status: next }).eq("id", storeId);
    setSaving(null);
    if (error) {
      toast.error("Erro ao salvar etapa");
      setStageStatus((s) => ({ ...s, [storeId]: current }));
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores
      .filter((s) => !q || s.nome.toLowerCase().includes(q) || (s.filial || "").toLowerCase().includes(q))
      .map((s) => {
        const inPipeline =
          pipelineInaug.has((s.nome || "").trim().toLowerCase()) ||
          pipelineInaug.has((s.filial || "").trim().toLowerCase());
        return { store: s, flags: computeAutoFlags(s, inPipeline) };
      })
      .filter((r) => !r.flags.inaugurada)
      .sort((a, b) => a.store.nome.localeCompare(b.store.nome, "pt-BR"));
  }, [stores, pipelineInaug, search]);

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
      PLANILHA_STAGES.forEach((s) => { if (st[s.key]) t[s.key]++; });
    });
    return t;
  }, [rows, stageStatus]);

  const totalStages = AUTO_PHASES.length + PLANILHA_STAGES.length;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Matriz de Etapas</h1>
        <p className="text-sm text-muted-foreground">
          Fases automáticas (calculadas pelo sistema) + etapas da planilha do Funil (clique para marcar/desmarcar).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">
              {rows.length} loja{rows.length !== 1 ? "s" : ""} em andamento
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
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma loja encontrada.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[220px]">Loja</TableHead>
                  {AUTO_PHASES.map((p) => (
                    <TableHead key={p.key} className="text-center whitespace-nowrap bg-muted/40">
                      {p.label}
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {autoTotals[p.key]}/{rows.length}
                      </div>
                    </TableHead>
                  ))}
                  {PLANILHA_STAGES.map((s) => (
                    <TableHead key={s.key} className="text-center whitespace-nowrap">
                      <div className="text-[11px]">{s.label}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {planilhaTotals[s.key]}/{rows.length}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center whitespace-nowrap">Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ store, flags }) => {
                  const st = stageStatus[store.id] || {};
                  const autoDone = AUTO_PHASES.filter((p) => flags[p.key]).length;
                  const planDone = PLANILHA_STAGES.filter((s) => st[s.key]).length;
                  const done = autoDone + planDone;
                  return (
                    <TableRow key={store.id}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        <Link to={`/loja/${store.id}`} className="hover:underline">
                          {store.nome}
                        </Link>
                        {store.filial && (
                          <div className="text-[11px] text-muted-foreground">{store.filial}</div>
                        )}
                      </TableCell>
                      {AUTO_PHASES.map((p) => (
                        <TableCell key={p.key} className="text-center bg-muted/20">
                          <div
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full border",
                              flags[p.key]
                                ? "bg-[hsl(142,60%,45%)] text-white border-[hsl(142,60%,45%)]"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                            title={flags[p.key] ? "Concluída (auto)" : "Pendente"}
                          >
                            {flags[p.key] ? <Check className="h-4 w-4" /> : <Minus className="h-3 w-3" />}
                          </div>
                        </TableCell>
                      ))}
                      {PLANILHA_STAGES.map((s) => {
                        const done = !!st[s.key];
                        const isSaving = saving === store.id + s.key;
                        return (
                          <TableCell key={s.key} className="text-center">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => toggle(store.id, s.key)}
                              className={cn(
                                "inline-flex h-7 w-7 items-center justify-center rounded-full border transition hover:scale-110",
                                done
                                  ? "bg-[hsl(142,60%,45%)] text-white border-[hsl(142,60%,45%)]"
                                  : "bg-background text-muted-foreground border-border hover:bg-muted",
                                isSaving && "opacity-50"
                              )}
                              title={done ? "Concluída — clique para desmarcar" : "Pendente — clique para marcar"}
                            >
                              {done ? <Check className="h-4 w-4" /> : <Minus className="h-3 w-3" />}
                            </button>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center text-sm tabular-nums whitespace-nowrap">
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
  );
}
