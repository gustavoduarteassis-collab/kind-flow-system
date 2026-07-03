import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, LayoutDashboard, Sparkles } from "lucide-react";
import AnalistaColuna from "./AnalistaColuna";
import { ANALISTAS_ORDEM, useLojasPendentesHoje } from "@/hooks/useLojasPendentesHoje";
import { InauguracaoBanner } from "@/components/InauguracaoBanner";

export default function HojePainel() {
  const { grupos, acompanhamento, totalLojas, loading, error } = useLojasPendentesHoje();

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <InauguracaoBanner />

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
              <AnalistaColuna key={a} analista={a} lojas={grupos[a]} acompanhamento={acompanhamento[a]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
