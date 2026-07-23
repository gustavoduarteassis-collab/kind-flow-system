import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, checklistCategories, StatusType } from "@/data/checklistData";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Flag,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface Props {
  store: Store;
  onJumpTab: (tab: string) => void;
  onOpenAtualizar: () => void;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export default function ResumoTab({ store, onJumpTab, onOpenAtualizar }: Props) {
  const narrative = useMemo(() => {
    const nome = store.nome || "Esta loja";
    const inaugDate =
      parseDate((store as any).inauguracaoReal) || parseDate(store.inauguracao);
    const diasParaInaugurar = inaugDate ? daysBetween(inaugDate, new Date()) : null;

    let prazoFrase = "sem data de inauguração definida";
    let prazoTone: "ok" | "warn" | "bad" | "neutral" = "neutral";
    if (diasParaInaugurar !== null) {
      if (diasParaInaugurar < 0) {
        prazoFrase = `com inauguração vencida há ${Math.abs(diasParaInaugurar)} dias`;
        prazoTone = "bad";
      } else if (diasParaInaugurar === 0) {
        prazoFrase = "inaugurando hoje";
        prazoTone = "warn";
      } else if (diasParaInaugurar <= 14) {
        prazoFrase = `inaugurando em ${diasParaInaugurar} dias`;
        prazoTone = "warn";
      } else if (diasParaInaugurar <= 30) {
        prazoFrase = `inaugurando em ${diasParaInaugurar} dias`;
        prazoTone = "ok";
      } else {
        prazoFrase = `inaugurando em ${diasParaInaugurar} dias`;
        prazoTone = "neutral";
      }
    }

    // Última atualização
    const upDate = parseDate((store as any).ultimaAtualizacaoAt);
    let updateFrase = "sem histórico de atualizações";
    let updateStale = false;
    if (upDate) {
      const diasUpdate = daysBetween(new Date(), upDate);
      updateFrase = `última atualização há ${diasUpdate} dia${diasUpdate === 1 ? "" : "s"}`;
      if ((store as any).ultimaAtualizacaoAutor) {
        updateFrase += ` por ${(store as any).ultimaAtualizacaoAutor}`;
      }
      updateStale = diasUpdate >= 7;
    }

    return { nome, diasParaInaugurar, prazoFrase, prazoTone, updateFrase, updateStale };
  }, [store]);

  // Progresso do checklist
  const checklist = store.checklist || {};
  const progressoCategorias = useMemo(() => {
    return checklistCategories.map((cat) => {
      const items = (checklist as any)[cat.id]?.items || [];
      const realizado = items.filter((i: any) =>
        ["REALIZADO", "NÃO SE APLICA"].includes(i.status as StatusType)
      ).length;
      const total = items.length || 1;
      const pct = Math.round((realizado / total) * 100);
      return { id: cat.id, nome: cat.nome, pct, realizado, total };
    });
  }, [checklist]);

  const totalItens = progressoCategorias.reduce((s, c) => s + c.total, 0);
  const totalConcluidos = progressoCategorias.reduce((s, c) => s + c.realizado, 0);
  const pctGeral = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;

  // Pontos de atenção — categorias mais atrasadas
  const atrasadas = [...progressoCategorias]
    .filter((c) => c.total > 1 && c.pct < 50)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  // Próximas ações — itens pendentes das próximas fases
  const proximasAcoes = useMemo(() => {
    const acoes: { categoria: string; item: string }[] = [];
    for (const cat of checklistCategories) {
      const items = (checklist as any)[cat.id]?.items || [];
      for (const it of items) {
        if (
          it.status === "EM COTAÇÃO" ||
          it.status === "EM ANDAMENTO" ||
          it.status === "EM ANÁLISE" ||
          it.status === "EM ELABORAÇÃO"
        ) {
          acoes.push({ categoria: cat.nome, item: it.item });
          if (acoes.length >= 5) return acoes;
        }
      }
    }
    return acoes;
  }, [checklist]);

  const toneBg: Record<string, string> = {
    ok: "bg-[hsl(142,60%,95%)] border-[hsl(142,60%,75%)] text-[hsl(142,60%,20%)]",
    warn: "bg-[hsl(45,90%,95%)] border-[hsl(45,90%,70%)] text-[hsl(45,90%,20%)]",
    bad: "bg-destructive/10 border-destructive/40 text-destructive",
    neutral: "bg-muted border-border text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      {/* Narrativa executiva */}
      <Card className="p-6 bg-gradient-to-br from-background to-muted/40 border-l-4 border-l-primary">
        <div className="flex items-start gap-3">
          <div className="mt-1 shrink-0 rounded-full bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base sm:text-lg leading-relaxed">
              <span className="font-semibold">{narrative.nome}</span> está{" "}
              <span
                className={`inline-block px-2 py-0.5 rounded font-medium text-sm ${
                  narrative.prazoTone === "bad"
                    ? "bg-destructive/15 text-destructive"
                    : narrative.prazoTone === "warn"
                    ? "bg-[hsl(45,90%,90%)] text-[hsl(45,90%,20%)]"
                    : narrative.prazoTone === "ok"
                    ? "bg-[hsl(142,60%,90%)] text-[hsl(142,60%,20%)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {narrative.prazoFrase}
              </span>
              , com{" "}
              <span className="font-semibold">{pctGeral}% do checklist concluído</span>
              {atrasadas.length > 0 && (
                <>
                  {" "}
                  e atenção em{" "}
                  <span className="font-semibold">
                    {atrasadas.map((a) => a.nome).join(", ")}
                  </span>
                </>
              )}
              .{" "}
              <span className={narrative.updateStale ? "text-destructive font-medium" : "text-muted-foreground"}>
                {narrative.updateFrase}
                {narrative.updateStale ? " — atualização em atraso." : "."}
              </span>
            </p>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="flex flex-wrap gap-2 mt-5">
          <Button size="sm" onClick={onOpenAtualizar}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Atualizar progresso
          </Button>
          <Button size="sm" variant="outline" onClick={() => onJumpTab("etapas")}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Ver etapas
          </Button>
          <Button size="sm" variant="outline" onClick={() => onJumpTab("pendencias")}>
            <Flag className="h-4 w-4 mr-2" />
            Ver pendências
          </Button>
          <Button size="sm" variant="outline" onClick={() => onJumpTab("checklist")}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Abrir checklist completo
          </Button>
        </div>
      </Card>

      {/* Grid: progresso por categoria + pontos de atenção + próximas ações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progresso por categoria */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Progresso por categoria
            </h3>
            <Badge variant="secondary">
              {totalConcluidos} / {totalItens} itens
            </Badge>
          </div>
          <div className="space-y-3">
            {progressoCategorias.map((c) => (
              <button
                key={c.id}
                onClick={() => onJumpTab("checklist")}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium group-hover:text-primary transition-colors">
                    {c.nome}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {c.realizado}/{c.total} · {c.pct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      c.pct >= 80
                        ? "bg-[hsl(142,60%,45%)]"
                        : c.pct >= 40
                        ? "bg-[hsl(38,90%,55%)]"
                        : "bg-destructive/70"
                    }`}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Sidebar direita — atenção + próximas ações */}
        <div className="space-y-4">
          {atrasadas.length > 0 && (
            <Card className={`p-5 border ${toneBg.warn}`}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                  Pontos de atenção
                </h3>
              </div>
              <ul className="space-y-2 text-sm">
                {atrasadas.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{a.nome}</span>
                    <Badge variant="outline" className="shrink-0 tabular-nums">
                      {a.pct}%
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {proximasAcoes.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Em andamento
                </h3>
              </div>
              <ul className="space-y-2.5 text-sm">
                {proximasAcoes.map((a, i) => (
                  <li key={i}>
                    <p className="font-medium truncate">{a.item}</p>
                    <p className="text-xs text-muted-foreground">{a.categoria}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
