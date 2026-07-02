import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, AlertTriangle } from "lucide-react";
import { useStores } from "@/hooks/useStores";
import { computeCriticality, highestSeverity } from "@/utils/storeCriticality";
import { isStoreLiberated } from "@/utils/inaugurationStatus";

type Member = { id: string; name: string; role: string | null };
type Row = {
  member: Member;
  concluidas: number;
  noPrazo: number;
  prazoPct: number;
  lojasAtivas: number;
  lojasCriticas: number;
};

/**
 * Cumprimento de prazo + carga de lojas por analista.
 * Une dados de tarefas (concluídas dentro do due_date) e de lojas
 * (criticidade computada) para uma leitura unificada de performance.
 */
export default function PrazoCumprimento() {
  const { stores } = useStores();
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ms, ts] = await Promise.all([
        supabase.from("team_members").select("id,name,role").is("deleted_at", null).order("name"),
        supabase.from("tasks")
          .select("assigned_to,status,due_date,updated_at")
          .is("deleted_at", null)
          .eq("status", "concluida"),
      ]);
      setMembers((ms.data ?? []) as Member[]);
      setTasks(ts.data ?? []);
      setLoading(false);
    })();
  }, []);

  const rows: Row[] = useMemo(() => {
    const criticidadePorNome = new Map<string, { ativas: number; criticas: number }>();
    for (const s of stores) {
      const items = Object.values(s.checklist || {}) as any[];
      const done = items.filter((i) => i?.status === "REALIZADO" || i?.status === "NÃO SE APLICA").length;
      const progressPct = items.length ? (done / items.length) * 100 : 0;
      const inaugurada = isStoreLiberated(s.inauguracaoChecklist, s.tipoLoja);
      if (inaugurada) continue;
      const reasons = computeCriticality(s, { progressPct, inaugurada });
      const sev = highestSeverity(reasons);
      const nome = (s.analistaObra ?? "").trim().toLowerCase().split(" ")[0];
      if (!nome) continue;
      const cur = criticidadePorNome.get(nome) ?? { ativas: 0, criticas: 0 };
      cur.ativas += 1;
      if (sev) cur.criticas += 1;
      criticidadePorNome.set(nome, cur);
    }

    return members.map((m) => {
      const my = tasks.filter((t) => t.assigned_to === m.id);
      const concluidas = my.length;
      const noPrazo = my.filter(
        (t) => t.due_date && t.updated_at && String(t.updated_at).slice(0, 10) <= String(t.due_date),
      ).length;
      const prazoPct = concluidas > 0 ? Math.round((noPrazo / concluidas) * 100) : 0;
      const key = (m.name ?? "").toLowerCase().split(" ")[0];
      const stat = criticidadePorNome.get(key) ?? { ativas: 0, criticas: 0 };
      return {
        member: m,
        concluidas,
        noPrazo,
        prazoPct,
        lojasAtivas: stat.ativas,
        lojasCriticas: stat.criticas,
      };
    });
  }, [members, tasks, stores]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" /> Cumprimento de prazo & carga de lojas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Analista</TableHead>
                <TableHead className="text-center">Concluídas</TableHead>
                <TableHead className="text-center">No prazo</TableHead>
                <TableHead>% no prazo</TableHead>
                <TableHead className="text-center">Lojas ativas</TableHead>
                <TableHead className="text-center">Críticas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const tone =
                  r.prazoPct >= 80
                    ? "bg-emerald-600"
                    : r.prazoPct >= 60
                    ? "bg-blue-600"
                    : r.prazoPct >= 40
                    ? "bg-amber-500"
                    : "bg-red-600";
                return (
                  <TableRow key={r.member.id}>
                    <TableCell>
                      <div className="font-medium">{r.member.name}</div>
                      <div className="text-xs text-muted-foreground">{r.member.role}</div>
                    </TableCell>
                    <TableCell className="text-center">{r.concluidas}</TableCell>
                    <TableCell className="text-center">{r.noPrazo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <Progress value={r.prazoPct} className="h-2 flex-1" />
                        <span className="text-xs font-semibold min-w-[36px] text-right">{r.prazoPct}%</span>
                        <span className={`inline-block h-2 w-2 rounded-full ${tone}`} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{r.lojasAtivas}</TableCell>
                    <TableCell className="text-center">
                      {r.lojasCriticas > 0 ? (
                        <Badge className="bg-red-600 text-white gap-1">
                          <AlertTriangle className="h-3 w-3" /> {r.lojasCriticas}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
