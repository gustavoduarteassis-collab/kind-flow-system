import { Check, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STAGE_GROUPS, deriveStagesFromChecklist } from "@/data/matrizStages";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Store } from "@/data/checklistData";

interface Props {
  store: Store;
  canEdit: boolean;
  onUpdate: (patch: Partial<Store>) => void;
}

export default function EtapasPlanilhaLoja({ store, canEdit, onUpdate }: Props) {
  const [saving, setSaving] = useState<string | null>(null);
  const derived = useMemo(() => deriveStagesFromChecklist(store), [store]);
  const stageStatus = store.stageStatus || {};

  const isDone = (key: string) => !!(derived[key] || stageStatus[key]);

  const toggle = async (key: string) => {
    if (!canEdit) return;
    if (derived[key]) {
      toast.info("Etapa controlada pelo Checklist Final — ajuste por lá.");
      return;
    }
    const next = { ...stageStatus, [key]: !stageStatus[key] };
    onUpdate({ stageStatus: next });
    setSaving(key);
    const { error } = await supabase.from("stores").update({ stage_status: next }).eq("id", store.id);
    setSaving(null);
    if (error) {
      toast.error("Erro ao salvar etapa");
      onUpdate({ stageStatus });
    }
  };

  const total = STAGE_GROUPS.reduce((n, g) => n + g.stages.length, 0);
  const done = STAGE_GROUPS.reduce(
    (n, g) => n + g.stages.filter((s) => isDone(s.key)).length,
    0
  );
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-xl border bg-card p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold">Etapas da Planilha (Matriz)</h3>
            <p className="text-sm text-muted-foreground">
              Marcações manuais sincronizadas com a Matriz de Etapas. Itens do Checklist Final aparecem automáticos.
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {done}/{total} concluídas ({progress}%)
          </Badge>
        </div>

        <div className="space-y-5">
          {STAGE_GROUPS.map((group) => {
            const gDone = group.stages.filter((s) => isDone(s.key)).length;
            return (
              <div key={group.name}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.name}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    ({gDone}/{group.stages.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {group.stages.map((stage) => {
                    const done = isDone(stage.key);
                    const auto = !!derived[stage.key];
                    return (
                      <Tooltip key={stage.key}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            disabled={!canEdit || saving === stage.key}
                            onClick={() => toggle(stage.key)}
                            className={cn(
                              "flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors text-xs",
                              "hover:bg-muted/50 disabled:opacity-70 disabled:cursor-not-allowed",
                              done
                                ? "border-primary/40 bg-primary/5"
                                : "border-border bg-background",
                              stage.sub && "ml-3"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-4 w-4 items-center justify-center rounded border shrink-0",
                                done
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/40"
                              )}
                            >
                              {done && <Check className="h-3 w-3" />}
                            </span>
                            <span className="flex-1 leading-snug">
                              <span className={cn("font-medium", done && "text-primary")}>
                                {stage.label}
                              </span>
                              {auto && (
                                <span className="ml-1 text-[10px] text-muted-foreground">(auto)</span>
                              )}
                            </span>
                            <Info className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {stage.desc}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
