import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import { cn } from "@/lib/utils";

const PHASES = [
  { key: "funil", label: "Funil" },
  { key: "preobra", label: "Pré-Obra" },
  { key: "obra", label: "Obra" },
  { key: "checklist", label: "Checklist Final" },
  { key: "inaugurada", label: "Inaugurada" },
] as const;

type PhaseKey = typeof PHASES[number]["key"];

function computePhaseFlags(store: any, inauguradaInPipeline: boolean): Record<PhaseKey, boolean> {
  const funilDone = true;

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
    funil: funilDone,
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pipeline_stores")
        .select("nome_loja, local, filial, status_geral")
        .is("deleted_at", null);
      const set = new Set<string>();
      (data || []).forEach((r: any) => {
        if ((r.status_geral || "").toString().toLowerCase().startsWith("inaugurada")) {
          [r.nome_loja, r.local, r.filial].filter(Boolean).forEach((v: string) =>
            set.add(v.toString().trim().toLowerCase())
          );
        }
      });
      setPipelineInaug(set);
    })();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores
      .filter((s) => !q || s.nome.toLowerCase().includes(q) || (s.filial || "").toLowerCase().includes(q))
      .map((s) => {
        const inPipeline =
          pipelineInaug.has((s.nome || "").trim().toLowerCase()) ||
          pipelineInaug.has((s.filial || "").trim().toLowerCase());
        return { store: s, flags: computePhaseFlags(s, inPipeline) };
      })
      .filter((r) => !r.flags.inaugurada)
      .sort((a, b) => a.store.nome.localeCompare(b.store.nome, "pt-BR"));
  }, [stores, pipelineInaug, search]);

  const totals = useMemo(() => {
    const t: Record<PhaseKey, number> = { funil: 0, preobra: 0, obra: 0, checklist: 0, inaugurada: 0 };
    rows.forEach((r) => PHASES.forEach((p) => { if (r.flags[p.key]) t[p.key]++; }));
    return t;
  }, [rows]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Matriz de Etapas</h1>
        <p className="text-sm text-muted-foreground">
          Visão rápida do progresso de cada loja em cada etapa. O check é marcado automaticamente conforme o avanço.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">
              {rows.length} loja{rows.length !== 1 ? "s" : ""}
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
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma loja encontrada.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[220px]">Loja</TableHead>
                  {PHASES.map((p) => (
                    <TableHead key={p.key} className="text-center whitespace-nowrap">
                      {p.label}
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {totals[p.key]}/{rows.length}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ store, flags }) => {
                  const done = PHASES.filter((p) => flags[p.key]).length;
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
                      {PHASES.map((p) => (
                        <TableCell key={p.key} className="text-center">
                          <div
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full border",
                              flags[p.key]
                                ? "bg-[hsl(142,60%,45%)] text-white border-[hsl(142,60%,45%)]"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                            title={flags[p.key] ? "Concluída" : "Pendente"}
                          >
                            {flags[p.key] ? <Check className="h-4 w-4" /> : <Minus className="h-3 w-3" />}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-center text-sm tabular-nums">
                        {done}/{PHASES.length}
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
