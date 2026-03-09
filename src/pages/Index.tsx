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
  Building2, ClipboardCheck, Users, ListTodo, Target,
  ChevronRight, LogOut, Calendar, KeyRound, Plus, Trash2,
} from "lucide-react";
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
  can_view_diario: boolean; can_view_custos: boolean;
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
  "NÃO INICIADO": "bg-muted text-muted-foreground",
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
    store_id: "", franchisee_email: "",
    can_view_checklist: true, can_edit_checklist: true,
    can_view_cronograma: true, can_edit_cronograma: true,
    can_view_diario: true, can_view_custos: true,
  });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [t, m, h, fa] = await Promise.all([
      supabase.from("tasks").select("id, title, status, priority, assigned_to, due_date, start_date").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("team_members").select("id, name").eq("user_id", user.id),
      supabase.from("habits").select("id, name").eq("user_id", user.id),
      supabase.from("franchisee_access").select("*").eq("created_by", user.id),
    ]);
    if (t.data) setTasks(t.data as Task[]);
    if (m.data) setMembers(m.data);
    if (h.data) setHabits(h.data);
    if (fa.data) setFranchiseeAccess(fa.data as FranchiseeAccess[]);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalItems = stores.length * checklistCategories.flatMap((c) => c.items).length;
  const getStoreStatusSummary = () => {
    const summary: Partial<Record<StatusType, number>> = {};
    stores.forEach((store) => {
      Object.values(store.checklist).forEach((c) => {
        summary[c.status] = (summary[c.status] || 0) + 1;
      });
    });
    return summary;
  };
  const statusSummary = getStoreStatusSummary();
  const doneItems = (statusSummary["REALIZADO"] || 0) + (statusSummary["NÃO SE APLICA"] || 0);
  const overallProgress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

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
      can_view_checklist: accessForm.can_view_checklist,
      can_edit_checklist: accessForm.can_edit_checklist,
      can_view_cronograma: accessForm.can_view_cronograma,
      can_edit_cronograma: accessForm.can_edit_cronograma,
      can_view_diario: accessForm.can_view_diario,
      can_view_custos: accessForm.can_view_custos,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Acesso liberado!", description: `Franqueado ${accessForm.franchisee_email} vinculado à loja.` });
    setAccessForm({
      store_id: "", franchisee_email: "",
      can_view_checklist: true, can_edit_checklist: true,
      can_view_cronograma: true, can_edit_cronograma: true,
      can_view_diario: true, can_view_custos: true,
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
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Gestão de Obra</h1>
                <p className="text-sm text-muted-foreground">Painel Principal</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick navigation */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Lojas", count: stores.length, icon: Building2, path: "/lojas", color: "bg-primary/10 text-primary" },
            { label: "Equipe", count: members.length, icon: Users, path: "/equipe", color: "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]" },
            { label: "Hábitos", count: habits.length, icon: Target, path: "/equipe", color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
            { label: "Calendário", count: null, icon: Calendar, path: "/equipe", color: "bg-primary/10 text-primary" },
          ].map((item) => (
            <Card key={item.label} className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 group" onClick={() => navigate(item.path)}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  {item.count !== null && <p className="text-2xl font-bold">{item.count}</p>}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Store summary table */}
        {stores.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resumo das Lojas</h2>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/lojas")}>
                Ver Todas <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Card className="mb-4">
              <CardContent className="p-4 flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Progresso Geral</p>
                  <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
                </div>
                <Progress value={overallProgress} className="h-2 flex-1" />
              </CardContent>
            </Card>

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
                      const total = checklistCategories.flatMap((c) => c.items).length;
                      const counts: Partial<Record<StatusType, number>> = {};
                      Object.values(store.checklist).forEach((c) => {
                        counts[c.status] = (counts[c.status] || 0) + 1;
                      });
                      const done = (counts["REALIZADO"] || 0) + (counts["NÃO SE APLICA"] || 0);
                      const pct = Math.round((done / total) * 100);
                      const inProgress = (counts["EM COTAÇÃO"] || 0) + (counts["EM TRANSPORTE"] || 0) + (counts["EM ELABORAÇÃO"] || 0) + (counts["EM ANÁLISE"] || 0) + (counts["EM CONTRATAÇÃO"] || 0) + (counts["CONSTRUTORA"] || 0);
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
                              <Progress value={pct} className="h-1.5 w-16" />
                              <span className="text-xs font-semibold">{pct}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-xs">{counts["REALIZADO"] || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {(counts["ATRASADO"] || 0) > 0
                              ? <Badge variant="destructive" className="text-xs">{counts["ATRASADO"]}</Badge>
                              : <span className="text-xs text-muted-foreground">0</span>
                            }
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-muted-foreground">{counts["NÃO INICIADO"] || 0}</span>
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
      </main>
    </div>
  );
};

export default Index;
