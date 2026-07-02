import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MuralObras from "@/components/home/MuralObras";
import { InauguracaoBanner } from "@/components/InauguracaoBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { checklistCategories, StatusType } from "@/data/checklistData";
import { visitaTecnicaCategories, VisitaStatusType } from "@/data/visitaTecnicaData";
import { META_POR_M2 } from "@/data/custosGeralData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Building2, Users, ListTodo, Target, ChevronRight, GitBranch, DollarSign, FolderOpen,
  Eye, EyeOff, AlertTriangle, CheckCircle2, Sparkles, KeyRound,
  Clock, Search, Calendar, Wallet, Flame, Thermometer,
} from "lucide-react";
import { useUserDisplayName } from "@/hooks/useUserDisplayName";
import { usePageTitle } from "@/hooks/usePageTitle";
import { buildInauguradasFiliais } from "@/utils/inauguradaFilter";

type Task = {
  id: string; title: string; status: string; priority: string;
  assigned_to: string | null; due_date: string | null; start_date: string | null;
};
type TeamMember = { id: string; name: string };

type CustoEntry = {
  nome: string; ano: number; tipo: string | null; area_loja: number | null;
  mao_de_obra: number | null; moveis: number | null; piso: number | null;
  iluminacao: number | null; informatica: number | null; demais_itens: number | null;
};

const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-secondary text-secondary-foreground",
  alta: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  urgente: "bg-destructive text-destructive-foreground",
};
const priorityLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
const statusLabels: Record<string, string> = { pendente: "Pendente", em_andamento: "Em Andamento", concluida: "Concluída", cancelada: "Cancelada" };

const formatDate = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

const navCards = [
  { url: "/pipeline", label: "Funil de Lojas", desc: "Pipeline de implantação", icon: GitBranch },
  { url: "/lojas", label: "Lojas", desc: "Gestão de lojas ativas", icon: Building2 },
  { url: "/custos-geral", label: "Custos Geral", desc: "Visão consolidada", icon: DollarSign },
  { url: "/agm", label: "AGM", desc: "Análise Gerencial Mensal", icon: Target },
  { url: "/equipe", label: "Equipe & Tarefas", desc: "Time e calendário", icon: Users },
  { url: "/diversos", label: "Diversos", desc: "Prospecção & Fornecedores", icon: FolderOpen },
  { url: "/funil-importar", label: "Importar Funil", desc: "Atualizar lojas via planilha", icon: Sparkles },
  { url: "/acessos", label: "Acessos", desc: "Franqueados & construtores", icon: KeyRound },
];

// --------- helpers ---------

