import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, ListTodo, TrendingUp, Activity } from "lucide-react";
import { format, isToday, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Member = { id: string; name: string; role: string };
type Task = {
  id: string; title: string; status: string; priority: string;
  assigned_to: string | null; due_date: string | null;
};
type ActivityRow = {
  id: string; actor_name: string | null; action_type: string;
  description: string; created_at: string;
};

interface Props {
  members: Member[];
  tasks: Task[];
  onOpenTask: (memberId?: string) => void;
}

export function VisaoGeralTab({ members, tasks, onOpenTask }: Props) {
  const [recent, setRecent] = useState<ActivityRow[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("activity_log")
      .select("id, actor_name, action_type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => { if (mounted) setRecent((data as ActivityRow[]) || []); });

    const ch = supabase
      .channel("visao_geral_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (p) => {
        setRecent((prev) => [p.new as ActivityRow, ...prev].slice(0, 15));
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const painelHoje = useMemo(() => {
    const dueToday = tasks.filter((t) => t.due_date === todayStr && t.status !== "concluida");
    const atrasadas = tasks.filter((t) => t.due_date && t.due_date < todayStr && t.status !== "concluida");
    const concluidasHoje = tasks.filter((t) => t.status === "concluida"); // approximation; updated_at not in type
    const urgentes = tasks.filter((t) => t.priority === "urgente" && t.status !== "concluida");
    return { dueToday, atrasadas, concluidasHoje, urgentes };
  }, [tasks, todayStr]);

  const resumoMembros = useMemo(() => {
    return members.map((m) => {
      const minhas = tasks.filter((t) => t.assigned_to === m.id);
      const ativas = minhas.filter((t) => t.status !== "concluida");
      const atrasadas = ativas.filter((t) => t.due_date && t.due_date < todayStr);
      const hoje = ativas.filter((t) => t.due_date === todayStr);
      const concluidas = minhas.filter((t) => t.status === "concluida");
      return { member: m, total: minhas.length, ativas: ativas.length, atrasadas: atrasadas.length, hoje: hoje.length, concluidas: concluidas.length };
    });
  }, [members, tasks, todayStr]);

  return (
    <div className="space-y-6">
      {/* Painel Hoje */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Vencem hoje</p>
                <p className="text-2xl font-bold">{painelHoje.dueToday.length}</p>
              </div>
              <Clock className="h-8 w-8 text-[hsl(var(--accent))]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Atrasadas</p>
                <p className={`text-2xl font-bold ${painelHoje.atrasadas.length > 0 ? "text-destructive" : ""}`}>
                  {painelHoje.atrasadas.length}
                </p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${painelHoje.atrasadas.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Urgentes</p>
                <p className="text-2xl font-bold">{painelHoje.urgentes.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground font-medium">Concluídas (total)</p>
                <p className="text-2xl font-bold text-[hsl(var(--success))]">{painelHoje.concluidasHoje.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Resumo por membro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-4 w-4" /> Resumo por Membro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resumoMembros.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
            ) : (
              <ul className="space-y-2">
                {resumoMembros.map((r) => (
                  <li key={r.member.id} className="flex items-center justify-between rounded-md border bg-card p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.member.name}</p>
                      <p className="text-xs text-muted-foreground">{r.member.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.atrasadas > 0 && (
                        <Badge variant="destructive" className="text-[10px]">{r.atrasadas} atras.</Badge>
                      )}
                      {r.hoje > 0 && (
                        <Badge className="text-[10px] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
                          {r.hoje} hoje
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">{r.ativas} ativas</Badge>
                      <Button size="sm" variant="ghost" onClick={() => onOpenTask(r.member.id)}>+</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Feed de Atividades resumido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem atividades recentes.</p>
            ) : (
              <ul className="space-y-2 max-h-[420px] overflow-y-auto">
                {recent.map((r) => (
                  <li key={r.id} className="text-sm border-l-2 border-primary/40 pl-3 py-1">
                    <p className="line-clamp-2">{r.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
