import { Store } from "@/data/checklistData";
import { cronogramaCategorias, CronogramaStore, TOTAL_DAYS } from "@/data/cronogramaData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { differenceInCalendarDays, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, AlertTriangle, CircleDashed } from "lucide-react";

interface Props {
  store: Store;
}

type PhaseStatus = "nao_iniciado" | "em_andamento" | "concluido" | "atrasado";

function ensure(store: Store): CronogramaStore {
  const c = (store.cronograma || {}) as any;
  return {
    cells: c.cells || {},
    startDate: c.startDate || "",
    itemDates: c.itemDates || {},
    itemDatesReal: c.itemDatesReal || {},
    actionPlans: c.actionPlans || {},
  };
}

const parseDate = (v?: string): Date | null => {
  if (!v) return null;
  const d = new Date(v + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};

const minDate = (dates: Date[]) =>
  dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
const maxDate = (dates: Date[]) =>
  dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

const fmt = (d: Date | null) => (d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "—");

export default function CronogramaPhaseSummary({ store }: Props) {
  const cron = ensure(store);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const obraStart = parseDate(cron.startDate);
  const obraEnd = obraStart ? addDays(obraStart, TOTAL_DAYS - 1) : null;

  const phases = cronogramaCategorias.map((cat) => {
    const items = cat.items.length > 0 ? cat.items : [{ id: cat.id, descricao: cat.nome }];
    const plannedStarts: Date[] = [];
    const plannedEnds: Date[] = [];
    const realStarts: Date[] = [];
    const realEnds: Date[] = [];
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;

    items.forEach((item) => {
      const p = cron.itemDates[item.id];
      const r = cron.itemDatesReal[item.id];
      const pi = parseDate(p?.inicio);
      const pf = parseDate(p?.fim);
      const ri = parseDate(r?.inicioReal);
      const rf = parseDate(r?.fimReal);
      if (pi) plannedStarts.push(pi);
      if (pf) plannedEnds.push(pf);
      if (ri) realStarts.push(ri);
      if (rf) realEnds.push(rf);

      if (rf) {
        completed++;
        if (pf && rf.getTime() > pf.getTime()) overdue++;
      } else if (ri) {
        inProgress++;
        if (pf && today.getTime() > pf.getTime()) overdue++;
      } else if (pf && today.getTime() > pf.getTime()) {
        overdue++;
      }
    });

    const plannedStart = minDate(plannedStarts);
    const plannedEnd = maxDate(plannedEnds);
    const realStart = minDate(realStarts);
    const realEnd = maxDate(realEnds);

    const totalItems = items.length;
    const pct = totalItems === 0 ? 0 : Math.round((completed / totalItems) * 100);
    const deviation =
      plannedEnd && realEnd ? differenceInCalendarDays(realEnd, plannedEnd) : null;

    let status: PhaseStatus = "nao_iniciado";
    if (completed === totalItems && totalItems > 0) status = "concluido";
    else if (overdue > 0) status = "atrasado";
    else if (inProgress > 0 || completed > 0) status = "em_andamento";

    return {
      id: cat.id,
      nome: cat.nome,
      numero: cat.numero,
      total: totalItems,
      completed,
      inProgress,
      overdue,
      pct,
      plannedStart,
      plannedEnd,
      realStart,
      realEnd,
      deviation,
      status,
    };
  });

  const statusMeta: Record<PhaseStatus, { label: string; cls: string; Icon: any }> = {
    nao_iniciado: {
      label: "Não iniciado",
      cls: "bg-muted text-muted-foreground",
      Icon: CircleDashed,
    },
    em_andamento: {
      label: "Em andamento",
      cls: "bg-[hsl(200,70%,50%)] text-white",
      Icon: Clock,
    },
    concluido: {
      label: "Concluído",
      cls: "bg-[hsl(152,60%,40%)] text-white",
      Icon: CheckCircle2,
    },
    atrasado: {
      label: "Atrasado",
      cls: "bg-destructive text-destructive-foreground",
      Icon: AlertTriangle,
    },
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Visão somente leitura: as datas e o status são <strong>recalculados</strong> a partir
        dos itens já cadastrados nas abas Gantt e Planejado vs Real. Nada é alterado aqui.
        {obraStart && obraEnd && (
          <span className="ml-2">
            • Janela da obra: <strong>{fmt(obraStart)}</strong> → <strong>{fmt(obraEnd)}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {phases.map((p) => {
          const meta = statusMeta[p.status];
          const Icon = meta.Icon;
          return (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      ETAPA {p.numero}
                    </p>
                    <h4 className="text-sm font-semibold truncate">{p.nome}</h4>
                  </div>
                  <Badge className={`${meta.cls} flex items-center gap-1 shrink-0`}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </Badge>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">
                      {p.completed}/{p.total} concluídos
                    </span>
                    <span className="font-semibold">{p.pct}%</span>
                  </div>
                  <Progress value={p.pct} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded border border-border/60 p-2">
                    <p className="text-muted-foreground">Planejado</p>
                    <p className="font-medium text-[hsl(200,70%,40%)]">
                      {fmt(p.plannedStart)} → {fmt(p.plannedEnd)}
                    </p>
                  </div>
                  <div className="rounded border border-border/60 p-2">
                    <p className="text-muted-foreground">Real</p>
                    <p className="font-medium text-[hsl(152,60%,35%)]">
                      {fmt(p.realStart)} → {fmt(p.realEnd)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex gap-2">
                    {p.inProgress > 0 && (
                      <span className="text-[hsl(200,70%,45%)]">
                        ⏱ {p.inProgress} em curso
                      </span>
                    )}
                    {p.overdue > 0 && (
                      <span className="text-destructive font-medium">
                        ⚠ {p.overdue} atrasado(s)
                      </span>
                    )}
                  </div>
                  {p.deviation !== null && (
                    <span
                      className={
                        p.deviation > 0
                          ? "text-destructive font-semibold"
                          : p.deviation < 0
                          ? "text-[hsl(152,60%,35%)] font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      {p.deviation > 0
                        ? `+${p.deviation}d atraso`
                        : p.deviation < 0
                        ? `${p.deviation}d adiantado`
                        : "no prazo"}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