const normalizeName = (s: string | null | undefined) =>
  (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

/** Parse pt-BR or ISO date strings; returns null on failure. */
function parseAnyDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // ISO yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  // dd/mm/yyyy
  const br = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const d = new Date(+br[3], +br[2] - 1, +br[1]);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysUntil(d: Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

const VT_TOTAL = visitaTecnicaCategories.flatMap((c) => c.items).length;

function visitaPct(store: any): number {
  const items = store?.visitaTecnica?.items as Record<string, { status: VisitaStatusType }> | undefined;
  if (!items) return 0;
  let done = 0;
  for (const id of Object.keys(items)) {
    const st = items[id]?.status;
    if (st === "CONCLUIDO" || st === "NAO_SE_APLICA") done++;
  }
  return VT_TOTAL > 0 ? Math.round((done / VT_TOTAL) * 100) : 0;
}

function cronogramaIniciado(store: any): boolean {
  return !!store?.cronograma?.startDate;
}

function checklistMetrics(store: any) {
  const total = checklistCategories.flatMap((c) => c.items).length;
  const counts: Partial<Record<StatusType, number>> = {};
  Object.values(store.checklist || {}).forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
  const done = (counts["REALIZADO"] || 0) + (counts["NÃO SE APLICA"] || 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { pct, atrasados: counts["ATRASADO"] || 0 };
}

function custoForStore(entries: CustoEntry[], storeNome: string) {
  const key = normalizeName(storeNome);
  const match = entries.filter((e) => normalizeName(e.nome) === key);
  if (match.length === 0) return null;
  // pick latest year
  const latest = match.reduce((a, b) => ((b.ano || 0) > (a.ano || 0) ? b : a));
  const total =
    (latest.mao_de_obra || 0) + (latest.moveis || 0) + (latest.piso || 0) +
    (latest.iluminacao || 0) + (latest.informatica || 0) + (latest.demais_itens || 0);
  const area = latest.area_loja || 0;
  const tipo = (latest.tipo || "").toString().toUpperCase();
  const meta = META_POR_M2[tipo] || 0;
  const perM2 = area > 0 ? total / area : 0;
  return { total, area, tipo, meta, perM2, hasCusto: total > 0 };
}

// --------- semáforo helper ---------

type Sem = "green" | "amber" | "red" | "muted";
const semBg: Record<Sem, string> = {
  green: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30",
  amber: "bg-[hsl(38,90%,55%)]/15 text-[hsl(38,90%,40%)] border-[hsl(38,90%,55%)]/30",
  red: "bg-destructive/15 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground border-border",
};

// --------- existing store summary section (kept as-is) ---------

type SortKey = "nome" | "analista" | "progresso" | "realizados" | "atrasados" | "naoiniciados" | "andamento";

function StoreSummarySection({
  stores, inauguradasFiliais, showReformas, setShowReformas, navigate,
}: {
  stores: any[];
  inauguradasFiliais: Set<string>;
  showReformas: boolean;
  setShowReformas: (fn: (v: boolean) => boolean) => void;
  navigate: (to: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("atrasados");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const totalItems = checklistCategories.flatMap((c) => c.items).length;
  const rows = useMemo(() => {
    return stores
      .filter((store) => {
        if (store.isReforma && !showReformas) return false;
        if (store.filial && inauguradasFiliais.has(String(store.filial))) return false;
        return true;
      })
      .map((store) => {
        const counts: Partial<Record<StatusType, number>> = {};
        Object.values(store.checklist).forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
        const done = (counts["REALIZADO"] || 0) + (counts["NÃO SE APLICA"] || 0);
        const pct = totalItems > 0 ? Math.round((done / totalItems) * 100) : 0;
        const inProgress = (counts["EM COTAÇÃO"] || 0) + (counts["EM TRANSPORTE"] || 0) + (counts["EM ELABORAÇÃO"] || 0) + (counts["EM ANÁLISE"] || 0) + (counts["EM CONTRATAÇÃO"] || 0) + (counts["CONSTRUTORA"] || 0);
        return { store, counts, pct, inProgress, atrasados: counts["ATRASADO"] || 0, realizados: counts["REALIZADO"] || 0, naoIni: counts["NÃO INICIADO"] || 0 };
      })
      .filter((r) => r.pct < 100);
  }, [stores, inauguradasFiliais, showReformas, totalItems]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const get = (r: typeof a) => {
        switch (sortKey) {
          case "nome": return r.store.nome.toLowerCase();
          case "analista": return (r.store.analistaObra || "").toLowerCase();
          case "progresso": return r.pct;
          case "realizados": return r.realizados;
          case "atrasados": return r.atrasados;
          case "naoiniciados": return r.naoIni;
          case "andamento": return r.inProgress;
        }
      };
      const av = get(a); const bv = get(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "nome" || k === "analista" ? "asc" : "desc"); }
  };
  const SortHead = ({ k, children, align = "left" }: { k: SortKey; children: any; align?: "left" | "center" }) => (
    <TableHead className={align === "center" ? "text-center" : ""}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
        {children}{sortKey === k && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </TableHead>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Resumo das Lojas</h2>
          <p className="text-xs text-muted-foreground">Mostrando {sorted.length} de {stores.length} lojas (apenas em andamento)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showReformas ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setShowReformas((v) => !v)}>
            {showReformas ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showReformas ? "Ocultar reformas" : "Mostrar reformas"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/lojas")}>
            Ver Todas <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card><div className="overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <SortHead k="nome">Loja</SortHead>
          <SortHead k="analista">Analista</SortHead>
          <SortHead k="progresso" align="center">Progresso</SortHead>
          <SortHead k="realizados" align="center">Realizados</SortHead>
          <SortHead k="atrasados" align="center">Atrasados</SortHead>
          <SortHead k="naoiniciados" align="center">Não Iniciados</SortHead>
          <SortHead k="andamento" align="center">Em Andamento</SortHead>
        </TableRow></TableHeader>
        <TableBody>
          {sorted.map(({ store, pct, inProgress, atrasados, realizados, naoIni }) => (
            <TableRow key={store.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/loja/${store.id}`)}>
              <TableCell className="font-medium">{store.nome}</TableCell>
              <TableCell className="text-sm">
                {store.analistaObra ? (
                  <span className="text-primary cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/lojas?analista=${encodeURIComponent(store.analistaObra)}`); }}>
                    {store.analistaObra}
                  </span>
                ) : <span className="text-muted-foreground italic">sem analista</span>}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <Progress value={pct} className="h-1.5 w-16" />
                  <span className="text-xs font-semibold">{pct}%</span>
                </div>
              </TableCell>
              <TableCell className="text-center"><Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-xs">{realizados}</Badge></TableCell>
              <TableCell className="text-center">
                {atrasados > 0
                  ? <span className="text-destructive font-bold text-sm">{atrasados}</span>
                  : <span className="text-xs text-muted-foreground">0</span>}
              </TableCell>
              <TableCell className="text-center"><span className="text-xs text-muted-foreground">{naoIni}</span></TableCell>
              <TableCell className="text-center"><span className="text-xs text-muted-foreground">{inProgress}</span></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></div></Card>
    </section>
  );
}


const Index = () => {
  usePageTitle("Painel do Coordenador");
  const { stores } = useStores();
  const navigate = useNavigate();
  const { name } = useUserDisplayName();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inauguradasFiliais, setInauguradasFiliais] = useState<Set<string>>(new Set());
  const [inauguradasMes, setInauguradasMes] = useState(0);
  const [showReformas, setShowReformas] = useState(false);
  const [custos, setCustos] = useState<CustoEntry[]>([]);

  const fetchData = useCallback(async () => {
    const [t, m, ps, cg] = await Promise.all([
      supabase.from("tasks").select("id, title, status, priority, assigned_to, due_date, start_date").is("deleted_at", null).order("created_at", { ascending: false }).limit(10),
      supabase.from("team_members").select("id, name").is("deleted_at", null),
      supabase.from("pipeline_stores").select("filial, status_geral, data_inauguracao").is("deleted_at", null),
      supabase.from("custos_geral_entries")
        .select("nome, ano, tipo, area_loja, mao_de_obra, moveis, piso, iluminacao, informatica, demais_itens")
        .is("deleted_at", null),
    ]);
    if (t.data) setTasks(t.data as Task[]);
    if (m.data) setMembers(m.data);
    if (cg.data) setCustos(cg.data as CustoEntry[]);
    if (ps.data) {
      setInauguradasFiliais(buildInauguradasFiliais(ps.data as any));
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const count = (ps.data as any[]).filter((p) =>
        (p.data_inauguracao && String(p.data_inauguracao).startsWith(ym))
        || (p.status_geral && /inaugurada/i.test(p.status_geral) && String(p.status_geral).includes(ym.split("-").reverse().join("/").slice(0, 5)))
      ).length;
      setInauguradasMes(count);
    }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  // active stores = not inaugurated, not reform-only
  const activeStores = useMemo(
    () => stores.filter((s) => !s.filial || !inauguradasFiliais.has(String(s.filial))),
    [stores, inauguradasFiliais],
  );

  // per-store derived metrics
  const storeMetrics = useMemo(() => activeStores.map((store) => {
    const inaugDate = parseAnyDate(store.inauguracao);
    const days = inaugDate ? daysUntil(inaugDate) : null;
    const vtPct = visitaPct(store);
    const cron = cronogramaIniciado(store);
    const chk = checklistMetrics(store);
    const custo = custoForStore(custos, store.nome);
    return { store, inaugDate, days, vtPct, cron, ...chk, custo };
  }), [activeStores, custos]);

  // ----- Obras Críticas (grouped per store) -----
  type Alert = { icon: any; label: string; tone: Sem; tab?: string; sort: number };
  type GroupedAlert = { storeId: string; storeName: string; analista: string; alerts: Alert[]; worstTone: Sem; minSort: number };
  const groupedAlerts: GroupedAlert[] = useMemo(() => {
    const byStore = new Map<string, GroupedAlert>();
    const push = (m: typeof storeMetrics[0], a: Alert) => {
      const key = m.store.id;
      const g = byStore.get(key) || { storeId: key, storeName: m.store.nome, analista: m.store.analistaObra || "—", alerts: [], worstTone: "muted" as Sem, minSort: 999 };
      g.alerts.push(a);
      const toneRank: Record<Sem, number> = { red: 3, amber: 2, green: 1, muted: 0 };
      if (toneRank[a.tone] > toneRank[g.worstTone]) g.worstTone = a.tone;
      if (a.sort < g.minSort) g.minSort = a.sort;
      byStore.set(key, g);
    };
    storeMetrics.forEach((m) => {
      if (m.days !== null && m.days >= 0 && m.days <= 7) {
        push(m, { icon: Clock, label: `⏳ ${m.days === 0 ? "Inaugura hoje" : `${m.days}d p/ inaugurar`}`, tone: "red", sort: m.days });
      }
      if (m.vtPct === 0 && m.days !== null && m.days >= 0 && m.days < 30) {
        push(m, { icon: Search, label: "🔍 Visita pendente", tone: "red", tab: "visita-tecnica", sort: 10 });
      }
      if (!m.cron) {
        push(m, { icon: Calendar, label: "📅 Sem cronograma", tone: "amber", tab: "cronograma", sort: 20 });
      }
      if (!m.custo?.hasCusto && m.pct > 20) {
        push(m, { icon: Wallet, label: "💰 Sem custo", tone: "amber", tab: "custos", sort: 30 });
      }
      if (m.atrasados > 10) {
        push(m, { icon: Flame, label: `⚠️ ${m.atrasados} atrasados`, tone: "red", sort: 5 });
      }
    });
    return Array.from(byStore.values()).sort((a, b) => a.minSort - b.minSort);
  }, [storeMetrics]);

  // ----- 4 KPIs de Qualidade -----
  const qualityKpis = useMemo(() => {
    const total = activeStores.length || 1;
    const vtDone = storeMetrics.filter((m) => m.vtPct > 0).length;
    const cronDone = storeMetrics.filter((m) => m.cron).length;
    const withCusto = storeMetrics.filter((m) => m.custo?.hasCusto);
    const inBudget = withCusto.filter((m) => m.custo!.meta > 0 && m.custo!.perM2 > 0 && m.custo!.perM2 <= m.custo!.meta).length;
    const chk70 = storeMetrics.filter((m) => m.pct >= 70).length;
    return {
      vt: { num: vtDone, den: activeStores.length, label: "Visitas técnicas realizadas" },
      cron: { num: cronDone, den: activeStores.length, label: "Cronogramas ativos" },
      budget: { num: inBudget, den: withCusto.length, label: "Lojas dentro do orçamento" },
      chk: { num: chk70, den: activeStores.length, label: "Checklists ≥ 70%" },
      total,
    };
  }, [activeStores.length, storeMetrics]);

  // ----- Próximas Inaugurações (next 90 days) -----
  const upcoming = useMemo(() => {
    return storeMetrics
      .filter((m) => m.days !== null && m.days >= 0 && m.days <= 90)
      .sort((a, b) => (a.days! - b.days!));
  }, [storeMetrics]);

  // ----- KPIs base (existing) -----
  const totalItems = stores.length * checklistCategories.flatMap((c) => c.items).length;
  const statusSummary = useMemo(() => {
    const s: Partial<Record<StatusType, number>> = {};
    stores.forEach((store) => Object.values(store.checklist).forEach((c) => { s[c.status] = (s[c.status] || 0) + 1; }));
    return s;
  }, [stores]);
  const doneItems = (statusSummary["REALIZADO"] || 0) + (statusSummary["NÃO SE APLICA"] || 0);
  const overallProgress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const progressColor = overallProgress >= 80 ? "hsl(var(--success))" : overallProgress >= 50 ? "hsl(var(--accent))" : "hsl(var(--destructive))";

  const lojasAtivas = activeStores.length;
  const urgentes = tasks.filter((t) => t.priority === "urgente" && t.status !== "concluida" && t.status !== "cancelada").length;
  const pendingTasks = tasks.filter((t) => t.status === "pendente").length;
  const inProgressTasks = tasks.filter((t) => t.status === "em_andamento").length;
  const completedTasks = tasks.filter((t) => t.status === "concluida").length;

  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";

  // -------- Render --------

  const goToStore = (storeId: string, tab?: string) => {
    navigate(tab ? `/loja/${storeId}?tab=${tab}` : `/loja/${storeId}`);
  };

  const KpiCard = ({ label, num, den, icon: Icon }: { label: string; num: number; den: number; icon: any }) => {
    const pct = den > 0 ? Math.round((num / den) * 100) : 0;
    const tone: Sem = pct >= 80 ? "green" : pct >= 50 ? "amber" : den === 0 ? "muted" : "red";
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold">{num}<span className="text-base font-normal text-muted-foreground"> / {den}</span></p>
          <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${semBg[tone]}`}>
            {pct}% {tone === "green" ? "ok" : tone === "amber" ? "atenção" : tone === "red" ? "crítico" : "sem dados"}
          </div>
        </CardContent>
      </Card>
    );
  };

  const [sp, setSp] = useSearchParams();
  const tabParam = sp.get("tab");
  const activeTab = tabParam === "alertas" || tabParam === "mural" ? tabParam : "resumo";
  const setTab = (v: string) => {
    const next = new URLSearchParams(sp);
    if (v === "alertas" || v === "mural") next.set("tab", v);
    else next.delete("tab");
    setSp(next, { replace: true });
  };

  const uniqueAlertStores = groupedAlerts.length;

  const AlertasCriticosSection = ({ limit }: { limit?: number }) => {
    const list = limit ? groupedAlerts.slice(0, limit) : groupedAlerts;
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" /> Obras Críticas — Atenção Hoje
          </h2>
          <span className="text-xs text-muted-foreground">{uniqueAlertStores} loja(s) com alertas</span>
        </div>
        {list.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
            Nenhuma loja em alerta no momento. ✅
          </CardContent></Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((g) => (
              <button
                key={g.storeId}
                onClick={() => goToStore(g.storeId)}
                className={`text-left rounded-lg border p-3 transition-colors hover:bg-muted/50 ${semBg[g.worstTone]}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold truncate">{g.storeName}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">{g.alerts.length}</Badge>
                </div>
                <p className="text-[11px] opacity-80 mb-1 truncate">{g.analista}</p>
                <p className="text-xs opacity-95 leading-snug">
                  {g.alerts.map((a) => a.label).join(" | ")}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Inauguração pendente banner */}
      <InauguracaoBanner />

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Olá, {name?.split(" ")[0] || "bem-vindo"} 👋</h1>
        <p className="text-sm text-muted-foreground">Início do dia: prioridades, qualidade e próximas inaugurações.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="alertas">Alertas Críticos</TabsTrigger>
          <TabsTrigger value="mural">Mural de Obras</TabsTrigger>
        </TabsList>

        <TabsContent value="mural" className="mt-4">
          <MuralObras />
        </TabsContent>

        <TabsContent value="alertas" className="mt-4">
          <AlertasCriticosSection />
        </TabsContent>

        <TabsContent value="resumo" className="mt-4 space-y-8">


      {/* ============= OBRAS CRÍTICAS (resumo curto) ============= */}
      <AlertasCriticosSection limit={9} />

      {/* ============= INDICADORES DE QUALIDADE ============= */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" /> Indicadores de Qualidade
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KpiCard label={qualityKpis.vt.label} num={qualityKpis.vt.num} den={qualityKpis.vt.den} icon={Search} />
          <KpiCard label={qualityKpis.cron.label} num={qualityKpis.cron.num} den={qualityKpis.cron.den} icon={Calendar} />
          <KpiCard label={qualityKpis.budget.label} num={qualityKpis.budget.num} den={qualityKpis.budget.den} icon={Wallet} />
          <KpiCard label={qualityKpis.chk.label} num={qualityKpis.chk.num} den={qualityKpis.chk.den} icon={CheckCircle2} />
        </div>
      </section>

      {/* Termômetro removido — unificado em "Status das Lojas" abaixo. */}

      {/* ============= PRÓXIMAS INAUGURAÇÕES ============= */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" /> Próximas Inaugurações (90 dias)
        </h2>
        {upcoming.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nenhuma inauguração nos próximos 90 dias.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              {/* timeline track */}
              <div className="relative">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
                <div className="overflow-x-auto pb-2">
                  <div className="relative flex gap-4 min-w-max px-1 py-6">
                    {upcoming.map((m) => {
                      const tone: Sem = m.pct >= 70 ? "green" : m.pct >= 40 ? "amber" : "red";
                      return (
                        <button
                          key={m.store.id}
                          onClick={() => goToStore(m.store.id)}
                          className={`flex flex-col items-center w-40 shrink-0 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${semBg[tone]}`}
                        >
                          <span className="text-[11px] font-semibold mb-1">{m.inaugDate?.toLocaleDateString("pt-BR")}</span>
                          <span className="text-xs font-bold truncate w-full text-center">{m.store.nome}</span>
                          <span className="text-[10px] opacity-80 truncate w-full text-center">{m.store.analistaObra || "—"}</span>
                          <span className="text-[11px] font-bold mt-1">{m.pct}%</span>
                          <span className="text-[10px] opacity-80">em {m.days}d</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* KPI mini-dashboard (mantido) */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Lojas ativas</span>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{lojasAtivas}</p>
            <p className="text-xs text-muted-foreground mt-1">{stores.length} no total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Inauguradas no mês</span>
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
            </div>
            <p className="text-3xl font-bold">{inauguradasMes}</p>
            <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Tarefas urgentes</span>
              <AlertTriangle className={`h-4 w-4 ${urgentes > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            <p className={`text-3xl font-bold ${urgentes > 0 ? "text-destructive" : ""}`}>{urgentes}</p>
            <p className="text-xs text-muted-foreground mt-1">{pendingTasks + inProgressTasks} abertas</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Progresso geral</span>
              <Target className="h-4 w-4" style={{ color: progressColor }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: progressColor }}>{overallProgress}%</p>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${overallProgress}%`, background: progressColor }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Checklists das lojas</p>
          </CardContent>
        </Card>
      </section>

      {/* Module cards (4-col grid) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Módulos</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {navCards.map((c) => (
            <button
              key={c.url}
              onClick={() => navigate(c.url)}
              className="group text-left bg-card border rounded-xl p-4 hover:border-[hsl(var(--accent))] hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-[hsl(var(--accent))]/15 flex items-center justify-center">
                  <c.icon className="h-4 w-4 text-[hsl(var(--accent))]" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-[hsl(var(--accent))]" />
              </div>
              <p className="font-semibold text-sm">{c.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Store summary */}
      {stores.length > 0 && <StoreSummarySection
        stores={stores}
        inauguradasFiliais={inauguradasFiliais}
        showReformas={showReformas}
        setShowReformas={setShowReformas}
        navigate={navigate}
      />}

      {/* Tasks panel */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><ListTodo className="h-5 w-5" /> Tarefas</h2>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/equipe")}>Ver Todas <ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground mb-1">Pendentes</p><p className="text-2xl font-bold text-[hsl(var(--accent))]">{pendingTasks}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground mb-1">Em Andamento</p><p className="text-2xl font-bold text-primary">{inProgressTasks}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-sm text-muted-foreground mb-1">Concluídas</p><p className="text-2xl font-bold text-[hsl(var(--success))]">{completedTasks}</p></CardContent></Card>
        </div>
        {tasks.length > 0 && (
          <Card><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>Tarefa</TableHead><TableHead>Responsável</TableHead><TableHead>Início</TableHead>
              <TableHead>Prazo</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {tasks.slice(0, 8).map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium text-sm">{task.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getMemberName(task.assigned_to)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(task.start_date)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(task.due_date)}</TableCell>
                  <TableCell><Badge className={`${priorityColors[task.priority]} text-[10px]`}>{priorityLabels[task.priority]}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{statusLabels[task.status]}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div></Card>
        )}
      </section>
        </TabsContent>
      </Tabs>
    </div>
  );
};


export default Index;
