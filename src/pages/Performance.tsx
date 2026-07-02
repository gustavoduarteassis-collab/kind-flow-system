import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, FileDown, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import PrazoCumprimento from "@/components/performance/PrazoCumprimento";

type Member = { id: string; user_id: string | null; name: string; role: string | null };
type MetricRow = {
  member: Member;
  created: number;
  done: number;
  overdue: number;
  habitsDone: number;
  habitsExpected: number;
  habitsPct: number;
  phaseAdvances: number;
  storeCount: number;
};

const MES_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthBounds(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end, daysInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() };
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

function statusFor(pct: number): { label: string; cls: string } {
  if (pct >= 80) return { label: "Excelente", cls: "bg-emerald-600 text-white" };
  if (pct >= 60) return { label: "Bom", cls: "bg-blue-600 text-white" };
  if (pct >= 40) return { label: "Atenção", cls: "bg-amber-500 text-white" };
  return { label: "Crítico", cls: "bg-red-600 text-white" };
}

export default function Performance() {
  const [cursor, setCursor] = useState(() => new Date());
  const [members, setMembers] = useState<Member[]>([]);
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfObs, setPdfObs] = useState<Record<string, string>>({});
  const [openPdfFor, setOpenPdfFor] = useState<MetricRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { start, end, daysInMonth } = monthBounds(cursor);
      const startIso = iso(start);
      const endIso = iso(end);

      const { data: ms } = await supabase
        .from("team_members")
        .select("id,user_id,name,role")
        .is("deleted_at", null)
        .order("name");
      const mems = (ms ?? []) as Member[];
      setMembers(mems);

      const memberIds = mems.map((m) => m.id);
      const userIds = mems.map((m) => m.user_id).filter(Boolean) as string[];

      const [tasksRes, habitsRes, complRes, logsRes, storesRes] = await Promise.all([
        supabase.from("tasks").select("id,assigned_to,status,due_date,created_at,updated_at,title")
          .is("deleted_at", null).in("assigned_to", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("habits").select("id,assigned_to_members").is("deleted_at", null),
        supabase.from("habit_completions").select("habit_id,team_member_id,completion_date,completed")
          .is("deleted_at", null).gte("completion_date", startIso).lt("completion_date", endIso),
        supabase.from("activity_log").select("user_id,action_type,created_at")
          .eq("action_type", "store_status_changed").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()),
        supabase.from("stores").select("analista_obra,nome,status_geral").is("deleted_at", null),
      ]);

      const tasks = tasksRes.data ?? [];
      const habits = (habitsRes.data ?? []) as any[];
      const completions = (complRes.data ?? []) as any[];
      const logs = (logsRes.data ?? []) as any[];
      const stores = (storesRes.data ?? []) as any[];
      const today = iso(new Date());

      const out: MetricRow[] = mems.map((m) => {
        const myTasks = tasks.filter((t: any) => t.assigned_to === m.id);
        const created = myTasks.filter((t: any) => t.created_at >= start.toISOString() && t.created_at < end.toISOString()).length;
        const done = myTasks.filter((t: any) => t.status === "concluida" && t.updated_at >= start.toISOString() && t.updated_at < end.toISOString()).length;
        const overdue = myTasks.filter((t: any) => t.due_date && t.due_date < today && t.status !== "concluida" && t.status !== "cancelada").length;
        const myHabits = habits.filter((h: any) => Array.isArray(h.assigned_to_members) && h.assigned_to_members.includes(m.id));
        const habitsExpected = myHabits.length * daysInMonth;
        const habitsDone = completions.filter((c: any) => c.team_member_id === m.id && c.completed).length;
        const habitsPct = habitsExpected > 0 ? Math.round((habitsDone / habitsExpected) * 100) : 0;
        const phaseAdvances = m.user_id ? logs.filter((l: any) => l.user_id === m.user_id).length : 0;
        const storeCount = stores.filter((s: any) =>
          (s.analista_obra ?? "").toLowerCase().includes((m.name ?? "").toLowerCase().split(" ")[0])
        ).length;
        return { member: m, created, done, overdue, habitsDone, habitsExpected, habitsPct, phaseAdvances, storeCount };
      });
      setRows(out);

      // 6-month trend (hábitos %)
      const trendPoints: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
        const { start: s, end: e, daysInMonth: dim } = monthBounds(d);
        const { data: cs } = await supabase
          .from("habit_completions").select("team_member_id,completed")
          .is("deleted_at", null).gte("completion_date", iso(s)).lt("completion_date", iso(e));
        const point: any = { month: `${MES_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` };
        mems.forEach((m) => {
          const myHabits = habits.filter((h: any) => Array.isArray(h.assigned_to_members) && h.assigned_to_members.includes(m.id));
          const expected = myHabits.length * dim;
          const doneCount = (cs ?? []).filter((c: any) => c.team_member_id === m.id && c.completed).length;
          point[m.name] = expected > 0 ? Math.round((doneCount / expected) * 100) : 0;
        });
        trendPoints.push(point);
      }
      setTrend(trendPoints);
      setLoading(false);
    })();
  }, [cursor]);

  const winner = useMemo(() => {
    if (!rows.length) return null;
    return [...rows].sort((a, b) => (b.habitsPct + (b.done * 5)) - (a.habitsPct + (a.done * 5)))[0];
  }, [rows]);

  const colors = ["#e11d48", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

  async function exportPdf(row: MetricRow) {
    const { start, end } = monthBounds(cursor);
    const period = `${MES_LABELS[cursor.getMonth()]}/${cursor.getFullYear()}`;
    toast.loading("Gerando relatório…", { id: "pdf" });

    const [tasksRes, habitsRes, complRes] = await Promise.all([
      supabase.from("tasks")
        .select("id,title,status,priority,due_date,created_at,updated_at,observacoes")
        .is("deleted_at", null)
        .eq("assigned_to", row.member.id),
      supabase.from("habits").select("id,title,frequency").is("deleted_at", null).contains("assigned_to_members", [row.member.id]),
      supabase.from("habit_completions")
        .select("habit_id,completion_date,completed,notes")
        .is("deleted_at", null)
        .eq("team_member_id", row.member.id)
        .gte("completion_date", iso(start)).lt("completion_date", iso(end)),
    ]);

    const tasks = (tasksRes.data ?? []) as any[];
    const habits = (habitsRes.data ?? []) as any[];
    const completions = (complRes.data ?? []) as any[];
    const today = iso(new Date());

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(120, 53, 15);
    doc.rect(0, 0, pageW, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Relatório de Performance — Constance", 14, 12);
    doc.setFontSize(10);
    doc.text(`${row.member.name} · ${row.member.role ?? ""} · Período: ${period}`, 14, 20);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 32,
      head: [["Indicador", "Valor"]],
      body: [
        ["Tarefas criadas no período", String(row.created)],
        ["Tarefas concluídas no período", String(row.done)],
        ["Tarefas atrasadas (em aberto)", String(row.overdue)],
        ["Hábitos realizados", `${row.habitsDone}/${row.habitsExpected} (${row.habitsPct}%)`],
        ["Lojas avançadas de fase", String(row.phaseAdvances)],
        ["Lojas sob responsabilidade", String(row.storeCount)],
        ["Status geral", statusFor(row.habitsPct).label],
      ],
      headStyles: { fillColor: [120, 53, 15] },
      theme: "striped",
    });

    const done = tasks.filter((t) => t.status === "concluida" && t.updated_at >= start.toISOString() && t.updated_at < end.toISOString());
    if (done.length) {
      doc.setFontSize(12);
      doc.text(`Tarefas concluídas (${done.length})`, 14, (doc as any).lastAutoTable.finalY + 10);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 13,
        head: [["Título", "Prioridade", "Concluída em"]],
        body: done.map((t) => [t.title ?? "—", t.priority ?? "—", (t.updated_at ?? "").slice(0, 10)]),
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 9 },
      });
    }

    const overdue = tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada" && t.due_date && t.due_date < today);
    if (overdue.length) {
      doc.setFontSize(12);
      doc.text(`Tarefas atrasadas (${overdue.length})`, 14, (doc as any).lastAutoTable.finalY + 10);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 13,
        head: [["Título", "Prioridade", "Vencimento"]],
        body: overdue.map((t) => [t.title ?? "—", t.priority ?? "—", t.due_date ?? "—"]),
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: 9 },
      });
    }

    if (habits.length) {
      doc.setFontSize(12);
      doc.text(`Hábitos — resumo do período`, 14, (doc as any).lastAutoTable.finalY + 10);
      const habitRows = habits.map((h) => {
        const cs = completions.filter((c) => c.habit_id === h.id && c.completed);
        const notes = completions
          .filter((c) => c.habit_id === h.id && (c.notes ?? "").trim())
          .map((c) => `• ${String(c.completion_date).slice(5)}: ${c.notes}`)
          .join("\n");
        return [h.title ?? "—", h.frequency ?? "diário", String(cs.length), notes || "—"];
      });
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 13,
        head: [["Hábito", "Frequência", "Realizados", "Observações"]],
        body: habitRows,
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
        columnStyles: { 3: { cellWidth: 80 } },
      });
    }

    const obs = pdfObs[row.member.id] ?? "";
    if (obs.trim()) {
      let y = (doc as any).lastAutoTable.finalY + 12;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text("Observações do coordenador", 14, y);
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(obs, 180), 14, y + 6);
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} — pág ${i}/${pageCount}`, 14, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`performance-${row.member.name.replace(/\s+/g, "_")}-${period.replace("/", "-")}.pdf`);
    toast.success("Relatório gerado", { id: "pdf" });
    setOpenPdfFor(null);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" /> Performance da Equipe</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento mensal de tarefas, hábitos e avanços</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 font-medium min-w-[150px] text-center">
            {MES_LABELS[cursor.getMonth()]} / {cursor.getFullYear()}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {winner && (
        <Card className="border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm">🏆 Destaque do mês</CardTitle></CardHeader>
          <CardContent>
            <div className="font-semibold text-lg">{winner.member.name}</div>
            <div className="text-sm text-muted-foreground">{winner.done} tarefas concluídas · {winner.habitsPct}% hábitos</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Desempenho por membro</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground text-sm">Carregando…</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead className="text-center">Criadas</TableHead>
                  <TableHead className="text-center">Concluídas</TableHead>
                  <TableHead className="text-center">Atrasadas</TableHead>
                  <TableHead>Hábitos</TableHead>
                  <TableHead className="text-center">Fases avançadas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Relatório</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const st = statusFor(r.habitsPct);
                  return (
                    <TableRow key={r.member.id}>
                      <TableCell>
                        <div className="font-medium">{r.member.name}</div>
                        <div className="text-xs text-muted-foreground">{r.member.role}</div>
                      </TableCell>
                      <TableCell className="text-center">{r.created}</TableCell>
                      <TableCell className="text-center">{r.done}</TableCell>
                      <TableCell className={`text-center font-semibold ${r.overdue > 0 ? "text-red-600" : ""}`}>{r.overdue}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <Progress value={r.habitsPct} className="h-2 flex-1" />
                          <span className="text-xs whitespace-nowrap">{r.habitsDone}/{r.habitsExpected} ({r.habitsPct}%)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{r.phaseAdvances}</TableCell>
                      <TableCell><Badge className={st.cls}>{st.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Dialog open={openPdfFor?.member.id === r.member.id} onOpenChange={(o) => setOpenPdfFor(o ? r : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline"><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Exportar relatório — {r.member.name}</DialogTitle></DialogHeader>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Observações (opcional)</label>
                              <Textarea
                                value={pdfObs[r.member.id] ?? ""}
                                onChange={(e) => setPdfObs({ ...pdfObs, [r.member.id]: e.target.value })}
                                placeholder="Pontos fortes, melhorias, próximos passos…"
                                rows={5}
                              />
                            </div>
                            <DialogFooter>
                              <Button onClick={() => exportPdf(r)}><FileDown className="h-4 w-4 mr-1" /> Gerar PDF</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PrazoCumprimento />

      <Card>
        <CardHeader><CardTitle>Tendência de hábitos — últimos 6 meses (%)</CardTitle></CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              {members.map((m, i) => (
                <Line key={m.id} type="monotone" dataKey={m.name} stroke={colors[i % colors.length]} strokeWidth={2} dot />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
