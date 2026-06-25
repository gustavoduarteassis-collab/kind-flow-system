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
 *  - Se a loja não existe ainda no pipeline_stores, cria a entrada (assim
 *    lojas cadastradas só em `stores` aparecem na aba Inauguradas).
 *  - Executa no máximo uma vez por montagem do componente (debounce por ref).
 *  - Silencioso (sem toast) para não poluir a navegação.
 */
export function useAutoMarkInaugurada(args: {
  filial?: string | null;
  storeName?: string | null;
  franqueado?: string | null;
  analistaObra?: string | null;
  inauguracao?: string | null;
  inauguracaoChecklist: any;
  tipoLoja?: string;
  onMarked?: () => void;
}) {
  const {
    filial,
    storeName,
    franqueado,
    analistaObra,
    inauguracao,
    inauguracaoChecklist,
    tipoLoja,
    onMarked,
  } = args;
  const alreadyRan = useRef(false);

  useEffect(() => {
    if (alreadyRan.current) return;
    if (!isStoreLiberated(inauguracaoChecklist, tipoLoja)) return;
    if (!filial && !storeName) return;

    alreadyRan.current = true;

    (async () => {
      try {
        // Try by filial first; fall back to name match
        let existing: { id: string; status_geral: string | null } | null = null;
        if (filial) {
          const { data } = await supabase
            .from("pipeline_stores")
            .select("id, status_geral")
            .eq("filial", filial)
            .maybeSingle();
          existing = (data as any) ?? null;
        }
        if (!existing && storeName) {
          const { data } = await supabase
            .from("pipeline_stores")
            .select("id, status_geral")
            .ilike("local", storeName)
            .maybeSingle();
          existing = (data as any) ?? null;
        }

        const prefix = `Inaugurada em ${format(new Date(), "dd/MM/yyyy")} (auto: checklist liberado)`;

        if (existing) {
          const prev = (existing.status_geral || "").trim();
          if (prev.toLowerCase().startsWith("inaugurada")) return;
          const newStatus = prev ? `${prefix}\n---\n${prev}` : prefix;
          const { error: upErr } = await supabase
            .from("pipeline_stores")
            .update({ status_geral: newStatus } as any)
            .eq("id", existing.id);
          if (!upErr && onMarked) onMarked();
        } else {
          // Cria entrada nova no funil para refletir a inauguração
          const { data: userRes } = await supabase.auth.getUser();
          const uid = userRes.user?.id;
          if (!uid) return;
          const insertPayload: any = {
            user_id: uid,
            filial: filial || null,
            local: storeName || null,
            franqueado: franqueado || null,
            analista_obra: analistaObra || null,
            data_inauguracao: inauguracao || null,
            status_geral: prefix,
          };
          const { error: insErr } = await supabase
            .from("pipeline_stores")
            .insert(insertPayload);
          if (!insErr && onMarked) onMarked();
        }
      } catch {
        // silencioso por design
      }
    })();
  }, [filial, storeName, franqueado, analistaObra, inauguracao, inauguracaoChecklist, tipoLoja, onMarked]);
}
