import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import LojaPendenteCard from "./LojaPendenteCard";
import type { Analista, LojaPendente } from "@/hooks/useLojasPendentesHoje";

const CORES: Record<Analista, string> = {
  Deise: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  Thainara: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  Gizelia: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  Gustavo: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

export default function AnalistaColuna({ analista, lojas }: { analista: Analista; lojas: LojaPendente[] }) {
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
          {lojas.map((l) => <LojaPendenteCard key={l.id} loja={l} />)}
        </div>
      )}
    </div>
  );
}
