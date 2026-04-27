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
  ChevronLeft, ChevronRight, Calendar, KeyRound, Sun, User,
  FileDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportFeriasGustavoExcel } from "@/lib/exportFeriasGustavoExcel";

type TeamMember = {
  id: string; name: string; role: string; email: string | null; phone: string | null;
};
type Task = {
  id: string; title: string; description: string | null; status: string;
  priority: string; assigned_to: string | null; due_date: string | null; start_date: string | null;
  updated_at: string;
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

const ANALYST_OPTIONS = ["Thainara", "Deise", "Gizelia", "Gustavo", "Thiago", "Ieda", "Agopal"];

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
  const [scheduleSubTab, setScheduleSubTab] = useState<"equipe" | "mobiliario">("equipe");

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
    dataMarcenaria: "",
    duracaoMarcenariaDias: "",
    responsavelMarcenaria: "",
    responsavelVisita: "",
    responsavelImplantacao: "",
  });
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [calendarMemberFilter, setCalendarMemberFilter] = useState<string | null>(null);
  const [taskMemberFilter, setTaskMemberFilter] = useState<string | null>(null);
  const [taskViewTab, setTaskViewTab] = useState<"ativas" | "concluidas">("ativas");
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null);
  const [editingEventDesc, setEditingEventDesc] = useState("");
  const [editingEventDate, setEditingEventDate] = useState("");
  const [editingEventEndDate, setEditingEventEndDate] = useState("");
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
    setEditingEventDate(ev.event_date);
    setEditingEventEndDate(ev.end_date || "");
    setEventDetailOpen(true);
  };

  const saveEventDescription = async () => {
    if (!selectedEvent) return;
    const updateData: Record<string, string | null> = { 
      description: editingEventDesc,
      event_date: editingEventDate,
      end_date: editingEventEndDate || null,
    };
    await supabase.from("team_events").update(updateData).eq("id", selectedEvent.id);
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
    const inauguracaoDate = "";
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
          dataMarcenaria: scheduleForm.dataMarcenaria,
          duracaoMarcenariaDias: scheduleForm.duracaoMarcenariaDias,
          responsavelMarcenaria: scheduleForm.responsavelMarcenaria,
          responsavelVisita: scheduleForm.responsavelVisita,
          responsavelImplantacao: scheduleForm.responsavelImplantacao,
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
      dataMarcenaria: "",
      duracaoMarcenariaDias: "",
      responsavelMarcenaria: "",
      responsavelVisita: "",
      responsavelImplantacao: "",
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
    type: "visita" | "implantacao" | "inauguracao" | "marcenaria";
    memberKey: string;
    memberLabel: string;
    city: string;
    start: Date;
    end: Date;
  };
  const scheduleBlocks: ScheduleBlock[] = [];
  stores.forEach((s) => {
    const visita = (s.visitaTecnica as any) || {};
    const defaultLabel = (s.analistaObra || "").toString().trim();
    const defaultKey = normalizeName(defaultLabel);
    const city = (visita.cidade || "").toString().trim();

    // Marcenaria
    const marcStart = parseDateValue(visita.dataMarcenaria);
    const marcDays = toPositiveNumber(visita.duracaoMarcenariaDias || 0);
    const marcLabel = (visita.responsavelMarcenaria || defaultLabel).toString().trim();
    const marcKey = normalizeName(marcLabel);
    if (marcStart && marcDays > 0 && marcKey) {
      scheduleBlocks.push({
        storeId: s.id, storeName: s.nome, type: "marcenaria",
        memberKey: marcKey, memberLabel: marcLabel, city,
        start: marcStart, end: addDays(marcStart, marcDays - 1),
      });
    }

    // Visita Técnica
    const visitaStart = parseDateValue(visita.dataVisita);
    const visitaDays = toPositiveNumber(visita.duracaoVisitaDias || 0);
    const vtLabel = (visita.responsavelVisita || defaultLabel).toString().trim();
    const vtKey = normalizeName(vtLabel);
    if (visitaStart && visitaDays > 0 && vtKey) {
      scheduleBlocks.push({
        storeId: s.id, storeName: s.nome, type: "visita",
        memberKey: vtKey, memberLabel: vtLabel, city,
        start: visitaStart, end: addDays(visitaStart, visitaDays - 1),
      });
    }

    // Implantação
    const implantStart = parseDateValue(visita.dataImplantacao);
    const implantDays = toPositiveNumber(visita.duracaoImplantacaoDias || 0);
    const implLabel = (visita.responsavelImplantacao || defaultLabel).toString().trim();
    const implKey = normalizeName(implLabel);
    if (implantStart && implantDays > 0 && implKey) {
      scheduleBlocks.push({
        storeId: s.id, storeName: s.nome, type: "implantacao",
        memberKey: implKey, memberLabel: implLabel, city,
        start: implantStart, end: addDays(implantStart, implantDays - 1),
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
            <TabsTrigger value="ferias_gustavo" className="gap-2 text-[hsl(38,90%,55%)]"><Sun className="h-4 w-4" /> Férias Gustavo</TabsTrigger>
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

            {/* Sub-tabs: Ativas / Concluídas */}
            <div className="flex gap-2 mb-4">
              <Button variant={taskViewTab === "ativas" ? "default" : "outline"} size="sm" onClick={() => setTaskViewTab("ativas")}>
                Ativas
              </Button>
              <Button variant={taskViewTab === "concluidas" ? "default" : "outline"} size="sm" onClick={() => setTaskViewTab("concluidas")}>
                Concluídas
              </Button>
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
                      <TableHead>{taskViewTab === "concluidas" ? "Concluída em" : "Status"}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      let filtered = taskMemberFilter
                        ? tasks.filter((t) => t.assigned_to === taskMemberFilter)
                        : tasks;
                      if (taskViewTab === "ativas") {
                        filtered = filtered.filter((t) => t.status !== "concluida");
                      } else {
                        filtered = filtered.filter((t) => t.status === "concluida");
                      }
                      return filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          {taskViewTab === "concluidas" ? "Nenhuma tarefa concluída" : "Nenhuma tarefa cadastrada"}
                        </TableCell></TableRow>
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
                          {taskViewTab === "concluidas" ? (
                            <span className="text-xs text-muted-foreground">{formatDate(task.updated_at)}</span>
                          ) : (
                            <Select value={task.status} onValueChange={(v) => updateTaskStatus(task.id, v)}>
                              <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
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
              <h2 className="text-lg font-semibold">Programação</h2>
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

            {/* Sub-tabs: Equipe / Mobiliário */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={scheduleSubTab === "equipe" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setScheduleSubTab("equipe")}
              >
                <Users className="h-4 w-4" /> Equipe (VT + Implantação)
              </Button>
              <Button
                variant={scheduleSubTab === "mobiliario" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setScheduleSubTab("mobiliario")}
              >
                🪑 Mobiliário (Marcenaria)
              </Button>
            </div>

            {/* ---- SUB-TAB: EQUIPE ---- */}
            {scheduleSubTab === "equipe" && (
              <>
                {/* Gantt - only VT + Implantação */}
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Quadro Equipe — VT & Implantação</CardTitle>
                    <p className="text-xs text-muted-foreground">Visão consolidada por responsável.</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => {
                      const equipeBlocks = scheduleBlocks.filter((b) => b.type === "visita" || b.type === "implantacao");
                      if (equipeBlocks.length === 0) return <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma programação de equipe cadastrada</div>;
                      const equipeConflictMap = equipeBlocks.reduce<Record<string, Record<string, number>>>((acc, block) => {
                        if (!acc[block.memberKey]) acc[block.memberKey] = {};
                        eachDayOfInterval({ start: block.start, end: block.end }).forEach((day) => {
                          const key = format(day, "yyyy-MM-dd");
                          acc[block.memberKey][key] = (acc[block.memberKey][key] || 0) + 1;
                        });
                        return acc;
                      }, {});
                      const equipeMembers = Object.values(
                        equipeBlocks.reduce<Record<string, { key: string; label: string }>>((acc, block) => {
                          if (!block.memberKey) return acc;
                          if (!acc[block.memberKey]) acc[block.memberKey] = { key: block.memberKey, label: block.memberLabel };
                          return acc;
                        }, {})
                      ).sort((a, b) => {
                        const aIdx = analystOrder.indexOf(a.key);
                        const bIdx = analystOrder.indexOf(b.key);
                        if (aIdx !== -1 || bIdx !== -1) return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
                        return a.label.localeCompare(b.label, "pt-BR");
                      });
                      return (
                        <div className="overflow-x-auto">
                          <div className="flex items-center gap-4 px-3 py-2 text-[10px] text-muted-foreground flex-wrap">
                            <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-[hsl(190,70%,45%)]" /> VT Visita Técnica</span>
                            <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-[hsl(152,60%,40%)]" /> I Implantação</span>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-border/60">
                                <th className="sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px]"></th>
                                <th className="text-center px-2 py-2" colSpan={scheduleDays.length}>
                                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary" style={{ textShadow: "0 1px 6px hsl(var(--primary) / 0.45)" }}>
                                    {format(scheduleMonth, "MMMM yyyy", { locale: ptBR })}
                                  </span>
                                </th>
                              </tr>
                              <tr className="border-b border-border">
                                <th className="sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px]">Responsável</th>
                                {scheduleDays.map((day) => {
                                  const isToday = isSameDay(day, new Date());
                                  return (
                                    <th key={day.toISOString()} className={`text-center px-0 py-1 min-w-[32px] ${isToday ? "text-primary" : "text-muted-foreground"}`}>
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
                              {equipeMembers.map((member) => (
                                <tr key={member.key} className="border-b border-border/50 hover:bg-muted/30">
                                  <td className="sticky left-0 z-10 bg-card px-3 py-2">
                                    <div className="font-semibold text-sm">{member.label}</div>
                                  </td>
                                  {scheduleDays.map((day) => {
                                    const dayKey = format(day, "yyyy-MM-dd");
                                    const blocks = equipeBlocks.filter((b) => b.memberKey === member.key && isWithinInterval(day, { start: b.start, end: b.end }));
                                    const hasConflict = (equipeConflictMap[member.key]?.[dayKey] || 0) > 1;
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                      <td key={`${member.key}-${dayKey}`} className={`text-center px-0 py-1 ${hasConflict ? "ring-2 ring-destructive/60 bg-destructive/10" : ""} ${isWeekend ? "bg-muted/20" : ""}`}>
                                        <div className="flex flex-col items-center gap-0.5">
                                          {blocks.map((b) => {
                                            const label = b.type === "visita" ? "VT" : "I";
                                            const color = b.type === "visita"
                                              ? "bg-[hsl(190,70%,45%)] text-[hsl(0,0%,100%)]"
                                              : "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]";
                                            return (
                                              <div key={`${b.storeId}-${b.type}`} className={`h-5 min-w-[24px] px-1 rounded text-[10px] font-bold flex items-center justify-center ${color}`}
                                                title={`${b.storeName} (${b.city}) • ${b.type === "visita" ? "Visita Técnica" : "Implantação"} • ${format(b.start, "dd/MM")} - ${format(b.end, "dd/MM")}`}>
                                                {label}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Table: VT + Implantação data per store */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Dados por loja — Equipe</CardTitle>
                    <p className="text-xs text-muted-foreground">VT e Implantação com responsáveis.</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left px-3 py-2.5 min-w-[160px] font-semibold">Loja</th>
                            <th className="text-left px-3 py-2.5 min-w-[100px] font-semibold">Cidade</th>
                            <th className="text-left px-3 py-2.5 min-w-[110px] bg-[hsl(190,70%,45%)/0.08] font-semibold text-[hsl(190,70%,35%)]">VT (data)</th>
                            <th className="text-left px-3 py-2.5 min-w-[60px] bg-[hsl(190,70%,45%)/0.08] font-semibold text-[hsl(190,70%,35%)]">Dias</th>
                            <th className="text-left px-3 py-2.5 min-w-[110px] bg-[hsl(190,70%,45%)/0.08] font-semibold text-[hsl(190,70%,35%)]">Resp. VT</th>
                            <th className="text-left px-3 py-2.5 min-w-[110px] bg-[hsl(152,60%,40%)/0.08] font-semibold text-[hsl(152,60%,30%)]">Impl. (data)</th>
                            <th className="text-left px-3 py-2.5 min-w-[60px] bg-[hsl(152,60%,40%)/0.08] font-semibold text-[hsl(152,60%,30%)]">Dias</th>
                            <th className="text-left px-3 py-2.5 min-w-[110px] bg-[hsl(152,60%,40%)/0.08] font-semibold text-[hsl(152,60%,30%)]">Resp. Impl.</th>
                            <th className="text-left px-3 py-2.5 min-w-[60px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* New row */}
                          <tr className="border-b border-border/50 bg-muted/30">
                            <td className="px-3 py-2">
                              <Input className="h-8 text-xs" placeholder="Nome da loja" value={scheduleForm.nome} onChange={(e) => setScheduleForm({ ...scheduleForm, nome: e.target.value })} />
                            </td>
                            <td className="px-3 py-2">
                              <Input className="h-8 text-xs" value={scheduleForm.cidade} onChange={(e) => setScheduleForm({ ...scheduleForm, cidade: e.target.value })} />
                            </td>
                            <td className="px-3 py-2"><Input type="date" className="h-8 text-xs" value={scheduleForm.dataVisita} onChange={(e) => setScheduleForm({ ...scheduleForm, dataVisita: e.target.value })} /></td>
                            <td className="px-3 py-2"><Input type="number" min={1} className="h-8 text-xs w-16" value={scheduleForm.duracaoVisitaDias} onChange={(e) => setScheduleForm({ ...scheduleForm, duracaoVisitaDias: e.target.value })} /></td>
                            <td className="px-3 py-2"><Input list="analistas-list" className="h-8 text-xs" value={scheduleForm.responsavelVisita} onChange={(e) => setScheduleForm({ ...scheduleForm, responsavelVisita: e.target.value })} /></td>
                            <td className="px-3 py-2"><Input type="date" className="h-8 text-xs" value={scheduleForm.dataImplantacao} onChange={(e) => setScheduleForm({ ...scheduleForm, dataImplantacao: e.target.value })} /></td>
                            <td className="px-3 py-2"><Input type="number" min={1} className="h-8 text-xs w-16" value={scheduleForm.duracaoImplantacaoDias} onChange={(e) => setScheduleForm({ ...scheduleForm, duracaoImplantacaoDias: e.target.value })} /></td>
                            <td className="px-3 py-2"><Input list="analistas-list" className="h-8 text-xs" value={scheduleForm.responsavelImplantacao} onChange={(e) => setScheduleForm({ ...scheduleForm, responsavelImplantacao: e.target.value })} /></td>
                            <td className="px-3 py-2">
                              <Button size="sm" className="h-8 text-xs" onClick={addScheduleStore}>Adicionar</Button>
                            </td>
                          </tr>
                          {stores.length === 0 ? (
                            <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Nenhuma loja cadastrada</td></tr>
                          ) : stores.map((store) => {
                            const visita = (store.visitaTecnica as any) || {};
                            return (
                              <tr key={store.id} className="border-b border-border/50 hover:bg-muted/20">
                                <td className="px-3 py-2 font-medium">{store.nome}</td>
                                <td className="px-3 py-2">
                                  <Input className="h-8 text-xs" value={(visita.cidade || "").toString()} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, cidade: e.target.value } } as any)} />
                                </td>
                                <td className="px-3 py-2"><Input type="date" className="h-8 text-xs" value={visita.dataVisita || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, dataVisita: e.target.value } } as any)} /></td>
                                <td className="px-3 py-2"><Input type="number" min={1} className="h-8 text-xs w-16" value={visita.duracaoVisitaDias || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, duracaoVisitaDias: e.target.value } } as any)} /></td>
                                <td className="px-3 py-2"><Input list="analistas-list" className="h-8 text-xs" value={visita.responsavelVisita || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, responsavelVisita: e.target.value } } as any)} /></td>
                                <td className="px-3 py-2"><Input type="date" className="h-8 text-xs" value={visita.dataImplantacao || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, dataImplantacao: e.target.value } } as any)} /></td>
                                <td className="px-3 py-2"><Input type="number" min={1} className="h-8 text-xs w-16" value={visita.duracaoImplantacaoDias || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, duracaoImplantacaoDias: e.target.value } } as any)} /></td>
                                <td className="px-3 py-2"><Input list="analistas-list" className="h-8 text-xs" value={visita.responsavelImplantacao || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, responsavelImplantacao: e.target.value } } as any)} /></td>
                                <td className="px-3 py-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Excluir esta loja?")) deleteStore(store.id); }}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <datalist id="analistas-list">
                        {ANALYST_OPTIONS.map((name) => <option key={name} value={name} />)}
                      </datalist>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ---- SUB-TAB: MOBILIÁRIO ---- */}
            {scheduleSubTab === "mobiliario" && (
              <>
                {/* Gantt - only Marcenaria */}
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Quadro Mobiliário — Marcenaria</CardTitle>
                    <p className="text-xs text-muted-foreground">Visão consolidada por fornecedor/responsável.</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => {
                      const marcBlocks = scheduleBlocks.filter((b) => b.type === "marcenaria");
                      if (marcBlocks.length === 0) return <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma programação de marcenaria cadastrada</div>;
                      const marcConflictMap = marcBlocks.reduce<Record<string, Record<string, number>>>((acc, block) => {
                        if (!acc[block.memberKey]) acc[block.memberKey] = {};
                        eachDayOfInterval({ start: block.start, end: block.end }).forEach((day) => {
                          const key = format(day, "yyyy-MM-dd");
                          acc[block.memberKey][key] = (acc[block.memberKey][key] || 0) + 1;
                        });
                        return acc;
                      }, {});
                      const marcMembers = Object.values(
                        marcBlocks.reduce<Record<string, { key: string; label: string }>>((acc, block) => {
                          if (!block.memberKey) return acc;
                          if (!acc[block.memberKey]) acc[block.memberKey] = { key: block.memberKey, label: block.memberLabel };
                          return acc;
                        }, {})
                      ).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
                      return (
                        <div className="overflow-x-auto">
                          <div className="flex items-center gap-4 px-3 py-2 text-[10px] text-muted-foreground flex-wrap">
                            <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-[hsl(30,80%,50%)]" /> M Marcenaria</span>
                          </div>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-border/60">
                                <th className="sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px]"></th>
                                <th className="text-center px-2 py-2" colSpan={scheduleDays.length}>
                                  <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[hsl(30,80%,50%)]">
                                    {format(scheduleMonth, "MMMM yyyy", { locale: ptBR })}
                                  </span>
                                </th>
                              </tr>
                              <tr className="border-b border-border">
                                <th className="sticky left-0 z-10 bg-card text-left px-3 py-2 min-w-[180px]">Fornecedor</th>
                                {scheduleDays.map((day) => {
                                  const isToday = isSameDay(day, new Date());
                                  return (
                                    <th key={day.toISOString()} className={`text-center px-0 py-1 min-w-[32px] ${isToday ? "text-[hsl(30,80%,50%)]" : "text-muted-foreground"}`}>
                                      <div className="text-[10px]">{["D", "S", "T", "Q", "Q", "S", "S"][day.getDay()]}</div>
                                      <div className={`text-xs font-medium ${isToday ? "bg-[hsl(30,80%,50%)] text-[hsl(0,0%,100%)] rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""}`}>
                                        {format(day, "d")}
                                      </div>
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {marcMembers.map((member) => (
                                <tr key={member.key} className="border-b border-border/50 hover:bg-muted/30">
                                  <td className="sticky left-0 z-10 bg-card px-3 py-2">
                                    <div className="font-semibold text-sm">{member.label}</div>
                                    {/* Show stores under this member */}
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      {marcBlocks.filter((b) => b.memberKey === member.key).map((b) => b.storeName).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                                    </div>
                                  </td>
                                  {scheduleDays.map((day) => {
                                    const dayKey = format(day, "yyyy-MM-dd");
                                    const blocks = marcBlocks.filter((b) => b.memberKey === member.key && isWithinInterval(day, { start: b.start, end: b.end }));
                                    const hasConflict = (marcConflictMap[member.key]?.[dayKey] || 0) > 1;
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                      <td key={`${member.key}-${dayKey}`} className={`text-center px-0 py-1 ${hasConflict ? "ring-2 ring-destructive/60 bg-destructive/10" : ""} ${isWeekend ? "bg-muted/20" : ""}`}>
                                        <div className="flex flex-col items-center gap-0.5">
                                          {blocks.map((b) => (
                                            <div key={`${b.storeId}-${b.type}`} className="h-5 min-w-[24px] px-1 rounded text-[10px] font-bold flex items-center justify-center bg-[hsl(30,80%,50%)] text-[hsl(0,0%,100%)]"
                                              title={`${b.storeName} (${b.city}) • Marcenaria • ${format(b.start, "dd/MM")} - ${format(b.end, "dd/MM")}`}>
                                              M
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Table: Marcenaria data per store */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Dados por loja — Mobiliário</CardTitle>
                    <p className="text-xs text-muted-foreground">Datas e fornecedores de marcenaria.</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left px-3 py-2.5 min-w-[160px] font-semibold">Loja</th>
                            <th className="text-left px-3 py-2.5 min-w-[100px] font-semibold">Cidade</th>
                            <th className="text-left px-3 py-2.5 min-w-[110px] bg-[hsl(30,80%,50%)/0.08] font-semibold text-[hsl(30,80%,40%)]">Data Início</th>
                            <th className="text-left px-3 py-2.5 min-w-[60px] bg-[hsl(30,80%,50%)/0.08] font-semibold text-[hsl(30,80%,40%)]">Dias</th>
                            <th className="text-left px-3 py-2.5 min-w-[110px] bg-[hsl(30,80%,50%)/0.08] font-semibold text-[hsl(30,80%,40%)]">Fornecedor</th>
                            <th className="text-left px-3 py-2.5 min-w-[100px] bg-[hsl(30,80%,50%)/0.08] font-semibold text-[hsl(30,80%,40%)]">Término</th>
                            <th className="text-left px-3 py-2.5 min-w-[60px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* New row */}
                          <tr className="border-b border-border/50 bg-muted/30">
                            <td className="px-3 py-2">
                              <Input className="h-8 text-xs" placeholder="Nome da loja" value={scheduleForm.nome} onChange={(e) => setScheduleForm({ ...scheduleForm, nome: e.target.value })} />
                            </td>
                            <td className="px-3 py-2">
                              <Input className="h-8 text-xs" value={scheduleForm.cidade} onChange={(e) => setScheduleForm({ ...scheduleForm, cidade: e.target.value })} />
                            </td>
                            <td className="px-3 py-2"><Input type="date" className="h-8 text-xs" value={scheduleForm.dataMarcenaria} onChange={(e) => setScheduleForm({ ...scheduleForm, dataMarcenaria: e.target.value })} /></td>
                            <td className="px-3 py-2"><Input type="number" min={1} className="h-8 text-xs w-16" value={scheduleForm.duracaoMarcenariaDias} onChange={(e) => setScheduleForm({ ...scheduleForm, duracaoMarcenariaDias: e.target.value })} /></td>
                            <td className="px-3 py-2"><Input list="analistas-marc-list" className="h-8 text-xs" value={scheduleForm.responsavelMarcenaria} onChange={(e) => setScheduleForm({ ...scheduleForm, responsavelMarcenaria: e.target.value })} /></td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {scheduleForm.dataMarcenaria && scheduleForm.duracaoMarcenariaDias
                                ? formatDate(format(addDays(new Date(scheduleForm.dataMarcenaria + "T00:00:00"), Number(scheduleForm.duracaoMarcenariaDias) - 1), "yyyy-MM-dd"))
                                : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <Button size="sm" className="h-8 text-xs" onClick={addScheduleStore}>Adicionar</Button>
                            </td>
                          </tr>
                          {stores.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma loja cadastrada</td></tr>
                          ) : stores.map((store) => {
                            const visita = (store.visitaTecnica as any) || {};
                            const marcEnd = visita.dataMarcenaria && visita.duracaoMarcenariaDias
                              ? format(addDays(new Date(visita.dataMarcenaria + "T00:00:00"), Number(visita.duracaoMarcenariaDias) - 1), "yyyy-MM-dd")
                              : "";
                            return (
                              <tr key={store.id} className="border-b border-border/50 hover:bg-muted/20">
                                <td className="px-3 py-2 font-medium">{store.nome}</td>
                                <td className="px-3 py-2">
                                  <Input className="h-8 text-xs" value={(visita.cidade || "").toString()} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, cidade: e.target.value } } as any)} />
                                </td>
                                <td className="px-3 py-2"><Input type="date" className="h-8 text-xs" value={visita.dataMarcenaria || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, dataMarcenaria: e.target.value } } as any)} /></td>
                                <td className="px-3 py-2"><Input type="number" min={1} className="h-8 text-xs w-16" value={visita.duracaoMarcenariaDias || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, duracaoMarcenariaDias: e.target.value } } as any)} /></td>
                                <td className="px-3 py-2"><Input list="analistas-marc-list" className="h-8 text-xs" value={visita.responsavelMarcenaria || ""} onChange={(e) => updateStore(store.id, { visitaTecnica: { ...visita, responsavelMarcenaria: e.target.value } } as any)} /></td>
                                <td className="px-3 py-2 text-muted-foreground">{formatDate(marcEnd)}</td>
                                <td className="px-3 py-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Excluir esta loja?")) deleteStore(store.id); }}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <datalist id="analistas-marc-list">
                        {ANALYST_OPTIONS.map((name) => <option key={name} value={name} />)}
                      </datalist>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Data Início</Label>
                        <Input type="date" value={editingEventDate} onChange={(e) => setEditingEventDate(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Data Fim (opcional)</Label>
                        <Input type="date" value={editingEventEndDate} onChange={(e) => setEditingEventEndDate(e.target.value)} />
                      </div>
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

          <TabsContent value="ferias_gustavo">
            <Tabs defaultValue="pendencias" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="pendencias" className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4" /> Pendências Lojas
                </TabsTrigger>
                <TabsTrigger value="plano_acao" className="flex items-center gap-2">
                  <Target className="h-4 w-4" /> Plano de Ação
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pendencias">
                <Card className="border-[hsl(38,90%,55%)]/30">
                  <CardHeader className="bg-[hsl(38,90%,55%)]/5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-[hsl(38,90%,55%)]">
                          <Sun className="h-5 w-5" /> Demandas & Tarefas - Férias Gustavo
                        </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Acompanhamento geral de projetos, obras e pendências das lojas.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2 border-[hsl(38,90%,55%)] text-[hsl(38,90%,55%)] hover:bg-[hsl(38,90%,55%)] hover:text-white"
                    onClick={async () => {
                      try {
                        await exportFeriasGustavoExcel(stores);
                        toast({
                          title: "Relatório gerado!",
                          description: "O arquivo Excel foi formatado seguindo o padrão Constance e baixado com sucesso.",
                        });
                      } catch (error) {
                        toast({
                          title: "Erro ao gerar relatório",
                          description: "Não foi possível gerar o arquivo Excel.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <FileDown className="h-4 w-4" /> Exportar XLS
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                    onClick={() => {
                      stores.forEach(store => {
                        updateStore(store.id, { 
                          checklist: {}, 
                          solicitacoes: {}, 
                          visitaTecnica: {} 
                        } as any);
                      });
                      toast({ 
                        title: "Pendências Zeradas", 
                        description: "Todas as pendências e status das lojas foram limpos." 
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Zerar Pendências
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Loja</TableHead>
                        <TableHead className="min-w-[120px]">Arquitetônico</TableHead>
                        <TableHead className="min-w-[120px]">Elétrico</TableHead>
                        <TableHead className="min-w-[120px]">Incêndio</TableHead>
                        <TableHead className="min-w-[120px]">Ar Condic.</TableHead>
                        <TableHead className="min-w-[120px]">Orçamentos</TableHead>
                        <TableHead className="min-w-[120px]">Demolição</TableHead>
                        <TableHead className="min-w-[120px]">Obra Início</TableHead>
                        <TableHead className="min-w-[120px]">Contrato Obra</TableHead>
                        <TableHead className="min-w-[120px]">Checklist Ini.</TableHead>
                        <TableHead className="min-w-[120px]">Apres. Proj.</TableHead>
                        <TableHead className="min-w-[120px]">Móveis</TableHead>
                        <TableHead className="min-w-[120px]">Piso</TableHead>
                        <TableHead className="min-w-[120px]">Luminárias</TableHead>
                        <TableHead className="min-w-[120px]">Teca</TableHead>
                        <TableHead className="min-w-[120px]">Antena</TableHead>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">V. Técnica</TableHead>
                        <TableHead className="min-w-[120px]">V. Implant.</TableHead>
                        <TableHead className="min-w-[120px]">Inauguração</TableHead>
                        <TableHead className="min-w-[120px]">Sist. Implant.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stores.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={21} className="text-center py-10 text-muted-foreground">
                            Nenhuma loja cadastrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        stores.map((store) => {
                          const checklist = store.checklist || {};
                          const solicitacoes = (store as any).solicitacoes || {};
                          const visita = (store as any).visitaTecnica || {};
                          
                          // Helper to get item status
                          const getItemStatus = (id: number) => checklist[id]?.status || "NÃO INICIADO";
                          const getSolStatus = (id: string) => solicitacoes[id]?.status || "pendente";

                          return (
                            <TableRow key={store.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/loja/${store.id}`)}>
                              <TableCell>
                                <div className="font-semibold">{store.nome}</div>
                                {store.analistaObra && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <User className="h-3 w-3" /> {store.analistaObra}
                                  </div>
                                )}
                              </TableCell>
                              
                              {/* Arquitetônico (Item 28) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[28]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(28)}
                                  </Badge>
                                  {getItemStatus(28) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[28]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 28: { ...checklist[28], status: checklist[28]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Elétrico (Item 31) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[31]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(31)}
                                  </Badge>
                                  {getItemStatus(31) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[31]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 31: { ...checklist[31], status: checklist[31]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Incêndio (Item 32) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[32]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(32)}
                                  </Badge>
                                  {getItemStatus(32) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[32]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 32: { ...checklist[32], status: checklist[32]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Ar Condicionado (Item 33) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[33]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(33)}
                                  </Badge>
                                  {getItemStatus(33) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[33]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 33: { ...checklist[33], status: checklist[33]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Orçamentos (Item 36) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[36]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(36)}
                                  </Badge>
                                  {getItemStatus(36) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[36]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 36: { ...checklist[36], status: checklist[36]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Demolição (Item 61) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[61]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(61)}
                                  </Badge>
                                  {getItemStatus(61) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[61]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 61: { ...checklist[61], status: checklist[61]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Início de Obra */}
                              <TableCell>
                                <Badge variant="outline">
                                  {checklist[40]?.status === "REALIZADO" ? "Iniciada" : "Aguardando"}
                                </Badge>
                              </TableCell>
                              
                              {/* Contrato Obra */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={getSolStatus("contrato_obras") === "concluido" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getSolStatus("contrato_obras")}
                                  </Badge>
                                  {getSolStatus("contrato_obras") === "pendente" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={solicitacoes["contrato_obras"]?.comentarios || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        solicitacoes: { ...solicitacoes, "contrato_obras": { ...solicitacoes["contrato_obras"], status: solicitacoes["contrato_obras"]?.status || "pendente", comentarios: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Checklist Iniciado */}
                              <TableCell>
                                <Badge variant="outline" className={Object.keys(checklist).length > 5 ? "bg-blue-500 text-white border-none" : ""}>
                                  {Object.keys(checklist).length > 5 ? "Sim" : "Não"}
                                </Badge>
                              </TableCell>
                              
                              {/* Apresentação Projetos (Item 27) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[27]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(27)}
                                  </Badge>
                                  {getItemStatus(27) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[27]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 27: { ...checklist[27], status: checklist[27]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Móveis (Item 44) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[44]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(44)}
                                  </Badge>
                                  {getItemStatus(44) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[44]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 44: { ...checklist[44], status: checklist[44]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Piso (Item 46) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[46]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(46)}
                                  </Badge>
                                  {getItemStatus(46) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[46]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 46: { ...checklist[46], status: checklist[46]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Luminárias (Item 53) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[53]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(53)}
                                  </Badge>
                                  {getItemStatus(53) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[53]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 53: { ...checklist[53], status: checklist[53]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Teca (Item 49) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[49]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(49)}
                                  </Badge>
                                  {getItemStatus(49) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[49]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 49: { ...checklist[49], status: checklist[49]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Antena (Item 50) */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[50]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(50)}
                                  </Badge>
                                  {getItemStatus(50) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[50]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 50: { ...checklist[50], status: checklist[50]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              
                              {/* Status Lojas */}
                              <TableCell>
                                {(() => {
                                  const done = Object.values(checklist).filter(i => i.status === "REALIZADO").length;
                                  const pct = Math.round((done / 144) * 100);
                                  return <div className="text-xs font-bold">{pct}%</div>
                                })()}
                              </TableCell>
                              
                              {/* Visita Técnica */}
                              <TableCell className="text-xs">
                                {visita.dataVisita ? formatDate(visita.dataVisita) : "—"}
                              </TableCell>
                              
                              {/* Visita Implantação */}
                              <TableCell className="text-xs">
                                {visita.dataImplantacao ? formatDate(visita.dataImplantacao) : "—"}
                              </TableCell>
                              
                              {/* Data Inauguração */}
                              <TableCell className="text-xs font-bold">
                                {store.inauguracao ? formatDate(store.inauguracao) : "—"}
                              </TableCell>
                              
                              {/* Implantação Sistema */}
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                  <Badge variant="outline" className={checklist[106]?.status === "REALIZADO" ? "bg-[hsl(var(--success))] text-white border-none" : ""}>
                                    {getItemStatus(106)}
                                  </Badge>
                                  {getItemStatus(106) === "NÃO INICIADO" && (
                                    <Input 
                                      className="h-6 text-[10px] px-1" 
                                      placeholder="Ação..." 
                                      value={checklist[106]?.observacoes || ""}
                                      onChange={(e) => updateStore(store.id, { 
                                        checklist: { ...checklist, 106: { ...checklist[106], status: checklist[106]?.status || "NÃO INICIADO", observacoes: e.target.value } } 
                                      } as any)}
                                    />
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="plano_acao">
                <Card className="border-[hsl(38,90%,55%)]/30">
                  <CardHeader className="bg-[hsl(38,90%,55%)]/5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-[hsl(38,90%,55%)]">
                          <Target className="h-5 w-5" /> Planos de Ação (Gustavo)
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Estratégias e ações preventivas/corretivas para o período de férias.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          className="border-destructive text-destructive hover:bg-destructive hover:text-white gap-2"
                          onClick={() => {
                            stores.forEach(store => {
                              updateStore(store.id, { actionPlans: [] } as any);
                            });
                            toast({ 
                              title: "Informações Zeradas", 
                              description: "Todos os planos de ação das férias do Gustavo foram removidos." 
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Zerar Planos de Ação
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="bg-[hsl(38,90%,55%)] hover:bg-[hsl(38,90%,65%)] text-white gap-2">
                              <Plus className="h-4 w-4" /> Novo Plano
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Criar Novo Plano de Ação</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Loja Responsável</Label>
                                <Select onValueChange={(val) => {
                                  const store = stores.find(s => s.id === val);
                                  if (store) {
                                    // @ts-ignore
                                    const plans = store.actionPlans || [];
                                    const newPlan = { id: crypto.randomUUID(), description: "", deadline: "", status: "pendente", responsible: "Gustavo", created_at: new Date().toISOString() };
                                    updateStore(store.id, { actionPlans: [...plans, newPlan] } as any);
                                    toast({ title: "Plano iniciado", description: `Plano de ação criado para ${store.nome}` });
                                  }
                                }}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione a loja..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Loja</TableHead>
                            <TableHead>Ação / Planejamento</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Prazo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stores.flatMap(store => (store as any).actionPlans?.map((plan: any) => (
                            <TableRow key={plan.id}>
                              <TableCell className="font-medium">{store.nome}</TableCell>
                              <TableCell>
                                <Input 
                                  value={plan.description} 
                                  onChange={(e) => {
                                    const updatedPlans = (store as any).actionPlans.map((p: any) => p.id === plan.id ? { ...p, description: e.target.value } : p);
                                    updateStore(store.id, { actionPlans: updatedPlans } as any);
                                  }}
                                  placeholder="Descreva a ação..."
                                />
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={plan.responsible} 
                                  onValueChange={(val) => {
                                    const updatedPlans = (store as any).actionPlans.map((p: any) => p.id === plan.id ? { ...p, responsible: val } : p);
                                    updateStore(store.id, { actionPlans: updatedPlans } as any);
                                  }}
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ANALYST_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="date" 
                                  value={plan.deadline}
                                  className="w-[130px]"
                                  onChange={(e) => {
                                    const updatedPlans = (store as any).actionPlans.map((p: any) => p.id === plan.id ? { ...p, deadline: e.target.value } : p);
                                    updateStore(store.id, { actionPlans: updatedPlans } as any);
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={`cursor-pointer ${plan.status === "concluido" ? "bg-[hsl(var(--success))] text-white" : "bg-yellow-100 text-yellow-800"}`}
                                  onClick={() => {
                                    const newStatus = plan.status === "concluido" ? "pendente" : "concluido";
                                    const updatedPlans = (store as any).actionPlans.map((p: any) => p.id === plan.id ? { ...p, status: newStatus } : p);
                                    updateStore(store.id, { actionPlans: updatedPlans } as any);
                                  }}
                                >
                                  {plan.status === "concluido" ? "Concluído" : "Pendente"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    const updatedPlans = (store as any).actionPlans.filter((p: any) => p.id !== plan.id);
                                    updateStore(store.id, { actionPlans: updatedPlans } as any);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )) || []).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                Nenhum plano de ação registrado. Clique em "Novo Plano" para começar.
                              </TableCell>
                            </TableRow>
                          ) : (
                            stores.map(store => {
                              const plans = (store as any).actionPlans || [];
                              return plans.map((plan: any) => (
                                <TableRow key={plan.id}>
                                  <TableCell className="font-medium">{store.nome}</TableCell>
                                  <TableCell>
                                    <Input 
                                      value={plan.description} 
                                      onChange={(e) => {
                                        const updatedPlans = (store as any).actionPlans.map((p: any) => p.id === plan.id ? { ...p, description: e.target.value } : p);
                                        updateStore(store.id, { actionPlans: updatedPlans } as any);
                                      }}
                                      placeholder="Descreva a ação..."
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select 
                                      value={plan.responsible} 
                                      onValueChange={(val) => {
                                        const updatedPlans = (store as any).actionPlans.map((p: any) => p.id === plan.id ? { ...p, responsible: val } : p);
                                        updateStore(store.id, { actionPlans: updatedPlans } as any);
                                      }}
                                    >
                                      <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ANALYST_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input 
                                      type="date" 
                                      value={plan.deadline}
                                      className="w-[130px]"
                                      onChange={(e) => {
                                        const updatedPlans = (store as any).actionPlans.map((p: any) => p.id === plan.id ? { ...p, deadline: e.target.value } : p);
                                        updateStore(store.id, { actionPlans: updatedPlans } as any);
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={`cursor-pointer ${plan.status === "concluido" ? "bg-[hsl(var(--success))] text-white" : "bg-yellow-100 text-yellow-800"}`}
                                      onClick={() => {
                                        const newStatus = plan.status === "concluido" ? "pendente" : "concluido";
                                        const updatedPlans = (store as any).actionPlans.map((p: any) => p.id === plan.id ? { ...p, status: newStatus } : p);
                                        updateStore(store.id, { actionPlans: updatedPlans } as any);
                                      }}
                                    >
                                      {plan.status === "concluido" ? "Concluído" : "Pendente"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        const updatedPlans = (store as any).actionPlans.filter((p: any) => p.id !== plan.id);
                                        updateStore(store.id, { actionPlans: updatedPlans } as any);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ));
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Equipe;
