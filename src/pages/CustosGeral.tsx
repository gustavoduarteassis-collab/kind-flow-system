import { useState, useMemo, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, TrendingUp, TrendingDown, Building2, Target, BarChart3, Calculator, Plus, FileText, Trash2, Printer } from "lucide-react";
import logoConstance from "@/assets/logo-constance.svg";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell as ReCell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

const PIE_COLORS = ["hsl(220,70%,55%)", "hsl(160,55%,45%)", "hsl(35,85%,55%)", "hsl(280,55%,55%)", "hsl(350,65%,55%)", "hsl(190,60%,45%)"];

const ESTADOS_BR = [
  "ACRE","ALAGOAS","AMAPA","AMAZONAS","BAHIA","CEARA","DISTRITO FEDERAL","ESPIRITO SANTO",
  "GOIAS","MARANHÃO","MATO GROSSO","MATO GROSSO DO SUL","MINAS GERAIS","PARA","PARAIBA",
  "PARANA","PERNAMBUCO","PIAUI","RIO DE JANEIRO","RIO GRANDE DO NORTE","RIO GRANDE DO SUL",
  "RONDONIA","RORAIMA","SANTA CATARINA","SÃO PAULO","SERGIPE","TOCANTINS"
];

const REGIONAIS = ["NORTE","NORDESTE","CENTRO-OESTE","SUDESTE","SUL"];

interface DbEntry {
  id: string;
  nome: string;
  ano: number;
  tipo: string;
  local: string;
  estado: string;
  regional: string;
  area_total: number;
  area_loja: number;
  prazo: string;
  mao_de_obra: number;
  moveis: number;
  piso: number;
  iluminacao: number;
  informatica: number;
  demais_itens: number;
}

function dbToStore(d: DbEntry): StoreCostEntry {
  return {
    nome: d.nome, ano: d.ano, tipo: d.tipo as StoreCostEntry["tipo"],
    local: d.local as StoreCostEntry["local"], estado: d.estado, regional: d.regional,
    areaTotal: Number(d.area_total), areaLoja: Number(d.area_loja), prazo: d.prazo,
    maoDeObra: Number(d.mao_de_obra), moveis: Number(d.moveis), piso: Number(d.piso),
    iluminacao: Number(d.iluminacao), informatica: Number(d.informatica), demaisItens: Number(d.demais_itens),
  };
}

const emptyForm = {
  nome: "", tipo: "TRADICIONAL", local: "SHOPPING", estado: "", regional: "SUDESTE",
  areaTotal: "", areaLoja: "", prazo: "",
  maoDeObra: "", moveis: "", piso: "", iluminacao: "", informatica: "", demaisItens: "",
};

