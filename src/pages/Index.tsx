import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStores } from "@/hooks/useStores";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { checklistCategories, StatusType } from "@/data/checklistData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, Users, ListTodo, Target,
  ChevronRight, LogOut, Calendar, KeyRound, Plus, Trash2, GitBranch, DollarSign, FolderOpen, HardHat
} from "lucide-react";
import logoConstance from "@/assets/logo-constance.svg";
import { useToast } from "@/hooks/use-toast";

type Task = {
  id: string; title: string; status: string; priority: string;
  assigned_to: string | null; due_date: string | null; start_date: string | null;
};
type TeamMember = { id: string; name: string };
type Habit = { id: string; name: string };
type FranchiseeAccess = {
  id: string; store_id: string; franchisee_email: string;
  can_view_checklist: boolean; can_edit_checklist: boolean;
  can_view_cronograma: boolean; can_edit_cronograma: boolean;
  can_view_diario: boolean; can_edit_diario: boolean;
  can_view_custos: boolean; can_edit_custos: boolean;
  access_type: string;
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente", em_andamento: "Em Andamento", concluida: "Concluída", cancelada: "Cancelada",
};
const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-secondary text-secondary-foreground",
  alta: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  urgente: "bg-destructive text-destructive-foreground",
};
const priorityLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};

const statusColors: Record<string, string> = {
  "NÃO REALIZADO": "bg-muted text-muted-foreground",
  "EM COTAÇÃO": "bg-secondary text-secondary-foreground",
  "EM TRANSPORTE": "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  "REALIZADO": "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  "ATRASADO": "bg-destructive text-destructive-foreground",
  "NÃO SE APLICA": "bg-muted text-muted-foreground",
  "CONSTRUTORA": "bg-primary text-primary-foreground",
  "EM ELABORAÇÃO": "bg-secondary text-secondary-foreground",
  "EM ANÁLISE": "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  "EM CONTRATAÇÃO": "bg-secondary text-secondary-foreground",
};

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
};

