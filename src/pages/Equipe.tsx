import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  ArrowLeft, Plus, Users, ListTodo, Target, Trash2, LogOut,
  ChevronLeft, ChevronRight, Calendar, KeyRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type TeamMember = {
  id: string; name: string; role: string; email: string | null; phone: string | null;
};
type Task = {
  id: string; title: string; description: string | null; status: string;
  priority: string; assigned_to: string | null; due_date: string | null; start_date: string | null;
};
type Habit = { id: string; name: string; description: string | null };
type HabitCompletion = {
  id: string; habit_id: string; team_member_id: string; completion_date: string; completed: boolean;
};
type TeamEvent = {
  id: string; title: string; event_type: string; event_date: string;
  end_date: string | null; store_name: string | null; team_member_id: string | null; description: string | null; event_time: string | null;
};
type FranchiseeAccess = {
  id: string; store_id: string; franchisee_email: string;
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

const eventTypeLabels: Record<string, string> = {
  checklist: "Checklist", folga: "Folga", implantacao: "Implantação", agm: "AGM", reuniao: "Reunião Semanal", outro: "Outro",
};
const eventTypeColors: Record<string, string> = {
  checklist: "bg-primary text-primary-foreground",
  folga: "bg-muted text-muted-foreground",
  implantacao: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  agm: "bg-destructive text-destructive-foreground",
  reuniao: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  outro: "bg-secondary text-secondary-foreground",
};

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
};

