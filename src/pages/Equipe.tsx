import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  ArrowLeft, Plus, Users, ListTodo, Target, Trash2, Edit, LogOut,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

type TeamMember = {
  id: string; name: string; role: string; email: string | null; phone: string | null;
};
type Task = {
  id: string; title: string; description: string | null; status: string;
  priority: string; assigned_to: string | null; due_date: string | null;
};
type Habit = { id: string; name: string; description: string | null };
type HabitCompletion = {
  id: string; habit_id: string; team_member_id: string; completion_date: string; completed: boolean;
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente", em_andamento: "Em Andamento", concluida: "Concluída", cancelada: "Cancelada",
};
const statusColors: Record<string, string> = {
  pendente: "bg-secondary text-secondary-foreground",
  em_andamento: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  concluida: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  cancelada: "bg-muted text-muted-foreground",
};
const priorityLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};
const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-secondary text-secondary-foreground",
  alta: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  urgente: "bg-destructive text-destructive-foreground",
};

const Equipe = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Dialogs
  const [memberOpen, setMemberOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", role: "", email: "", phone: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "media", assigned_to: "", due_date: "" });
  const [habitForm, setHabitForm] = useState({ name: "", description: "" });

  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [m, t, h, c] = await Promise.all([
      supabase.from("team_members").select("*").eq("user_id", user.id).order("name"),
      supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("habits").select("*").eq("user_id", user.id).order("name"),
      supabase.from("habit_completions").select("*").eq("user_id", user.id)
        .gte("completion_date", format(weekStart, "yyyy-MM-dd"))
        .lte("completion_date", format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd")),
    ]);
    if (m.data) setMembers(m.data);
    if (t.data) setTasks(t.data);
    if (h.data) setHabits(h.data);
    if (c.data) setCompletions(c.data);
  }, [user, weekStart]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addMember = async () => {
    if (!user || !memberForm.name) return;
    const { error } = await supabase.from("team_members").insert({
      user_id: user.id, name: memberForm.name, role: memberForm.role,
      email: memberForm.email || null, phone: memberForm.phone || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setMemberForm({ name: "", role: "", email: "", phone: "" });
    setMemberOpen(false);
    fetchAll();
  };

  const deleteMember = async (id: string) => {
    await supabase.from("team_members").delete().eq("id", id);
    fetchAll();
  };

  const addTask = async () => {
    if (!user || !taskForm.title) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title: taskForm.title, description: taskForm.description || null,
      priority: taskForm.priority as any, assigned_to: taskForm.assigned_to || null,
      due_date: taskForm.due_date || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setTaskForm({ title: "", description: "", priority: "media", assigned_to: "", due_date: "" });
    setTaskOpen(false);
    fetchAll();
  };

  const updateTaskStatus = async (id: string, status: string) => {
    await supabase.from("tasks").update({ status: status as any }).eq("id", id);
    fetchAll();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    fetchAll();
  };

  const addHabit = async () => {
    if (!user || !habitForm.name) return;
    const { error } = await supabase.from("habits").insert({
      user_id: user.id, name: habitForm.name, description: habitForm.description || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setHabitForm({ name: "", description: "" });
    setHabitOpen(false);
    fetchAll();
  };

  const deleteHabit = async (id: string) => {
    await supabase.from("habits").delete().eq("id", id);
    fetchAll();
  };

  const toggleCompletion = async (habitId: string, memberId: string, date: string) => {
    if (!user) return;
    const existing = completions.find(
      (c) => c.habit_id === habitId && c.team_member_id === memberId && c.completion_date === date
    );
    if (existing) {
      await supabase.from("habit_completions").delete().eq("id", existing.id);
    } else {
      await supabase.from("habit_completions").insert({
        user_id: user.id, habit_id: habitId, team_member_id: memberId, completion_date: date,
      });
    }
    fetchAll();
  };

  const isCompleted = (habitId: string, memberId: string, date: string) => {
    return completions.some(
      (c) => c.habit_id === habitId && c.team_member_id === memberId && c.completion_date === date
    );
  };

  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";

  const tasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Painel da Equipe</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="equipe">
          <TabsList className="mb-6">
            <TabsTrigger value="equipe" className="gap-2"><Users className="h-4 w-4" /> Equipe</TabsTrigger>
            <TabsTrigger value="tarefas" className="gap-2"><ListTodo className="h-4 w-4" /> Tarefas</TabsTrigger>
            <TabsTrigger value="habitos" className="gap-2"><Target className="h-4 w-4" /> Hábitos</TabsTrigger>
          </TabsList>

          {/* === EQUIPE === */}
          <TabsContent value="equipe">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Membros da Equipe</h2>
              <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Adicionar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Membro</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label>Nome *</Label>
                      <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>Cargo</Label>
                      <Input value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>E-mail</Label>
                      <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>Telefone</Label>
                      <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} />
                    </div>
                    <Button onClick={addMember} className="w-full">Adicionar Membro</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {members.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum membro cadastrado</CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((m) => (
                  <Card key={m.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{m.name}</CardTitle>
                          {m.role && <p className="text-sm text-muted-foreground">{m.role}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Excluir?")) deleteMember(m.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                      {m.email && <p>{m.email}</p>}
                      {m.phone && <p>{m.phone}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* === TAREFAS === */}
          <TabsContent value="tarefas">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Tarefas ({tasks.length})</h2>
              <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Tarefa</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label>Título *</Label>
                      <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>Descrição</Label>
                      <Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>Prioridade</Label>
                      <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Responsável</Label>
                      <Select value={taskForm.assigned_to} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Prazo</Label>
                      <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                    </div>
                    <Button onClick={addTask} className="w-full">Criar Tarefa</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(["pendente", "em_andamento", "concluida", "cancelada"] as const).map((status) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
                    <span className="text-sm text-muted-foreground">({tasksByStatus(status).length})</span>
                  </div>
                  <div className="space-y-2">
                    {tasksByStatus(status).map((task) => (
                      <Card key={task.id} className="group">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium">{task.title}</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => deleteTask(task.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${priorityColors[task.priority]} text-[10px]`}>{priorityLabels[task.priority]}</Badge>
                            {task.assigned_to && <span className="text-[10px] text-muted-foreground">{getMemberName(task.assigned_to)}</span>}
                            {task.due_date && <span className="text-[10px] text-muted-foreground">{new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                          </div>
                          <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* === HÁBITOS === */}
          <TabsContent value="habitos">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Hábitos Diários</h2>
              <Dialog open={habitOpen} onOpenChange={setHabitOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Hábito</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Hábito</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label>Nome *</Label>
                      <Input value={habitForm.name} onChange={(e) => setHabitForm({ ...habitForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>Descrição</Label>
                      <Textarea value={habitForm.description} onChange={(e) => setHabitForm({ ...habitForm, description: e.target.value })} />
                    </div>
                    <Button onClick={addHabit} className="w-full">Criar Hábito</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Week navigation */}
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => subDays(w, 7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {format(weekStart, "dd MMM", { locale: ptBR })} — {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "dd MMM yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addDays(w, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {habits.length === 0 || members.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {members.length === 0
                    ? "Cadastre membros da equipe primeiro na aba Equipe"
                    : "Nenhum hábito cadastrado"}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {habits.map((habit) => (
                  <Card key={habit.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-base">{habit.name}</CardTitle>
                          {habit.description && <p className="text-xs text-muted-foreground">{habit.description}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Excluir?")) deleteHabit(habit.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[120px]">Membro</TableHead>
                              {weekDays.map((day) => (
                                <TableHead key={day.toISOString()} className="text-center w-16">
                                  <div className="text-[10px] uppercase">{format(day, "EEE", { locale: ptBR })}</div>
                                  <div className="text-xs">{format(day, "dd")}</div>
                                </TableHead>
                              ))}
                              <TableHead className="text-center w-16">%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members.map((member) => {
                              const doneCount = weekDays.filter((d) =>
                                isCompleted(habit.id, member.id, format(d, "yyyy-MM-dd"))
                              ).length;
                              const pct = Math.round((doneCount / 7) * 100);
                              return (
                                <TableRow key={member.id}>
                                  <TableCell className="text-sm font-medium">{member.name}</TableCell>
                                  {weekDays.map((day) => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const done = isCompleted(habit.id, member.id, dateStr);
                                    return (
                                      <TableCell key={dateStr} className="text-center">
                                        <Checkbox
                                          checked={done}
                                          onCheckedChange={() => toggleCompletion(habit.id, member.id, dateStr)}
                                        />
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="text-center">
                                    <Badge variant={pct >= 80 ? "default" : pct >= 50 ? "secondary" : "outline"} className="text-xs">
                                      {pct}%
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Equipe;
