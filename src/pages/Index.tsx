import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { checklistCategories, StatusType } from "@/data/checklistData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Building2, Users, ListTodo, Target, ChevronRight, GitBranch, DollarSign, FolderOpen,
  Eye, EyeOff, AlertTriangle, CheckCircle2, Sparkles, KeyRound,
} from "lucide-react";
import { useUserDisplayName } from "@/hooks/useUserDisplayName";
import { usePageTitle } from "@/hooks/usePageTitle";
import { buildInauguradasFiliais } from "@/utils/inauguradaFilter";

type Task = {
  id: string; title: string; status: string; priority: string;
  assigned_to: string | null; due_date: string | null; start_date: string | null;
};
type TeamMember = { id: string; name: string };

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

const Index = () => {
  usePageTitle("Painel Executivo");
  const { stores } = useStores();
  const navigate = useNavigate();
  const { name } = useUserDisplayName();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inauguradasFiliais, setInauguradasFiliais] = useState<Set<string>>(new Set());
  const [inauguradasMes, setInauguradasMes] = useState(0);
  const [showReformas, setShowReformas] = useState(false);

  const fetchData = useCallback(async () => {
    const [t, m, ps] = await Promise.all([
      supabase.from("tasks").select("id, title, status, priority, assigned_to, due_date, start_date").order("created_at", { ascending: false }).limit(10),
      supabase.from("team_members").select("id, name"),
      supabase.from("pipeline_stores").select("filial, status_geral, data_inauguracao"),
    ]);
    if (t.data) setTasks(t.data as Task[]);
    if (m.data) setMembers(m.data);
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

  const totalItems = stores.length * checklistCategories.flatMap((c) => c.items).length;
  const statusSummary = useMemo(() => {
    const s: Partial<Record<StatusType, number>> = {};
    stores.forEach((store) => Object.values(store.checklist).forEach((c) => { s[c.status] = (s[c.status] || 0) + 1; }));
    return s;
  }, [stores]);
  const doneItems = (statusSummary["REALIZADO"] || 0) + (statusSummary["NÃO SE APLICA"] || 0);
  const overallProgress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const progressColor = overallProgress >= 80 ? "hsl(var(--success))" : overallProgress >= 50 ? "hsl(var(--accent))" : "hsl(var(--destructive))";

  const lojasAtivas = stores.filter((s) => !s.filial || !inauguradasFiliais.has(String(s.filial))).length;
  const urgentes = tasks.filter((t) => t.priority === "urgente" && t.status !== "concluida" && t.status !== "cancelada").length;
  const pendingTasks = tasks.filter((t) => t.status === "pendente").length;
  const inProgressTasks = tasks.filter((t) => t.status === "em_andamento").length;
  const completedTasks = tasks.filter((t) => t.status === "concluida").length;

  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Olá, {name?.split(" ")[0] || "bem-vindo"} 👋</h1>
        <p className="text-sm text-muted-foreground">Visão executiva da operação de implantação.</p>
      </div>

      {/* KPI mini-dashboard */}
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
    </div>
  );
};

export default Index;
