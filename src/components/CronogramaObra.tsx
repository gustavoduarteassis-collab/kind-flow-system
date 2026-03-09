import { Store } from "@/data/checklistData";
import {
  cronogramaCategorias,
  CronogramaDayStatus,
  CronogramaStore,
  TOTAL_DAYS,
} from "@/data/cronogramaData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { addDays, format, differenceInCalendarDays, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CronogramaObraProps {
  store: Store;
  onUpdate: (cronograma: CronogramaStore) => void;
}

const statusCycle: CronogramaDayStatus[] = ["none", "planned", "done", "delayed"];

const cellColors: Record<CronogramaDayStatus, string> = {
  none: "",
  planned: "bg-[hsl(200,70%,50%)]",
  done: "bg-[hsl(152,60%,40%)]",
  delayed: "bg-destructive",
};

function ensureCronograma(store: Store): CronogramaStore {
  const c = (store.cronograma || {}) as any;
  return {
    cells: c.cells || {},
    startDate: c.startDate || "",
    itemDates: c.itemDates || {},
    itemDatesReal: c.itemDatesReal || {},
    actionPlans: c.actionPlans || {},
  };
}

const CronogramaObra = ({ store, onUpdate }: CronogramaObraProps) => {
  const cronograma = ensureCronograma(store);

  const startDate = cronograma.startDate ? new Date(cronograma.startDate + "T00:00:00") : null;
  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1);

  // Compute actual dates for each day column
  const dayDates = startDate
    ? days.map((d) => addDays(startDate, d - 1))
    : null;

  // Group days by month for header
  const monthHeaders: { label: string; span: number }[] = [];
  if (dayDates) {
    let currentMonth = "";
    dayDates.forEach((date) => {
      const monthLabel = format(date, "MMMM yyyy", { locale: ptBR });
      if (monthLabel !== currentMonth) {
        monthHeaders.push({ label: monthLabel, span: 1 });
        currentMonth = monthLabel;
      } else {
        monthHeaders[monthHeaders.length - 1].span++;
      }
    });
  }

  const handleCellClick = (itemId: string, day: number) => {
    const key = `${itemId}-${day}`;
    const current = cronograma.cells[key] || "none";
    const nextIndex = (statusCycle.indexOf(current) + 1) % statusCycle.length;
    const next = statusCycle[nextIndex];

    const newCells = { ...cronograma.cells };
    if (next === "none") {
      delete newCells[key];
    } else {
      newCells[key] = next;
    }
    onUpdate({ ...cronograma, cells: newCells });
  };

  const handleStartDateChange = (date: string) => {
    onUpdate({ ...cronograma, startDate: date });
  };

  const handleItemDateChange = (itemId: string, field: "inicio" | "fim", value: string) => {
    const newItemDates = { ...cronograma.itemDates };
    const current = newItemDates[itemId] || { inicio: "", fim: "" };
    newItemDates[itemId] = { ...current, [field]: value };

    // Auto-fill cells based on date range
    const newCells = { ...cronograma.cells };
    const inicio = field === "inicio" ? value : current.inicio;
    const fim = field === "fim" ? value : current.fim;

    // Clear old planned cells for this item first
    for (let d = 1; d <= TOTAL_DAYS; d++) {
      const key = `${itemId}-${d}`;
      if (newCells[key] === "planned") {
        delete newCells[key];
      }
    }

    // Fill range if we have both dates AND a start date for the obra
    if (inicio && fim && cronograma.startDate) {
      const obraStart = new Date(cronograma.startDate + "T00:00:00");
      const inicioDate = new Date(inicio + "T00:00:00");
      const fimDate = new Date(fim + "T00:00:00");

      const startDay = differenceInCalendarDays(inicioDate, obraStart) + 1;
      const endDay = differenceInCalendarDays(fimDate, obraStart) + 1;

      for (let d = Math.max(1, startDay); d <= Math.min(TOTAL_DAYS, endDay); d++) {
        const key = `${itemId}-${d}`;
        // Only set to planned if not already marked as done/delayed
        if (!newCells[key] || newCells[key] === "none") {
          newCells[key] = "planned";
        }
      }
    }

    onUpdate({ ...cronograma, cells: newCells, itemDates: newItemDates });
  };

  const stickyColItem = "left-0 w-[50px] min-w-[50px]";
  const stickyColDesc = "left-[50px] min-w-[220px] max-w-[220px]";
  const stickyColInicio = "left-[270px] w-[120px] min-w-[120px]";
  const stickyColFim = "left-[390px] w-[120px] min-w-[120px]";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Data início da obra
          </Label>
          <Input
            type="date"
            className="h-9 w-44"
            value={cronograma.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Legenda:</span>
          <span className="flex items-center gap-1">
            <span className="h-3.5 w-3.5 rounded-sm bg-[hsl(200,70%,50%)]" /> Planejado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3.5 w-3.5 rounded-sm bg-[hsl(152,60%,40%)]" /> Realizado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3.5 w-3.5 rounded-sm bg-destructive" /> Atrasado
          </span>
          <span className="text-muted-foreground ml-2">(Clique nas células para alterar)</span>
        </div>
      </div>

      {/* Gantt table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Month header row */}
              {dayDates && (
                <tr className="bg-muted/70">
                  <th className={`sticky ${stickyColItem} z-20 bg-muted/70 border-r`} />
                  <th className={`sticky ${stickyColDesc} z-20 bg-muted/70 border-r`} />
                  <th className={`sticky ${stickyColInicio} z-20 bg-muted/70 border-r`} />
                  <th className={`sticky ${stickyColFim} z-20 bg-muted/70 border-r`} />
                  {monthHeaders.map((m, i) => (
                    <th
                      key={i}
                      colSpan={m.span}
                      className="text-center px-1 py-1.5 font-semibold text-foreground capitalize border-l border-border/40"
                    >
                      {m.label}
                    </th>
                  ))}
                </tr>
              )}
              {/* Day number row */}
              <tr className="bg-muted/50">
                <th className={`sticky ${stickyColItem} z-20 bg-muted/50 text-left px-2 py-2 border-r font-semibold`}>
                  Item
                </th>
                <th className={`sticky ${stickyColDesc} z-20 bg-muted/50 text-left px-2 py-2 border-r font-semibold`}>
                  Atividade
                </th>
                <th className={`sticky ${stickyColInicio} z-20 bg-muted/50 text-center px-1 py-2 border-r font-semibold`}>
                  Início
                </th>
                <th className={`sticky ${stickyColFim} z-20 bg-muted/50 text-center px-1 py-2 border-r font-semibold`}>
                  Término
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className="text-center px-0 py-2 w-7 min-w-[28px] font-medium text-muted-foreground"
                    title={dayDates ? format(dayDates[d - 1], "dd/MM/yyyy") : `Dia ${d}`}
                  >
                    {dayDates ? format(dayDates[d - 1], "dd") : d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cronogramaCategorias.map((cat) => (
                <>
                  {/* Category header */}
                  <tr key={cat.id} className="bg-primary/10">
                    <td className={`sticky ${stickyColItem} z-10 bg-primary/10 px-2 py-2 font-bold border-r`}>
                      {cat.numero}
                    </td>
                    <td className={`sticky ${stickyColDesc} z-10 bg-primary/10 px-2 py-2 font-bold border-r`}>
                      {cat.nome}
                    </td>
                    <td className={`sticky ${stickyColInicio} z-10 bg-primary/10 border-r`} />
                    <td className={`sticky ${stickyColFim} z-10 bg-primary/10 border-r`} />
                    {days.map((d) => (
                      <td key={d} className="border-l border-border/30" />
                    ))}
                  </tr>
                  {/* Items */}
                  {cat.items.map((item) => {
                    const itemDate = cronograma.itemDates[item.id] || { inicio: "", fim: "" };
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                      >
                        <td className={`sticky ${stickyColItem} z-10 bg-card px-2 py-1 text-muted-foreground font-mono border-r`}>
                          {item.id}
                        </td>
                        <td
                          className={`sticky ${stickyColDesc} z-10 bg-card px-2 py-1 border-r whitespace-nowrap overflow-hidden text-ellipsis`}
                          title={item.descricao}
                        >
                          {item.descricao}
                        </td>
                        <td className={`sticky ${stickyColInicio} z-10 bg-card px-1 py-0.5 border-r`}>
                          <Input
                            type="date"
                            className="h-6 text-[10px] px-1 border-none shadow-none"
                            value={itemDate.inicio}
                            onChange={(e) => handleItemDateChange(item.id, "inicio", e.target.value)}
                          />
                        </td>
                        <td className={`sticky ${stickyColFim} z-10 bg-card px-1 py-0.5 border-r`}>
                          <Input
                            type="date"
                            className="h-6 text-[10px] px-1 border-none shadow-none"
                            value={itemDate.fim}
                            onChange={(e) => handleItemDateChange(item.id, "fim", e.target.value)}
                          />
                        </td>
                        {days.map((d) => {
                          const key = `${item.id}-${d}`;
                          const status = cronograma.cells[key] || "none";
                          return (
                            <td
                              key={d}
                              className={`border-l border-border/20 cursor-pointer hover:bg-muted/50 transition-colors ${cellColors[status]}`}
                              onClick={() => handleCellClick(item.id, d)}
                              title={dayDates ? `${item.id} - ${format(dayDates[d - 1], "dd/MM")}: ${status === "none" ? "vazio" : status}` : ""}
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Empty categories */}
                  {cat.items.length === 0 && (
                    <tr key={`${cat.id}-empty`} className="border-b border-border/20">
                      <td className={`sticky ${stickyColItem} z-10 bg-card px-2 py-1 text-muted-foreground font-mono border-r`}>
                        {cat.numero}
                      </td>
                      <td className={`sticky ${stickyColDesc} z-10 bg-card px-2 py-1 border-r italic text-muted-foreground`}>
                        {cat.nome}
                      </td>
                      <td className={`sticky ${stickyColInicio} z-10 bg-card px-1 py-0.5 border-r`}>
                        <Input
                          type="date"
                          className="h-6 text-[10px] px-1 border-none shadow-none"
                          value={(cronograma.itemDates[cat.id] || { inicio: "" }).inicio}
                          onChange={(e) => handleItemDateChange(cat.id, "inicio", e.target.value)}
                        />
                      </td>
                      <td className={`sticky ${stickyColFim} z-10 bg-card px-1 py-0.5 border-r`}>
                        <Input
                          type="date"
                          className="h-6 text-[10px] px-1 border-none shadow-none"
                          value={(cronograma.itemDates[cat.id] || { fim: "" }).fim}
                          onChange={(e) => handleItemDateChange(cat.id, "fim", e.target.value)}
                        />
                      </td>
                      {days.map((d) => {
                        const key = `${cat.id}-${d}`;
                        const status = cronograma.cells[key] || "none";
                        return (
                          <td
                            key={d}
                            className={`border-l border-border/20 cursor-pointer hover:bg-muted/50 transition-colors ${cellColors[status]}`}
                            onClick={() => handleCellClick(cat.id, d)}
                          />
                        );
                      })}
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CronogramaObra;
