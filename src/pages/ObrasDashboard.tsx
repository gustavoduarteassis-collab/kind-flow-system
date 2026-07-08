import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isInauguradaStatus } from "@/utils/inauguradaFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2, Users, AlertTriangle, CalendarClock, ArrowUp, PartyPopper,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

type PipelineRow = any;
type StoreLite = {
  id: string;
  filial: string | null;
  ultima_atualizacao: string | null;
  ultima_atualizacao_at: string | null;
  ultima_atualizacao_autor: string | null;
  fase_atual: string | null;
};

type FarolTipo = "vermelho" | "amarelo" | "verde" | "cinza";

const farolClass: Record<FarolTipo, string> = {
  vermelho: "text-red-500",
  amarelo: "text-amber-400",
  verde: "text-emerald-500",
  cinza: "text-muted-foreground",
};

const farolLabel: Record<FarolTipo, string> = {
  vermelho: "Crítico",
  amarelo: "Atenção",
  verde: "No prazo",
  cinza: "Sem data",
};

const farolOrder: Record<FarolTipo, number> = {
  vermelho: 0,
  amarelo: 1,
  verde: 2,
  cinza: 3,
};

function normFilial(v?: string | null) {
  return String(v || "").trim();
}

function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const parts = String(dateStr).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  let d: Date;
  if (parts) {
    const year = parts[3].length === 2 ? 2000 + parseInt(parts[3]) : parseInt(parts[3]);
    d = new Date(year, parseInt(parts[2]) - 1, parseInt(parts[1]));
  } else {
    d = new Date(dateStr);
  }
  return isNaN(d.getTime()) ? null : d;
}

