import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type Task = {
  id: string; title: string; description: string | null; status: string;
  priority: string; assigned_to: string | null; due_date: string | null;
};

interface Props {
  tasks: Task[];
  getMemberName: (id: string | null) => string;
  onOpenTask: (task: Task) => void;
  onStatusChange: (id: string, status: string) => void;
}

const COLUMNS: { key: string; label: string; tone: string }[] = [
  { key: "pendente", label: "Pendente", tone: "bg-secondary" },
  { key: "em_andamento", label: "Em Andamento", tone: "bg-[hsl(var(--accent))]/20" },
  { key: "concluida", label: "Concluída", tone: "bg-[hsl(var(--success))]/20" },
  { key: "cancelada", label: "Cancelada", tone: "bg-muted" },
];

const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-secondary text-secondary-foreground",
  alta: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  urgente: "bg-destructive text-destructive-foreground",
};

export function TasksKanban({ tasks, getMemberName, onOpenTask, onStatusChange }: Props) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/task-id", id);
  };
  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/task-id");
    if (id) onStatusChange(id, status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            className={`rounded-lg border ${col.tone} p-2 min-h-[300px]`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, col.key)}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-semibold uppercase">{col.label}</h3>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((t) => {
                const overdue = t.status !== "concluida" && t.due_date && t.due_date < todayStr;
                return (
                  <Card
                    key={t.id}
                    className={`p-2 cursor-pointer hover:shadow ${overdue ? "border-destructive/40" : ""}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, t.id)}
                    onClick={() => onOpenTask(t)}
                  >
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {overdue && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                      <span className="line-clamp-2">{t.title}</span>
                    </p>
                    <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
                      <Badge className={`${priorityColors[t.priority]} text-[10px]`}>{t.priority}</Badge>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {getMemberName(t.assigned_to)}
                      </span>
                    </div>
                    {t.due_date && (
                      <p className={`text-[10px] mt-1 ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        Prazo: {format(new Date(t.due_date), "dd/MM")}
                      </p>
                    )}
                  </Card>
                );
              })}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Vazio</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
