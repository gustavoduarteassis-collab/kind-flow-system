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
import {
  Building2, ClipboardCheck, Users, ListTodo, Target,
  ChevronRight, LogOut, Store,
} from "lucide-react";

type Task = {
  id: string; title: string; status: string; priority: string;
  assigned_to: string | null; due_date: string | null;
};
type TeamMember = { id: string; name: string };
type Habit = { id: string; name: string };

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

const Index = () => {
  const { stores } = useStores();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [t, m, h] = await Promise.all([
      supabase.from("tasks").select("id, title, status, priority, assigned_to, due_date").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("team_members").select("id, name").eq("user_id", user.id),
      supabase.from("habits").select("id, name").eq("user_id", user.id),
    ]);
    if (t.data) setTasks(t.data);
    if (m.data) setMembers(m.data);
    if (h.data) setHabits(h.data);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Store summary
  const getStoreStatusSummary = () => {
    const summary: Partial<Record<StatusType, number>> = {};
    stores.forEach((store) => {
      Object.values(store.checklist).forEach((c) => {
        summary[c.status] = (summary[c.status] || 0) + 1;
      });
    });
    return summary;
  };

  const totalItems = stores.length * checklistCategories.flatMap((c) => c.items).length;
  const statusSummary = getStoreStatusSummary();
  const doneItems = (statusSummary["REALIZADO"] || 0) + (statusSummary["NÃO SE APLICA"] || 0);
  const overallProgress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const pendingTasks = tasks.filter((t) => t.status === "pendente").length;
  const inProgressTasks = tasks.filter((t) => t.status === "em_andamento").length;
  const completedTasks = tasks.filter((t) => t.status === "concluida").length;

  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";

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
        {/* Quick navigation cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 group"
            onClick={() => navigate("/lojas")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Lojas</p>
                <p className="text-2xl font-bold">{stores.length}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 group"
            onClick={() => navigate("/equipe")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-[hsl(var(--accent))]/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-[hsl(var(--accent))]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Equipe</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 group"
            onClick={() => navigate("/equipe")}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-[hsl(var(--success))]/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-[hsl(var(--success))]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Hábitos</p>
                <p className="text-2xl font-bold">{habits.length}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </div>

        {/* Store overview dashboard */}
        {stores.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Resumo das Lojas</h2>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/lojas")}>
                Ver Todas <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Progresso Geral</p>
                  <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
                  <Progress value={overallProgress} className="h-2 mt-2" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Realizados</p>
                  <p className="text-3xl font-bold text-[hsl(var(--success))]">{statusSummary["REALIZADO"] || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Atrasados</p>
                  <p className="text-3xl font-bold text-destructive">{statusSummary["ATRASADO"] || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Não Iniciados</p>
                  <p className="text-3xl font-bold text-muted-foreground">{statusSummary["NÃO INICIADO"] || 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Per-store mini cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stores.slice(0, 6).map((store) => {
                const total = checklistCategories.flatMap((c) => c.items).length;
                const done = Object.values(store.checklist).filter(
                  (c) => c.status === "REALIZADO" || c.status === "NÃO SE APLICA"
                ).length;
                const pct = Math.round((done / total) * 100);
                const delayed = Object.values(store.checklist).filter((c) => c.status === "ATRASADO").length;
                return (
                  <Card key={store.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/loja/${store.id}`)}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{store.nome}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                        </div>
                      </div>
                      {delayed > 0 && (
                        <Badge variant="destructive" className="text-xs">! {delayed}</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Tasks summary */}
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
            <div className="space-y-2">
              {tasks.slice(0, 5).map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={`${priorityColors[task.priority]} text-[10px] shrink-0`}>
                        {priorityLabels[task.priority]}
                      </Badge>
                      <span className="text-sm font-medium truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.assigned_to && (
                        <span className="text-xs text-muted-foreground">{getMemberName(task.assigned_to)}</span>
                      )}
                      <Badge variant="outline" className="text-[10px]">{statusLabels[task.status]}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
