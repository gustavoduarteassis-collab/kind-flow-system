import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeCriticality, daysSince } from "@/utils/storeCriticality";
import type { Store } from "@/data/checklistData";
import { checklistCategories, type StatusType } from "@/data/checklistData";

export type Analista = "Deise" | "Thainara" | "Gizelia" | "Gustavo";
export const ANALISTAS_ORDEM: Analista[] = ["Deise", "Thainara", "Gizelia", "Gustavo"];

export type LojaPendente = {
  id: string;
  nome: string;
  franqueado: string;
  analista: Analista;
  pendenciaCurta: string;
  severity: "alta" | "media";
  diasParado: number; // 999 se sem update
  semUpdate: boolean;
};

function progressPct(checklist: any): number {
  if (!checklist || typeof checklist !== "object") return 0;
  let total = 0, done = 0;
  for (const cat of checklistCategories) {
    for (const item of cat.items) {
      total++;
      const st = String(checklist?.[cat.id]?.[item.id]?.status || "").toUpperCase();
      if (st === "REALIZADO" || st === "NÃO SE APLICA") done++;
      else if (st === "REALIZANDO" || st === "EM ANDAMENTO") done += 0.5;
    }
  }
  return total ? (done / total) * 100 : 0;
}


function normalizaAnalista(v?: string | null): Analista {
  const raw = (v || "").trim().toLowerCase();
  if (raw.startsWith("deise")) return "Deise";
  if (raw.startsWith("thainara")) return "Thainara";
  if (raw.startsWith("gizelia")) return "Gizelia";
  return "Gustavo";
}

export function useLojasPendentesHoje() {
  const [grupos, setGrupos] = useState<Record<Analista, LojaPendente[]>>({
    Deise: [], Thainara: [], Gizelia: [], Gustavo: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("stores")
        .select(
          "id,nome,franqueado,analista_obra,tipo_registro,ultima_atualizacao_at," +
          "inauguracao,inauguracao_real," +
          "demolicao_prev,demolicao_real,obra_inicio_prev,obra_inicio_real," +
          "moveis_prev,moveis_real,produtos_prev,produtos_real,checklist"
        )
        .in("tipo_registro", ["nova", "reforma", "repasse", "troca"])
        .is("deleted_at", null);
      if (cancel) return;
      if (error) { setError(error.message); setLoading(false); return; }

      const buckets: Record<Analista, LojaPendente[]> = {
        Deise: [], Thainara: [], Gizelia: [], Gustavo: [],
      };
      for (const row of (data || []) as any[]) {
        const store: Store = {
          id: row.id, nome: row.nome, franqueado: row.franqueado || "",
          filial: "", construtor: "", analistaObra: row.analista_obra || "",
          inauguracao: row.inauguracao || "", tipoLoja: "",
          checklist: row.checklist || {}, cronograma: {} as any, custos: {} as any,
          inauguracaoChecklist: {}, solicitacoes: {}, visitaTecnica: {},
          demolicaoPrev: row.demolicao_prev || "", demolicaoReal: row.demolicao_real || "",
          obraInicioPrev: row.obra_inicio_prev || "", obraInicioReal: row.obra_inicio_real || "",
          moveisPrev: row.moveis_prev || "", moveisReal: row.moveis_real || "",
          produtosPrev: row.produtos_prev || "", produtosReal: row.produtos_real || "",
          inauguracaoReal: row.inauguracao_real || "",
          ultimaAtualizacaoAt: row.ultima_atualizacao_at || "",
        } as Store;

        const pct = progressPct(row.checklist);
        const inaugurada = !!row.inauguracao_real;
        const reasons = computeCriticality(store, { progressPct: pct, inaugurada });
        if (reasons.length === 0) continue;

        const worst =
          reasons.find((r) => r.severity === "alta") || reasons[0];
        const dias = daysSince(row.ultima_atualizacao_at);
        buckets[normalizaAnalista(row.analista_obra)].push({
          id: row.id,
          nome: row.nome,
          franqueado: row.franqueado || "",
          analista: normalizaAnalista(row.analista_obra),
          pendenciaCurta: worst.label,
          severity: worst.severity,
          diasParado: dias === null ? 999 : dias,
          semUpdate: dias === null,
        });
      }
      for (const k of ANALISTAS_ORDEM) buckets[k].sort((a, b) => b.diasParado - a.diasParado);
      setGrupos(buckets);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  const totalLojas = useMemo(
    () => ANALISTAS_ORDEM.reduce((s, a) => s + grupos[a].length, 0),
    [grupos]
  );

  return { grupos, totalLojas, loading, error };
}