const CustosGeral = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filterAno, setFilterAno] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [dashboardAno, setDashboardAno] = useState<string>("2025");
  const [dbEntries, setDbEntries] = useState<DbEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Load DB entries (2026+)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("custos_geral_entries")
        .select("*")
        .order("nome");
      if (data) setDbEntries(data as unknown as DbEntry[]);
    };
    load();
  }, []);

  // Merge static + DB entries
  const allEntries = useMemo(() => {
    const fromDb = dbEntries.map(dbToStore);
    return [...custosGeralData, ...fromDb];
  }, [dbEntries]);

  const anos = useMemo(() => {
    const set = new Set(allEntries.map((d) => d.ano));
    set.add(2026); // always show 2026
    return [...set].sort();
  }, [allEntries]);

  const filtered = useMemo(() => {
    let data = allEntries;
    if (filterAno !== "todos") data = data.filter((d) => d.ano === Number(filterAno));
    if (filterTipo !== "todos") data = data.filter((d) => d.tipo === filterTipo);
    return data;
  }, [filterAno, filterTipo, allEntries]);

  const totals = useMemo(() => {
    let ok = 0, over = 0;
    filtered.forEach((entry) => {
      const custoM2 = getStoreCostPerM2(entry);
      const meta = META_POR_M2[entry.tipo] || 3250;
      if (custoM2 <= meta) ok++; else over++;
    });
    return { ok, over, total: filtered.length };
  }, [filtered]);

  const dashData = useMemo(() => {
    const yearData = allEntries.filter((d) => d.ano === Number(dashboardAno));
    return calcAverages(yearData);
  }, [dashboardAno, allEntries]);

  const dashSummary = useMemo(() => {
    const yearData = allEntries.filter((d) => d.ano === Number(dashboardAno));
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
  }, [dashboardAno, allEntries]);

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

  // Report data
  const reportData = useMemo(() => {
    const reportAno = filterAno !== "todos" ? Number(filterAno) : null;
    const reportTipo = filterTipo !== "todos" ? filterTipo : null;
    let data = allEntries;
    if (reportAno) data = data.filter((d) => d.ano === reportAno);
    if (reportTipo) data = data.filter((d) => d.tipo === reportTipo);

    const totalInvestido = data.reduce((s, e) => s + getStoreCostTotal(e), 0);
    const totalArea = data.reduce((s, e) => s + e.areaTotal, 0);
    const avgM2 = totalArea > 0 ? totalInvestido / totalArea : 0;

    // By type
    const byTipo = TIPOS.map((t) => {
      const td = data.filter((e) => e.tipo === t);
      const inv = td.reduce((s, e) => s + getStoreCostTotal(e), 0);
      const area = td.reduce((s, e) => s + e.areaTotal, 0);
      return { tipo: t, count: td.length, investido: inv, area, avgM2: area > 0 ? inv / area : 0 };
    }).filter((d) => d.count > 0);

    // By regional
    const regSet = new Set(data.map((d) => d.regional));
    const byRegional = [...regSet].map((r) => {
      const rd = data.filter((e) => e.regional === r);
      const inv = rd.reduce((s, e) => s + getStoreCostTotal(e), 0);
      return { name: r, value: inv, count: rd.length };
    }).sort((a, b) => b.value - a.value);

    // By category totals
    const byCat = CATEGORIAS.map(({ key, label }) => {
      const sum = data.reduce((s, e) => s + e[key], 0);
      return { name: label, value: sum };
    });

    // By estado
    const estSet = new Set(data.map((d) => d.estado));
    const byEstado = [...estSet].map((e) => {
      const ed = data.filter((d) => d.estado === e);
      return { estado: e, count: ed.length, investido: ed.reduce((s, d) => s + getStoreCostTotal(d), 0) };
    }).sort((a, b) => b.count - a.count);

    let ok = 0, over = 0;
    data.forEach((e) => {
      const cm2 = getStoreCostPerM2(e);
      const meta = META_POR_M2[e.tipo] || 3250;
      if (cm2 <= meta) ok++; else over++;
    });

    return { totalLojas: data.length, totalInvestido, totalArea, avgM2, ok, over, byTipo, byRegional, byCat, byEstado };
  }, [allEntries, filterAno, filterTipo]);

  const getStatusInfo = (entry: StoreCostEntry) => {
    const custoM2 = getStoreCostPerM2(entry);
    const meta = META_POR_M2[entry.tipo] || 3250;
    return { custoM2, meta, isOver: custoM2 > meta };
  };

  const barColors = ["hsl(220,70%,55%)", "hsl(160,55%,45%)", "hsl(35,85%,55%)", "hsl(280,55%,55%)", "hsl(350,65%,55%)", "hsl(190,60%,45%)"];

  const handleSave = async () => {
    if (!user) return;
    if (!form.nome.trim()) { toast.error("Nome da loja é obrigatório"); return; }
    if (!form.areaTotal || Number(form.areaTotal) <= 0) { toast.error("Área total é obrigatória"); return; }
    setSaving(true);
    const { error } = await supabase.from("custos_geral_entries").insert({
      user_id: user.id,
      nome: form.nome.toUpperCase(),
      ano: 2026,
      tipo: form.tipo,
      local: form.local,
      estado: form.estado,
      regional: form.regional,
      area_total: Number(form.areaTotal) || 0,
      area_loja: Number(form.areaLoja) || 0,
      prazo: form.prazo,
      mao_de_obra: Number(form.maoDeObra) || 0,
      moveis: Number(form.moveis) || 0,
      piso: Number(form.piso) || 0,
      iluminacao: Number(form.iluminacao) || 0,
      informatica: Number(form.informatica) || 0,
      demais_itens: Number(form.demaisItens) || 0,
    } as any);
    if (error) { toast.error("Erro ao salvar: " + error.message); setSaving(false); return; }
    toast.success("Loja 2026 adicionada!");
    setForm(emptyForm);
    setDialogOpen(false);
    setSaving(false);
    // reload
    const { data } = await supabase.from("custos_geral_entries").select("*").order("nome");
    if (data) setDbEntries(data as unknown as DbEntry[]);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("custos_geral_entries").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Entrada removida");
    setDbEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const setField = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

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
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="projecao" className="gap-1.5 text-xs"><Calculator className="h-3.5 w-3.5" />Meta 2026</TabsTrigger>
            <TabsTrigger value="lancamento" className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />2026</TabsTrigger>
            <TabsTrigger value="relatorio" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Relatório</TabsTrigger>
            <TabsTrigger value="tabela" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Tabela</TabsTrigger>
          </TabsList>

          {/* ===== DASHBOARD TAB ===== */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Ano:</span>
              {anos.map((a) => (
                <Button key={a} size="sm" variant={dashboardAno === String(a) ? "default" : "outline"} onClick={() => setDashboardAno(String(a))}>
                  {a}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Lojas</p><p className="text-2xl font-bold">{dashSummary.totalLojas}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Total Investido</p><p className="text-sm font-bold truncate">{fmt(dashSummary.totalInvestido)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Área Total (m²)</p><p className="text-lg font-bold">{dashSummary.totalArea.toFixed(0)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Média R$/m²</p><p className="text-lg font-bold">{fmtM2(dashSummary.avgM2)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate flex items-center gap-1"><TrendingDown className="h-3 w-3 text-[hsl(152,60%,40%)]" /> Na Meta</p><p className="text-2xl font-bold text-[hsl(152,60%,40%)]">{dashSummary.ok}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate flex items-center gap-1"><TrendingUp className="h-3 w-3 text-destructive" /> Estourou</p><p className="text-2xl font-bold text-destructive">{dashSummary.over}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Custo Médio por m² — {dashboardAno}</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={4} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip formatter={(value: number, name: string) => [fmtM2(value), name]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      {CATEGORIAS.map((cat, i) => (
                        <Bar key={cat.key} dataKey={cat.label} fill={barColors[i]} radius={[3, 3, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashData.map((d) => {
                const isOver = d.avgTotalPerM2 > d.meta;
                return (
                  <Card key={d.tipo} className={isOver ? "border-destructive/40" : "border-[hsl(152,60%,60%)]/40"}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{d.tipo}</CardTitle>
                        <Badge variant={isOver ? "destructive" : "outline"} className={!isOver ? "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]" : ""}>{d.count} lojas</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Área média</span><span className="font-mono font-medium">{d.avgArea.toFixed(1)} m²</span></div>
                      {CATEGORIAS.map(({ key, label }) => (<div key={key} className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{fmtM2(d.avgPerM2[key])}/m²</span></div>))}
                      <div className="border-t pt-2 mt-2 flex justify-between text-sm font-bold"><span>Total</span><span className={`font-mono ${isOver ? "text-destructive" : "text-[hsl(152,60%,40%)]"}`}>{fmtM2(d.avgTotalPerM2)}/m²</span></div>
                      <div className="flex justify-between text-xs text-muted-foreground"><span>Meta</span><span className="font-mono">{fmtM2(d.meta)}/m²</span></div>
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
                <div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><CardTitle>Meta de Custos por m² — Projeção 2026</CardTitle></div>
                <p className="text-sm text-muted-foreground">Baseado na média dos custos por m² das lojas inauguradas em 2025, separados por tipo de loja.</p>
              </CardHeader>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {projections2026.map((d) => {
                const totalProj = Object.values(d.avgPerM2).reduce((s, v) => s + v, 0);
                return (
                  <Card key={d.tipo} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-3">
                      <div className="flex items-center justify-between"><CardTitle className="text-lg">{d.tipo}</CardTitle><Badge variant="secondary">{d.count} lojas em 2025</Badge></div>
                      <p className="text-xs text-muted-foreground">Área média: {d.avgArea.toFixed(1)} m² | Meta geral: {fmtM2(d.meta)}/m²</p>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Valor por m² para 2026</div>
                      {CATEGORIAS.map(({ key, label }) => {
                        const val = d.avgPerM2[key];
                        const pct = totalProj > 0 ? (val / totalProj) * 100 : 0;
                        return (
                          <div key={key} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                            <div className="flex-1 text-sm">{label}</div>
                            <div className="text-right"><span className="font-mono font-bold text-sm">{fmtM2(val)}</span><span className="text-xs text-muted-foreground ml-1">/m²</span></div>
                            <Badge variant="outline" className="text-[10px] w-14 justify-center">{pct.toFixed(0)}%</Badge>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-2 pt-3 mt-2 border-t-2 border-primary/20">
                        <div className="flex-1 text-sm font-bold">TOTAL</div>
                        <div className="text-right"><span className="font-mono font-bold text-base text-[hsl(152,60%,40%)]">{fmtM2(totalProj)}</span><span className="text-xs text-muted-foreground ml-1">/m²</span></div>
                      </div>
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">Exemplo: loja de 100 m²</p>
                        {CATEGORIAS.map(({ key, label }) => (<div key={key} className="flex justify-between text-xs py-0.5"><span>{label}</span><span className="font-mono">{fmt(d.avgPerM2[key] * 100)}</span></div>))}
                        <div className="flex justify-between text-sm font-bold border-t mt-1 pt-1"><span>Total</span><span className="font-mono">{fmt(totalProj * 100)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ===== LANÇAMENTO 2026 TAB ===== */}
          <TabsContent value="lancamento" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Lançamentos 2026</h2>
                <p className="text-sm text-muted-foreground">Cadastre manualmente as lojas inauguradas em 2026</p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />Nova Loja 2026</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Cadastrar Loja — 2026</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Label>Nome da Loja</Label><Input value={form.nome} onChange={(e) => setField("nome", e.target.value)} placeholder="Ex: SHOPPING EXEMPLO" /></div>
                    <div><Label>Tipo</Label>
                      <Select value={form.tipo} onValueChange={(v) => setField("tipo", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Local</Label>
                      <Select value={form.local} onValueChange={(v) => setField("local", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="SHOPPING">Shopping</SelectItem><SelectItem value="RUA">Rua</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Estado</Label>
                      <Select value={form.estado} onValueChange={(v) => setField("estado", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{ESTADOS_BR.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Regional</Label>
                      <Select value={form.regional} onValueChange={(v) => setField("regional", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{REGIONAIS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Área Total (m²)</Label><Input type="number" value={form.areaTotal} onChange={(e) => setField("areaTotal", e.target.value)} /></div>
                    <div><Label>Área Loja (m²)</Label><Input type="number" value={form.areaLoja} onChange={(e) => setField("areaLoja", e.target.value)} /></div>
                    <div className="col-span-2"><Label>Prazo</Label><Input value={form.prazo} onChange={(e) => setField("prazo", e.target.value)} placeholder="Ex: 35 DIAS" /></div>
                    <div className="col-span-2 border-t pt-4"><p className="text-sm font-semibold text-muted-foreground mb-3">Custos (R$)</p></div>
                    <div><Label>Mão de Obra</Label><Input type="number" value={form.maoDeObra} onChange={(e) => setField("maoDeObra", e.target.value)} /></div>
                    <div><Label>Móveis</Label><Input type="number" value={form.moveis} onChange={(e) => setField("moveis", e.target.value)} /></div>
                    <div><Label>Piso</Label><Input type="number" value={form.piso} onChange={(e) => setField("piso", e.target.value)} /></div>
                    <div><Label>Iluminação</Label><Input type="number" value={form.iluminacao} onChange={(e) => setField("iluminacao", e.target.value)} /></div>
                    <div><Label>Informática</Label><Input type="number" value={form.informatica} onChange={(e) => setField("informatica", e.target.value)} /></div>
                    <div><Label>Demais Itens</Label><Input type="number" value={form.demaisItens} onChange={(e) => setField("demaisItens", e.target.value)} /></div>
                  </div>
                  <DialogFooter><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* List 2026 entries from DB */}
            {dbEntries.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma loja 2026 cadastrada ainda. Clique em "Nova Loja 2026" para começar.</CardContent></Card>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Loja</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-center">Local</TableHead>
                        <TableHead className="text-right">Área m²</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">R$/m²</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbEntries.map((d) => {
                        const entry = dbToStore(d);
                        const total = getStoreCostTotal(entry);
                        const { custoM2, meta, isOver } = getStatusInfo(entry);
                        return (
                          <TableRow key={d.id} className={isOver ? "bg-destructive/5" : "bg-[hsl(152,60%,95%)]"}>
                            <TableCell className="font-medium">{d.nome}</TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{d.tipo}</Badge></TableCell>
                            <TableCell className="text-center text-xs">{d.local}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{Number(d.area_total).toFixed(1)}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-bold">{fmt(total)}</TableCell>
                            <TableCell className={`text-right font-mono text-sm font-bold ${isOver ? "text-destructive" : "text-[hsl(152,60%,40%)]"}`}>{fmtM2(custoM2)}</TableCell>
                            <TableCell className="text-center">{isOver ? <Badge variant="destructive" className="text-[10px]">ESTOUROU</Badge> : <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)] text-[10px]">OK</Badge>}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===== RELATÓRIO TAB ===== */}
          <TabsContent value="relatorio" className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center print:hidden">
              <span className="text-sm font-medium text-muted-foreground">Filtros do Relatório:</span>
              <Select value={filterAno} onValueChange={setFilterAno}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="TRADICIONAL">Tradicional</SelectItem>
                  <SelectItem value="LIGHT">Light</SelectItem>
                  <SelectItem value="OUTLET">Outlet</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="ml-auto gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />Gerar PDF / Imprimir
              </Button>
            </div>

            {/* Print header - only visible when printing */}
            <div className="hidden print:block mb-6">
              <div className="flex items-center gap-3 mb-2">
                <img src={logoConstance} alt="Logo" className="h-10 w-auto" />
                <div>
                  <h1 className="text-xl font-bold">Relatório de Custos Geral</h1>
                  <p className="text-sm text-muted-foreground">
                    {filterAno !== "todos" ? `Ano: ${filterAno}` : "Todos os anos"}
                    {filterTipo !== "todos" ? ` | Tipo: ${filterTipo}` : " | Todos os tipos"}
                    {` | Gerado em: ${new Date().toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              <hr />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Total Lojas</p><p className="text-2xl font-bold">{reportData.totalLojas}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Total Investido</p><p className="text-sm font-bold truncate">{fmt(reportData.totalInvestido)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Área Total</p><p className="text-lg font-bold">{reportData.totalArea.toFixed(0)} m²</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Média R$/m²</p><p className="text-lg font-bold">{fmtM2(reportData.avgM2)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Na Meta</p><p className="text-2xl font-bold text-[hsl(152,60%,40%)]">{reportData.ok}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground truncate">Estourou</p><p className="text-2xl font-bold text-destructive">{reportData.over}</p></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Type */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Por Tipo de Loja</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead className="text-right">Investido</TableHead><TableHead className="text-right">Área m²</TableHead><TableHead className="text-right">R$/m²</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {reportData.byTipo.map((d) => (
                        <TableRow key={d.tipo}>
                          <TableCell className="font-medium">{d.tipo}</TableCell>
                          <TableCell className="text-center">{d.count}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{fmt(d.investido)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{d.area.toFixed(0)}</TableCell>
                          <TableCell className={`text-right font-mono text-sm font-bold ${d.avgM2 > (META_POR_M2[d.tipo] || 3250) ? "text-destructive" : "text-[hsl(152,60%,40%)]"}`}>{fmtM2(d.avgM2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* By Category pie */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por Categoria</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reportData.byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                          {reportData.byCat.map((_, i) => <ReCell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* By Regional */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Por Regional</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Regional</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead className="text-right">Investido</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {reportData.byRegional.map((d) => (
                        <TableRow key={d.name}><TableCell className="font-medium">{d.name}</TableCell><TableCell className="text-center">{d.count}</TableCell><TableCell className="text-right font-mono text-xs">{fmt(d.value)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* By Estado */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Por Estado (Top 10)</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Estado</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead className="text-right">Investido</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {reportData.byEstado.slice(0, 10).map((d) => (
                        <TableRow key={d.estado}><TableCell className="font-medium text-xs">{d.estado}</TableCell><TableCell className="text-center">{d.count}</TableCell><TableCell className="text-right font-mono text-xs">{fmt(d.investido)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== TABELA TAB ===== */}
          <TabsContent value="tabela" className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center print:hidden">
              <Select value={filterAno} onValueChange={setFilterAno}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
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
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />Imprimir Tabela
              </Button>
            </div>

            {/* Print header for table tab */}
            <div className="hidden print:block mb-4">
              <div className="flex items-center gap-3 mb-2">
                <img src={logoConstance} alt="Logo" className="h-10 w-auto" />
                <div>
                  <h1 className="text-xl font-bold">Custos Geral — Tabela Completa</h1>
                  <p className="text-sm text-muted-foreground">
                    {filterAno !== "todos" ? `Ano: ${filterAno}` : "Todos os anos"}
                    {filterTipo !== "todos" ? ` | Tipo: ${filterTipo}` : " | Todos os tipos"}
                    {` | ${totals.total} lojas | ${totals.ok} OK | ${totals.over} Estourou`}
                    {` | Gerado em: ${new Date().toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              <hr />
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
                        <TableRow key={`${entry.nome}-${entry.ano}-${idx}`} className={isOver ? "bg-destructive/5" : "bg-[hsl(152,60%,95%)]"}>
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{entry.nome}</TableCell>
                          <TableCell className="text-center text-sm">{entry.ano}</TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{entry.tipo}</Badge></TableCell>
                          <TableCell className="text-center text-xs">{entry.local}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{entry.areaTotal.toFixed(1)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.maoDeObra)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.moveis)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.piso)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.iluminacao)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.informatica)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{fmt(entry.demaisItens)}</TableCell>
                          <TableCell className="text-right text-sm font-bold font-mono">{fmt(total)}</TableCell>
                          <TableCell className={`text-right text-sm font-bold font-mono ${isOver ? "text-destructive" : "text-[hsl(152,60%,40%)]"}`}>{fmtM2(custoM2)}</TableCell>
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">{fmtM2(meta)}</TableCell>
                          <TableCell className="text-center">{isOver ? <Badge variant="destructive" className="text-[10px]">ESTOUROU</Badge> : <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)] text-[10px]">OK</Badge>}</TableCell>
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
