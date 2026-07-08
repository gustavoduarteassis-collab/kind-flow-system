import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil, daysSince } from "@/utils/storeCriticality";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Building2, Users, AlertTriangle, CalendarClock,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

type PipelineRow = {
  id: string;
  filial: string | null;
  local: string | null;
  cidade: string | null;
  estado: string | null;
  padrao: string | null;
  localizacao: string | null;
  franqueado: string | null;
  analista_obra: string | null;
  gerente_regional: string | null;
  previsao_inauguracao: string | null;
  data_inauguracao: string | null;
  inicio_obra: string | null;
  status_geral: string | null;
  reforma: boolean | null;
  transferido: boolean | null;
};

type StoreLite = {
  id: string;
  filial: string | null;
  ultima_atualizacao: string | null;
  ultima_atualizacao_at: string | null;
  fase_atual: string | null;
};

type Farol = "red" | "amber" | "green" | "gray";

function normalizeFilial(v?: string | null) {
  return (v || "").trim().toLowerCase();
}

function computeFarol(dInaug: number | null, stale: number | null): Farol {
  if (dInaug === null) return "gray";
  if (dInaug <= 14 || (stale !== null && stale > 14)) return "red";
  if ((dInaug >= 15 && dInaug <= 30) || (stale !== null && stale >= 8 && stale <= 14)) return "amber";
  if (dInaug > 30 && (stale === null || stale <= 7)) return "green";
  return "amber";
}

const farolColor: Record<Farol, string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  gray: "bg-muted-foreground/40",
};

const farolLabel: Record<Farol, string> = {
  red: "Crítico",
  amber: "Atenção",
  green: "No prazo",
  gray: "Sem data",
};

function diasCell(dInaug: number | null) {
  if (dInaug === null) return <span className="text-muted-foreground">—</span>;
  if (dInaug < 0)
    return <span className="text-red-600 font-medium">atrasada {Math.abs(dInaug)}d</span>;
  const cls =
    dInaug <= 14 ? "text-red-600" : dInaug <= 30 ? "text-amber-600" : "text-emerald-600";
  return <span className={`${cls} font-medium`}>em {dInaug}d</span>;
}

