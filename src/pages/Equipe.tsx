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
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

type TeamMember = {
  id: string; name: string; role: string; email: string | null; phone: string | null;
};
type Task = {
  id: string; title: string; description: string | null; status: string;
  priority: string; assigned_to: string | null; due_date: string | null; start_date: string | null;
};
type Habit = { id: string; name: string; description: string | null; assigned_to_members: string[] };
type HabitCompletion = {
  id: string; habit_id: string; team_member_id: string; completion_date: string; completed: boolean;
};
type TeamEvent = {
  id: string; title: string; event_type: string; event_date: string;
  end_date: string | null; store_name: string | null; team_member_id: string | null; description: string | null; event_time: string | null;
};
type TaskComment = {
  id: string; task_id: string; user_id: string; author_name: string; content: string; created_at: string;
};
type FranchiseeAccess = {
  id: string; store_id: string; franchisee_email: string;
  can_view_checklist: boolean; can_edit_checklist: boolean;
  can_view_cronograma: boolean; can_edit_cronograma: boolean;
  can_view_diario: boolean; can_view_custos: boolean;
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
  checklist: "Checklist",
  folga: "Folga",
  ferias: "Férias",
  visita_tecnica: "Visita Técnica",
  visita_implantacao: "Visita Implantação",
  implantacao: "Implantação",
  agm: "AGM",
  reuniao: "Reunião Semanal",
  outro: "Outro",
};
const eventTypeColors: Record<string, string> = {
  checklist: "bg-primary text-primary-foreground",
  folga: "bg-muted text-muted-foreground",
  ferias: "bg-[hsl(200,70%,50%)] text-[hsl(0,0%,100%)]",
  visita_tecnica: "bg-[hsl(190,70%,45%)] text-[hsl(0,0%,100%)]",
  visita_implantacao: "bg-[hsl(28,85%,55%)] text-[hsl(25,20%,15%)]",
  implantacao: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  agm: "bg-destructive text-destructive-foreground",
  reuniao: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  outro: "bg-secondary text-secondary-foreground",
};

const ANALYST_OPTIONS = ["Thainara", "Deise", "Gizelia", "Gustavo"];

// Fixed member colors for calendar visualization
const MEMBER_COLORS = [
  "hsl(25, 45%, 35%)",   // Coffee brown (Gustavo)
  "hsl(340, 55%, 48%)",  // Rose
  "hsl(200, 60%, 45%)",  // Blue
  "hsl(160, 50%, 40%)",  // Teal
  "hsl(270, 45%, 50%)",  // Purple
  "hsl(30, 70%, 50%)",   // Orange
];
const getMemberColor = (memberId: string | null | undefined, membersList: { id: string }[]) => {
  if (!memberId) return "transparent";
  const idx = membersList.findIndex((m) => m.id === memberId);
  return idx >= 0 ? MEMBER_COLORS[idx % MEMBER_COLORS.length] : "transparent";
};

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
};

