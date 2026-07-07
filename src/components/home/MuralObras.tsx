import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Calendar, Search, Flame, ChevronRight, MessageSquare, Pencil } from "lucide-react";
import { useStores } from "@/hooks/useStores";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import {
  computeCriticality,
  nextMilestone,
  daysUntil,
  daysSince,
  highestSeverity,
} from "@/utils/storeCriticality";
import { cn } from "@/lib/utils";

/**
 * Mural de Obras — visão de "parede" com todas as lojas em andamento,
 * ordenadas por criticidade e proximidade da inauguração.
 */
export default function MuralObras() {
  const { stores, loading } = useStores();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [onlyCritical, setOnlyCritical] = useState(false);

  const cards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores
      .filter((s) => !q || s.nome.toLowerCase().includes(q) || (s.filial || "").toLowerCase().includes(q))
      .map((s) => {
        // Progresso do checklist de obra
        const items = Object.values(s.checklist || {}) as any[];
        const done = items.filter((i) => i?.status === "REALIZADO" || i?.status === "NÃO SE APLICA").length;
        const progressPct = items.length ? (done / items.length) * 100 : 0;

        const inaugurada = isStoreLiberated(s.inauguracaoChecklist, s.tipoLoja);
        const reasons = computeCriticality(s, { progressPct, inaugurada });
        const severity = highestSeverity(reasons);
        const milestone = nextMilestone(s);
        const dInaug = daysUntil(s.inauguracaoReal || s.inauguracao);
        const stale = daysSince(s.ultimaAtualizacaoAt);

        return { s, progressPct, inaugurada, reasons, severity, milestone, dInaug, stale };
      })
      .filter((c) => !c.inaugurada)
      .filter((c) => !onlyCritical || c.severity !== null)
      .sort((a, b) => {
        // Alta > Média > sem alerta
        const sev = (x: typeof a) => (x.severity === "alta" ? 0 : x.severity === "media" ? 1 : 2);
        if (sev(a) !== sev(b)) return sev(a) - sev(b);
        // Depois, quem inaugura antes vem primeiro
        const da = a.dInaug ?? 999999;
        const db = b.dInaug ?? 999999;
        return da - db;
      });
  }, [stores, search, onlyCritical]);

  const totalCritical = cards.filter((c) => c.severity !== null).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar loja ou filial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant={onlyCritical ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyCritical((v) => !v)}
          className="gap-2"
        >
          <Flame className="h-4 w-4" />
          {onlyCritical ? "Mostrando críticas" : `Só críticas (${totalCritical})`}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {cards.length} loja{cards.length !== 1 ? "s" : ""} • {totalCritical} com alerta
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-3 space-y-2">
              <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
              <div className="h-1.5 w-full bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Nenhuma loja encontrada com os filtros atuais.
          </CardContent>
        </Card>
      ) : (() => {
        const groups: {
          key: string;
          title: string;
          icon: string;
          headerClass: string;
          items: typeof cards;
        }[] = [
          {
            key: "urgente",
            title: "INAUGURANDO EM ATÉ 14 DIAS (ou atrasadas)",
            icon: "🔴",
            headerClass: "text-destructive border-destructive/40",
            items: cards
              .filter((c) => c.dInaug !== null && c.dInaug <= 14)
              .sort((a, b) => (a.dInaug! - b.dInaug!)),
          },
          {
            key: "atencao",
            title: "ATENÇÃO — 15 a 30 dias",
            icon: "🟡",
            headerClass: "text-[hsl(var(--accent-foreground))] border-[hsl(var(--accent))]/40",
            items: cards
              .filter((c) => c.dInaug !== null && c.dInaug > 14 && c.dInaug <= 30)
              .sort((a, b) => (a.dInaug! - b.dInaug!)),
          },
          {
            key: "no-prazo",
            title: "NO PRAZO — mais de 30 dias",
            icon: "🟢",
            headerClass: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
            items: cards
              .filter((c) => c.dInaug !== null && c.dInaug > 30)
              .sort((a, b) => (a.dInaug! - b.dInaug!)),
          },
          {
            key: "sem-data",
            title: "SEM DATA DE INAUGURAÇÃO",
            icon: "⚪",
            headerClass: "text-muted-foreground border-muted",
            items: cards
              .filter((c) => c.dInaug === null)
              .sort((a, b) => (b.stale ?? -1) - (a.stale ?? -1)),
          },
        ];

        const renderCard = ({ s, progressPct, reasons, severity, milestone, dInaug, stale }: typeof cards[number]) => (
          <Link
            key={s.id}
            to={`/loja/${s.id}`}
            className={cn(
              "group rounded-xl border bg-card p-3 shadow-sm hover:shadow-md transition-all flex flex-col gap-2",
              severity === "alta" && "border-destructive/60 bg-destructive/5",
              severity === "media" && "border-[hsl(var(--accent))]/60 bg-[hsl(var(--accent))]/5"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{s.nome}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {[s.filial, s.tipoLoja].filter(Boolean).join(" • ") || "—"}
                </div>
              </div>
              {severity && (
                <Badge
                  variant={severity === "alta" ? "destructive" : "secondary"}
                  className="gap-1 text-[10px] shrink-0"
                >
                  <AlertTriangle className="h-3 w-3" /> {severity === "alta" ? "Crítica" : "Atenção"}
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Progresso obra</span>
                <span className="tabular-nums">{Math.round(progressPct)}%</span>
              </div>
              <Progress value={progressPct} className="h-1.5" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded bg-muted/40 p-1.5">
                <div className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Inauguração
                </div>
                <div className="font-medium">
                  {dInaug === null
                    ? "—"
                    : dInaug === 0
                      ? "Hoje"
                      : dInaug > 0
                        ? `em ${dInaug}d`
                        : `atrasada ${Math.abs(dInaug)}d`}
                </div>
              </div>
              <div className="rounded bg-muted/40 p-1.5">
                <div className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Próx. marco
                </div>
                <div className="font-medium truncate">
                  {milestone ? `${milestone.label} • ${milestone.days}d` : "—"}
                </div>
              </div>
            </div>

            {reasons.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {reasons.slice(0, 3).map((r, i) => (
                  <span
                    key={i}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border",
                      r.severity === "alta"
                        ? "border-destructive/40 text-destructive bg-destructive/10"
                        : "border-[hsl(var(--accent))]/40 text-[hsl(var(--accent-foreground))] bg-[hsl(var(--accent))]/10"
                    )}
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto pt-1 border-t flex items-center gap-1 text-[11px] text-muted-foreground min-h-[24px] flex-wrap">
              <MessageSquare className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1 min-w-0">
                {s.ultimaAtualizacao || <span className="italic">Sem atualização</span>}
              </span>
              {stale === null ? (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                  Nunca atualizada
                </Badge>
              ) : stale > 7 ? (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                  ⚠ Sem update há {stale}d
                </Badge>
              ) : (
                <span className="shrink-0 tabular-nums">
                  {stale === 0 ? "hoje" : `${stale}d`}
                </span>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] gap-1 shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/loja/${s.id}/atualizar`);
                }}
              >
                <Pencil className="h-3 w-3" /> Atualizar
              </Button>
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        );

        return (
          <div className="space-y-6">
            {groups.filter((g) => g.items.length > 0).map((g) => (
              <section key={g.key} className="space-y-3">
                <div className={cn("flex items-center gap-2 pb-2 border-b text-sm font-semibold uppercase tracking-wide", g.headerClass)}>
                  <span>{g.icon}</span>
                  <span>{g.title}</span>
                  <span className="text-xs font-normal opacity-70">({g.items.length} loja{g.items.length !== 1 ? "s" : ""})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {g.items.map(renderCard)}
                </div>
              </section>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
