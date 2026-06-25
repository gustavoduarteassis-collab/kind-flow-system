import { Store as StoreType } from "@/data/checklistData";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = {
  key: string;
  label: string;
  icon: string;
  done: boolean;
  active: boolean;
};

interface Props {
  store: StoreType;
  /** Se a loja já foi marcada como Inaugurada no Funil (pipeline_stores.status_geral começa com "Inaugurada"). */
  inauguradaInPipeline?: boolean;
}

function computePhases(store: StoreType, inauguradaInPipeline: boolean): Phase[] {
  // 1. Funil — existe registro da loja
  const funilDone = true;

  // 2. Pré-Obra — visita técnica ou solicitações iniciadas
  const visitaCount = store.visitaTecnica
    ? Object.keys(store.visitaTecnica).length
    : 0;
  const solicitCount = store.solicitacoes
    ? Object.keys(store.solicitacoes).length
    : 0;
  const preObraDone = visitaCount > 0 || solicitCount > 0;

  // 3. Obra — qualquer item do checklist saiu de NÃO INICIADO
  const checklistItems = Object.values(store.checklist || {});
  const obraDone = checklistItems.some(
    (i: any) => i?.status && i.status !== "NÃO INICIADO"
  );
  const allChecklistDone =
    checklistItems.length > 0 &&
    checklistItems.every(
      (i: any) =>
        i?.status === "REALIZADO" || i?.status === "NÃO SE APLICA"
    );

  // 4. Checklist Final de Inauguração — iniciado
  const inaugRaw: any = store.inauguracaoChecklist;
  let checklistFinalDone = false;
  if (inaugRaw && typeof inaugRaw === "object") {
    const rounds = inaugRaw.rounds;
    if (Array.isArray(rounds) && rounds.length > 0) {
      checklistFinalDone = rounds.some(
        (r: any) => r?.items && Object.keys(r.items).length > 0
      );
    } else if (Object.keys(inaugRaw).length > 0) {
      checklistFinalDone = true;
    }
  }

  // 5. Inaugurada — checklist liberado OU marcada no funil
  const inauguradaDone =
    inauguradaInPipeline ||
    isStoreLiberated(store.inauguracaoChecklist, store.tipoLoja);

  // "active" = primeira fase ainda não concluída
  const flags = [
    funilDone,
    preObraDone,
    obraDone && allChecklistDone,
    checklistFinalDone,
    inauguradaDone,
  ];
  const firstPending = flags.findIndex((f) => !f);

  return [
    { key: "funil", label: "Funil", icon: "🎯", done: funilDone, active: firstPending === 0 },
    { key: "preobra", label: "Pré-Obra", icon: "📋", done: preObraDone, active: firstPending === 1 },
    { key: "obra", label: "Obra", icon: "🏗️", done: obraDone && allChecklistDone, active: firstPending === 2 || (obraDone && !allChecklistDone) },
    { key: "checklist", label: "Checklist Final", icon: "✅", done: checklistFinalDone, active: firstPending === 3 },
    { key: "inaugurada", label: "Inaugurada", icon: "🎉", done: inauguradaDone, active: firstPending === 4 },
  ];
}

export default function StorePhaseProgress({ store, inauguradaInPipeline = false }: Props) {
  const phases = computePhases(store, inauguradaInPipeline);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {phases.map((p, idx) => (
          <div key={p.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                  p.done
                    ? "bg-[hsl(142,60%,45%)] text-white border-[hsl(142,60%,45%)]"
                    : p.active
                    ? "bg-[hsl(45,90%,55%)] text-[hsl(45,90%,15%)] border-[hsl(45,90%,55%)] animate-pulse"
                    : "bg-muted text-muted-foreground border-border"
                )}
                title={p.label}
              >
                {p.done ? <Check className="h-4 w-4" /> : <span>{p.icon}</span>}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] font-medium text-center whitespace-nowrap",
                  p.done
                    ? "text-[hsl(142,60%,35%)]"
                    : p.active
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {p.label}
              </span>
            </div>
            {idx < phases.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 sm:mx-2 -mt-4 transition-colors",
                  phases[idx + 1].done || p.done
                    ? "bg-[hsl(142,60%,45%)]"
                    : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