function daysUntilDate(dateStr?: string | null): number | null {
  const d = parseFlexibleDate(dateStr);
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function daysSinceDate(isoStr?: string | null): number | null {
  const d = parseFlexibleDate(isoStr);
  if (!d) return null;
  return Math.round((Date.now() - d.getTime()) / 86400000);
}


function farolFor(row: any, store: StoreLite | undefined): FarolTipo {
  const dias = daysUntilDate(row.data_inauguracao || row.previsao_inauguracao);
  const stale = daysSinceDate(store?.ultima_atualizacao_at);
  if (dias !== null && dias <= 14) return "vermelho";
  if (stale === null || stale > 14) return "vermelho";
  if (dias !== null && dias <= 30) return "amarelo";
  if (stale > 7) return "amarelo";
  if (dias === null) return "cinza";
  return "verde";
}

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const parts = String(dateStr).match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (parts) {
    const year = parts[3].length === 2 ? 2000 + parseInt(parts[3]) : parseInt(parts[3]);
    return `${parts[1]}/${parts[2]}/${year}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR");
}

function truncate(s: string | null | undefined, n: number): string {
  const str = String(s || "");
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function diasCell(dInaug: number | null) {
  if (dInaug === null) return <span className="text-muted-foreground">—</span>;
  if (dInaug < 0)
    return <span className="text-red-600 font-bold">atrasada {Math.abs(dInaug)}d</span>;
  if (dInaug <= 14) return <span className="text-red-600 font-bold">em {dInaug}d</span>;
  if (dInaug <= 30) return <span className="text-amber-600">em {dInaug}d</span>;
  return <span className="text-emerald-600">em {dInaug}d</span>;
}

export default function ObrasDashboard() {
  usePageTitle("Obras");
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [storeByFilial, setStoreByFilial] = useState<Map<string, StoreLite>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"funil" | "reformas" | "repasses">("funil");
  const [search, setSearch] = useState("");
  const [analistaFilter, setAnalistaFilter] = useState<string>("__all__");
  const [selected, setSelected] = useState<PipelineRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: pipe }, { data: storesData }] = await Promise.all([
        supabase
          .from("pipeline_stores")
          .select("*")
          .is("deleted_at", null)
          .order("updated_at", { ascending: false }),
        supabase
          .from("stores")
          .select("id, filial, ultima_atualizacao, ultima_atualizacao_at, ultima_atualizacao_autor, fase_atual")
          .is("deleted_at", null)
          .order("ultima_atualizacao_at", { ascending: false, nullsFirst: false }),
      ]);

      // dedupe pipeline by filial
      const seen = new Set<string>();
      const deduped = (pipe || []).filter((row: any) => {
        const f = normFilial(row.filial);
        if (!f || seen.has(f)) return false;
        seen.add(f);
        return true;
      });

      // dedupe stores by filial (keep most recent)
      const sMap = new Map<string, StoreLite>();
      (storesData || []).forEach((s: any) => {
        const f = normFilial(s.filial);
        if (f && !sMap.has(f)) sMap.set(f, s as StoreLite);
      });

      setPipeline(deduped);
      setStoreByFilial(sMap);
      setLoading(false);
    })();
  }, []);

  const { inauguradas, ativas, funil, reformas, repasses } = useMemo(() => {
    const inaug = pipeline.filter((s) => isInauguradaStatus(s.status_geral));
    const at = pipeline.filter((s) => !isInauguradaStatus(s.status_geral));
    return {
      inauguradas: inaug,
      ativas: at,
      funil: at.filter((s) => !s.reforma && !s.transferido),
      reformas: at.filter((s) => s.reforma === true),
      repasses: at.filter((s) => s.transferido === true),
    };
  }, [pipeline]);

  const kpis = useMemo(() => {
    const total = funil.length + reformas.length + repasses.length;
    const inaug14 = ativas.filter((s) => {
      const d = daysUntilDate(s.data_inauguracao || s.previsao_inauguracao);
      return d !== null && d >= 0 && d <= 14;
    }).length;
    const semAtual = ativas.filter((s) => {
      const st = storeByFilial.get(normFilial(s.filial));
      if (!st) return true;
      const stale = daysSinceDate(st.ultima_atualizacao_at);
      return stale === null || stale > 7;
    }).length;
    const currentYear = new Date().getFullYear();
    const inaugYear = inauguradas.filter((s) => {
      // Prefer real inauguration date; fall back to forecast — same precedence used for "Dias".
      const d = parseFlexibleDate(s.data_inauguracao) || parseFlexibleDate(s.previsao_inauguracao);
      return d !== null && d.getFullYear() === currentYear;
    }).length;

    return { total, inaug14, semAtual, inaugYear };
  }, [funil, reformas, repasses, ativas, inauguradas, storeByFilial]);

  const analistaOptions = useMemo(() => {
    const set = new Set<string>();
    ativas.forEach((s) => {
      const a = String(s.analista_obra || "").trim();
      if (a) set.add(a);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ativas]);

  const tabRows = tab === "funil" ? funil : tab === "reformas" ? reformas : repasses;

  const enriched = useMemo(() => {
    return tabRows.map((row) => {
      const store = storeByFilial.get(normFilial(row.filial));
      const dInaug = daysUntilDate(row.data_inauguracao || row.previsao_inauguracao);
      const stale = daysSinceDate(store?.ultima_atualizacao_at);
      const f = farolFor(row, store);
      return { row, store, dInaug, stale, farol: f };
    });
  }, [tabRows, storeByFilial]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched
      .filter((e) => {
        if (analistaFilter !== "__all__" && String(e.row.analista_obra || "").trim() !== analistaFilter)
          return false;
        if (!q) return true;
        return (
          String(e.row.local || "").toLowerCase().includes(q) ||
          String(e.row.filial || "").toLowerCase().includes(q) ||
          String(e.row.cidade || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const fo = farolOrder[a.farol] - farolOrder[b.farol];
        if (fo !== 0) return fo;
        const ad = a.dInaug ?? Number.POSITIVE_INFINITY;
        const bd = b.dInaug ?? Number.POSITIVE_INFINITY;
        return ad - bd;
      });
  }, [enriched, search, analistaFilter]);

  const kpiCards = [
    { label: "Total em obra", value: kpis.total, icon: Building2, color: "text-foreground" },
    { label: "Inaugurando ≤ 14 dias", value: kpis.inaug14, icon: CalendarClock, color: "text-red-600" },
    { label: "Sem atualização", value: kpis.semAtual, icon: AlertTriangle, color: "text-amber-600" },
    { label: `Inauguradas ${new Date().getFullYear()}`, value: kpis.inaugYear, icon: PartyPopper, color: "text-emerald-600" },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Obras</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada — Funil, Reformas e Repasses</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-md bg-muted ${k.color}`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="text-2xl font-bold">{loading ? "—" : k.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <Input
            placeholder="Buscar por loja, filial ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs"
          />
          <Select value={analistaFilter} onValueChange={setAnalistaFilter}>
            <SelectTrigger className="md:w-64">
              <SelectValue placeholder="Analista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as analistas</SelectItem>
              {analistaOptions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="funil">Funil ({funil.length})</TabsTrigger>
            <TabsTrigger value="reformas">Reformas ({reformas.length})</TabsTrigger>
            <TabsTrigger value="repasses">Repasses ({repasses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-12 text-center">•</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Padrão</TableHead>
                      <TableHead>Analista</TableHead>
                      <TableHead>Inauguração</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Última atualização</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell>
                      </TableRow>
                    ))}
                    {!loading && filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                          Nenhuma loja encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && filtered.map((e, idx) => {
                      const r = e.row;
                      const s = e.store;
                      const cidadeUf = [r.cidade, r.estado].filter(Boolean).join("/");
                      return (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer hover:bg-muted/60"
                          onClick={() => setSelected(r)}
                        >
                          <TableCell className="py-2 text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="py-2 text-center">
                            <span title={farolLabel[e.farol]} className={`text-2xl leading-none ${farolClass[e.farol]}`}>•</span>
                          </TableCell>
                          <TableCell className="py-2 font-mono text-xs">{r.filial || "—"}</TableCell>
                          <TableCell className="py-2 font-medium">{truncate(r.local, 35) || "—"}</TableCell>
                          <TableCell className="py-2 text-sm">{cidadeUf || "—"}</TableCell>
                          <TableCell className="py-2">
                            {r.padrao ? <Badge variant="secondary" className="text-[10px]">{r.padrao}</Badge> : "—"}
                          </TableCell>
                          <TableCell className="py-2 text-sm">{r.analista_obra || r.implantadora || "—"}</TableCell>
                          <TableCell className="py-2 text-sm">{formatDateBR(r.data_inauguracao || r.previsao_inauguracao)}</TableCell>
                          <TableCell className="py-2">{diasCell(e.dInaug)}</TableCell>
                          <TableCell className="py-2 max-w-[260px]">
                            {s ? (
                              <div className="text-xs space-y-0.5">
                                {s.ultima_atualizacao && (
                                  <div className="truncate">{truncate(s.ultima_atualizacao, 55)}</div>
                                )}
                                <div className="flex flex-wrap items-center gap-1">
                                  {e.stale !== null ? (
                                    <>
                                      <Badge variant="secondary" className="text-[10px]">há {e.stale}d</Badge>
                                      {e.stale > 7 && (
                                        <Badge variant="destructive" className="text-[10px]">⚠ {e.stale}d sem update</Badge>
                                      )}
                                    </>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">Nunca atualizada</Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Não cadastrada no sistema</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              {s ? (
                                <>
                                  <Button asChild size="sm" variant="ghost">
                                    <Link to={`/loja/${s.id}`}>Ver</Link>
                                  </Button>
                                  <Button asChild size="sm" variant="ghost">
                                    <Link to={`/loja/${s.id}/atualizar`}>
                                      <ArrowUp className="h-3 w-3 mr-1" />Atualizar
                                    </Link>
                                  </Button>
                                </>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button size="sm" variant="ghost" disabled>Ver</Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Cadastre a loja no sistema de obras</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
            {selected && (() => {
              const s = storeByFilial.get(normFilial(selected.filial));
              const dInaug = daysUntilDate(selected.data_inauguracao || selected.previsao_inauguracao);
              const stale = daysSinceDate(s?.ultima_atualizacao_at);
              const f = farolFor(selected, s);
              const statusLines = String(selected.status_geral || "")
                .split("\n").map((l) => l.trim()).filter(Boolean).slice(-3);
              return (
                <>
                  <SheetHeader className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl leading-none ${farolClass[f]}`}>•</span>
                      <Badge variant="outline">{farolLabel[f].toUpperCase()}</Badge>
                      <span className="font-mono text-sm text-muted-foreground">Filial {selected.filial}</span>
                    </div>
                    <SheetTitle className="text-xl text-left">{selected.local || "Sem nome"}</SheetTitle>
                    <div className="text-sm text-muted-foreground">
                      {[[selected.cidade, selected.estado].filter(Boolean).join("/"), selected.padrao, selected.localizacao]
                        .filter(Boolean).join(" · ")}
                    </div>
                  </SheetHeader>

                  <div className="mt-6 space-y-5 text-sm">
                    <section>
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">📅 Datas</h3>
                      <div className="space-y-1">
                        <div><span className="text-muted-foreground">Inauguração prevista:</span> {formatDateBR(selected.previsao_inauguracao || selected.data_inauguracao)}</div>
                        <div><span className="text-muted-foreground">Início da obra:</span> {formatDateBR(selected.inicio_obra)}</div>
                        <div className="pt-1">
                          <span className="text-muted-foreground">Dias restantes: </span>
                          <span className="text-lg font-semibold">
                            {dInaug === null ? "—" : dInaug < 0 ? `ATRASADA ${Math.abs(dInaug)}d` : `EM ${dInaug} DIAS`}
                          </span>
                        </div>
                      </div>
                    </section>

                    <Separator />

                    <section>
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">👤 Responsáveis</h3>
                      <div className="space-y-1">
                        <div><span className="text-muted-foreground">Franqueado:</span> {selected.franqueado || "—"}</div>
                        <div><span className="text-muted-foreground">Analista:</span> {selected.analista_obra || "—"}</div>
                        <div><span className="text-muted-foreground">G. Regional:</span> {selected.gerente_regional || "—"}</div>
                      </div>
                    </section>

                    <Separator />

                    <section>
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">📝 Situação no sistema</h3>
                      {s ? (
                        <div className="space-y-1">
                          {s.ultima_atualizacao && <div className="whitespace-pre-line italic">"{s.ultima_atualizacao}"</div>}
                          {s.fase_atual && <div><span className="text-muted-foreground">Fase:</span> {s.fase_atual}</div>}
                          <div className="text-muted-foreground">
                            {stale !== null ? `Atualizado há ${stale} dia(s)` : "Nunca atualizado"}
                            {s.ultima_atualizacao_autor ? ` por ${s.ultima_atualizacao_autor}` : ""}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-md bg-muted/50 text-muted-foreground text-xs">
                          ⚠ Esta loja ainda não foi cadastrada no sistema de obras. Cadastre em Lojas → Nova Loja para habilitar o acompanhamento.
                        </div>
                      )}
                    </section>

                    <Separator />

                    <section>
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">📋 Status do funil</h3>
                      {statusLines.length ? (
                        <div className="space-y-1">
                          {statusLines.map((l, i) => (
                            <div key={i} className="whitespace-pre-line">• {l}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Sem observações registradas</div>
                      )}
                    </section>

                    <div className="pt-4 border-t space-y-2">
                      {s ? (
                        <>
                          <Button className="w-full" onClick={() => { setSelected(null); navigate(`/loja/${s.id}`); }}>
                            Ver loja completa →
                          </Button>
                          <Button className="w-full" variant="outline" onClick={() => { setSelected(null); navigate(`/loja/${s.id}/atualizar`); }}>
                            <ArrowUp className="h-4 w-4 mr-1" /> Atualizar obra
                          </Button>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground text-center">
                          Cadastre a loja no sistema para habilitar as ações.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
