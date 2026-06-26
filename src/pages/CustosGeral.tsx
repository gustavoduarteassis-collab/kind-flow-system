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
import { ArrowLeft, TrendingUp, TrendingDown, Building2, Target, BarChart3, Calculator, Plus, FileText, Trash2, Printer, FileSpreadsheet } from "lucide-react";
import { exportCustosGeralExcel } from "@/lib/exportCustosGeralExcel";
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
    return { tipo, count: b.count, avgArea, avgPerM2, avgTotalPerM2, meta: META_POR_M2[tipo] || 3350 };
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

function dbToStore(d: DbEntry & { created_at?: string }): StoreCostEntry & { createdAt?: string } {
  return {
    nome: d.nome, ano: d.ano, tipo: d.tipo as StoreCostEntry["tipo"],
    local: d.local as StoreCostEntry["local"], estado: d.estado, regional: d.regional,
    areaTotal: Number(d.area_total), areaLoja: Number(d.area_loja), prazo: d.prazo,
    maoDeObra: Number(d.mao_de_obra), moveis: Number(d.moveis), piso: Number(d.piso),
    iluminacao: Number(d.iluminacao), informatica: Number(d.informatica), demaisItens: Number(d.demais_itens),
    createdAt: d.created_at,
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
  const [planilhaTipo, setPlanilhaTipo] = useState<StoreCostEntry["tipo"]>("TRADICIONAL");
  const [planilhaArea, setPlanilhaArea] = useState<string>("");
  const [planilhaLoja, setPlanilhaLoja] = useState<string>("");
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
      const meta = META_POR_M2[entry.tipo] || 3350;
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
      const meta = META_POR_M2[e.tipo] || 3350;
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

  // Meta 2026: média das lojas de 2026 — média POR LOJA de R$/m² (não soma total / soma área).
  // Fallback para projeção a partir de 2025 (escalada para a meta) quando ainda não há lojas 2026 de um tipo.
  const projections2026 = useMemo(() => {
    const data2026 = allEntries.filter((d) => d.ano === 2026);
    const data2025 = custosGeralData.filter((d) => d.ano === 2025);
    const catKeys = CATEGORIAS.map((c) => c.key);

    return TIPOS.map((tipo) => {
      const meta = META_POR_M2[tipo] || 3350;
      const lojasTipo = data2026.filter((e) => e.tipo === tipo && e.areaTotal > 0);

      if (lojasTipo.length > 0) {
        // Média por loja: para cada loja calcula R$/m² da categoria, depois tira a média simples.
        const avgPerM2: Record<string, number> = {};
        catKeys.forEach((k) => {
          const soma = lojasTipo.reduce((s, e) => s + (e[k] / e.areaTotal), 0);
          avgPerM2[k] = soma / lojasTipo.length;
        });
        // Escala proporcional para fechar exatamente na meta (mantém as proporções entre categorias).
        const rawTotal = catKeys.reduce((s, k) => s + avgPerM2[k], 0);
        if (rawTotal > 0) {
          const scale = meta / rawTotal;
          catKeys.forEach((k) => { avgPerM2[k] = avgPerM2[k] * scale; });
        }
        const avgArea = lojasTipo.reduce((s, e) => s + e.areaTotal, 0) / lojasTipo.length;
        return { tipo, count: lojasTipo.length, avgArea, avgPerM2, avgTotalPerM2: meta, meta };
      }

      // Fallback: projeção a partir de 2025 escalada para a meta
      const lojas2025 = data2025.filter((e) => e.tipo === tipo && e.areaTotal > 0);
      const avgPerM2: Record<string, number> = {};
      catKeys.forEach((k) => {
        avgPerM2[k] = lojas2025.length > 0
          ? lojas2025.reduce((s, e) => s + (e[k] / e.areaTotal), 0) / lojas2025.length
          : 0;
      });
      const rawTotal = catKeys.reduce((s, k) => s + avgPerM2[k], 0);
      if (rawTotal > 0) {
        const scale = meta / rawTotal;
        catKeys.forEach((k) => { avgPerM2[k] = avgPerM2[k] * scale; });
      }
      const avgArea = lojas2025.length > 0 ? lojas2025.reduce((s, e) => s + e.areaTotal, 0) / lojas2025.length : 0;
      return { tipo, count: 0, avgArea, avgPerM2, avgTotalPerM2: meta, meta };
    });
  }, [allEntries]);

  const planilhaRegua = useMemo(() => {
    return projections2026.find((d) => d.tipo === planilhaTipo) || projections2026[0];
  }, [planilhaTipo, projections2026]);

  const planilhaAreaNum = Number(planilhaArea) || 0;
  const planilhaRows = useMemo(() => {
    if (!planilhaRegua) return [] as { key: CatKey; label: string; valM2: number; total: number }[];
    return CATEGORIAS.map(({ key, label }) => {
      const valM2 = planilhaRegua.avgPerM2[key] || 0;
      return { key, label, valM2, total: valM2 * planilhaAreaNum };
    });
  }, [planilhaRegua, planilhaAreaNum]);

  const planilhaTotal = planilhaRows.reduce((s, r) => s + r.total, 0);
  const planilhaTotalM2 = planilhaAreaNum > 0 ? planilhaTotal / planilhaAreaNum : 0;

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

    // Régua de previsto por m² (por tipo) — usa a projeção 2026 (meta dividida proporcionalmente entre categorias)
    const reguaPorTipo: Record<string, Record<CatKey, number>> = {} as any;
    projections2026.forEach((p) => {
      reguaPorTipo[p.tipo] = p.avgPerM2 as Record<CatKey, number>;
    });

    // Por loja — Previsto / Realizado / Diferença por categoria
    const byLoja = data.map((e) => {
      const regua = reguaPorTipo[e.tipo] || ({} as Record<CatKey, number>);
      const area = e.areaTotal || 0;
      const categorias = CATEGORIAS.map(({ key, label }) => {
        const realizado = e[key];
        const previsto = (regua[key] || 0) * area;
        const diferenca = realizado - previsto; // >0 = estourou, <=0 = bateu
        return { key, label, previsto, realizado, diferenca };
      });
      const previstoTotal = categorias.reduce((s, c) => s + c.previsto, 0);
      const realizadoTotal = categorias.reduce((s, c) => s + c.realizado, 0);
      const diferencaTotal = realizadoTotal - previstoTotal;
      const meta = META_POR_M2[e.tipo] || 3350;
      return {
        nome: e.nome,
        tipo: e.tipo,
        ano: e.ano,
        area,
        meta,
        categorias,
        previstoTotal,
        realizadoTotal,
        diferencaTotal,
        bateuTotal: diferencaTotal <= 0,
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome));

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
      const meta = META_POR_M2[e.tipo] || 3350;
      if (cm2 <= meta) ok++; else over++;
    });

    // Média mensal por tipo de loja (somente entries com createdAt) — acompanhamento mensal do ano filtrado
    const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const mensalPorTipo = TIPOS.map((tipo) => {
      const dataDoTipo = data.filter((e) => e.tipo === tipo);
      const meta = META_POR_M2[tipo] || 3350;
      // Agrupa por mês de createdAt
      const meses = MESES.map((mesLabel, i) => {
        const noMes = dataDoTipo.filter((e) => {
          const ca = (e as any).createdAt as string | undefined;
          if (!ca) return false;
          const dt = new Date(ca);
          return dt.getMonth() === i;
        });
        const inv = noMes.reduce((s, e) => s + getStoreCostTotal(e), 0);
        const area = noMes.reduce((s, e) => s + e.areaTotal, 0);
        const avgM2 = area > 0 ? inv / area : 0;
        return { mes: mesLabel, count: noMes.length, investido: inv, area, avgM2, meta, bateu: avgM2 <= meta && avgM2 > 0 };
      });
      // Acumulado anual do tipo (todas entries, com ou sem createdAt)
      const totalInv = dataDoTipo.reduce((s, e) => s + getStoreCostTotal(e), 0);
      const totalArea = dataDoTipo.reduce((s, e) => s + e.areaTotal, 0);
      const mediaAnualM2 = totalArea > 0 ? totalInv / totalArea : 0;
      return {
        tipo,
        meta,
        countTotal: dataDoTipo.length,
        totalInv,
        totalArea,
        mediaAnualM2,
        bateuAnual: mediaAnualM2 > 0 && mediaAnualM2 <= meta,
        meses,
      };
    });

    return { totalLojas: data.length, totalInvestido, totalArea, avgM2, ok, over, byLoja, byRegional, byCat, byEstado, mensalPorTipo };
  }, [allEntries, filterAno, filterTipo, projections2026]);

  const getStatusInfo = (entry: StoreCostEntry) => {
    const custoM2 = getStoreCostPerM2(entry);
    const meta = META_POR_M2[entry.tipo] || 3350;
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

  // Mini KPI strip (current year filter context)
  const headerYearData = useMemo(
    () => allEntries.filter((d) => d.ano === Number(dashboardAno)),
    [allEntries, dashboardAno]
  );
  const headerKpis = useMemo(() => {
    const inv = headerYearData.reduce((s, e) => s + getStoreCostTotal(e), 0);
    const area = headerYearData.reduce((s, e) => s + e.areaTotal, 0);
    const avg = area > 0 ? inv / area : 0;
    let ok = 0, over = 0;
    headerYearData.forEach((e) => {
      const cm2 = getStoreCostPerM2(e);
      const meta = META_POR_M2[e.tipo] || 3350;
      if (cm2 <= meta) ok++; else over++;
    });
    return { count: headerYearData.length, inv, area, avg, ok, over };
  }, [headerYearData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <img src={logoConstance} alt="" className="h-9 w-auto" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Custos Geral</h1>
              <p className="text-sm text-muted-foreground">Análise de custos por m² · todas as lojas desde 2024</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground self-center mr-1">Ano:</span>
            {anos.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={dashboardAno === String(a) ? "default" : "outline"}
                onClick={() => setDashboardAno(String(a))}
                className="h-8 px-3"
              >
                {a}
              </Button>
            ))}
          </div>
        </div>

        {/* Tricolor KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-2">
          <div className="rounded-lg border bg-card p-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Lojas {dashboardAno}</div>
            <div className="text-2xl font-bold mt-0.5">{headerKpis.count}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Investido</div>
            <div className="text-lg font-bold mt-0.5 truncate">{fmt(headerKpis.inv)}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Área (m²)</div>
            <div className="text-2xl font-bold mt-0.5">{headerKpis.area.toFixed(0)}</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Média R$/m²</div>
            <div className="text-xl font-bold mt-0.5">{fmtM2(headerKpis.avg)}</div>
          </div>
          <div className="rounded-lg border border-[hsl(152,60%,40%)]/40 bg-[hsl(152,60%,40%)]/5 p-3">
            <div className="text-[11px] text-[hsl(152,60%,30%)] uppercase tracking-wide flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Na meta
            </div>
            <div className="text-2xl font-bold mt-0.5 text-[hsl(152,60%,30%)]">{headerKpis.ok}</div>
          </div>
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <div className="text-[11px] text-destructive uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Estouraram
            </div>
            <div className="text-2xl font-bold mt-0.5 text-destructive">{headerKpis.over}</div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="projecao" className="gap-1.5 text-xs"><Calculator className="h-3.5 w-3.5" />Meta 2026</TabsTrigger>
            <TabsTrigger value="planilha" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Planilha</TabsTrigger>
            <TabsTrigger value="lancamento" className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />2026</TabsTrigger>
            <TabsTrigger value="relatorio" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Relatório</TabsTrigger>
            <TabsTrigger value="tabela" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Tabela</TabsTrigger>
          </TabsList>

          {/* ===== DASHBOARD TAB ===== */}
          <TabsContent value="dashboard" className="space-y-6">


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

          {/* ===== PLANILHA TAB ===== */}
          <TabsContent value="planilha" className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center print:hidden">
              <div className="w-full max-w-xs">
                <Label>Nome da Loja</Label>
                <Input value={planilhaLoja} onChange={(e) => setPlanilhaLoja(e.target.value)} placeholder="Ex: SHOPPING EXEMPLO" />
              </div>
              <div className="w-full max-w-[200px]">
                <Label>Tipo de Loja</Label>
                <Select value={planilhaTipo} onValueChange={(v) => setPlanilhaTipo(v as StoreCostEntry["tipo"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-full max-w-[160px]">
                <Label>Área da Loja (m²)</Label>
                <Input type="number" value={planilhaArea} onChange={(e) => setPlanilhaArea(e.target.value)} placeholder="0" />
              </div>
              <Button variant="outline" className="ml-auto gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />Gerar PDF / Imprimir
              </Button>
            </div>

            {/* Print header */}
            <div className="hidden print:block mb-6">
              <div className="flex items-center gap-3 mb-2">
                <img src={logoConstance} alt="Logo" className="h-10 w-auto" />
                <div>
                  <h1 className="text-xl font-bold">Planilha de Custo por m²</h1>
                  <p className="text-sm text-muted-foreground">
                    {planilhaLoja ? `Loja: ${planilhaLoja} | ` : ""}Tipo: {planilhaTipo} | Área: {planilhaAreaNum > 0 ? planilhaAreaNum.toFixed(1) : "0"} m²
                    {` | Gerado em: ${new Date().toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              <hr />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Régua por m² — {planilhaTipo}</CardTitle>
                <p className="text-xs text-muted-foreground">Valores calculados com base na régua por m² do tipo selecionado.</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor / m²</TableHead>
                        <TableHead className="text-right">Total ({planilhaAreaNum > 0 ? `${planilhaAreaNum.toFixed(1)} m²` : "m²"})</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planilhaRows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmtM2(row.valM2)}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">{fmt(row.total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right font-mono">{fmtM2(planilhaTotalM2)}</TableCell>
                        <TableCell className="text-right font-mono text-base text-[hsl(152,60%,40%)]">{fmt(planilhaTotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Meta do tipo: {planilhaRegua ? fmtM2(planilhaRegua.meta) : "—"}/m²</span>
                  <span>Régua aplicada: média ajustada 2026 por categoria</span>
                </div>
              </CardContent>
            </Card>
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
              <div className="ml-auto flex gap-2">
                <Button
                  variant="default"
                  className="gap-2 bg-[hsl(140,55%,35%)] hover:bg-[hsl(140,55%,30%)] text-white"
                  onClick={async () => {
                    try {
                      await exportCustosGeralExcel(reportData, filterAno, filterTipo);
                      toast.success("Relatório Excel gerado!");
                    } catch (e) {
                      toast.error("Erro ao gerar Excel");
                      console.error(e);
                    }
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4" />Exportar Excel
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />Gerar PDF / Imprimir
                </Button>
              </div>
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

            {/* Previsto x Realizado por Loja */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Previsto x Realizado — Por Loja</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Linhas: <span className="font-semibold">Previsto</span> (meta × área), <span className="font-semibold">Realizado</span> (executado) e <span className="font-semibold">Diferença</span>.
                  {" "}Cores: <span className="text-[hsl(152,60%,40%)] font-semibold">verde</span> = bateu (≤ previsto) · <span className="text-destructive font-semibold">vermelho</span> = estourou.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {reportData.byLoja.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma loja para os filtros selecionados.</p>
                )}
                {reportData.byLoja.map((loja) => (
                  <div key={`${loja.nome}-${loja.ano}`} className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-bold uppercase tracking-wide">
                        {loja.nome} <span className="text-xs text-muted-foreground font-normal">· {loja.tipo} · {loja.ano} · {loja.area.toFixed(0)} m²</span>
                      </h4>
                      <span className="text-xs text-muted-foreground">Meta: {fmtM2(loja.meta)}/m²</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Linha</TableHead>
                            {CATEGORIAS.map((c) => (
                              <TableHead key={c.key} className="text-right text-xs">{c.label}</TableHead>
                            ))}
                            <TableHead className="text-right text-xs font-bold">TOTAL</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Previsto */}
                          <TableRow>
                            <TableCell className="text-xs font-medium text-muted-foreground">Previsto</TableCell>
                            {loja.categorias.map((c) => (
                              <TableCell key={c.key} className="text-right font-mono text-xs">{fmt(c.previsto)}</TableCell>
                            ))}
                            <TableCell className="text-right font-mono text-xs font-bold">{fmt(loja.previstoTotal)}</TableCell>
                          </TableRow>
                          {/* Realizado */}
                          <TableRow>
                            <TableCell className="text-xs font-medium text-muted-foreground">Realizado</TableCell>
                            {loja.categorias.map((c) => {
                              const bateu = c.realizado <= c.previsto;
                              return (
                                <TableCell key={c.key} className={`text-right font-mono text-xs font-bold ${bateu ? "text-[hsl(152,60%,40%)]" : "text-destructive"}`}>
                                  {fmt(c.realizado)}
                                </TableCell>
                              );
                            })}
                            <TableCell className={`text-right font-mono text-sm font-bold ${loja.bateuTotal ? "text-[hsl(152,60%,40%)]" : "text-destructive"}`}>
                              {fmt(loja.realizadoTotal)}
                            </TableCell>
                          </TableRow>
                          {/* Diferença */}
                          <TableRow className="bg-muted/20">
                            <TableCell className="text-xs font-medium text-muted-foreground">Diferença</TableCell>
                            {loja.categorias.map((c) => {
                              const bateu = c.diferenca <= 0;
                              const sinal = c.diferenca > 0 ? "+" : "";
                              return (
                                <TableCell key={c.key} className={`text-right font-mono text-xs font-bold ${bateu ? "text-[hsl(152,60%,40%)]" : "text-destructive"}`}>
                                  {sinal}{fmt(c.diferenca)}
                                </TableCell>
                              );
                            })}
                            <TableCell className={`text-right font-mono text-sm font-bold ${loja.bateuTotal ? "text-[hsl(152,60%,40%)]" : "text-destructive"}`}>
                              {loja.diferencaTotal > 0 ? "+" : ""}{fmt(loja.diferencaTotal)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Média Mensal por Tipo de Loja */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Média Mensal por Tipo de Loja — Acompanhamento Anual</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Custo médio por m² em cada mês (baseado nos lançamentos do período).{" "}
                  <span className="text-[hsl(152,60%,40%)] font-semibold">verde</span> = dentro da meta ·{" "}
                  <span className="text-destructive font-semibold">vermelho</span> = acima da meta · meses sem lançamento ficam em branco.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {reportData.mensalPorTipo.map((t) => (
                  <div key={t.tipo} className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-bold uppercase tracking-wide">{t.tipo}</h4>
                      <span className="text-xs text-muted-foreground">
                        {t.countTotal} loja{t.countTotal !== 1 ? "s" : ""} no ano · Meta: {fmtM2(t.meta)}/m² ·
                        {" "}Média anual: <span className={`font-mono font-bold ${t.countTotal === 0 ? "text-muted-foreground" : t.bateuAnual ? "text-[hsl(152,60%,40%)]" : "text-destructive"}`}>{t.countTotal === 0 ? "—" : `${fmtM2(t.mediaAnualM2)}/m²`}</span>
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Indicador</TableHead>
                            {t.meses.map((m) => (
                              <TableHead key={m.mes} className="text-right text-xs">{m.mes}</TableHead>
                            ))}
                            <TableHead className="text-right text-xs font-bold">ANO</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-xs font-medium text-muted-foreground">Lojas</TableCell>
                            {t.meses.map((m) => (
                              <TableCell key={m.mes} className="text-right font-mono text-xs">{m.count || "—"}</TableCell>
                            ))}
                            <TableCell className="text-right font-mono text-xs font-bold">{t.countTotal || "—"}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-xs font-medium text-muted-foreground">Investido</TableCell>
                            {t.meses.map((m) => (
                              <TableCell key={m.mes} className="text-right font-mono text-[10px]">
                                {m.investido > 0 ? fmt(m.investido) : "—"}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-mono text-[10px] font-bold">
                              {t.totalInv > 0 ? fmt(t.totalInv) : "—"}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/20">
                            <TableCell className="text-xs font-medium">Média R$/m²</TableCell>
                            {t.meses.map((m) => (
                              <TableCell
                                key={m.mes}
                                className={`text-right font-mono text-xs font-bold ${
                                  m.avgM2 === 0
                                    ? "text-muted-foreground"
                                    : m.bateu
                                    ? "text-[hsl(152,60%,40%)]"
                                    : "text-destructive"
                                }`}
                              >
                                {m.avgM2 > 0 ? fmtM2(m.avgM2) : "—"}
                              </TableCell>
                            ))}
                            <TableCell
                              className={`text-right font-mono text-xs font-bold ${
                                t.mediaAnualM2 === 0
                                  ? "text-muted-foreground"
                                  : t.bateuAnual
                                  ? "text-[hsl(152,60%,40%)]"
                                  : "text-destructive"
                              }`}
                            >
                              {t.mediaAnualM2 > 0 ? fmtM2(t.mediaAnualM2) : "—"}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
