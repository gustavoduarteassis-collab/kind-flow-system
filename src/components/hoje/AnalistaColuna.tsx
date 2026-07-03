import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import LojaPendenteCard from "./LojaPendenteCard";
import type { Analista, LojaPendente, LojaAcompanhamento } from "@/hooks/useLojasPendentesHoje";

const CORES: Record<Analista, string> = {
  Deise: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  Thainara: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  Gizelia: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  Gustavo: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function AnalistaColuna({
  analista,
  lojas,
  acompanhamento = [],
  onCobrada,
}: {
  analista: Analista;
  lojas: LojaPendente[];
  acompanhamento?: LojaAcompanhamento[];
  onCobrada?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className={`sticky top-0 z-10 flex items-center justify-between rounded-md border px-3 py-2 backdrop-blur ${CORES[analista]}`}>
        <span className="font-semibold text-sm">{analista}</span>
        <Badge variant="outline" className="bg-background/70">{lojas.length}</Badge>
      </div>
      {lojas.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          Sem pendências
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lojas.map((l) => <LojaPendenteCard key={l.id} loja={l} onCobrada={onCobrada} />)}
        </div>
      )}

      {acompanhamento.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-1">
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-md border border-dashed px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/40 transition-colors">
            <span className="flex items-center gap-1">
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Em acompanhamento
            </span>
            <span className="tabular-nums">{acompanhamento.length}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 flex flex-col gap-1">
            {acompanhamento.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs"
              >
                <span className="truncate text-foreground/80">{l.nome}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {formatDate(l.ultimaAtualizacaoAt)}
                </span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
