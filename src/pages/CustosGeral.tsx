import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { custosGeralData, getStoreCostTotal, getStoreCostPerM2, META_POR_M2, StoreCostEntry } from "@/data/custosGeralData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown, Building2, Target, BarChart3, Calculator } from "lucide-react";
import logoConstance from "@/assets/logo-constance.svg";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtM2 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

const TIPOS = ["TRADICIONAL", "LIGHT", "OUTLET"] as const;
const CATEGORIAS = [
  { key: "maoDeObra", label: "Mão de Obra" },
  { key: "moveis", label: "Móveis" },
  { key: "piso", label: "Piso" },
  { key: "iluminacao", label: "Iluminação" },
  { key: "informatica", label: "Informática" },
  { key: "demaisItens", label: "Demais Itens" },
] as const;

type CatKey = typeof CATEGORIAS[number]["key"];

function calcAverages(data: StoreCostEntry[]) {
  const byTipo: Record<string, { totalArea: number; count: number; sums: Record<CatKey, number>; totalGeral: number }> = {};
  TIPOS.forEach((t) => { byTipo[t] = { totalArea: 0, count: 0, sums: { maoDeObra: 0, moveis: 0, piso: 0, iluminacao: 0, informatica: 0, demaisItens: 0 }, totalGeral: 0 }; });

  data.forEach((e) => {
    const b = byTipo[e.tipo];
    if (!b) return;
    b.count++;
    b.totalArea += e.areaTotal;
    CATEGORIAS.forEach(({ key }) => { b.sums[key] += e[key]; });
    b.totalGeral += getStoreCostTotal(e);
  });

  return TIPOS.map((tipo) => {
    const b = byTipo[tipo];
    const avgArea = b.count > 0 ? b.totalArea / b.count : 0;
    const avgPerM2: Record<string, number> = {};
    CATEGORIAS.forEach(({ key }) => {
      avgPerM2[key] = b.totalArea > 0 ? b.sums[key] / b.totalArea : 0;
    });
    const avgTotalPerM2 = b.totalArea > 0 ? b.totalGeral / b.totalArea : 0;
    return { tipo, count: b.count, avgArea, avgPerM2, avgTotalPerM2, meta: META_POR_M2[tipo] || 3250 };
  });
}

