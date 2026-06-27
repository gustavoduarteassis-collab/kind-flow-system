import { Bell, Check, AlertTriangle, ClipboardCheck, ListChecks, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const iconFor = (type: string) => {
  switch (type) {
    case "task_overdue": return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "task_due_today": return <ListChecks className="h-4 w-4 text-amber-500" />;
    case "habit_pending": return <Target className="h-4 w-4 text-amber-500" />;
    case "task_completed": return <Check className="h-4 w-4 text-emerald-500" />;
    case "task_assigned": return <ClipboardCheck className="h-4 w-4 text-[hsl(var(--accent))]" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

export function NotificationBell() {
  const { items, unreadCount, markAllRead, markOneRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold">Notificações</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Sem notificações.</div>
          ) : (
            items.map((n: Notification) => {
              const unread = !n.read_at;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 px-3 py-2.5 border-b last:border-b-0 transition-colors ${
                    unread ? "bg-[hsl(var(--accent))]/5" : ""
                  }`}
                >
                  <div className="pt-0.5">{iconFor(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${unread ? "font-semibold" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => markOneRead(n.id)}
                          className="text-[11px] font-medium text-[hsl(var(--accent))] hover:underline"
                        >
                          Ver
                        </Link>
                      )}
                    </div>
                  </div>
                  {unread && <div className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] mt-1.5 shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