const Equipe = () => {
  const { user, signOut } = useAuth();
  const { stores } = useStores();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [franchiseeAccess, setFranchiseeAccess] = useState<FranchiseeAccess[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Dialogs
  const [memberOpen, setMemberOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", role: "", email: "", phone: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "media", assigned_to: "", due_date: "", start_date: "" });
  const [habitForm, setHabitForm] = useState({ name: "", description: "" });
  const [eventForm, setEventForm] = useState({ title: "", event_type: "outro", event_date: "", end_date: "", store_name: "", team_member_id: "", description: "", event_time: "" });
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [accessForm, setAccessForm] = useState({ store_id: "", franchisee_email: "" });

  // Mon-Fri only
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 4) });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const monthStart = format(startOfMonth(calendarMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(calendarMonth), "yyyy-MM-dd");
    const [m, t, h, c, e, fa] = await Promise.all([
      supabase.from("team_members").select("*").eq("user_id", user.id).order("name"),
      supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("habits").select("*").eq("user_id", user.id).order("name"),
      supabase.from("habit_completions").select("*").eq("user_id", user.id)
        .gte("completion_date", format(weekStart, "yyyy-MM-dd"))
        .lte("completion_date", format(addDays(weekStart, 4), "yyyy-MM-dd")),
      supabase.from("team_events").select("*").eq("user_id", user.id)
        .gte("event_date", monthStart).lte("event_date", monthEnd),
      supabase.from("franchisee_access").select("*").eq("created_by", user.id),
    ]);
    if (m.data) setMembers(m.data);
    if (t.data) setTasks(t.data as Task[]);
    if (h.data) setHabits(h.data);
    if (c.data) setCompletions(c.data);
    if (e.data) setEvents(e.data as TeamEvent[]);
    if (fa.data) setFranchiseeAccess(fa.data as FranchiseeAccess[]);
  }, [user, weekStart, calendarMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // CRUD functions
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
      due_date: taskForm.due_date || null, start_date: taskForm.start_date || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setTaskForm({ title: "", description: "", priority: "media", assigned_to: "", due_date: "", start_date: "" });
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

  const addEvent = async () => {
    if (!user || !eventForm.title || !eventForm.event_date) return;
    const { error } = await supabase.from("team_events").insert({
      user_id: user.id, title: eventForm.title, event_type: eventForm.event_type,
      event_date: eventForm.event_date, end_date: eventForm.end_date || null,
      store_name: eventForm.store_name || null,
      team_member_id: eventForm.team_member_id || null,
      description: eventForm.description || null,
      event_time: eventForm.event_time || null,
    } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setEventForm({ title: "", event_type: "outro", event_date: "", end_date: "", store_name: "", team_member_id: "", description: "", event_time: "" });
    setEventOpen(false);
    fetchAll();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("team_events").delete().eq("id", id);
    fetchAll();
  };

  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";

  const addAccess = async () => {
    if (!user || !accessForm.store_id || !accessForm.franchisee_email) return;
    const { error } = await supabase.from("franchisee_access").insert({
      store_id: accessForm.store_id,
      franchisee_email: accessForm.franchisee_email.toLowerCase(),
      created_by: user.id,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Acesso liberado!", description: `Franqueado ${accessForm.franchisee_email} vinculado à loja.` });
    setAccessForm({ store_id: "", franchisee_email: "" });
    setAccessOpen(false);
    fetchAll();
  };

  const deleteAccess = async (id: string) => {
    await supabase.from("franchisee_access").delete().eq("id", id);
    fetchAll();
  };

  const getStoreName = (storeId: string) => stores.find((s) => s.id === storeId)?.nome || storeId;

  // Calendar helpers
  const monthDays = eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) });
  const firstDayOfWeek = getDay(startOfMonth(calendarMonth));
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Build virtual events from all data sources (only scheduled/agendado items)
  type CalendarEvent = { id: string; title: string; event_type: string; date: Date; deletable: boolean; originalId?: string; time?: string | null };
  const allCalendarEvents: CalendarEvent[] = [];

  // 1. Team events (manually created in calendar) - expand date ranges
  events.forEach((e) => {
    const start = new Date(e.event_date + "T00:00:00");
    const end = e.end_date ? new Date(e.end_date + "T00:00:00") : start;
    const days = eachDayOfInterval({ start, end });
    days.forEach((day) => {
      allCalendarEvents.push({ id: `${e.id}-${day.toISOString()}`, title: e.title, event_type: e.event_type, date: day, deletable: true, originalId: e.id, time: e.event_time });
    });
  });

  // 2. Store inaugurations
  stores.forEach((s) => {
    if (s.inauguracao) {
      allCalendarEvents.push({ id: `inaug-${s.id}`, title: `Inauguração: ${s.nome}`, event_type: "implantacao", date: new Date(s.inauguracao + "T00:00:00"), deletable: false });
    }
  });

  // 3. Cronograma dates from stores
  stores.forEach((s) => {
    const cron = s.cronograma as any;
    if (cron?.itemDates) {
      Object.entries(cron.itemDates as Record<string, { inicio: string; fim: string }>).forEach(([itemId, dates]) => {
        if (dates.inicio) {
          allCalendarEvents.push({ id: `cron-ini-${s.id}-${itemId}`, title: `${s.nome} - ${itemId} início`, event_type: "checklist", date: new Date(dates.inicio + "T00:00:00"), deletable: false });
        }
        if (dates.fim) {
          allCalendarEvents.push({ id: `cron-fim-${s.id}-${itemId}`, title: `${s.nome} - ${itemId} término`, event_type: "checklist", date: new Date(dates.fim + "T00:00:00"), deletable: false });
        }
      });
    }
  });

  // 4. Checklist dates from stores (only items with dates filled)
  stores.forEach((s) => {
    const cl = s.checklist as any;
    if (cl) {
      Object.entries(cl).forEach(([itemId, data]: [string, any]) => {
        if (data?.prazoInicial) {
          allCalendarEvents.push({ id: `cl-ini-${s.id}-${itemId}`, title: `${s.nome} - Item ${itemId} início`, event_type: "checklist", date: new Date(data.prazoInicial + "T00:00:00"), deletable: false });
        }
        if (data?.prazoFinal) {
          allCalendarEvents.push({ id: `cl-fim-${s.id}-${itemId}`, title: `${s.nome} - Item ${itemId} prazo`, event_type: "checklist", date: new Date(data.prazoFinal + "T00:00:00"), deletable: false });
        }
      });
    }
  });

  const getEventsForDate = (date: Date) => allCalendarEvents.filter((e) => isSameDay(e.date, date));

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
        <Tabs defaultValue="tarefas">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="tarefas" className="gap-2"><ListTodo className="h-4 w-4" /> Tarefas</TabsTrigger>
            <TabsTrigger value="habitos" className="gap-2"><Target className="h-4 w-4" /> Hábitos</TabsTrigger>
            <TabsTrigger value="calendario" className="gap-2"><Calendar className="h-4 w-4" /> Calendário</TabsTrigger>
            <TabsTrigger value="equipe" className="gap-2"><Users className="h-4 w-4" /> Equipe</TabsTrigger>
            <TabsTrigger value="franqueados" className="gap-2"><KeyRound className="h-4 w-4" /> Franqueados</TabsTrigger>
          </TabsList>

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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Data de Início</Label>
                        <Input type="date" value={taskForm.start_date} onChange={(e) => setTaskForm({ ...taskForm, start_date: e.target.value })} />
                      </div>
                      <div className="space-y-2"><Label>Data Limite</Label>
                        <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                      </div>
                    </div>
                    <Button onClick={addTask} className="w-full">Criar Tarefa</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

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
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhuma tarefa cadastrada</TableCell></TableRow>
                    ) : tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.description && <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>}
                        </TableCell>
                        <TableCell className="text-sm">{getMemberName(task.assigned_to)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(task.start_date)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(task.due_date)}</TableCell>
                        <TableCell>
                          <Badge className={`${priorityColors[task.priority]} text-[10px]`}>{priorityLabels[task.priority]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Excluir?")) deleteTask(task.id); }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* === HÁBITOS === */}
          <TabsContent value="habitos">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Hábitos (Seg–Sex)</h2>
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
                {format(weekStart, "dd MMM", { locale: ptBR })} — {format(addDays(weekStart, 4), "dd MMM yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addDays(w, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {habits.length === 0 || members.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {members.length === 0 ? "Cadastre membros da equipe primeiro na aba Equipe" : "Nenhum hábito cadastrado"}
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
                            {members.filter((m) => m.name !== "Gustavo").map((member) => {
                              const doneCount = weekDays.filter((d) =>
                                isCompleted(habit.id, member.id, format(d, "yyyy-MM-dd"))
                              ).length;
                              const pct = Math.round((doneCount / 5) * 100);
                              return (
                                <TableRow key={member.id}>
                                  <TableCell className="text-sm font-medium">{member.name}</TableCell>
                                  {weekDays.map((day) => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    const done = isCompleted(habit.id, member.id, dateStr);
                                    return (
                                      <TableCell key={dateStr} className="text-center">
                                        <Checkbox checked={done} onCheckedChange={() => toggleCompletion(habit.id, member.id, dateStr)} />
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="text-center">
                                    <Badge variant={pct >= 80 ? "default" : pct >= 50 ? "secondary" : "outline"} className="text-xs">{pct}%</Badge>
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

          {/* === CALENDÁRIO === */}
          <TabsContent value="calendario">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Calendário da Equipe</h2>
              <Dialog open={eventOpen} onOpenChange={setEventOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Evento</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label>Título *</Label>
                      <Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>Tipo</Label>
                      <Select value={eventForm.event_type} onValueChange={(v) => setEventForm({ ...eventForm, event_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(eventTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Data *</Label>
                        <Input type="date" value={eventForm.event_date} onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })} />
                      </div>
                      <div className="space-y-2"><Label>Até (opcional)</Label>
                        <Input type="date" value={eventForm.end_date} onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Loja (opcional)</Label>
                      <Input value={eventForm.store_name} onChange={(e) => setEventForm({ ...eventForm, store_name: e.target.value })} placeholder="Nome da loja" />
                    </div>
                    <div className="space-y-2"><Label>Membro (opcional)</Label>
                      <Select value={eventForm.team_member_id} onValueChange={(v) => setEventForm({ ...eventForm, team_member_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Horário (opcional)</Label>
                      <Input type="time" value={eventForm.event_time} onChange={(e) => setEventForm({ ...eventForm, event_time: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>Descrição</Label>
                      <Textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
                    </div>
                    <Button onClick={addEvent} className="w-full">Criar Evento</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Month navigation */}
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="icon" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium capitalize">
                {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(eventTypeLabels).map(([k, v]) => (
                <Badge key={k} className={`${eventTypeColors[k]} text-[10px]`}>{v}</Badge>
              ))}
            </div>

            {/* Calendar grid */}
            <Card>
              <CardContent className="p-2">
                <div className="grid grid-cols-7 gap-px">
                  {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                  {Array.from({ length: paddingDays }).map((_, i) => (
                    <div key={`pad-${i}`} className="min-h-[80px]" />
                  ))}
                  {monthDays.map((day) => {
                    const dayEvents = getEventsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={day.toISOString()} className={`min-h-[80px] border rounded-md p-1 ${isToday ? "border-primary bg-primary/5" : "border-border"}`}>
                        <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <div key={ev.id} className={`text-[9px] px-1 py-0.5 rounded truncate ${ev.deletable ? "cursor-pointer" : ""} ${eventTypeColors[ev.event_type] || "bg-secondary text-secondary-foreground"}`}
                              title={ev.title}
                              onClick={() => { if (ev.deletable && confirm(`Excluir "${ev.title}"?`)) deleteEvent(ev.originalId || ev.id); }}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Events list for the month */}
            {(() => {
              // Deduplicate expanded events for the list (show each event once)
              const seen = new Set<string>();
              const monthEvents = allCalendarEvents
                .filter((e) => e.date >= startOfMonth(calendarMonth) && e.date <= endOfMonth(calendarMonth))
                .filter((e) => {
                  const key = e.originalId || e.id;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                })
                .sort((a, b) => a.date.getTime() - b.date.getTime());
              return monthEvents.length > 0 ? (
                <Card className="mt-4">
                  <CardHeader><CardTitle className="text-base">Eventos do Mês</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {monthEvents.map((ev) => (
                        <div key={ev.originalId || ev.id} className="flex items-center justify-between p-2 rounded-md border">
                          <div className="flex items-center gap-3">
                            <Badge className={`${eventTypeColors[ev.event_type] || "bg-secondary text-secondary-foreground"} text-[10px]`}>{eventTypeLabels[ev.event_type] || "Evento"}</Badge>
                            <div>
                              <p className="text-sm font-medium">{ev.title}</p>
                              <p className="text-xs text-muted-foreground">{format(ev.date, "dd/MM/yyyy")}</p>
                            </div>
                          </div>
                          {ev.deletable && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Excluir?")) deleteEvent(ev.originalId || ev.id); }}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}
          </TabsContent>

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

          {/* === FRANQUEADOS === */}
          <TabsContent value="franqueados">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Acesso de Franqueados</h2>
              <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Liberar Acesso</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Liberar Acesso ao Franqueado</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label>E-mail do Franqueado *</Label>
                      <Input type="email" placeholder="franqueado@email.com" value={accessForm.franchisee_email} onChange={(e) => setAccessForm({ ...accessForm, franchisee_email: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>Loja *</Label>
                      <Select value={accessForm.store_id} onValueChange={(v) => setAccessForm({ ...accessForm, store_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione a loja..." /></SelectTrigger>
                        <SelectContent>
                          {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O franqueado precisa criar uma conta com este e-mail. Ao entrar, verá apenas o checklist e cronograma da loja selecionada.
                    </p>
                    <Button onClick={addAccess} className="w-full">Liberar Acesso</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {franchiseeAccess.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Nenhum franqueado com acesso liberado.<br />
                <span className="text-xs">Clique em "Liberar Acesso" para vincular um e-mail a uma loja.</span>
              </CardContent></Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-mail do Franqueado</TableHead>
                        <TableHead>Loja Vinculada</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {franchiseeAccess.map((fa) => (
                        <TableRow key={fa.id}>
                          <TableCell className="text-sm">{fa.franchisee_email}</TableCell>
                          <TableCell className="text-sm font-medium">{getStoreName(fa.store_id)}</TableCell>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Equipe;