export default function ObrasDashboard() {
  usePageTitle("Obras");
  const navigate = useNavigate();
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [storesByFilial, setStoresByFilial] = useState<Map<string, StoreLite>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"funil" | "reformas" | "repasses">("funil");
  const [search, setSearch] = useState("");
  const [analistaFilter, setAnalistaFilter] = useState<string>("__all__");
  const [selected, setSelected] = useState<PipelineRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: pRows }, { data: sRows }] = await Promise.all([
        supabase
          .from("pipeline_stores")
          .select(
            "id,filial,local,cidade,estado,padrao,localizacao,franqueado,analista_obra,gerente_regional,previsao_inauguracao,data_inauguracao,inicio_obra,status_geral,reforma,transferido"
          )
          .is("deleted_at", null),
        supabase
          .from("stores")
          .select("id, filial, ultima_atualizacao, ultima_atualizacao_at, fase_atual")
          .is("deleted_at", null),
      ]);
      const map = new Map<string, StoreLite>();
      (sRows || []).forEach((s: any) => {
        const k = normalizeFilial(s.filial);
        if (k) map.set(k, s as StoreLite);
      });
      setStoresByFilial(map);
      setRows((pRows || []) as PipelineRow[]);
      setLoading(false);
    })();
  }, []);

  const enriched = useMemo(() => {
    return rows.map((r) => {
      const store = storesByFilial.get(normalizeFilial(r.filial)) || null;
      const dInaug = daysUntil(r.previsao_inauguracao || r.data_inauguracao);
      const stale = store ? daysSince(store.ultima_atualizacao_at) : null;
      const farol = computeFarol(dInaug, stale);
      return { row: r, store, dInaug, stale, farol };
    });
  }, [rows, storesByFilial]);

  // KPIs
  const kpis = useMemo(() => {
    const total = enriched.length;
    const inaug14 = enriched.filter((e) => e.dInaug !== null && e.dInaug <= 14 && e.dInaug >= 0).length;
    const semAtual = enriched.filter(
      (e) => e.store && (e.store.ultima_atualizacao_at === null || (e.stale !== null && e.stale > 7))
    ).length;
    const analistas = new Set(
      enriched.map((e) => (e.row.analista_obra || "").trim()).filter((x) => x !== "")
    );
    return { total, inaug14, semAtual, analistasCount: analistas.size };
  }, [enriched]);

  const analistaOptions = useMemo(() => {
    const set = new Set<string>();
    enriched.forEach((e) => {
      const a = (e.row.analista_obra || "").trim();
      if (a) set.add(a);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  const filteredByTab = useMemo(() => {
    return enriched.filter((e) => {
      const isReforma = !!e.row.reforma;
      const isRepasse = !!e.row.transferido;
      if (tab === "funil") return !isReforma && !isRepasse;
      if (tab === "reformas") return isReforma;
      return isRepasse;
    });
  }, [enriched, tab]);

  const tabCounts = useMemo(() => {
    let f = 0, r = 0, rp = 0;
    enriched.forEach((e) => {
      const isReforma = !!e.row.reforma;
      const isRepasse = !!e.row.transferido;
      if (isRepasse) rp++;
      else if (isReforma) r++;
      else f++;
    });
    return { funil: f, reformas: r, repasses: rp };
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return filteredByTab
      .filter((e) => {
        if (analistaFilter !== "__all__" && (e.row.analista_obra || "").trim() !== analistaFilter)
          return false;
        if (!q) return true;
        return (
          (e.row.local || "").toLowerCase().includes(q) ||
          (e.row.filial || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.dInaug === null && b.dInaug === null)
          return (a.row.local || "").localeCompare(b.row.local || "");
        if (a.dInaug === null) return 1;
        if (b.dInaug === null) return -1;
        return a.dInaug - b.dInaug;
      });
  }, [filteredByTab, search, analistaFilter]);

  const kpiCards = [
    { label: "Total em obra", value: kpis.total, icon: Building2, color: "text-foreground" },
    { label: "Inaugurando em ≤ 14 dias", value: kpis.inaug14, icon: CalendarClock, color: "text-red-600" },
    { label: "Sem atualização", value: kpis.semAtual, icon: AlertTriangle, color: "text-amber-600" },
    { label: "Analistas ativas", value: kpis.analistasCount, icon: Users, color: "text-emerald-600" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Obras</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada do funil, reformas e repasses</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-md bg-muted ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-2xl font-bold">{k.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <Input
          placeholder="Buscar por loja ou filial..."
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
          <TabsTrigger value="funil">Funil — Novas Lojas ({tabCounts.funil})</TabsTrigger>
          <TabsTrigger value="reformas">Reformas ({tabCounts.reformas})</TabsTrigger>
          <TabsTrigger value="repasses">Repasses ({tabCounts.repasses})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 text-center">Farol</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Loja / Local</TableHead>
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
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Nenhuma loja encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((e, idx) => {
                    const r = e.row;
                    const s = e.store;
                    const cidadeUf = [r.cidade, r.estado].filter(Boolean).join("/");
                    const updText = s?.ultima_atualizacao?.slice(0, 60) || "";
                    return (
                      <TableRow
                        key={r.id}
                        className={`cursor-pointer ${idx % 2 === 1 ? "bg-muted/30" : ""} hover:bg-muted/60`}
                        onClick={() => setSelected(r)}
                      >
                        <TableCell className="text-center">
                          <span
                            title={farolLabel[e.farol]}
                            className={`inline-block w-3 h-3 rounded-full ${farolColor[e.farol]}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.filial || "—"}</TableCell>
                        <TableCell className="font-medium">{r.local || "—"}</TableCell>
                        <TableCell className="text-sm">{cidadeUf || "—"}</TableCell>
                        <TableCell className="text-sm">{r.padrao || "—"}</TableCell>
                        <TableCell className="text-sm">{r.analista_obra || "—"}</TableCell>
                        <TableCell className="text-sm">{r.previsao_inauguracao || r.data_inauguracao || "—"}</TableCell>
                        <TableCell>{diasCell(e.dInaug)}</TableCell>
                        <TableCell className="max-w-[280px]">
                          {s ? (
                            s.ultima_atualizacao_at ? (
                              <div className="text-sm">
                                <div className="truncate">{updText}</div>
                                <div className="text-xs text-muted-foreground">
                                  há {e.stale}d
                                </div>
                              </div>
                            ) : (
                              <Badge variant="secondary">Nunca atualizada</Badge>
                            )
                          ) : (
                            <Badge variant="secondary">Nunca atualizada</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap" onClick={(ev) => ev.stopPropagation()}>
                          {s ? (
                            <div className="flex gap-1 justify-end">
                              <Button asChild size="sm" variant="ghost">
                                <Link to={`/loja/${s.id}`}>Ver</Link>
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/loja/${s.id}/atualizar`}>Atualizar</Link>
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Ver</Button>
                          )}
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

      {/* Side panel */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
          {selected && (() => {
            const enr = enriched.find((e) => e.row.id === selected.id);
            const s = enr?.store || null;
            const dInaug = enr?.dInaug ?? null;
            const stale = enr?.stale ?? null;
            const farol = enr?.farol || "gray";
            const statusLines = (selected.status_geral || "")
              .split("\n").map((l) => l.trim()).filter(Boolean).slice(-2);

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-xl">{selected.local || "Sem nome"}</SheetTitle>
                  <div className="text-sm text-muted-foreground">
                    {[selected.filial, selected.padrao, [selected.cidade, selected.estado].filter(Boolean).join("/")].filter(Boolean).join(" • ")}
                  </div>
                  <div>
                    <Badge className={`${farolColor[farol]} text-white border-transparent`}>
                      {farolLabel[farol]}
                    </Badge>
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-6 text-sm">
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Datas e prazos</h3>
                    <div className="space-y-1">
                      <div><span className="text-muted-foreground">Inauguração prevista:</span> {selected.previsao_inauguracao || "—"}</div>
                      <div><span className="text-muted-foreground">Início da obra:</span> {selected.inicio_obra || "—"}</div>
                      <div className="pt-1">
                        <span className="text-muted-foreground">Dias para inauguração: </span>
                        <span className="text-lg font-semibold">
                          {dInaug === null ? "—" : dInaug < 0 ? `atrasada ${Math.abs(dInaug)}d` : `${dInaug}d`}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Responsáveis</h3>
                    <div className="space-y-1">
                      <div><span className="text-muted-foreground">Franqueado:</span> {selected.franqueado || "—"}</div>
                      <div><span className="text-muted-foreground">Analista de obra:</span> {selected.analista_obra || "—"}</div>
                      <div><span className="text-muted-foreground">Gerente regional:</span> {selected.gerente_regional || "—"}</div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Situação atual</h3>
                    {s ? (
                      <div className="space-y-1">
                        <div className="text-muted-foreground">Última atualização:</div>
                        <div className="whitespace-pre-line">{s.ultima_atualizacao || "—"}</div>
                        <div className="pt-2"><span className="text-muted-foreground">Fase atual:</span> {s.fase_atual || "—"}</div>
                        <div>
                          <span className="text-muted-foreground">Atualizada há:</span>{" "}
                          {stale === null ? "—" : `${stale}d`}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">Sem dados no sistema</div>
                    )}
                  </section>

                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Status do funil</h3>
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
                        <Button className="w-full" onClick={() => navigate(`/loja/${s.id}`)}>
                          Ver loja completa
                        </Button>
                        <Button className="w-full" variant="outline" onClick={() => navigate(`/loja/${s.id}/atualizar`)}>
                          Atualizar obra
                        </Button>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center">
                        Loja ainda não cadastrada no sistema de obras
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
  );
}