const Index = () => {
  const { stores } = useStores();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [franchiseeAccess, setFranchiseeAccess] = useState<FranchiseeAccess[]>([]);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessForm, setAccessForm] = useState({
    store_id: "", franchisee_email: "", access_type: "franqueado",
    can_view_checklist: true, can_edit_checklist: true,
    can_view_cronograma: true, can_edit_cronograma: true,
    can_view_diario: true, can_edit_diario: true,
    can_view_custos: true, can_edit_custos: true,
  });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [t, m, h, fa] = await Promise.all([
      supabase.from("tasks").select("id, title, status, priority, assigned_to, due_date, start_date").order("created_at", { ascending: false }).limit(10),
      supabase.from("team_members").select("id, name"),
      supabase.from("habits").select("id, name"),
      supabase.from("franchisee_access").select("*"),
    ]);
    if (t.data) setTasks(t.data as Task[]);
    if (m.data) setMembers(m.data);
    if (h.data) setHabits(h.data);
    if (fa.data) setFranchiseeAccess(fa.data as FranchiseeAccess[]);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allChecklistItems = checklistCategories.flatMap((c) => c.items);
  
  const getOverallStats = () => {
    let totalApplicable = 0;
    let totalDone = 0;
    
    stores.forEach((store) => {
      allChecklistItems.forEach((item) => {
        const itemData = store.checklist[item.id];
        if (itemData && itemData.status !== "NÃO SE APLICA") {
          totalApplicable++;
          if (itemData.status === "REALIZADO") {
            totalDone++;
          }
        }
      });
    });
    
    const progress = totalApplicable > 0 ? Math.round((totalDone / totalApplicable) * 100) : 0;
    return { totalApplicable, totalDone, progress };
  };

  const { progress: overallProgress } = getOverallStats();

  const pendingTasks = tasks.filter((t) => t.status === "pendente").length;
  const inProgressTasks = tasks.filter((t) => t.status === "em_andamento").length;
  const completedTasks = tasks.filter((t) => t.status === "concluida").length;

  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";
  const getStoreName = (storeId: string) => stores.find((s) => s.id === storeId)?.nome || storeId;

  const addAccess = async () => {
    if (!user || !accessForm.store_id || !accessForm.franchisee_email) return;
    const { error } = await supabase.from("franchisee_access").insert({
      store_id: accessForm.store_id,
      franchisee_email: accessForm.franchisee_email.toLowerCase(),
      created_by: user.id,
      access_type: accessForm.access_type,
      can_view_checklist: accessForm.can_view_checklist,
      can_edit_checklist: accessForm.can_edit_checklist,
      can_view_cronograma: accessForm.can_view_cronograma,
      can_edit_cronograma: accessForm.can_edit_cronograma,
      can_view_diario: accessForm.can_view_diario,
      can_edit_diario: accessForm.can_edit_diario,
      can_view_custos: accessForm.can_view_custos,
      can_edit_custos: accessForm.can_edit_custos,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Acesso liberado!", description: `O e-mail ${accessForm.franchisee_email} já pode criar uma conta e acessar o portal.` });
    setAccessForm({
      store_id: "", franchisee_email: "", access_type: "franqueado",
      can_view_checklist: true, can_edit_checklist: true,
      can_view_cronograma: true, can_edit_cronograma: true,
      can_view_diario: true, can_edit_diario: true,
      can_view_custos: true, can_edit_custos: true,
    });
    setAccessOpen(false);
    fetchData();
  };

  const deleteAccess = async (id: string) => {
    await supabase.from("franchisee_access").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden" style={{
        background: `linear-gradient(135deg, hsl(25,40%,12%) 0%, hsl(25,35%,18%) 40%, hsl(30,30%,24%) 100%)`,
      }}>
        {/* Gold accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[hsl(38,70%,50%)] to-transparent" />
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2l2 3-2 3z'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
              <img src={logoConstance} alt="Constance" className="h-12 brightness-0 invert opacity-90" />
              <div className="h-10 w-px bg-[hsl(38,70%,50%)]/30" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Gestão de Obra</h1>
                <p className="text-sm text-[hsl(38,70%,50%)]/70 font-medium tracking-wide uppercase">Painel Executivo</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2.5 bg-white/8 border border-white/10 rounded-lg px-3.5 py-2">
                  <div className="h-8 w-8 rounded-full bg-[hsl(38,70%,50%)]/20 border border-[hsl(38,70%,50%)]/30 flex items-center justify-center text-xs font-bold text-[hsl(38,70%,50%)]">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-white/70">{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 gap-2" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              </div>
            )}
          </div>

          {/* Hero Navigation + KPIs */}
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-7">
            {/* Navigation cards */}
            <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-xl p-5 group hover:bg-white/[0.12] transition-all cursor-pointer" onClick={() => navigate("/pipeline")}>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[hsl(38,70%,50%)]/15 flex items-center justify-center">
                  <GitBranch className="h-5 w-5 text-[hsl(38,70%,50%)]" />
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[hsl(38,70%,50%)]/60 transition-colors" />
              </div>
              <p className="text-lg font-bold text-white">Funil de Lojas</p>
              <p className="text-xs text-white/40 mt-0.5">Pipeline de implantação</p>
            </div>
            <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-xl p-5 group hover:bg-white/[0.12] transition-all cursor-pointer" onClick={() => navigate("/lojas")}>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[hsl(38,70%,50%)]/15 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[hsl(38,70%,50%)]" />
                </div>
                <span className="text-2xl font-bold text-white">{stores.length}</span>
              </div>
              <p className="text-lg font-bold text-white">Lojas</p>
              <p className="text-xs text-white/40 mt-0.5">Gestão de lojas ativas</p>
            </div>
            <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-xl p-5 group hover:bg-white/[0.12] transition-all cursor-pointer" onClick={() => navigate("/custos-geral")}>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[hsl(38,70%,50%)]/15 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-[hsl(38,70%,50%)]" />
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[hsl(38,70%,50%)]/60 transition-colors" />
              </div>
              <p className="text-lg font-bold text-white">Custos Geral</p>
              <p className="text-xs text-white/40 mt-0.5">Visão consolidada</p>
            </div>
            <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-xl p-5 group hover:bg-white/[0.12] transition-all cursor-pointer" onClick={() => navigate("/diversos")}>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[hsl(38,70%,50%)]/15 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-[hsl(38,70%,50%)]" />
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[hsl(38,70%,50%)]/60 transition-colors" />
              </div>
              <p className="text-lg font-bold text-white">Diversos</p>
              <p className="text-xs text-white/40 mt-0.5">Prospecção & Fornecedores</p>
            </div>
            <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-xl p-5 group hover:bg-white/[0.12] transition-all cursor-pointer" onClick={() => navigate("/agm")}>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <Target className="h-5 w-5 text-destructive" />
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-destructive/60 transition-colors" />
              </div>
              <p className="text-lg font-bold text-white">AGM</p>
              <p className="text-xs text-white/40 mt-0.5">Análise Gerencial Mensal</p>
            </div>
            {/* KPI cards */}
            <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-xl p-5 group hover:bg-white/[0.12] transition-all cursor-pointer" onClick={() => navigate("/equipe")}>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-white/[0.08] flex items-center justify-center">
                  <ListTodo className="h-5 w-5 text-white/70" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white">{pendingTasks + inProgressTasks}</span>
                  {completedTasks > 0 && <span className="text-xs text-[hsl(var(--success))]">+{completedTasks} ✓</span>}
                </div>
              </div>
              <p className="text-lg font-bold text-white">Tarefas</p>
              <p className="text-xs text-white/40 mt-0.5">Abertas e em andamento</p>
            </div>
            <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-xl p-5 group hover:bg-white/[0.12] transition-all cursor-pointer" onClick={() => navigate("/equipe")}>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-white/[0.08] flex items-center justify-center">
                  <Users className="h-5 w-5 text-white/70" />
                </div>
                <span className="text-2xl font-bold text-white">{members.length}</span>
              </div>
              <p className="text-lg font-bold text-white">Equipe</p>
              <p className="text-xs text-white/40 mt-0.5">Time e calendário</p>
            </div>
            <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] rounded-xl p-5 group hover:bg-white/[0.12] transition-all cursor-pointer" onClick={() => navigate("/cronograma-proprias")}>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-[hsl(38,70%,50%)]/15 flex items-center justify-center">
                  <HardHat className="h-5 w-5 text-[hsl(38,70%,50%)]" />
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[hsl(38,70%,50%)]/60 transition-colors" />
              </div>
              <p className="text-lg font-bold text-white">Próprias</p>
              <p className="text-xs text-white/40 mt-0.5">Obras & Reformas Próprias</p>
            </div>
          </div>

          {/* Progress bar */}
          {stores.length > 0 && (
            <div className="mt-6 bg-white/[0.05] rounded-lg p-3 flex items-center gap-4">
              <span className="text-xs text-white/40 shrink-0">Progresso Geral (Checklists)</span>
              <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden flex-1">
                <div className="h-full rounded-full bg-[hsl(var(--success))] transition-all" style={{ width: `${overallProgress}%` }} />
              </div>
              <span className="text-sm font-bold text-white shrink-0">{overallProgress}%</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Store summary table */}
        {stores.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resumo das Lojas</h2>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/lojas")}>
                Ver Todas <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loja</TableHead>
                      <TableHead>Analista</TableHead>
                      <TableHead className="text-center">Progresso</TableHead>
                      <TableHead className="text-center">Realizados</TableHead>
                      <TableHead className="text-center">Atrasados</TableHead>
                      <TableHead className="text-center">Não Iniciados</TableHead>
                      <TableHead className="text-center">Em Andamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => {
                      const applicableItems = allChecklistItems.filter(item => store.checklist[item.id]?.status !== "NÃO SE APLICA");
                      const doneCount = allChecklistItems.filter(item => store.checklist[item.id]?.status === "REALIZADO").length;
                      const progress = applicableItems.length > 0 ? Math.round((doneCount / applicableItems.length) * 100) : 0;
                      const atrasados = allChecklistItems.filter(item => store.checklist[item.id]?.status === "ATRASADO").length;
                      const naoIniciados = allChecklistItems.filter(item => !store.checklist[item.id] || store.checklist[item.id].status === "NÃO REALIZADO").length;
                      const inProgress = allChecklistItems.filter(item => {
                        const status = store.checklist[item.id]?.status;
                        return status && !["REALIZADO", "NÃO SE APLICA", "ATRASADO", "NÃO REALIZADO"].includes(status);
                      }).length;

                      return (
                        <TableRow key={store.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/loja/${store.id}`)}>
                          <TableCell className="font-medium">{store.nome}</TableCell>
                          <TableCell className="text-sm">
                            {store.analistaObra ? (
                              <span
                                className="text-primary cursor-pointer hover:underline"
                                onClick={(e) => { e.stopPropagation(); navigate(`/lojas?analista=${encodeURIComponent(store.analistaObra)}`); }}
                              >
                                {store.analistaObra}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <Progress value={progress} className="h-1.5 w-16" />
                              <span className="text-xs font-semibold">{progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-xs">{doneCount}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {atrasados > 0
                              ? <Badge variant="destructive" className="text-xs">{atrasados}</Badge>
                              : <span className="text-xs text-muted-foreground">0</span>
                            }
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-muted-foreground">{naoIniciados}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-muted-foreground">{inProgress}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>
        )}

        {/* Tasks panel */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListTodo className="h-5 w-5" /> Tarefas
            </h2>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/equipe")}>
              Ver Todas <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-[hsl(var(--accent))]">{pendingTasks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Em Andamento</p>
                <p className="text-2xl font-bold text-primary">{inProgressTasks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Concluídas</p>
                <p className="text-2xl font-bold text-[hsl(var(--success))]">{completedTasks}</p>
              </CardContent>
            </Card>
          </div>

          {tasks.length > 0 && (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarefa</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.slice(0, 8).map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium text-sm">{task.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getMemberName(task.assigned_to)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(task.start_date)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(task.due_date)}</TableCell>
                        <TableCell>
                          <Badge className={`${priorityColors[task.priority]} text-[10px]`}>{priorityLabels[task.priority]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{statusLabels[task.status]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </section>

        {/* Franqueados section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Acesso de Franqueados
            </h2>
            <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Liberar Acesso</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Liberar Acesso</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2"><Label>Tipo de Acesso *</Label>
                    <Select value={accessForm.access_type} onValueChange={(v) => setAccessForm({ ...accessForm, access_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="franqueado">Franqueado</SelectItem>
                        <SelectItem value="construtor">Construtor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>E-mail *</Label>
                    <Input type="email" placeholder="email@exemplo.com" value={accessForm.franchisee_email} onChange={(e) => setAccessForm({ ...accessForm, franchisee_email: e.target.value })} />
                  </div>
                  <div className="space-y-2"><Label>Loja *</Label>
                    <Select value={accessForm.store_id} onValueChange={(v) => setAccessForm({ ...accessForm, store_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione a loja..." /></SelectTrigger>
                      <SelectContent>
                        {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Permissões</Label>
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Checklist</p>
                        <div className="flex items-center gap-2">
                          <Checkbox id="view-checklist" checked={accessForm.can_view_checklist} onCheckedChange={(v) => setAccessForm({ ...accessForm, can_view_checklist: !!v, can_edit_checklist: !v ? false : accessForm.can_edit_checklist })} />
                          <Label htmlFor="view-checklist" className="text-xs">Visualizar</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="edit-checklist" checked={accessForm.can_edit_checklist} disabled={!accessForm.can_view_checklist} onCheckedChange={(v) => setAccessForm({ ...accessForm, can_edit_checklist: !!v })} />
                          <Label htmlFor="edit-checklist" className="text-xs">Editar</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Cronograma</p>
                        <div className="flex items-center gap-2">
                          <Checkbox id="view-cronograma" checked={accessForm.can_view_cronograma} onCheckedChange={(v) => setAccessForm({ ...accessForm, can_view_cronograma: !!v, can_edit_cronograma: !v ? false : accessForm.can_edit_cronograma })} />
                          <Label htmlFor="view-cronograma" className="text-xs">Visualizar</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="edit-cronograma" checked={accessForm.can_edit_cronograma} disabled={!accessForm.can_view_cronograma} onCheckedChange={(v) => setAccessForm({ ...accessForm, can_edit_cronograma: !!v })} />
                          <Label htmlFor="edit-cronograma" className="text-xs">Editar</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Diário de Obra</p>
                        <div className="flex items-center gap-2">
                          <Checkbox id="view-diario" checked={accessForm.can_view_diario} onCheckedChange={(v) => setAccessForm({ ...accessForm, can_view_diario: !!v, can_edit_diario: !v ? false : accessForm.can_edit_diario })} />
                          <Label htmlFor="view-diario" className="text-xs">Visualizar</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="edit-diario" checked={accessForm.can_edit_diario} disabled={!accessForm.can_view_diario} onCheckedChange={(v) => setAccessForm({ ...accessForm, can_edit_diario: !!v })} />
                          <Label htmlFor="edit-diario" className="text-xs">Editar</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Custos</p>
                        <div className="flex items-center gap-2">
                          <Checkbox id="view-custos" checked={accessForm.can_view_custos} onCheckedChange={(v) => setAccessForm({ ...accessForm, can_view_custos: !!v, can_edit_custos: !v ? false : accessForm.can_edit_custos })} />
                          <Label htmlFor="view-custos" className="text-xs">Visualizar</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="edit-custos" checked={accessForm.can_edit_custos} disabled={!accessForm.can_view_custos} onCheckedChange={(v) => setAccessForm({ ...accessForm, can_edit_custos: !!v })} />
                          <Label htmlFor="edit-custos" className="text-xs">Editar</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button onClick={addAccess} className="w-full">Liberar Acesso</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {franchiseeAccess.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Nenhum franqueado com acesso liberado.<br />
              <span className="text-xs">Clique em "Liberar Acesso" para vincular um e-mail a uma loja.</span>
            </CardContent></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Loja Vinculada</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {franchiseeAccess.map((fa) => (
                      <TableRow key={fa.id}>
                        <TableCell>
                          <Badge className={fa.access_type === "construtor" ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] text-[10px]" : "bg-primary text-primary-foreground text-[10px]"}>
                            {fa.access_type === "construtor" ? "Construtor" : "Franqueado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{fa.franchisee_email}</TableCell>
                        <TableCell className="text-sm font-medium">{getStoreName(fa.store_id)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {fa.can_view_checklist && <Badge variant="outline" className="text-[10px]">Checklist {fa.can_edit_checklist ? "✏️" : "👁️"}</Badge>}
                            {fa.can_view_cronograma && <Badge variant="outline" className="text-[10px]">Cronograma {fa.can_edit_cronograma ? "✏️" : "👁️"}</Badge>}
                            {fa.can_view_diario && <Badge variant="outline" className="text-[10px]">Diário {fa.can_edit_diario ? "✏️" : "👁️"}</Badge>}
                            {fa.can_view_custos && <Badge variant="outline" className="text-[10px]">Custos {fa.can_edit_custos ? "✏️" : "👁️"}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Revogar acesso?")) deleteAccess(fa.id); }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
