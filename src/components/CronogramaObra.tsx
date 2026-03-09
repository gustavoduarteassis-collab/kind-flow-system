import { useState } from "react";
import { Store } from "@/data/checklistData";
import {
  cronogramaCategorias,
  CronogramaDayStatus,
  CronogramaStore,
  TOTAL_DAYS,
} from "@/data/cronogramaData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";
import { addDays, format, differenceInCalendarDays } from "date-fns";
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
  const [tab, setTab] = useState("gantt");

  const startDate = cronograma.startDate ? new Date(cronograma.startDate + "T00:00:00") : null;
  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1);

  const dayDates = startDate ? days.map((d) => addDays(startDate, d - 1)) : null;

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
    if (next === "none") delete newCells[key]; else newCells[key] = next;
    onUpdate({ ...cronograma, cells: newCells });
  };

  const handleStartDateChange = (date: string) => {
    onUpdate({ ...cronograma, startDate: date });
  };

  const handleItemDateChange = (itemId: string, field: "inicio" | "fim", value: string) => {
    const newItemDates = { ...cronograma.itemDates };
    const current = newItemDates[itemId] || { inicio: "", fim: "" };
    newItemDates[itemId] = { ...current, [field]: value };
    const newCells = { ...cronograma.cells };
    const inicio = field === "inicio" ? value : current.inicio;
    const fim = field === "fim" ? value : current.fim;
    for (let d = 1; d <= TOTAL_DAYS; d++) {
      const key = `${itemId}-${d}`;
      if (newCells[key] === "planned") delete newCells[key];
    }
    if (inicio && fim && cronograma.startDate) {
      const obraStart = new Date(cronograma.startDate + "T00:00:00");
      const inicioDate = new Date(inicio + "T00:00:00");
      const fimDate = new Date(fim + "T00:00:00");
      const startDay = differenceInCalendarDays(inicioDate, obraStart) + 1;
      const endDay = differenceInCalendarDays(fimDate, obraStart) + 1;
      for (let d = Math.max(1, startDay); d <= Math.min(TOTAL_DAYS, endDay); d++) {
        const key = `${itemId}-${d}`;
        if (!newCells[key] || newCells[key] === "none") newCells[key] = "planned";
      }
    }
    onUpdate({ ...cronograma, cells: newCells, itemDates: newItemDates });
  };

  const handleRealDateChange = (itemId: string, field: "inicioReal" | "fimReal", value: string) => {
    const newReal = { ...cronograma.itemDatesReal };
    const current = newReal[itemId] || { inicioReal: "", fimReal: "" };
    newReal[itemId] = { ...current, [field]: value };
    onUpdate({ ...cronograma, itemDatesReal: newReal });
  };

  const handleActionPlanChange = (itemId: string, value: string) => {
    const newPlans = { ...cronograma.actionPlans };
    newPlans[itemId] = value;
    onUpdate({ ...cronograma, actionPlans: newPlans });
  };

  // Compute deviation data for all items
  const allItems = cronogramaCategorias.flatMap((cat) =>
    cat.items.length > 0 ? cat.items : [{ id: cat.id, descricao: cat.nome }]
  );

  const getDeviation = (itemId: string) => {
    const planned = cronograma.itemDates[itemId];
    const real = cronograma.itemDatesReal[itemId];
    if (!planned?.fim) return null;

    const plannedEnd = new Date(planned.fim + "T00:00:00");
    const today = new Date();

    if (real?.fimReal) {
      const realEnd = new Date(real.fimReal + "T00:00:00");
      const diff = differenceInCalendarDays(realEnd, plannedEnd);
      return { diff, status: diff > 0 ? "delayed" : diff < 0 ? "ahead" : "on_time", finished: true };
    }

    // Not finished yet - check if past due
    const diff = differenceInCalendarDays(today, plannedEnd);
    if (diff > 0) return { diff, status: "overdue", finished: false };
    return { diff: -diff, status: "in_progress", finished: false };
  };

  const delayedItems = allItems.filter((item) => {
    const dev = getDeviation(item.id);
    return dev && (dev.status === "delayed" || dev.status === "overdue");
  });

  const stickyColItem = "left-0 w-[50px] min-w-[50px]";
  const stickyColDesc = "left-[50px] min-w-[180px] max-w-[180px]";
  const stickyColInicio = "left-[230px] w-[100px] min-w-[100px]";
  const stickyColFim = "left-[330px] w-[100px] min-w-[100px]";
  const stickyColInicioReal = "left-[430px] w-[100px] min-w-[100px]";
  const stickyColFimReal = "left-[530px] w-[100px] min-w-[100px]";
  const stickyColDesvio = "left-[630px] w-[70px] min-w-[70px]";

  const formatDateBR = (d: string) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Data início da obra
          </Label>
          <Input type="date" className="h-9 w-44" value={cronograma.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Legenda:</span>
          <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-sm bg-[hsl(200,70%,50%)]" /> Planejado</span>
          <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-sm bg-[hsl(152,60%,40%)]" /> Realizado</span>
          <span className="flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-sm bg-destructive" /> Atrasado</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Atividades</p>
            <p className="text-xl font-bold">{allItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto text-[hsl(152,60%,40%)] mb-1" />
            <p className="text-xs text-muted-foreground mb-1">Concluídas</p>
            <p className="text-xl font-bold text-[hsl(152,60%,40%)]">
              {allItems.filter((i) => cronograma.itemDatesReal[i.id]?.fimReal).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-[hsl(200,70%,50%)] mb-1" />
            <p className="text-xs text-muted-foreground mb-1">Em Andamento</p>
            <p className="text-xl font-bold text-[hsl(200,70%,50%)]">
              {allItems.filter((i) => {
                const d = getDeviation(i.id);
                return d && d.status === "in_progress";
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-destructive mb-1" />
            <p className="text-xs text-muted-foreground mb-1">Atrasadas</p>
            <p className="text-xl font-bold text-destructive">{delayedItems.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="gantt">📊 Cronograma Gantt</TabsTrigger>
          <TabsTrigger value="comparison">📋 Planejado vs Real</TabsTrigger>
          <TabsTrigger value="actions">
            ⚡ Plano de Ação
            {delayedItems.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">{delayedItems.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === GANTT === */}
        <TabsContent value="gantt" className="mt-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  {dayDates && (
                    <tr className="bg-muted/70">
                      <th className={`sticky ${stickyColItem} z-20 bg-muted/70 border-r`} />
                      <th className={`sticky ${stickyColDesc} z-20 bg-muted/70 border-r`} />
                      <th className={`sticky ${stickyColInicio} z-20 bg-muted/70 border-r`} />
                      <th className={`sticky ${stickyColFim} z-20 bg-muted/70 border-r`} />
                      <th className={`sticky ${stickyColInicioReal} z-20 bg-muted/70 border-r`} />
                      <th className={`sticky ${stickyColFimReal} z-20 bg-muted/70 border-r`} />
                      <th className={`sticky ${stickyColDesvio} z-20 bg-muted/70 border-r`} />
                      {monthHeaders.map((m, i) => (
                        <th key={i} colSpan={m.span}
                          className="text-center px-1 py-1.5 font-semibold text-foreground capitalize border-l border-border/40">
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  )}
                  <tr className="bg-muted/50">
                    <th className={`sticky ${stickyColItem} z-20 bg-muted/50 text-left px-2 py-2 border-r font-semibold`}>Item</th>
                    <th className={`sticky ${stickyColDesc} z-20 bg-muted/50 text-left px-2 py-2 border-r font-semibold`}>Atividade</th>
                    <th className={`sticky ${stickyColInicio} z-20 bg-muted/50 text-center px-1 py-2 border-r font-semibold text-[hsl(200,70%,50%)]`}>Início Plan.</th>
                    <th className={`sticky ${stickyColFim} z-20 bg-muted/50 text-center px-1 py-2 border-r font-semibold text-[hsl(200,70%,50%)]`}>Fim Plan.</th>
                    <th className={`sticky ${stickyColInicioReal} z-20 bg-muted/50 text-center px-1 py-2 border-r font-semibold text-[hsl(152,60%,40%)]`}>Início Real</th>
                    <th className={`sticky ${stickyColFimReal} z-20 bg-muted/50 text-center px-1 py-2 border-r font-semibold text-[hsl(152,60%,40%)]`}>Fim Real</th>
                    <th className={`sticky ${stickyColDesvio} z-20 bg-muted/50 text-center px-1 py-2 border-r font-semibold`}>Desvio</th>
                    {days.map((d) => (
                      <th key={d} className="text-center px-0 py-2 w-7 min-w-[28px] font-medium text-muted-foreground"
                        title={dayDates ? format(dayDates[d - 1], "dd/MM/yyyy") : `Dia ${d}`}>
                        {dayDates ? format(dayDates[d - 1], "dd") : d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cronogramaCategorias.map((cat) => (
                    <>
                      <tr key={cat.id} className="bg-primary/10">
                        <td className={`sticky ${stickyColItem} z-10 bg-primary/10 px-2 py-2 font-bold border-r`}>{cat.numero}</td>
                        <td className={`sticky ${stickyColDesc} z-10 bg-primary/10 px-2 py-2 font-bold border-r`}>{cat.nome}</td>
                        <td className={`sticky ${stickyColInicio} z-10 bg-primary/10 border-r`} />
                        <td className={`sticky ${stickyColFim} z-10 bg-primary/10 border-r`} />
                        <td className={`sticky ${stickyColInicioReal} z-10 bg-primary/10 border-r`} />
                        <td className={`sticky ${stickyColFimReal} z-10 bg-primary/10 border-r`} />
                        <td className={`sticky ${stickyColDesvio} z-10 bg-primary/10 border-r`} />
                        {days.map((d) => <td key={d} className="border-l border-border/30" />)}
                      </tr>
                      {(cat.items.length > 0 ? cat.items : [{ id: cat.id, descricao: cat.nome }]).map((item) => {
                        const itemDate = cronograma.itemDates[item.id] || { inicio: "", fim: "" };
                        const realDate = cronograma.itemDatesReal[item.id] || { inicioReal: "", fimReal: "" };
                        const dev = getDeviation(item.id);
                        return (
                          <tr key={item.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                            <td className={`sticky ${stickyColItem} z-10 bg-card px-2 py-1 text-muted-foreground font-mono border-r`}>{item.id}</td>
                            <td className={`sticky ${stickyColDesc} z-10 bg-card px-2 py-1 border-r whitespace-nowrap overflow-hidden text-ellipsis`} title={item.descricao}>{item.descricao}</td>
                            <td className={`sticky ${stickyColInicio} z-10 bg-card px-1 py-0.5 border-r`}>
                              <Input type="date" className="h-6 text-[10px] px-1 border-none shadow-none"
                                value={itemDate.inicio} onChange={(e) => handleItemDateChange(item.id, "inicio", e.target.value)} />
                            </td>
                            <td className={`sticky ${stickyColFim} z-10 bg-card px-1 py-0.5 border-r`}>
                              <Input type="date" className="h-6 text-[10px] px-1 border-none shadow-none"
                                value={itemDate.fim} onChange={(e) => handleItemDateChange(item.id, "fim", e.target.value)} />
                            </td>
                            <td className={`sticky ${stickyColInicioReal} z-10 bg-card px-1 py-0.5 border-r`}>
                              <Input type="date" className="h-6 text-[10px] px-1 border-none shadow-none bg-[hsl(152,60%,40%)]/5"
                                value={realDate.inicioReal} onChange={(e) => handleRealDateChange(item.id, "inicioReal", e.target.value)} />
                            </td>
                            <td className={`sticky ${stickyColFimReal} z-10 bg-card px-1 py-0.5 border-r`}>
                              <Input type="date" className="h-6 text-[10px] px-1 border-none shadow-none bg-[hsl(152,60%,40%)]/5"
                                value={realDate.fimReal} onChange={(e) => handleRealDateChange(item.id, "fimReal", e.target.value)} />
                            </td>
                            <td className={`sticky ${stickyColDesvio} z-10 bg-card px-1 py-0.5 border-r text-center`}>
                              {dev && (
                                <Badge className={`text-[9px] px-1 ${
                                  dev.status === "delayed" || dev.status === "overdue"
                                    ? "bg-destructive text-destructive-foreground"
                                    : dev.status === "ahead"
                                    ? "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]"
                                    : dev.status === "on_time"
                                    ? "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]"
                                    : "bg-[hsl(200,70%,50%)] text-[hsl(0,0%,100%)]"
                                }`}>
                                  {dev.status === "delayed" ? `+${dev.diff}d` :
                                   dev.status === "overdue" ? `+${dev.diff}d` :
                                   dev.status === "ahead" ? `${dev.diff}d` :
                                   dev.status === "on_time" ? "✓" : `${dev.diff}d`}
                                </Badge>
                              )}
                            </td>
                            {days.map((d) => {
                              const key = `${item.id}-${d}`;
                              const status = cronograma.cells[key] || "none";
                              return (
                                <td key={d}
                                  className={`border-l border-border/20 cursor-pointer hover:bg-muted/50 transition-colors ${cellColors[status]}`}
                                  onClick={() => handleCellClick(item.id, d)}
                                  title={dayDates ? `${item.id} - ${format(dayDates[d - 1], "dd/MM")}: ${status === "none" ? "vazio" : status}` : ""} />
                              );
                            })}
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* === COMPARAÇÃO PLANEJADO VS REAL === */}
        <TabsContent value="comparison" className="mt-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold">Item</th>
                    <th className="text-left px-3 py-2 font-semibold">Atividade</th>
                    <th className="text-center px-2 py-2 font-semibold text-[hsl(200,70%,50%)]">Início Plan.</th>
                    <th className="text-center px-2 py-2 font-semibold text-[hsl(200,70%,50%)]">Fim Plan.</th>
                    <th className="text-center px-2 py-2 font-semibold text-[hsl(152,60%,40%)]">Início Real</th>
                    <th className="text-center px-2 py-2 font-semibold text-[hsl(152,60%,40%)]">Fim Real</th>
                    <th className="text-center px-2 py-2 font-semibold">Desvio</th>
                    <th className="text-center px-2 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item) => {
                    const planned = cronograma.itemDates[item.id] || { inicio: "", fim: "" };
                    const real = cronograma.itemDatesReal[item.id] || { inicioReal: "", fimReal: "" };
                    const dev = getDeviation(item.id);
                    return (
                      <tr key={item.id} className="border-b border-border/20 hover:bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground font-mono">{item.id}</td>
                        <td className="px-3 py-2 font-medium">{item.descricao}</td>
                        <td className="px-2 py-2 text-center">{formatDateBR(planned.inicio)}</td>
                        <td className="px-2 py-2 text-center">{formatDateBR(planned.fim)}</td>
                        <td className="px-2 py-2 text-center">{formatDateBR(real.inicioReal)}</td>
                        <td className="px-2 py-2 text-center">{formatDateBR(real.fimReal)}</td>
                        <td className="px-2 py-2 text-center">
                          {dev && (
                            <span className={`font-semibold ${
                              dev.status === "delayed" || dev.status === "overdue" ? "text-destructive" :
                              dev.status === "ahead" ? "text-[hsl(152,60%,40%)]" : ""
                            }`}>
                              {dev.status === "delayed" ? `+${dev.diff} dias` :
                               dev.status === "overdue" ? `+${dev.diff} dias` :
                               dev.status === "ahead" ? `${dev.diff} dias` :
                               dev.status === "on_time" ? "No prazo" : `${dev.diff} dias rest.`}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {dev ? (
                            <Badge className={`text-[10px] ${
                              dev.status === "delayed" || dev.status === "overdue" ? "bg-destructive text-destructive-foreground" :
                              dev.status === "on_time" || dev.status === "ahead" ? "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]" :
                              "bg-[hsl(200,70%,50%)] text-[hsl(0,0%,100%)]"
                            }`}>
                              {dev.status === "delayed" ? "Atrasado" :
                               dev.status === "overdue" ? "Vencido" :
                               dev.status === "on_time" ? "No Prazo" :
                               dev.status === "ahead" ? "Adiantado" : "Em Andamento"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">Sem datas</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* === PLANO DE AÇÃO === */}
        <TabsContent value="actions" className="mt-4 space-y-4">
          {delayedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma atividade atrasada!</p>
                <p className="text-sm mt-1">Todas as atividades estão dentro do prazo</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">{delayedItems.length} atividade(s) precisam de ação</span>
              </div>
              {delayedItems.map((item) => {
                const planned = cronograma.itemDates[item.id] || { inicio: "", fim: "" };
                const real = cronograma.itemDatesReal[item.id] || { inicioReal: "", fimReal: "" };
                const dev = getDeviation(item.id)!;
                const plan = cronograma.actionPlans[item.id] || "";
                return (
                  <Card key={item.id} className="border-destructive/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <span className="text-muted-foreground font-mono">{item.id}</span>
                            {item.descricao}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-1.5 text-xs">
                            <span className="text-muted-foreground">
                              Planejado: {formatDateBR(planned.inicio)} → {formatDateBR(planned.fim)}
                            </span>
                            {real.inicioReal && (
                              <span className="text-muted-foreground">
                                Real: {formatDateBR(real.inicioReal)} → {real.fimReal ? formatDateBR(real.fimReal) : "em aberto"}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          +{dev.diff} dias
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Plano de Ação
                        </Label>
                        <Textarea
                          rows={2}
                          placeholder="Descreva as ações corretivas para recuperar o prazo..."
                          className="text-sm"
                          value={plan}
                          onChange={(e) => handleActionPlanChange(item.id, e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CronogramaObra;