const CustosGeral = () => {
  const navigate = useNavigate();
  const [filterAno, setFilterAno] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [dashboardAno, setDashboardAno] = useState<string>("2025");

  const anos = [...new Set(custosGeralData.map((d) => d.ano))].sort();

  const filtered = useMemo(() => {
    let data = custosGeralData;
    if (filterAno !== "todos") data = data.filter((d) => d.ano === Number(filterAno));
    if (filterTipo !== "todos") data = data.filter((d) => d.tipo === filterTipo);
    return data;
  }, [filterAno, filterTipo]);

  const totals = useMemo(() => {
    let ok = 0, over = 0;
    filtered.forEach((entry) => {
      const custoM2 = getStoreCostPerM2(entry);
      const meta = META_POR_M2[entry.tipo] || 3250;
      if (custoM2 <= meta) ok++; else over++;
    });
    return { ok, over, total: filtered.length };
  }, [filtered]);

  // Dashboard metrics for selected year
  const dashData = useMemo(() => {
    const yearData = custosGeralData.filter((d) => d.ano === Number(dashboardAno));
    return calcAverages(yearData);
  }, [dashboardAno]);

  // Summary for dashboard year
  const dashSummary = useMemo(() => {
    const yearData = custosGeralData.filter((d) => d.ano === Number(dashboardAno));
    const totalLojas = yearData.length;
    const totalInvestido = yearData.reduce((s, e) => s + getStoreCostTotal(e), 0);
    const totalArea = yearData.reduce((s, e) => s + e.areaTotal, 0);
    const avgM2 = totalArea > 0 ? totalInvestido / totalArea : 0;
    let ok = 0, over = 0;
    yearData.forEach((e) => {
      const cm2 = getStoreCostPerM2(e);
      const meta = META_POR_M2[e.tipo] || 3250;
      if (cm2 <= meta) ok++; else over++;
    });
    return { totalLojas, totalInvestido, totalArea, avgM2, ok, over };
  }, [dashboardAno]);

  // Chart data for dashboard
  const chartData = useMemo(() => {
    return dashData.map((d) => ({
      tipo: d.tipo,
      "Mão de Obra": Number(d.avgPerM2.maoDeObra.toFixed(2)),
      "Móveis": Number(d.avgPerM2.moveis.toFixed(2)),
      "Piso": Number(d.avgPerM2.piso.toFixed(2)),
      "Iluminação": Number(d.avgPerM2.iluminacao.toFixed(2)),
      "Informática": Number(d.avgPerM2.informatica.toFixed(2)),
      "Demais Itens": Number(d.avgPerM2.demaisItens.toFixed(2)),
      meta: d.meta,
      total: Number(d.avgTotalPerM2.toFixed(2)),
    }));
  }, [dashData]);

  // 2026 projections: scale each category proportionally so total = meta exactly
  const projections2026 = useMemo(() => {
    const data2025 = custosGeralData.filter((d) => d.ano === 2025);
    const rawAvgs = calcAverages(data2025);
    return rawAvgs.map((d) => {
      const catKeys = CATEGORIAS.map((c) => c.key);
      const rawTotal = catKeys.reduce((sum, k) => sum + (d.avgPerM2[k] || 0), 0);
      if (rawTotal <= 0) return d;
      const scaleFactor = d.meta / rawTotal;
      const adjustedPerM2: Record<string, number> = {};
      catKeys.forEach((k) => {
        adjustedPerM2[k] = (d.avgPerM2[k] || 0) * scaleFactor;
      });
      return { ...d, avgPerM2: adjustedPerM2, avgTotalPerM2: d.meta };
    });
  }, []);

  const getStatusInfo = (entry: StoreCostEntry) => {
    const custoM2 = getStoreCostPerM2(entry);
    const meta = META_POR_M2[entry.tipo] || 3250;
    return { custoM2, meta, isOver: custoM2 > meta };
  };

  const barColors = ["hsl(220,70%,55%)", "hsl(160,55%,45%)", "hsl(35,85%,55%)", "hsl(280,55%,55%)", "hsl(350,65%,55%)", "hsl(190,60%,45%)"];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoConstance} alt="Logo" className="h-8 w-auto" />
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">Custos Geral — Todas as Lojas</h1>
              <p className="text-sm text-muted-foreground">Análise de custos por m² desde 2024</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="projecao" className="gap-1.5"><Calculator className="h-4 w-4" />Meta 2026</TabsTrigger>
            <TabsTrigger value="tabela" className="gap-1.5"><Building2 className="h-4 w-4" />Tabela</TabsTrigger>
          </TabsList>

          {/* ===== DASHBOARD TAB ===== */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Ano:</span>
              {anos.map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={dashboardAno === String(a) ? "default" : "outline"}
                  onClick={() => setDashboardAno(String(a))}
                >
                  {a}
                </Button>
              ))}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground">Lojas</p>
                  <p className="text-2xl font-bold">{dashSummary.totalLojas}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground">Total Investido</p>
                  <p className="text-lg font-bold">{fmt(dashSummary.totalInvestido)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground">Área Total (m²)</p>
                  <p className="text-lg font-bold">{dashSummary.totalArea.toFixed(0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground">Média Geral R$/m²</p>
                  <p className="text-lg font-bold">{fmtM2(dashSummary.avgM2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-[hsl(152,60%,40%)]" /> Dentro da Meta</p>
                  <p className="text-2xl font-bold text-[hsl(152,60%,40%)]">{dashSummary.ok}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-destructive" /> Estourou</p>
                  <p className="text-2xl font-bold text-destructive">{dashSummary.over}</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custo Médio por m² por Categoria — {dashboardAno}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip formatter={(value: number) => fmtM2(value)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {CATEGORIAS.map((cat, i) => (
                        <Bar key={cat.key} dataKey={cat.label} stackId="a" fill={barColors[i]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Per-type detail cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashData.map((d) => {
                const isOver = d.avgTotalPerM2 > d.meta;
                return (
                  <Card key={d.tipo} className={isOver ? "border-destructive/40" : "border-[hsl(152,60%,60%)]/40"}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{d.tipo}</CardTitle>
                        <Badge variant={isOver ? "destructive" : "outline"} className={!isOver ? "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]" : ""}>
                          {d.count} lojas
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Área média</span>
                        <span className="font-mono font-medium">{d.avgArea.toFixed(1)} m²</span>
                      </div>
                      {CATEGORIAS.map(({ key, label }) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono">{fmtM2(d.avgPerM2[key])}/m²</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2 flex justify-between text-sm font-bold">
                        <span>Total</span>
                        <span className={`font-mono ${isOver ? "text-destructive" : "text-[hsl(152,60%,40%)]"}`}>
                          {fmtM2(d.avgTotalPerM2)}/m²
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Meta</span>
                        <span className="font-mono">{fmtM2(d.meta)}/m²</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ===== PROJEÇÃO 2026 TAB ===== */}
          <TabsContent value="projecao" className="space-y-6">
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle>Meta de Custos por m² — Projeção 2026</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Baseado na média dos custos por m² das lojas inauguradas em 2025, separados por tipo de loja. Use esses valores como referência para contratação em 2026.
                </p>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {projections2026.map((d) => {
                const totalProj = Object.values(d.avgPerM2).reduce((s, v) => s + v, 0);
                return (
                  <Card key={d.tipo} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{d.tipo}</CardTitle>
                        <Badge variant="secondary">{d.count} lojas em 2025</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Área média: {d.avgArea.toFixed(1)} m² | Meta geral: {fmtM2(d.meta)}/m²</p>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Valor sugerido por m² para 2026</div>
                      {CATEGORIAS.map(({ key, label }) => {
                        const val = d.avgPerM2[key];
                        const pct = totalProj > 0 ? (val / totalProj) * 100 : 0;
                        return (
                          <div key={key} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                            <div className="flex-1 text-sm">{label}</div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-sm">{fmtM2(val)}</span>
                              <span className="text-xs text-muted-foreground ml-1">/m²</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] w-14 justify-center">{pct.toFixed(0)}%</Badge>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-2 pt-3 mt-2 border-t-2 border-primary/20">
                        <div className="flex-1 text-sm font-bold">TOTAL</div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-base text-[hsl(152,60%,40%)]">
                            {fmtM2(totalProj)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">/m²</span>
                        </div>
                      </div>

                      {/* Example: for a 100m² store */}
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">Exemplo: loja de 100 m²</p>
                        {CATEGORIAS.map(({ key, label }) => (
                          <div key={key} className="flex justify-between text-xs py-0.5">
                            <span>{label}</span>
                            <span className="font-mono">{fmt(d.avgPerM2[key] * 100)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t mt-1 pt-1">
                          <span>Total</span>
                          <span className="font-mono">{fmt(totalProj * 100)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ===== TABELA TAB ===== */}
          <TabsContent value="tabela" className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={filterAno} onValueChange={setFilterAno}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {anos.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="TRADICIONAL">Tradicional</SelectItem>
                  <SelectItem value="LIGHT">Light</SelectItem>
                  <SelectItem value="OUTLET">Outlet</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]">{totals.ok} OK</Badge>
                <Badge variant="destructive">{totals.over} Estourou</Badge>
                <span className="font-medium">{totals.total} lojas</span>
              </div>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead className="min-w-[180px]">Loja</TableHead>
                      <TableHead className="w-16 text-center">Ano</TableHead>
                      <TableHead className="w-24 text-center">Tipo</TableHead>
                      <TableHead className="w-20 text-center">Local</TableHead>
                      <TableHead className="w-20 text-right">Área m²</TableHead>
                      <TableHead className="w-28 text-right">Mão de Obra</TableHead>
                      <TableHead className="w-24 text-right">Móveis</TableHead>
                      <TableHead className="w-24 text-right">Piso</TableHead>
                      <TableHead className="w-24 text-right">Iluminação</TableHead>
                      <TableHead className="w-24 text-right">Informática</TableHead>
                      <TableHead className="w-24 text-right">Demais</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      <TableHead className="w-24 text-right">R$/m²</TableHead>
                      <TableHead className="w-24 text-right">Meta R$/m²</TableHead>
                      <TableHead className="w-20 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((entry, idx) => {
                      const total = getStoreCostTotal(entry);
                      const { custoM2, meta, isOver } = getStatusInfo(entry);
                      return (
                        <TableRow
                          key={`${entry.nome}-${entry.ano}`}
                          className={isOver ? "bg-destructive/5" : "bg-[hsl(152,60%,95%)]"}
                        >
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{entry.nome}</TableCell>
                          <TableCell className="text-center text-sm">{entry.ano}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px]">{entry.tipo}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs">{entry.local}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{entry.areaTotal.toFixed(1)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.maoDeObra)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.moveis)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.piso)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.iluminacao)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.informatica)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.demaisItens)}</TableCell>
                          <TableCell className="text-right text-sm font-bold font-mono">{fmt(total)}</TableCell>
                          <TableCell className={`text-right text-sm font-bold font-mono ${isOver ? "text-destructive" : "text-[hsl(152,60%,40%)]"}`}>
                            {fmtM2(custoM2)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">{fmtM2(meta)}</TableCell>
                          <TableCell className="text-center">
                            {isOver ? (
                              <Badge variant="destructive" className="text-[10px]">ESTOUROU</Badge>
                            ) : (
                              <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)] text-[10px]">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CustosGeral;
