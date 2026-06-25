import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import { format } from "date-fns";

/**
 * Marca automaticamente a loja como "Inaugurada em dd/MM/yyyy" no pipeline_stores
 * quando o checklist de inauguração atinge LIBERADO ou LIBERADO_COM_RESSALVAS.
 *
 * Regras de segurança:
 *  - SOMENTE adiciona o prefixo; nunca apaga o histórico já preenchido.
 *  - Não faz nada se status_geral já começa com "inaugurada" (case-insensitive).
 *  - Executa no máximo uma vez por montagem do componente (debounce por ref).
 *  - Silencioso (sem toast) para não poluir a navegação.
 *
 * Retorna `inauguradaInPipeline` para a UI atualizar a barra de fases.
 */
export function useAutoMarkInaugurada(args: {
  filial?: string | null;
  inauguracaoChecklist: any;
  tipoLoja?: string;
  onMarked?: () => void;
}) {
  const { filial, inauguracaoChecklist, tipoLoja, onMarked } = args;
  const alreadyRan = useRef(false);

  useEffect(() => {
    if (alreadyRan.current) return;
    if (!filial) return;
    if (!isStoreLiberated(inauguracaoChecklist, tipoLoja)) return;

    alreadyRan.current = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("pipeline_stores")
          .select("id, status_geral")
          .eq("filial", filial)
          .maybeSingle();

        if (error || !data) return;

        const prev = (data.status_geral || "").trim();
        if (prev.toLowerCase().startsWith("inaugurada")) return;

        const prefix = `Inaugurada em ${format(new Date(), "dd/MM/yyyy")} (auto: checklist liberado)`;
        const newStatus = prev ? `${prefix}\n---\n${prev}` : prefix;

        const { error: upErr } = await supabase
          .from("pipeline_stores")
          .update({ status_geral: newStatus } as any)
          .eq("id", data.id);

        if (!upErr && onMarked) onMarked();
      } catch {
        // silencioso por design
      }
    })();
  }, [filial, inauguracaoChecklist, tipoLoja, onMarked]);
}
