import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CheckCircle2, Archive, ListPlus, Target, Store } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ActivityRow = {
  id: string;
  actor_name: string | null;
  action_type: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: any;
  created_at: string;
};

const ICONS: Record<string, any> = {
  task_created: ListPlus,
  task_completed: CheckCircle2,
  task_archived: Archive,
  habit_completed: Target,
  store_status_changed: Store,
};

const COLORS: Record<string, string> = {
  task_created: "bg-secondary text-secondary-foreground",
  task_completed: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  task_archived: "bg-muted text-muted-foreground",
  habit_completed: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  store_status_changed: "bg-primary text-primary-foreground",
};

const LABELS: Record<string, string> = {
  task_created: "Tarefa criada",
  task_completed: "Tarefa concluída",
  task_archived: "Tarefa arquivada",
  habit_completed: "Hábito concluído",
  store_status_changed: "Status de loja",
};

export function AtividadesTab() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (mounted) {
        setRows((data as ActivityRow[]) || []);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel("activity_log_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        setRows((prev) => [payload.new as ActivityRow, ...prev].slice(0, 300));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = rows.filter((r) => {
    if (filterType !== "all" && r.action_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.description.toLowerCase().includes(q) ||
        (r.actor_name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" /> Feed de Atividades
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Input
            placeholder="Buscar por descrição ou autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma atividade registrada.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => {
              const Icon = ICONS[r.action_type] || Activity;
              return (
                <li key={r.id} className="flex items-start gap-3 rounded-md border bg-card p-3">
                  <div className={`rounded-md p-2 ${COLORS[r.action_type] || "bg-muted"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{r.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{LABELS[r.action_type] || r.action_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
