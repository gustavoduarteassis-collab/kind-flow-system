import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ListChecks, ExternalLink, Trash2 } from "lucide-react";
import { formatBR } from "@/utils/safeDate";
import { useNavigate } from "react-router-dom";

interface Member { id: string; name: string; }
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  assigned_name?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-[hsl(45,90%,55%)] text-[hsl(45,90%,15%)]",
  concluida: "bg-[hsl(142,60%,40%)] text-white",
  cancelada: "bg-destructive text-destructive-foreground",
};
const PRIORITY_COLOR: Record<string, string> = {
  urgente: "bg-destructive text-destructive-foreground",
  alta: "bg-[hsl(14,90%,55%)] text-white",
  media: "bg-[hsl(45,90%,55%)] text-[hsl(45,90%,15%)]",
  baixa: "bg-muted text-muted-foreground",
};

interface Props {
  storeId: string;
  storeName: string;
  canEdit: boolean;
}

export default function TarefasTab({ storeId, storeName, canEdit }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", priority: "media", status: "pendente",
    due_date: "", assigned_to: "",
  });

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_date, assigned_to, team_members(name)")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setTasks(((data as any[]) || []).map((t) => ({ ...t, assigned_name: t.team_members?.name || null })));
  }, [storeId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("team_members").select("id, name").is("deleted_at", null).order("name");
      setMembers((data as any) || []);
    })();
  }, []);

  async function handleCreate() {
    if (!user || !form.title.trim()) { toast.error("Título é obrigatório"); return; }
    const { error } = await supabase.from("tasks").insert([{
      user_id: user.id,
      store_id: storeId,
      title: `${form.title.trim()} — ${storeName}`,
      description: form.description || null,
      priority: form.priority as any,
      status: form.status as any,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      task_type: "loja" as any,
    }]);
    if (error) { toast.error("Erro ao criar tarefa"); return; }
    toast.success("Tarefa criada!");
    setOpen(false);
    setForm({ title: "", description: "", priority: "media", status: "pendente", due_date: "", assigned_to: "" });
    fetchTasks();
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from("tasks").update({ status }).eq("id", id);
    fetchTasks();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir tarefa? Ela poderá ser restaurada em Itens Excluídos.")) return;
    await supabase.from("tasks")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq("id", id);
    fetchTasks();
  }

  const open_count = tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada").length;
  const overdue = tasks.filter((t) =>
    t.status !== "concluida" && t.status !== "cancelada" &&
    t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())
  ).length;

  return (
    <div className="rounded-xl border bg-card">
      <div className="p-4 border-b flex items-center gap-3">
        <ListChecks className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Tarefas da Loja</h3>
        <Badge variant="secondary">{open_count} abertas</Badge>
        {overdue > 0 && <Badge variant="destructive">{overdue} atrasadas</Badge>}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5"
            onClick={() => navigate(`/equipe?tab=tarefas&store=${storeId}`)}>
            <ExternalLink className="h-3.5 w-3.5" /> Ver em Equipe
          </Button>
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Nova tarefa</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova tarefa · {storeName}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Título *</label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                    <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                      <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Prazo</label>
                      <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgente">Urgente</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Status</label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate}>Criar tarefa</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="divide-y">
        {tasks.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma tarefa vinculada. {canEdit && "Clique em «Nova tarefa» para começar."}
          </div>
        )}
        {tasks.map((t) => {
          const isOverdue = t.due_date && t.status !== "concluida" && t.status !== "cancelada" &&
            new Date(t.due_date) < new Date(new Date().toDateString());
          return (
            <div key={t.id} className={`p-3 flex items-center gap-3 ${isOverdue ? "bg-destructive/5" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.title}</div>
                {t.description && <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>}
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  {t.assigned_name && <span>👤 {t.assigned_name}</span>}
                  {t.due_date && <span className={isOverdue ? "text-destructive font-medium" : ""}>📅 {formatBR(t.due_date)}</span>}
                </div>
              </div>
              <Badge className={`${PRIORITY_COLOR[t.priority] || "bg-muted"} text-[10px]`}>{t.priority}</Badge>
              <Select value={t.status} onValueChange={(v) => handleStatusChange(t.id, v)} disabled={!canEdit}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <Badge className={`${STATUS_COLOR[t.status] || "bg-muted"} text-[10px]`}>{STATUS_LABEL[t.status] || t.status}</Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              {canEdit && (
                <button className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(t.id)} title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