const Equipe = () => {
  const { user, signOut } = useAuth();
  const { stores, updateStore, addStore, deleteStore } = useStores();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [franchiseeAccess, setFranchiseeAccess] = useState<FranchiseeAccess[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [habitMonth, setHabitMonth] = useState(new Date());
  const [habitMemberFilter, setHabitMemberFilter] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [scheduleMonth, setScheduleMonth] = useState(new Date());
  const [scheduleAllOpen, setScheduleAllOpen] = useState(false);

  // Dialogs
  const [memberOpen, setMemberOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", role: "", email: "", phone: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "media", assigned_to: "", due_date: "", start_date: "" });
  const [habitForm, setHabitForm] = useState({ name: "", description: "", assigned_to_members: [] as string[] });
  const [eventForm, setEventForm] = useState({ title: "", event_type: "outro", event_date: "", end_date: "", store_name: "", team_member_id: "", description: "", event_time: "" });
  const [scheduleForm, setScheduleForm] = useState({
    nome: "",
    analistaObra: "",
    cidade: "",
    inauguracao: "",
    dataVisita: "",
    duracaoVisitaDias: "",
    dataImplantacao: "",
    duracaoImplantacaoDias: "",
  });
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [calendarMemberFilter, setCalendarMemberFilter] = useState<string | null>(null);
  const [taskMemberFilter, setTaskMemberFilter] = useState<string | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null);
  const [editingEventDesc, setEditingEventDesc] = useState("");
  const [accessForm, setAccessForm] = useState({
    store_id: "", franchisee_email: "",
    can_view_checklist: true, can_edit_checklist: true,
    can_view_cronograma: true, can_edit_cronograma: true,
    can_view_diario: true, can_view_custos: true,
  });

  // Mon-Fri only
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 4) });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const monthStart = format(startOfMonth(calendarMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(calendarMonth), "yyyy-MM-dd");
    const habitMonthStart = format(startOfMonth(habitMonth), "yyyy-MM-dd");
    const habitMonthEnd = format(endOfMonth(habitMonth), "yyyy-MM-dd");
    const [m, t, h, c, e, fa] = await Promise.all([
      supabase.from("team_members").select("*").order("role", { ascending: false }).order("name"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("habits").select("*").order("name"),
      supabase.from("habit_completions").select("*")
        .gte("completion_date", habitMonthStart)
        .lte("completion_date", habitMonthEnd),
      supabase.from("team_events").select("*")
        .gte("event_date", monthStart).lte("event_date", monthEnd),
      supabase.from("franchisee_access").select("*"),
    ]);
    if (m.data) setMembers(m.data);
    if (t.data) setTasks(t.data as Task[]);
    if (h.data) setHabits(h.data);
    if (c.data) setCompletions(c.data);
    if (e.data) setEvents(e.data as TeamEvent[]);
    if (fa.data) setFranchiseeAccess(fa.data as FranchiseeAccess[]);
  }, [user, weekStart, calendarMonth, habitMonth]);

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
    const assignedMembers = habitForm.assigned_to_members.length > 0
      ? habitForm.assigned_to_members
      : members.map((m) => m.id);
    const { error } = await supabase.from("habits").insert({
      user_id: user.id, name: habitForm.name, description: habitForm.description || null,
      assigned_to_members: assignedMembers,
    } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setHabitForm({ name: "", description: "", assigned_to_members: [] });
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

  // Task detail / comments
  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    setEditingTask({ title: task.title, description: task.description || "", priority: task.priority, assigned_to: task.assigned_to, due_date: task.due_date, start_date: task.start_date, status: task.status });
    setTaskDetailOpen(true);
    const { data } = await supabase.from("task_comments").select("*").eq("task_id", task.id).order("created_at", { ascending: true });
    if (data) setTaskComments(data as TaskComment[]);
  };

  const addComment = async () => {
    if (!user || !selectedTask || !newComment.trim()) return;
    const authorName = user.email?.split("@")[0] || "Usuário";
    await supabase.from("task_comments").insert({ task_id: selectedTask.id, user_id: user.id, author_name: authorName, content: newComment.trim() });
    setNewComment("");
    const { data } = await supabase.from("task_comments").select("*").eq("task_id", selectedTask.id).order("created_at", { ascending: true });
    if (data) setTaskComments(data as TaskComment[]);
  };

  const saveTaskEdits = async () => {
    if (!selectedTask) return;
    await supabase.from("tasks").update({
      title: editingTask.title, description: editingTask.description || null,
      priority: editingTask.priority as any, assigned_to: editingTask.assigned_to || null,
      due_date: editingTask.due_date || null, start_date: editingTask.start_date || null,
      status: editingTask.status as any,
    }).eq("id", selectedTask.id);
    toast({ title: "Tarefa atualizada!" });
    setTaskDetailOpen(false);
    fetchAll();
  };

  // Event detail
  const openEventDetail = (ev: TeamEvent) => {
    setSelectedEvent(ev);
    setEditingEventDesc(ev.description || "");
    setEventDetailOpen(true);
  };

  const saveEventDescription = async () => {
    if (!selectedEvent) return;
    await supabase.from("team_events").update({ description: editingEventDesc }).eq("id", selectedEvent.id);
    toast({ title: "Evento atualizado!" });
    setEventDetailOpen(false);
    fetchAll();
  };

  const getMemberName = (id: string | null) => members.find((m) => m.id === id)?.name || "—";
  const normalizeName = (value?: string | null) => (value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const getMemberIdByName = (name?: string | null) => {
    if (!name) return null;
    const normalized = normalizeName(name);
    const found = members.find((m) => normalizeName(m.name) === normalized);
    return found?.id || null;
  };

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
    toast({ title: "Acesso liberado!", description: `O e-mail ${accessForm.franchisee_email} já pode criar uma conta e acessar o portal.` });
    setAccessForm({
      store_id: "", franchisee_email: "",
      can_view_checklist: true, can_edit_checklist: true,
      can_view_cronograma: true, can_edit_cronograma: true,
      can_view_diario: true, can_view_custos: true,
    });
    setAccessOpen(false);
    fetchAll();
  };

  const deleteAccess = async (id: string) => {
    await supabase.from("franchisee_access").delete().eq("id", id);
    fetchAll();
  };

  const getStoreName = (storeId: string) => stores.find((s) => s.id === storeId)?.nome || storeId;

  const parseDateValue = (value?: string | null) => (value ? new Date(value + "T00:00:00") : null);
  const toPositiveNumber = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : 0;
  };
  const getImplantationEndDate = (implantDate?: string | null, implantDays?: any) => {
    const start = parseDateValue(implantDate || "");
    const days = toPositiveNumber(implantDays || 0);
    if (!start || days <= 0) return "";
    return format(addDays(start, days - 1), "yyyy-MM-dd");
  };
  const getEffectiveInaugurationValue = (storeInaug?: string | null, implantDate?: string | null, implantDays?: any) => {
    const manual = (storeInaug || "").toString().trim();
    if (manual) return manual;
    return getImplantationEndDate(implantDate, implantDays);
  };

  const addScheduleStore = async () => {
    if (!scheduleForm.nome) return;
    const inauguracaoDate = scheduleForm.inauguracao || getImplantationEndDate(scheduleForm.dataImplantacao, scheduleForm.duracaoImplantacaoDias);
    const newId = await addStore({
      nome: scheduleForm.nome,
      filial: "",
      franqueado: "",
      construtor: "",
      analistaObra: scheduleForm.analistaObra,
      inauguracao: inauguracaoDate,
      tipoLoja: "",
      inauguracaoChecklist: {} as any,
    } as any);
    if (newId) {
      await updateStore(newId, {
        inauguracao: inauguracaoDate,
        analistaObra: scheduleForm.analistaObra,
        visitaTecnica: {
          cidade: scheduleForm.cidade,
          dataVisita: scheduleForm.dataVisita,
          duracaoVisitaDias: scheduleForm.duracaoVisitaDias,
          dataImplantacao: scheduleForm.dataImplantacao,
          duracaoImplantacaoDias: scheduleForm.duracaoImplantacaoDias,
        } as any,
      } as any);
    }
    setScheduleForm({
      nome: "",
      analistaObra: "",
      cidade: "",
      inauguracao: "",
      dataVisita: "",
      duracaoVisitaDias: "",
      dataImplantacao: "",
      duracaoImplantacaoDias: "",
    });
  };

  // Calendar helpers
  const monthDays = eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) });
  const firstDayOfWeek = getDay(startOfMonth(calendarMonth));
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Schedule (visita/implantação) helpers
  type ScheduleBlock = {
    storeId: string;
    storeName: string;
    type: "visita" | "implantacao" | "inauguracao";
    memberKey: string;
    memberLabel: string;
    city: string;
    start: Date;
    end: Date;
  };
  const scheduleBlocks: ScheduleBlock[] = [];
  stores.forEach((s) => {
    const visita = (s.visitaTecnica as any) || {};
    const memberLabel = (s.analistaObra || "").toString().trim();
    const memberKey = normalizeName(memberLabel);
    const hasMember = Boolean(memberKey);
    const city = (visita.cidade || "").toString().trim();
    const implantStart = parseDateValue(visita.dataImplantacao);
    const implantDays = toPositiveNumber(visita.duracaoImplantacaoDias || 0);
    const inaugValue = getEffectiveInaugurationValue(s.inauguracao || null, visita.dataImplantacao, visita.duracaoImplantacaoDias);
    const inaug = parseDateValue(inaugValue);
    if (inaug && hasMember) {
      scheduleBlocks.push({
        storeId: s.id,
        storeName: s.nome,
        type: "inauguracao",
        memberKey,
        memberLabel,
        city,
        start: inaug,
        end: inaug,
      });
    }
    const visitaStart = parseDateValue(visita.dataVisita);
    const visitaDays = toPositiveNumber(visita.duracaoVisitaDias || 0);
    if (visitaStart && visitaDays > 0 && hasMember) {
      scheduleBlocks.push({
        storeId: s.id,
        storeName: s.nome,
        type: "visita",
        memberKey,
        memberLabel,
        city,
        start: visitaStart,
        end: addDays(visitaStart, visitaDays - 1),
      });
    }
    if (implantStart && implantDays > 0 && hasMember) {
      scheduleBlocks.push({
        storeId: s.id,
        storeName: s.nome,
        type: "implantacao",
        memberKey,
        memberLabel,
        city,
        start: implantStart,
        end: addDays(implantStart, implantDays - 1),
      });
    }
  });

  const scheduleConflictMap = scheduleBlocks.reduce<Record<string, Record<string, number>>>((acc, block) => {
    if (!acc[block.memberKey]) acc[block.memberKey] = {};
    eachDayOfInterval({ start: block.start, end: block.end }).forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      acc[block.memberKey][key] = (acc[block.memberKey][key] || 0) + 1;
    });
    return acc;
  }, {});
  const scheduleDays = eachDayOfInterval({ start: startOfMonth(scheduleMonth), end: endOfMonth(scheduleMonth) });
  const analystOrder = ANALYST_OPTIONS.map((name) => normalizeName(name));
  const scheduleMembers = Object.values(
    scheduleBlocks.reduce<Record<string, { key: string; label: string }>>((acc, block) => {
      if (!block.memberKey) return acc;
      if (!acc[block.memberKey]) acc[block.memberKey] = { key: block.memberKey, label: block.memberLabel };
      return acc;
    }, {})
  ).sort((a, b) => {
    const aIdx = analystOrder.indexOf(a.key);
    const bIdx = analystOrder.indexOf(b.key);
    if (aIdx !== -1 || bIdx !== -1) {
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    }
    return a.label.localeCompare(b.label, "pt-BR");
  });
  const getBlocksForMemberDay = (memberKey: string, day: Date) => {
    return scheduleBlocks.filter((b) => b.memberKey === memberKey && isWithinInterval(day, { start: b.start, end: b.end }));
  };
  // Build virtual events from all data sources (only scheduled/agendado items)
  type CalendarEvent = { id: string; title: string; event_type: string; date: Date; deletable: boolean; originalId?: string; time?: string | null; memberId?: string | null; originalEvent?: TeamEvent };
  const allCalendarEvents: CalendarEvent[] = [];

  // 1. Team events (manually created in calendar) - expand date ranges
  events.forEach((e) => {
    const start = new Date(e.event_date + "T00:00:00");
    const end = e.end_date ? new Date(e.end_date + "T00:00:00") : start;
    const days = eachDayOfInterval({ start, end });
    days.forEach((day) => {
      allCalendarEvents.push({ id: `${e.id}-${day.toISOString()}`, title: e.title, event_type: e.event_type, date: day, deletable: true, originalId: e.id, time: e.event_time, memberId: e.team_member_id, originalEvent: e });
    });
  });

  // Calendar is now manually filled only - no automatic data from stores

  const getAllEventsForDate = (date: Date) => allCalendarEvents.filter((e) => isSameDay(e.date, date));
  const filteredCalendarEvents = calendarMemberFilter
    ? allCalendarEvents.filter((e) => e.memberId === calendarMemberFilter || !e.memberId)
    : allCalendarEvents;
  const getEventsForDate = (date: Date) => filteredCalendarEvents.filter((e) => isSameDay(e.date, date));
  const getConflictInfoForDate = (date: Date) => {
    const eventsForDay = getAllEventsForDate(date);
    const memberEvents = eventsForDay.filter((e) => e.memberId);
    // Only flag conflict when the SAME member has multiple events on the same day
    const memberCounts: Record<string, number> = {};
    memberEvents.forEach((e) => {
      if (e.memberId) memberCounts[e.memberId] = (memberCounts[e.memberId] || 0) + 1;
    });
    const hasConflict = Object.values(memberCounts).some((count) => count > 1);
    return {
      hasConflict,
      memberEvents: hasConflict ? memberEvents.filter((e) => e.memberId && memberCounts[e.memberId!] > 1) : [],
    };
  };

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
            <TabsTrigger value="programacao" className="gap-2"><Calendar className="h-4 w-4" /> Programação</TabsTrigger>
            <TabsTrigger value="calendario" className="gap-2"><Calendar className="h-4 w-4" /> Calendário</TabsTrigger>
            <TabsTrigger value="equipe" className="gap-2"><Users className="h-4 w-4" /> Equipe</TabsTrigger>
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

            {/* Member filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={taskMemberFilter === null ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setTaskMemberFilter(null)}
              >
                Todos
              </Button>
              {members.map((m) => (
                <Button
                  key={m.id}
                  variant={taskMemberFilter === m.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setTaskMemberFilter(taskMemberFilter === m.id ? null : m.id)}
                >
                  {m.name}
                </Button>
              ))}
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
                    {(() => {
                      const filtered = taskMemberFilter
                        ? tasks.filter((t) => t.assigned_to === taskMemberFilter)
                        : tasks;
                      return filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhuma tarefa cadastrada</TableCell></TableRow>
                      ) : filtered.map((task) => (
                      <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openTaskDetail(task)}>
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Excluir?")) deleteTask(task.id); }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))})()}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Task Detail Dialog */}
            <Dialog open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Detalhes da Tarefa</DialogTitle></DialogHeader>
                {selectedTask && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2"><Label>Título</Label>
                      <Input value={editingTask.title || ""} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} />
                    </div>
                    <div className="space-y-2"><Label>Descrição</Label>
                      <Textarea value={editingTask.description || ""} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Prioridade</Label>
                        <Select value={editingTask.priority || "media"} onValueChange={(v) => setEditingTask({ ...editingTask, priority: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Status</Label>
                        <Select value={editingTask.status || "pendente"} onValueChange={(v) => setEditingTask({ ...editingTask, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Responsável</Label>
                      <Select value={editingTask.assigned_to || ""} onValueChange={(v) => setEditingTask({ ...editingTask, assigned_to: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Data de Início</Label>
                        <Input type="date" value={editingTask.start_date || ""} onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })} />
                      </div>
                      <div className="space-y-2"><Label>Data Limite</Label>
                        <Input type="date" value={editingTask.due_date || ""} onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })} />
                      </div>
                    </div>
                    <Button onClick={saveTaskEdits} className="w-full">Salvar Alterações</Button>

                    {/* Comments section */}
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-sm font-semibold mb-3">💬 Comentários</h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto mb-3">
                        {taskComments.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário ainda</p>
                        ) : taskComments.map((c) => (
                          <div key={c.id} className="bg-muted/50 rounded-md p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium">{c.author_name}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                            </div>
                            <p className="text-xs">{c.content}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Escreva um comentário..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addComment(); }} />
                        <Button size="sm" onClick={addComment}>Enviar</Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* === PROGRAMAÇÃO === */}
          <TabsContent value="programacao">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Programação de Visitas e Implantação</h2>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setScheduleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold capitalize">
                  {format(scheduleMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <Button variant="outline" size="icon" onClick={() => setScheduleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quadro geral do mês</CardTitle>
                <p className="text-xs text-muted-foreground">Visão consolidada por analista.</p>
              </CardHeader>
              <CardContent className="p-0">
                {scheduleBlocks.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma programação cadastrada</div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex items-center gap-3 px-3 py-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[hsl(190,70%,45%)]" /> VT Visita Técnica</span>
                      <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[hsl(28,85%,55%)]" /> VI Visita de Implantação</span>
                      <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[hsl(152,60%,40%)]" /> I Inauguração</span>
                    </div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px]"></th>
                          <th className="text-center px-2 py-2" colSpan={scheduleDays.length}>
                            <span
                              className="text-sm font-semibold uppercase tracking-[0.2em] text-primary"
                              style={{ textShadow: "0 1px 6px hsl(var(--primary) / 0.45)" }}
                            >
                              {format(scheduleMonth, "MMMM yyyy", { locale: ptBR })}
                            </span>
                          </th>
                        </tr>
                        <tr className="border-b border-border">
                          <th className="sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px]">Analista</th>
                          {scheduleDays.map((day) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                              <th key={day.toISOString()} className={`text-center px-0 py-1 min-w-[28px] ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                                <div className="text-[10px]">{["D", "S", "T", "Q", "Q", "S", "S"][day.getDay()]}</div>
                                <div className={`text-xs font-medium ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""}`}>
                                  {format(day, "d")}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleMembers.map((member) => (
                          <tr key={member.key} className="border-b border-border/50">
                            <td className="sticky left-0 z-10 bg-card px-3 py-2">
                              <div className="font-semibold">{member.label || "Equipe"}</div>
                            </td>
                            {scheduleDays.map((day) => {
                              const dayKey = format(day, "yyyy-MM-dd");
                              const blocks = getBlocksForMemberDay(member.key, day);
                              const hasConflict = (scheduleConflictMap[member.key]?.[dayKey] || 0) > 1;
                              return (
                                <td key={`${member.key}-${dayKey}`} className={`text-center px-0 py-1 ${hasConflict ? "ring-2 ring-destructive/60" : ""}`}>
                                  <div className="flex items-center justify-center gap-0.5">
                                    {blocks.slice(0, 2).map((b) => {
                                      const label = b.type === "visita" ? "VT" : b.type === "implantacao" ? "VI" : "I";
                                      const color = b.type === "visita"
                                        ? "bg-[hsl(190,70%,45%)] text-[hsl(0,0%,100%)]"
                                        : b.type === "implantacao"
                                          ? "bg-[hsl(28,85%,55%)] text-[hsl(25,20%,15%)]"
                                          : "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]";
                                      const typeLabel = b.type === "visita" ? "Visita Técnica" : b.type === "implantacao" ? "Visita de Implantação" : "Inauguração";
                                      return (
                                        <div
                                          key={`${b.storeId}-${b.type}`}
                                          className={`h-4 min-w-[20px] px-1 rounded-sm text-[9px] font-medium text-center ${color}`}
                                          title={`${b.storeName} • ${typeLabel} • ${format(b.start, "dd/MM")} - ${format(b.end, "dd/MM")}`}
                                        >
                                          {label}
                                        </div>
                                      );
                                    })}
                                    {blocks.length > 2 && <span className="text-[9px] text-muted-foreground">+{blocks.length - 2}</span>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Resumo por loja</CardTitle>
                    <p className="text-xs text-muted-foreground">Cadastro simples para alimentar o quadro geral.</p>
                  </div>
                  <Dialog open={scheduleAllOpen} onOpenChange={setScheduleAllOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Mostrar tudo</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Resumo completo por loja</DialogTitle></DialogHeader>
                      {stores.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma loja cadastrada</p>
                      ) : (
                        <div className="space-y-3">
                          {stores.map((store) => {
                            const visita = (store.visitaTecnica as any) || {};
                            const derivedInaug = getEffectiveInaugurationValue(store.inauguracao || null, visita.dataImplantacao, visita.duracaoImplantacaoDias);
                            return (
                              <div key={store.id} className="border border-border/60 rounded-md p-3 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-semibold">{store.nome}</div>
                                    <div className="text-xs text-muted-foreground">Analista: {store.analistaObra || "—"}</div>
                                    <div className="text-xs text-muted-foreground">Cidade: {visita.cidade || "—"}</div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => { if (confirm("Excluir esta loja?")) deleteStore(store.id); }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div><span className="text-muted-foreground">Inauguração:</span> {formatDate(derivedInaug)}</div>
                                  <div><span className="text-muted-foreground">VT data:</span> {formatDate(visita.dataVisita || "")}</div>
                                  <div><span className="text-muted-foreground">VT dias:</span> {visita.duracaoVisitaDias || "—"}</div>
                                  <div><span className="text-muted-foreground">VI data:</span> {formatDate(visita.dataImplantacao || "")}</div>
                                  <div><span className="text-muted-foreground">VI dias:</span> {visita.duracaoImplantacaoDias || "—"}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 min-w-[180px]">Loja</th>
                        <th className="text-left px-3 py-2 min-w-[140px]">Analista</th>
                        <th className="text-left px-3 py-2 min-w-[140px]">Cidade</th>
                        <th className="text-left px-3 py-2 min-w-[140px]">Inauguração</th>
                        <th className="text-left px-3 py-2 min-w-[160px]">VT (data)</th>
                        <th className="text-left px-3 py-2 min-w-[90px]">VT (dias)</th>
                        <th className="text-left px-3 py-2 min-w-[160px]">VI (data)</th>
                        <th className="text-left px-3 py-2 min-w-[90px]">VI (dias)</th>
                        <th className="text-left px-3 py-2 min-w-[120px]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50 bg-muted/20">
                        <td className="px-3 py-2">
                          <Input className="h-8 text-xs" value={scheduleForm.nome} onChange={(e) => setScheduleForm({ ...scheduleForm, nome: e.target.value })} />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            list="analistas-list"
                            className="h-8 text-xs"
                            value={scheduleForm.analistaObra}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, analistaObra: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input className="h-8 text-xs" value={scheduleForm.cidade} onChange={(e) => setScheduleForm({ ...scheduleForm, cidade: e.target.value })} />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={getEffectiveInaugurationValue(scheduleForm.inauguracao, scheduleForm.dataImplantacao, scheduleForm.duracaoImplantacaoDias)}
                            onChange={(e) => setScheduleForm({ ...scheduleForm, inauguracao: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="date" className="h-8 text-xs" value={scheduleForm.dataVisita} onChange={(e) => setScheduleForm({ ...scheduleForm, dataVisita: e.target.value })} />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" min={1} className="h-8 text-xs" value={scheduleForm.duracaoVisitaDias} onChange={(e) => setScheduleForm({ ...scheduleForm, duracaoVisitaDias: e.target.value })} />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={scheduleForm.dataImplantacao}
                            onChange={(e) => {
                              const dataImplantacao = e.target.value;
                              const currentDerived = getImplantationEndDate(scheduleForm.dataImplantacao, scheduleForm.duracaoImplantacaoDias);
                              const nextDerived = getImplantationEndDate(dataImplantacao, scheduleForm.duracaoImplantacaoDias);
                              const shouldUpdateInaug = !scheduleForm.inauguracao || scheduleForm.inauguracao === currentDerived;
                              setScheduleForm({
                                ...scheduleForm,
                                dataImplantacao,
                                inauguracao: shouldUpdateInaug ? nextDerived : scheduleForm.inauguracao,
                              });
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            className="h-8 text-xs"
                            value={scheduleForm.duracaoImplantacaoDias}
                            onChange={(e) => {
                              const duracaoImplantacaoDias = e.target.value;
                              const currentDerived = getImplantationEndDate(scheduleForm.dataImplantacao, scheduleForm.duracaoImplantacaoDias);
                              const nextDerived = getImplantationEndDate(scheduleForm.dataImplantacao, duracaoImplantacaoDias);
                              const shouldUpdateInaug = !scheduleForm.inauguracao || scheduleForm.inauguracao === currentDerived;
                              setScheduleForm({
                                ...scheduleForm,
                                duracaoImplantacaoDias,
                                inauguracao: shouldUpdateInaug ? nextDerived : scheduleForm.inauguracao,
                              });
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Button size="sm" className="h-8" onClick={addScheduleStore}>Adicionar</Button>
                        </td>
                      </tr>
                      {stores.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-10 text-muted-foreground">Nenhuma loja cadastrada</td>
                        </tr>
                      ) : stores.map((store) => {
                        const visita = (store.visitaTecnica as any) || {};
                        const derivedInaug = getEffectiveInaugurationValue(store.inauguracao || null, visita.dataImplantacao, visita.duracaoImplantacaoDias);
                        return (
                          <tr key={store.id} className="border-b border-border/50">
                            <td className="px-3 py-2 font-medium">{store.nome}</td>
                            <td className="px-3 py-2">
                              <Input
                                list="analistas-list"
                                className="h-8 text-xs"
                                value={store.analistaObra || ""}
                                onChange={(e) => updateStore(store.id, { analistaObra: e.target.value } as any)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input className="h-8 text-xs" value={(visita.cidade || "").toString()} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, cidade: e.target.value } } as any)} />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="date"
                                className="h-8 text-xs"
                                value={derivedInaug}
                                onChange={(e) => updateStore(store.id, { inauguracao: e.target.value } as any)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="date" className="h-8 text-xs" value={visita.dataVisita || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, dataVisita: e.target.value } } as any)} />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" min={1} className="h-8 text-xs" value={visita.duracaoVisitaDias || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, duracaoVisitaDias: e.target.value } } as any)} />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="date"
                                className="h-8 text-xs"
                                value={visita.dataImplantacao || ""}
                                onChange={(e) => {
                                  const dataImplantacao = e.target.value;
                                  const currentDerived = getImplantationEndDate(visita.dataImplantacao, visita.duracaoImplantacaoDias);
                                  const nextDerived = getImplantationEndDate(dataImplantacao, visita.duracaoImplantacaoDias);
                                  const shouldUpdateInaug = !store.inauguracao || store.inauguracao === currentDerived;
                                  const payload: any = { visitaTecnica: { ...visita, dataImplantacao } };
                                  if (shouldUpdateInaug) payload.inauguracao = nextDerived;
                                  updateStore(store.id, payload as any);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={1}
                                className="h-8 text-xs"
                                value={visita.duracaoImplantacaoDias || ""}
                                onChange={(e) => {
                                  const duracaoImplantacaoDias = e.target.value;
                                  const currentDerived = getImplantationEndDate(visita.dataImplantacao, visita.duracaoImplantacaoDias);
                                  const nextDerived = getImplantationEndDate(visita.dataImplantacao, duracaoImplantacaoDias);
                                  const shouldUpdateInaug = !store.inauguracao || store.inauguracao === currentDerived;
                                  const payload: any = { visitaTecnica: { ...visita, duracaoImplantacaoDias } };
                                  if (shouldUpdateInaug) payload.inauguracao = nextDerived;
                                  updateStore(store.id, payload as any);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => { if (confirm("Excluir esta loja?")) deleteStore(store.id); }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <datalist id="analistas-list">
                    {ANALYST_OPTIONS.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === HÁBITOS === */}
          <TabsContent value="habitos">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Tracker Mensal</h2>
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
                    <div className="space-y-2">
                      <Label>Repetir para quem? <span className="text-xs text-muted-foreground">(vazio = todos)</span></Label>
                      <div className="space-y-2">
                        {members.map((m) => (
                          <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={habitForm.assigned_to_members.includes(m.id)}
                              onCheckedChange={(checked) => {
                                setHabitForm({
                                  ...habitForm,
                                  assigned_to_members: checked
                                    ? [...habitForm.assigned_to_members, m.id]
                                    : habitForm.assigned_to_members.filter((id) => id !== m.id),
                                });
                              }}
                            />
                            {m.name} <span className="text-xs text-muted-foreground">({m.role})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button onClick={addHabit} className="w-full">Criar Hábito</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button variant="outline" size="icon" onClick={() => setHabitMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold capitalize">
                {format(habitMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setHabitMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Member filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={habitMemberFilter === null ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setHabitMemberFilter(null)}
              >
                Todos
              </Button>
              {members.map((m) => (
                <Button
                  key={m.id}
                  variant={habitMemberFilter === m.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setHabitMemberFilter(habitMemberFilter === m.id ? null : m.id)}
                >
                  {m.name}
                </Button>
              ))}
            </div>

            {habits.length === 0 || members.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {members.length === 0 ? "Cadastre membros da equipe primeiro na aba Equipe" : "Nenhum hábito cadastrado"}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const monthDaysHabit = eachDayOfInterval({ start: startOfMonth(habitMonth), end: endOfMonth(habitMonth) });
                  const dayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
                  const today = new Date();
                  const todayStr = format(today, "yyyy-MM-dd");
                  const filteredMembers = members.filter((m) => !habitMemberFilter || m.id === habitMemberFilter);

                  const renderMemberTracker = (member: typeof members[0]) => {
                    // Filter habits assigned to this member (empty array = all members)
                    const memberHabits = habits.filter((h) =>
                      !h.assigned_to_members || h.assigned_to_members.length === 0 || h.assigned_to_members.includes(member.id)
                    );
                    const pendingHabits = memberHabits.filter((h) => !isCompleted(h.id, member.id, todayStr));
                    const completedHabits = memberHabits.filter((h) => isCompleted(h.id, member.id, todayStr));

                    return (
                      <Card key={member.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{member.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[140px] font-semibold">Hábito</th>
                                  {monthDaysHabit.map((day) => {
                                    const isToday = isSameDay(day, today);
                                    return (
                                      <th key={day.toISOString()} className={`text-center px-0 py-1 min-w-[28px] ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                                        <div className="text-[10px]">{dayLabels[day.getDay()]}</div>
                                        <div className={`text-xs font-medium ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""}`}>
                                          {format(day, "d")}
                                        </div>
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {/* Pending habits first */}
                                {pendingHabits.map((habit) => (
                                  <tr key={habit.id} className="border-b border-border/50 hover:bg-muted/30">
                                    <td className="sticky left-0 z-10 bg-card px-3 py-2">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{habit.name}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => { if (confirm("Excluir?")) deleteHabit(habit.id); }}>
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </div>
                                    </td>
                                    {monthDaysHabit.map((day) => {
                                      const dateStr = format(day, "yyyy-MM-dd");
                                      const done = isCompleted(habit.id, member.id, dateStr);
                                      const isDayToday = isSameDay(day, today);
                                      return (
                                        <td key={dateStr} className="text-center px-0 py-1">
                                          <button
                                            className={`w-6 h-6 rounded-md border transition-all ${done ? "bg-primary border-primary text-primary-foreground" : isDayToday ? "border-primary/50 bg-primary/5" : "border-border/50"}`}
                                            onClick={() => toggleCompletion(habit.id, member.id, dateStr)}
                                          >
                                            {done && <span className="text-[10px]">✓</span>}
                                          </button>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                                {/* Completed today - shown faded at bottom */}
                                {completedHabits.length > 0 && (
                                  <>
                                    <tr><td colSpan={monthDaysHabit.length + 1} className="sticky left-0 z-10 bg-card px-3 py-1 text-[10px] text-muted-foreground font-medium border-b border-border/30">✓ Realizados hoje</td></tr>
                                    {completedHabits.map((habit) => (
                                      <tr key={habit.id} className="border-b border-border/20 opacity-50">
                                        <td className="sticky left-0 z-10 bg-card px-3 py-1.5">
                                          <span className="font-medium line-through">{habit.name}</span>
                                        </td>
                                        {monthDaysHabit.map((day) => {
                                          const dateStr = format(day, "yyyy-MM-dd");
                                          const done = isCompleted(habit.id, member.id, dateStr);
                                          const isDayToday = isSameDay(day, today);
                                          return (
                                            <td key={dateStr} className="text-center px-0 py-1">
                                              <button
                                                className={`w-6 h-6 rounded-md border transition-all ${done ? "bg-primary border-primary text-primary-foreground" : isDayToday ? "border-primary/50 bg-primary/5" : "border-border/50"}`}
                                                onClick={() => toggleCompletion(habit.id, member.id, dateStr)}
                                              >
                                                {done && <span className="text-[10px]">✓</span>}
                                              </button>
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  };

                  return filteredMembers.map((member) => renderMemberTracker(member));
                })()}
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
                    {eventForm.event_date && (() => {
                      const formDate = new Date(eventForm.event_date + "T00:00:00");
                      const conflictInfo = getConflictInfoForDate(formDate);
                      const otherEvents = conflictInfo.memberEvents;
                      return conflictInfo.hasConflict ? (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                          <p className="font-semibold text-destructive">Conflito no dia</p>
                          <div className="mt-1 space-y-1">
                            {otherEvents.map((ev) => (
                              <div key={ev.id} className="flex items-center justify-between">
                                <span className="truncate">
                                  {ev.time ? `${ev.time} ` : ""}{ev.title}
                                </span>
                                <span className="text-muted-foreground">
                                  {ev.memberId ? getMemberName(ev.memberId) : "Equipe"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
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

            {/* View toggle + navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {calendarView === "month" ? (
                  <>
                    <Button variant="outline" size="icon" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium capitalize">
                      {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="icon" onClick={() => setCalendarWeekStart((w) => subDays(w, 7))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {format(calendarWeekStart, "dd/MM")} — {format(addDays(calendarWeekStart, 6), "dd/MM/yyyy")}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCalendarWeekStart((w) => addDays(w, 7))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant={calendarView === "week" ? "default" : "outline"} size="sm" onClick={() => setCalendarView("week")}>Semana</Button>
                <Button variant={calendarView === "month" ? "default" : "outline"} size="sm" onClick={() => setCalendarView("month")}>Mês</Button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(eventTypeLabels).map(([k, v]) => (
                <Badge key={k} className={`${eventTypeColors[k]} text-[10px]`}>{v}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {members.map((m, i) => (
                <div key={m.id} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }} />
                  <span>{m.name}</span>
                </div>
              ))}
            </div>

            {/* Member filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={calendarMemberFilter === null ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setCalendarMemberFilter(null)}
              >
                Todos
              </Button>
              {members.map((m) => (
                <Button
                  key={m.id}
                  variant={calendarMemberFilter === m.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setCalendarMemberFilter(calendarMemberFilter === m.id ? null : m.id)}
                >
                  {m.name}
                </Button>
              ))}
            </div>

            <Card>
              <CardContent className="p-2">
                {calendarView === "month" ? (
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
                      const conflictInfo = getConflictInfoForDate(day);
                      return (
                        <div key={day.toISOString()} className={`min-h-[80px] border rounded-md p-1 ${isToday ? "border-primary bg-primary/5" : "border-border"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                              {format(day, "d")}
                            </div>
                            {conflictInfo.hasConflict && (
                              <Badge variant="destructive" className="text-[9px] h-4 px-1">Conflito</Badge>
                            )}
                          </div>
                          <div className="space-y-0.5">
                             {dayEvents.slice(0, 3).map((ev) => (
                              <div key={ev.id} className={`text-[9px] px-1 py-0.5 rounded truncate cursor-pointer ${eventTypeColors[ev.event_type] || "bg-secondary text-secondary-foreground"} ${conflictInfo.hasConflict && ev.memberId ? "ring-1 ring-destructive/50" : ""}`}
                                style={{ borderLeft: `3px solid ${getMemberColor(ev.memberId, members)}` }}
                                title={`${ev.memberId ? getMemberName(ev.memberId) + ": " : ""}${ev.title}${ev.time ? ` às ${ev.time}` : ""}`}
                                onClick={() => { if (ev.originalEvent) openEventDetail(ev.originalEvent); }}
                              >
                                {ev.time ? `${ev.time} ` : ""}{ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Week view */
                  <div className="grid grid-cols-7 gap-px">
                    {eachDayOfInterval({ start: calendarWeekStart, end: addDays(calendarWeekStart, 6) }).map((day) => {
                      const dayEvents = getEventsForDate(day);
                      const isToday = isSameDay(day, new Date());
                      const conflictInfo = getConflictInfoForDate(day);
                      return (
                        <div key={day.toISOString()} className={`min-h-[200px] border rounded-md p-1.5 ${isToday ? "border-primary bg-primary/5" : "border-border"}`}>
                          <div className={`text-xs font-medium mb-2 text-center ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                            <div className="capitalize">{format(day, "EEE", { locale: ptBR })}</div>
                            <div className="text-lg">{format(day, "d")}</div>
                            {conflictInfo.hasConflict && <div className="mt-1"><Badge variant="destructive" className="text-[9px] h-4 px-1">Conflito</Badge></div>}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map((ev) => (
                              <div key={ev.id} className={`text-[10px] px-1.5 py-1 rounded truncate cursor-pointer ${eventTypeColors[ev.event_type] || "bg-secondary text-secondary-foreground"} ${conflictInfo.hasConflict && ev.memberId ? "ring-1 ring-destructive/50" : ""}`}
                                style={{ borderLeft: `3px solid ${getMemberColor(ev.memberId, members)}` }}
                                title={`${ev.memberId ? getMemberName(ev.memberId) + ": " : ""}${ev.title}${ev.time ? ` às ${ev.time}` : ""}`}
                                onClick={() => { if (ev.originalEvent) openEventDetail(ev.originalEvent); }}
                              >
                                {ev.time ? <span className="font-semibold">{ev.time} </span> : null}{ev.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Events list for the month */}
            {(() => {
              // Deduplicate expanded events for the list (show each event once)
              const seen = new Set<string>();
              const monthEvents = filteredCalendarEvents
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
                        <div key={ev.originalId || ev.id} className={`flex items-center justify-between p-2 rounded-md border ${ev.originalEvent ? "cursor-pointer hover:bg-muted/50" : ""}`}
                          onClick={() => { if (ev.originalEvent) openEventDetail(ev.originalEvent); }}>
                          <div className="flex items-center gap-3">
                            <Badge className={`${eventTypeColors[ev.event_type] || "bg-secondary text-secondary-foreground"} text-[10px]`}>{eventTypeLabels[ev.event_type] || "Evento"}</Badge>
                            <div>
                              <p className="text-sm font-medium">{ev.title}</p>
                              <p className="text-xs text-muted-foreground">{format(ev.date, "dd/MM/yyyy")}</p>
                            </div>
                          </div>
                          {ev.deletable && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); if (confirm("Excluir?")) deleteEvent(ev.originalId || ev.id); }}>
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

            {/* Event Detail Dialog */}
            <Dialog open={eventDetailOpen} onOpenChange={setEventDetailOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Detalhes do Evento</DialogTitle></DialogHeader>
                {selectedEvent && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <p className="text-sm font-semibold">{selectedEvent.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${eventTypeColors[selectedEvent.event_type] || "bg-secondary text-secondary-foreground"} text-[10px]`}>{eventTypeLabels[selectedEvent.event_type] || "Evento"}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(selectedEvent.event_date)}{selectedEvent.end_date ? ` — ${formatDate(selectedEvent.end_date)}` : ""}</span>
                      </div>
                      {selectedEvent.team_member_id && <p className="text-xs text-muted-foreground mt-1">Membro: {getMemberName(selectedEvent.team_member_id)}</p>}
                      {selectedEvent.store_name && <p className="text-xs text-muted-foreground">Loja: {selectedEvent.store_name}</p>}
                      {selectedEvent.event_time && <p className="text-xs text-muted-foreground">Horário: {selectedEvent.event_time}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição / Observações</Label>
                      <Textarea rows={4} value={editingEventDesc} onChange={(e) => setEditingEventDesc(e.target.value)} placeholder="Adicione uma descrição ou observação..." />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveEventDescription} className="flex-1">Salvar</Button>
                      <Button variant="destructive" onClick={() => { if (confirm("Excluir este evento?")) { deleteEvent(selectedEvent.id); setEventDetailOpen(false); } }}>Excluir</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
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

        </Tabs>
      </main>
    </div>
  );
};

export default Equipe;
