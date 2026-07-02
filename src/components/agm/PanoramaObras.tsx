import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, Calendar, Building2, TrendingUp, ChevronRight } from "lucide-react";
import { useStores } from "@/hooks/useStores";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import {
  computeCriticality,
  nextMilestone,
  daysUntil,
  highestSeverity,
} from "@/utils/storeCriticality";
import { cn } from "@/lib/utils";

/**
 * Panorama Automático das Obras — resumo agregado em tempo real
 * a partir do banco de lojas, com sinais de criticidade e próximas
 * inaugurações. Usado em AGM e Performance para unificar a visão.
 */
export default function PanoramaObras() {
  const { stores, loading } = useStores();

  const summary = useMemo(() => {
    const rows = stores.map((s) => {
      const items = Object.values(s.checklist || {}) as any[];
      const done = items.filter((i) => i?.status === "REALIZADO" || i?.status === "NÃO SE APLICA").length;
      const progressPct = items.length ? (done / items.length) * 100 : 0;
      const inaugurada = isStoreLiberated(s.inauguracaoChecklist, s.tipoLoja);
      const reasons = computeCriticality(s, { progressPct, inaugurada });
      const severity = highestSeverity(reasons);
      const dInaug = daysUntil(s.inauguracaoReal || s.inauguracao);
      const milestone = nextMilestone(s);
      return { s, progressPct, inaugurada, reasons, severity, dInaug, milestone };
    });

    const ativas = rows.filter((r) => !r.inaugurada);
    const inauguradas = rows.filter((r) => r.inaugurada);
    const criticasAlta = ativas.filter((r) => r.severity === "alta");
    const criticasMedia = ativas.filter((r) => r.severity === "media");
    const proximos30 = ativas
      .filter((r) => r.dInaug !== null && r.dInaug >= 0 && r.dInaug <= 30)
      .sort((a, b) => (a.dInaug ?? 0) - (b.dInaug ?? 0));
    const avgProgresso = ativas.length
      ? Math.round(ativas.reduce((sum, r) => sum + r.progressPct, 0) / ativas.length)
      : 0;

    return { rows, ativas, inauguradas, criticasAlta, criticasMedia, proximos30, avgProgresso };
  }, [stores]);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-6">Carregando panorama…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard icon={Building2} label="Obras ativas" value={summary.ativas.length} tone="default" />
        <MetricCard icon={TrendingUp} label="Inauguradas" value={summary.inauguradas.length} tone="success" />
        <MetricCard icon={AlertTriangle} label="Críticas (alta)" value={summary.criticasAlta.length} tone="danger" />
        <MetricCard icon={Clock} label="Atenção (média)" value={summary.criticasMedia.length} tone="warn" />
        <MetricCard icon={Calendar} label="Inaugurando ≤ 30d" value={summary.proximos30.length} tone="info" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Progresso médio das obras ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Progress value={summary.avgProgresso} className="h-2 flex-1" />
            <span className="text-sm font-semibold min-w-[45px] text-right">{summary.avgProgresso}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" /> Lojas críticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.criticasAlta.length === 0 && summary.criticasMedia.length === 0 && (
              <div className="text-xs text-muted-foreground">Nenhuma loja crítica no momento.</div>
            )}
            {[...summary.criticasAlta, ...summary.criticasMedia].slice(0, 8).map(({ s, reasons, severity }) => (
              <Link
                key={s.id}
                to={`/loja/${s.id}`}
                className="flex items-center justify-between gap-2 rounded-md border p-2 hover:bg-accent transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {reasons.slice(0, 2).map((r) => r.label).join(" · ")}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge className={severity === "alta" ? "bg-red-600 text-white" : "bg-amber-500 text-white"}>
                    {severity === "alta" ? "Alta" : "Média"}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" /> Próximas inaugurações (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.proximos30.length === 0 && (
              <div className="text-xs text-muted-foreground">Nenhuma inauguração prevista nos próximos 30 dias.</div>
            )}
            {summary.proximos30.slice(0, 8).map(({ s, dInaug, progressPct }) => (
              <Link
                key={s.id}
                to={`/loja/${s.id}`}
                className="flex items-center justify-between gap-2 rounded-md border p-2 hover:bg-accent transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    Progresso {Math.round(progressPct)}%
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    (dInaug ?? 0) <= 7 ? "border-red-500 text-red-700" : "border-blue-500 text-blue-700"
                  )}
                >
                  {dInaug === 0 ? "hoje" : `${dInaug}d`}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "default" | "success" | "danger" | "warn" | "info";
}) {
  const toneCls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "danger"
      ? "text-red-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "info"
      ? "text-blue-600"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className={cn("h-3.5 w-3.5", toneCls)} />
          <span className="truncate">{label}</span>
        </div>
        <div className={cn("text-2xl font-bold mt-1", toneCls)}>{value}</div>
      </CardContent>
    </Card>
  );
}
