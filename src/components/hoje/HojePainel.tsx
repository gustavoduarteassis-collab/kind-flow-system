import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, LayoutDashboard, Sparkles, MapPin, ArrowRight, PhoneOff } from "lucide-react";
import AnalistaColuna from "./AnalistaColuna";
import { ANALISTAS_ORDEM, useLojasPendentesHoje } from "@/hooks/useLojasPendentesHoje";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil, daysSince } from "@/utils/storeCriticality";

type LojaSemUpdate = {
  id: string;
  nome: string;
  filial: string | null;
  analista_obra: string | null;
  ultima_atualizacao_at: string | null;
  inauguracao: string | null;
  inauguracao_real: string | null;
  dInaug: number | null;
  stale: number | null;
};

function useLojasSemAtualizacao() {
  const [lojas, setLojas] = useState<LojaSemUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, nome, filial, analista_obra, ultima_atualizacao_at, inauguracao, inauguracao_real")
        .is("deleted_at", null);

      if (error || !data) {
        setLojas([]);
        setLoading(false);
        return;
      }

      const items: LojaSemUpdate[] = (data as any[])
        // Ignora inauguradas (com data real preenchida)
        .filter((r) => !r.inauguracao_real)
        .map((r) => {
          const stale = daysSince(r.ultima_atualizacao_at);
          const dInaug = daysUntil(r.inauguracao_real || r.inauguracao);
          return { ...r, stale, dInaug } as LojaSemUpdate;
        })
        .filter((r) => r.stale === null || r.stale > 7)
        .sort((a, b) => {
          // Mais próximas de inauguração primeiro; sem data ao final
          const da = a.dInaug ?? 999999;
          const db = b.dInaug ?? 999999;
          return da - db;
        });

      setLojas(items);
      setLoading(false);
    })();
  }, []);

  return { lojas, loading };
}

function formatInauguracao(d: number | null) {
  if (d === null) return "sem data";
  if (d === 0) return "hoje";
  if (d > 0) return `em ${d}d`;
  return `atrasada ${Math.abs(d)}d`;
}

function formatStale(s: number | null) {
  if (s === null) return "Nunca atualizada";
  return `Sem update há ${s}d`;
}

export default function HojePainel() {
  const { grupos, acompanhamento, totalLojas, loading, error, refresh } = useLojasPendentesHoje();
  const { lojas: semUpdate, loading: loadingSemUpdate } = useLojasSemAtualizacao();

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">


        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Hoje
            </h1>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando…" : `${totalLojas} loja(s) com pendência, agrupadas por analista`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/painel/detalhado">
              <LayoutDashboard className="h-4 w-4 mr-2" /> Ver detalhado
            </Link>
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 text-sm text-destructive">
              Erro ao carregar: {error}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {ANALISTAS_ORDEM.map((a) => (
              <div key={a} className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        ) : totalLojas === 0 ? (
          <Card>
            <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-semibold">Nenhuma pendência aberta agora.</p>
              <p className="text-xs text-muted-foreground">Todas as obras estão em dia.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {ANALISTAS_ORDEM.map((a) => (
              <AnalistaColuna key={a} analista={a} lojas={grupos[a]} acompanhamento={acompanhamento[a]} onCobrada={refresh} />
            ))}
          </div>
        )}

        {/* Seção: Lojas sem atualização há mais de 7 dias */}
        <div className="pt-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <PhoneOff className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Sem atualização há mais de 7 dias
            </h2>
            {!loadingSemUpdate && (
              <span className="text-xs text-muted-foreground">
                ({semUpdate.length} loja{semUpdate.length !== 1 ? "s" : ""})
              </span>
            )}
          </div>

          {loadingSemUpdate ? (
            <div className="space-y-2 mt-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : semUpdate.length === 0 ? (
            <Card className="mt-3">
              <CardContent className="p-4 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Todas as lojas atualizadas nos últimos 7 dias.
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-3">
              <CardContent className="p-0 divide-y">
                {semUpdate.map((l) => (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {l.nome}
                        {l.filial ? <span className="text-muted-foreground font-normal"> · {l.filial}</span> : null}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                        {l.analista_obra && <span>{l.analista_obra}</span>}
                        <span>·</span>
                        <span>Inauguração: {formatInauguracao(l.dInaug)}</span>
                      </div>
                    </div>
                    <Badge
                      variant={l.stale === null ? "secondary" : "destructive"}
                      className="text-[10px] shrink-0"
                    >
                      ⚠ {formatStale(l.stale)}
                    </Badge>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0">
                      <Link to={`/loja/${l.id}/atualizar`}>
                        Atualizar <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
