import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useStores } from "@/hooks/useStores";
import {
  PartyPopper,
  AlertTriangle,
  TrendingUp,
  CalendarClock,
  Sparkles,
  ArrowRight,
  Trophy,
  Building2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { formatBR } from "@/utils/safeDate";


function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  // aceita ISO e dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/");
    const dt = new Date(`${y}-${m}-${d}`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

function daysDiff(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function hasRealActivity(s: any): boolean {
  // considera "com preenchimento" quem tem: update recente, checklist com itens realizados,
  // ou data prevista de inauguração
  const checklist = s.checklist || {};
  const hasChecklistProgress = Object.values(checklist).some((cat: any) => {
    const items = cat?.items || [];
    return items.some((i: any) =>
      ["REALIZADO", "EM COTAÇÃO", "EM TRANSPORTE", "REALIZANDO", "EM ANDAMENTO"].includes(i.status)
    );
  });
  const hasUpdate = !!s.ultimaAtualizacaoAt;
  const hasInauguracao = !!s.inauguracao || !!s.inauguracaoReal;
  return hasChecklistProgress || hasUpdate || hasInauguracao;
}

function computeProgress(s: any): number {
  const checklist = s.checklist || {};
  let realizados = 0;
  let total = 0;
  Object.values(checklist).forEach((cat: any) => {
    const items = cat?.items || [];
    total += items.length;
    realizados += items.filter((i: any) =>
      ["REALIZADO", "NÃO SE APLICA"].includes(i.status)
    ).length;
  });
  return total > 0 ? Math.round((realizados / total) * 100) : 0;
}

export default function Executivo() {
  const navigate = useNavigate();
  const { stores, loading } = useStores();

  const analytics = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const in14 = new Date(now.getTime() + 14 * 86400000);
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const last7 = new Date(now.getTime() - 7 * 86400000);

    // Filtrar somente lojas com preenchimento real e não repasse/encerramento
    const ativas = stores.filter((s) => {
      const t = (s.tipoRegistro || "").toLowerCase();
      const excluidas = ["repasse", "troca", "encerramento", "interno"];
      if (excluidas.includes(t)) return false;
      return hasRealActivity(s);
    });

    // Inauguradas em 2026
    const inauguradas2026 = ativas.filter((s) => {
      const d = parseDate((s as any).inauguracaoReal);
      if (!d) return (s.tipoRegistro || "").toLowerCase() === "inaugurada";
      return d >= yearStart && d <= yearEnd;
    });

    // Ativas (não inauguradas)
    const emObra = ativas.filter(
      (s) => (s.tipoRegistro || "").toLowerCase() !== "inaugurada"
    );

    // Inaugurando em ≤14d
    const proximasInauguracoes = emObra
      .map((s) => {
        const d = parseDate((s as any).inauguracaoReal) || parseDate(s.inauguracao);
        return { store: s, date: d };
      })
      .filter((x) => x.date && x.date >= now && x.date <= in30)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());

    const inaug14 = proximasInauguracoes.filter((x) => x.date! <= in14);

    // Riscos: inauguração vencida ou < 14d com progresso baixo
    const riscos = emObra
      .map((s) => {
        const d = parseDate((s as any).inauguracaoReal) || parseDate(s.inauguracao);
        const pct = computeProgress(s);
        const upDate = parseDate((s as any).ultimaAtualizacaoAt);
        const staleDays = upDate ? daysDiff(now, upDate) : 999;
        let score = 0;
        let motivos: string[] = [];
        if (d) {
          const dias = daysDiff(d, now);
          if (dias < 0) {
            score += 100;
            motivos.push(`inauguração vencida há ${Math.abs(dias)}d`);
          } else if (dias <= 14 && pct < 60) {
            score += 60 + (60 - pct);
            motivos.push(`${dias}d para inaugurar · ${pct}% pronto`);
          } else if (dias <= 30 && pct < 30) {
            score += 40;
            motivos.push(`${dias}d para inaugurar · só ${pct}% pronto`);
          }
        }
        if (staleDays >= 14) {
          score += 20;
          motivos.push(`sem atualização há ${staleDays}d`);
        }
        return { store: s, date: d, pct, score, motivos, staleDays };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Vitórias da semana (updates recentes)
    const vitorias = ativas
      .filter((s) => {
        const upDate = parseDate((s as any).ultimaAtualizacaoAt);
        return upDate && upDate >= last7;
      })
      .sort((a, b) => {
        const da = parseDate((a as any).ultimaAtualizacaoAt)!.getTime();
        const db = parseDate((b as any).ultimaAtualizacaoAt)!.getTime();
        return db - da;
      })
      .slice(0, 5);

    // Sparkline: atualizações por semana nas últimas 8 semanas
    const weeks: { label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now.getTime() - i * 7 * 86400000);
      const start = new Date(end.getTime() - 7 * 86400000);
      const count = ativas.filter((s) => {
        const d = parseDate((s as any).ultimaAtualizacaoAt);
        return d && d > start && d <= end;
      }).length;
      weeks.push({
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        count,
      });
    }

    return {
      totalAtivas: ativas.length,
      totalEmObra: emObra.length,
      inauguradas2026: inauguradas2026.length,
      proximasInauguracoes,
      inaug14: inaug14.length,
      riscos,
      vitorias,
      weeks,
    };
  }, [stores]);

  // Meta anual configurável
  const [metaAnual, setMetaAnual] = useState<number>(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("executivo.metaAnual") : null;
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 40;
  });
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState(String(metaAnual));
  useEffect(() => {
    localStorage.setItem("executivo.metaAnual", String(metaAnual));
  }, [metaAnual]);
  const metaPct = metaAnual > 0 ? Math.min(100, Math.round((analytics.inauguradas2026 / metaAnual) * 100)) : 0;


  if (loading) {
    return (
      <div className="p-8 text-muted-foreground">Carregando painel executivo…</div>
    );
  }

  const now = new Date();
  const saudacao =
    now.getHours() < 12
      ? "Bom dia"
      : now.getHours() < 18
      ? "Boa tarde"
      : "Boa noite";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero narrativo */}
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            {saudacao} · Painel Executivo
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            <span className="text-primary">{analytics.inauguradas2026}</span> lojas
            inauguradas em {now.getFullYear()} ·{" "}
            <span className="text-primary">{analytics.inaug14}</span>{" "}
            {analytics.inaug14 === 1 ? "inaugura" : "inauguram"} nos próximos 14 dias ·{" "}
            <span className={analytics.riscos.length > 0 ? "text-destructive" : "text-primary"}>
              {analytics.riscos.length}
            </span>{" "}
            {analytics.riscos.length === 1 ? "em risco crítico" : "em risco crítico"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {analytics.totalEmObra} lojas ativas em obra · dados de {analytics.totalAtivas} lojas com preenchimento
          </p>
        </div>

        {/* Sparkline: momentum das últimas 8 semanas */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Momentum</p>
              <p className="text-sm mt-1">
                <span className="font-semibold text-foreground">
                  {analytics.weeks.reduce((a, w) => a + w.count, 0)}
                </span>{" "}
                atualizações nas últimas 8 semanas ·{" "}
                <span className={
                  analytics.weeks[7].count >= analytics.weeks[6].count
                    ? "text-primary" : "text-destructive"
                }>
                  {analytics.weeks[7].count} nesta semana
                </span>
              </p>
            </div>
            <Sparkline weeks={analytics.weeks} />
          </div>
        </Card>

        {/* KPIs executivos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<PartyPopper className="h-5 w-5" />}
            label={`Meta ${now.getFullYear()}`}
            value={`${analytics.inauguradas2026}/${metaAnual}`}
            hint={
              editingMeta ? (
                <span className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    value={metaDraft}
                    onChange={(e) => setMetaDraft(e.target.value)}
                    className="h-6 w-16 text-xs px-1"
                    autoFocus
                  />
                  <button
                    className="text-primary hover:opacity-80"
                    onClick={() => {
                      const n = parseInt(metaDraft, 10);
                      if (Number.isFinite(n) && n > 0) setMetaAnual(n);
                      setEditingMeta(false);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="text-muted-foreground hover:opacity-80"
                    onClick={() => { setMetaDraft(String(metaAnual)); setEditingMeta(false); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                <button
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  onClick={() => { setMetaDraft(String(metaAnual)); setEditingMeta(true); }}
                >
                  {metaPct}% da meta <Pencil className="h-3 w-3 opacity-60" />
                </button>
              )
            }
            tone={metaPct >= 75 ? "ok" : metaPct >= 40 ? "warn" : "bad"}
            progress={metaPct}
          />
          <KpiCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Próximas 14 dias"
            value={String(analytics.inaug14)}
            hint="janela crítica"
            tone={analytics.inaug14 > 0 ? "warn" : "neutral"}
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Em risco"
            value={String(analytics.riscos.length)}
            hint="ação necessária"
            tone={analytics.riscos.length > 0 ? "bad" : "ok"}
          />
          <KpiCard
            icon={<Building2 className="h-5 w-5" />}
            label="Em obra"
            value={String(analytics.totalEmObra)}
            hint="lojas ativas"
            tone="neutral"
          />
        </div>


        {/* Riscos + Próximas inaugurações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-destructive/10 p-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">Riscos da semana</h2>
              </div>
              <Badge variant="destructive">{analytics.riscos.length}</Badge>
            </div>
            {analytics.riscos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhum risco crítico neste momento. 🎉
              </p>
            ) : (
              <ul className="space-y-3">
                {analytics.riscos.map((r) => (
                  <li
                    key={r.store.id}
                    className="group cursor-pointer rounded-lg border p-4 hover:border-primary hover:bg-muted/40 transition-all"
                    onClick={() => navigate(`/loja/${r.store.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate group-hover:text-primary transition-colors">
                          {r.store.nome}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(r.store as any).analistaObra || "sem analista"} ·{" "}
                          {r.store.franqueado || "sem franqueado"}
                        </p>
                        <p className="text-sm mt-1.5 text-destructive">
                          {r.motivos.join(" · ")}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">Próximas inaugurações</h2>
              </div>
              <Badge variant="secondary">{analytics.proximasInauguracoes.length}</Badge>
            </div>
            {analytics.proximasInauguracoes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma inauguração nos próximos 30 dias.
              </p>
            ) : (
              <ul className="space-y-3">
                {analytics.proximasInauguracoes.slice(0, 6).map(({ store, date }) => {
                  const dias = daysDiff(date!, new Date());
                  const pct = computeProgress(store);
                  return (
                    <li
                      key={store.id}
                      className="group cursor-pointer rounded-lg border p-4 hover:border-primary hover:bg-muted/40 transition-all"
                      onClick={() => navigate(`/loja/${store.id}`)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate group-hover:text-primary transition-colors">
                            {store.nome}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatBR(date!.toISOString())} · em {dias} dia{dias === 1 ? "" : "s"} ·{" "}
                            {pct}% pronto
                          </p>
                        </div>
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                          <div
                            className={`h-full ${
                              pct >= 80
                                ? "bg-[hsl(142,60%,45%)]"
                                : pct >= 40
                                ? "bg-[hsl(38,90%,55%)]"
                                : "bg-destructive/70"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Vitórias da semana */}
        {analytics.vitorias.length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-background to-[hsl(142,60%,97%)] border-[hsl(142,60%,85%)]">
            <div className="flex items-center gap-2 mb-5">
              <div className="rounded-full bg-[hsl(142,60%,90%)] p-2">
                <Trophy className="h-4 w-4 text-[hsl(142,60%,30%)]" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Movimentações da semana</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {analytics.vitorias.map((v) => {
                const upDate = parseDate((v as any).ultimaAtualizacaoAt);
                const dias = upDate ? daysDiff(new Date(), upDate) : 0;
                return (
                  <button
                    key={v.id}
                    className="text-left rounded-lg border bg-background p-3 hover:border-primary hover:shadow-sm transition-all"
                    onClick={() => navigate(`/loja/${v.id}`)}
                  >
                    <p className="font-medium text-sm truncate">{v.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(v as any).ultimaAtualizacaoAutor || "atualização"} · há {dias}d
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Atalhos */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" onClick={() => navigate("/lojas")}>
            <Building2 className="h-4 w-4 mr-2" />
            Todas as lojas
          </Button>
          <Button variant="outline" onClick={() => navigate("/obras")}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Painel operacional
          </Button>
          <Button variant="outline" onClick={() => navigate("/painel/detalhado")}>
            <Sparkles className="h-4 w-4 mr-2" />
            Painel detalhado
          </Button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "neutral";
  progress?: number;
}) {
  const toneClasses: Record<string, string> = {
    ok: "bg-[hsl(142,60%,96%)] border-[hsl(142,60%,80%)]",
    warn: "bg-[hsl(45,90%,96%)] border-[hsl(45,90%,80%)]",
    bad: "bg-destructive/5 border-destructive/40",
    neutral: "bg-card border-border",
  };
  const iconTone: Record<string, string> = {
    ok: "text-[hsl(142,60%,30%)] bg-[hsl(142,60%,90%)]",
    warn: "text-[hsl(38,90%,25%)] bg-[hsl(45,90%,88%)]",
    bad: "text-destructive bg-destructive/15",
    neutral: "text-primary bg-primary/10",
  };
  const progressColor: Record<string, string> = {
    ok: "bg-[hsl(142,60%,45%)]",
    warn: "bg-[hsl(38,90%,55%)]",
    bad: "bg-destructive/70",
    neutral: "bg-primary",
  };
  return (
    <Card className={`p-5 border ${toneClasses[tone]}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2 shrink-0 ${iconTone[tone]}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
            {label}
          </p>
          <p className="text-3xl font-bold tabular-nums leading-tight mt-1">{value}</p>
          <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
          {typeof progress === "number" && (
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full ${progressColor[tone]}`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Sparkline({ weeks }: { weeks: { label: string; count: number }[] }) {
  const w = 240;
  const h = 56;
  const pad = 4;
  const max = Math.max(1, ...weeks.map((x) => x.count));
  const step = (w - pad * 2) / Math.max(1, weeks.length - 1);
  const points = weeks.map((x, i) => {
    const px = pad + i * step;
    const py = h - pad - ((x.count / max) * (h - pad * 2));
    return { px, py, ...x };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" ");
  const area = `${path} L${points[points.length - 1].px.toFixed(1)},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg width={w} height={h} className="text-primary" role="img" aria-label="Momentum semanal">
      <path d={area} fill="currentColor" opacity={0.12} />
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.px}
          cy={p.py}
          r={i === points.length - 1 ? 3 : 2}
          fill="currentColor"
        >
          <title>{`${p.label}: ${p.count}`}</title>
        </circle>
      ))}
    </svg>
  );
}

