import { useState } from "react";
import { Store } from "@/data/checklistData";
import {
  cronogramaCategorias,
  CronogramaDayStatus,
  TOTAL_DAYS,
} from "@/data/cronogramaData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface CronogramaObraProps {
  store: Store;
  onUpdate: (cronograma: Store["cronograma"]) => void;
}

const statusCycle: CronogramaDayStatus[] = ["none", "planned", "done", "delayed"];

const cellColors: Record<CronogramaDayStatus, string> = {
  none: "",
  planned: "bg-[hsl(200,70%,50%)]",
  done: "bg-[hsl(152,60%,40%)]",
  delayed: "bg-destructive",
};

const CronogramaObra = ({ store, onUpdate }: CronogramaObraProps) => {
  const cronograma = store.cronograma || { cells: {}, startDate: "" };

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

  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Header with start date and legend */}
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

      {/* Gantt chart table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 text-left px-3 py-2.5 min-w-[60px] border-r font-semibold">
                  Item
                </th>
                <th className="sticky left-[60px] z-10 bg-muted/50 text-left px-3 py-2.5 min-w-[280px] border-r font-semibold">
                  Descrição das Atividades
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className="text-center px-0 py-2.5 w-7 min-w-[28px] font-medium text-muted-foreground"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cronogramaCategorias.map((cat) => (
                <>
                  {/* Category header row */}
                  <tr key={cat.id} className="bg-primary/10">
                    <td className="sticky left-0 z-10 bg-primary/10 px-3 py-2 font-bold border-r">
                      {cat.numero}
                    </td>
                    <td
                      className="sticky left-[60px] z-10 bg-primary/10 px-3 py-2 font-bold border-r"
                      colSpan={1}
                    >
                      {cat.nome}
                    </td>
                    {days.map((d) => (
                      <td key={d} className="border-l border-border/30" />
                    ))}
                  </tr>
                  {/* Activity rows */}
                  {cat.items.map((item) => {
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-card px-3 py-1.5 text-muted-foreground font-mono border-r">
                          {item.id}
                        </td>
                        <td className="sticky left-[60px] z-10 bg-card px-3 py-1.5 border-r whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px]" title={item.descricao}>
                          {item.descricao}
                        </td>
                        {days.map((d) => {
                          const key = `${item.id}-${d}`;
                          const status = cronograma.cells[key] || "none";
                          return (
                            <td
                              key={d}
                              className={`border-l border-border/20 cursor-pointer hover:bg-muted/50 transition-colors ${cellColors[status]}`}
                              onClick={() => handleCellClick(item.id, d)}
                              title={`${item.id} - Dia ${d}: ${status === "none" ? "vazio" : status}`}
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Categories without sub-items get a single row */}
                  {cat.items.length === 0 && (
                    <tr key={`${cat.id}-empty`} className="border-b border-border/20">
                      <td className="sticky left-0 z-10 bg-card px-3 py-1.5 text-muted-foreground font-mono border-r">
                        {cat.numero}
                      </td>
                      <td className="sticky left-[60px] z-10 bg-card px-3 py-1.5 border-r italic text-muted-foreground">
                        {cat.nome}
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
