import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Analista = "Deise" | "Thainara" | "Gizelia" | "Gustavo";
export const ANALISTAS_ORDEM: Analista[] = ["Deise", "Thainara", "Gizelia", "Gustavo"];

export type LojaPendente = {
  id: string;                 // store id
  nome: string;
  franqueado: string;
  analista: Analista;
  pendenciaId: string;        // id da pendência mais antiga
  pendenciaCurta: string;
  extraCount: number;         // outras pendências abertas/cobradas na mesma loja
  severity: "alta" | "media";
  diasParado: number;
  semUpdate: boolean;
  jaCobrada: boolean;
};

export type LojaAcompanhamento = {
  id: string;
  nome: string;
  ultimaAtualizacaoAt: string | null;
};

function normalizaAnalista(v?: string | null): Analista {
  const raw = (v || "").trim().toLowerCase();
  if (raw.startsWith("deise")) return "Deise";
  if (raw.startsWith("thainara")) return "Thainara";
  if (raw.startsWith("gizelia")) return "Gizelia";
  return "Gustavo";
}

function daysBetween(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

const TIPOS = ["nova", "reforma", "repasse", "troca"];

export function useLojasPendentesHoje() {
  const [grupos, setGrupos] = useState<Record<Analista, LojaPendente[]>>({
    Deise: [], Thainara: [], Gizelia: [], Gustavo: [],
  });
  const [acompanhamento, setAcompanhamento] = useState<Record<Analista, LojaAcompanhamento[]>>({
    Deise: [], Thainara: [], Gizelia: [], Gustavo: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);

      const storesQ = supabase
        .from("stores")
        .select("id,nome,franqueado,analista_obra,tipo_registro,ultima_atualizacao_at,inauguracao_real")
        .in("tipo_registro", TIPOS)
        .is("deleted_at", null);

      const pendQ = (supabase as any)
        .from("pendencias")
        .select("id,store_id,descricao,responsavel_interno,status,criado_em")
        .in("status", ["aberta", "cobrada"])
        .is("deleted_at", null)
        .order("criado_em", { ascending: true });

      const [{ data: stores, error: e1 }, { data: pends, error: e2 }] = await Promise.all([storesQ, pendQ]);
      if (cancel) return;
      if (e1 || e2) { setError((e1 || e2)?.message || "erro"); setLoading(false); return; }

      const storesById = new Map<string, any>();
      for (const s of (stores || [])) storesById.set(s.id, s);

      // Agrupar pendências por loja (só lojas ativas, não inauguradas)
      const pendsByStore = new Map<string, any[]>();
      for (const p of (pends || []) as any[]) {
        const s = storesById.get(p.store_id);
        if (!s || s.inauguracao_real) continue;
        if (!pendsByStore.has(p.store_id)) pendsByStore.set(p.store_id, []);
        pendsByStore.get(p.store_id)!.push(p);
      }

      const buckets: Record<Analista, LojaPendente[]> = {
        Deise: [], Thainara: [], Gizelia: [], Gustavo: [],
      };
      const acomp: Record<Analista, LojaAcompanhamento[]> = {
        Deise: [], Thainara: [], Gizelia: [], Gustavo: [],
      };

      for (const s of (stores || []) as any[]) {
        if (s.inauguracao_real) continue;
        const lista = pendsByStore.get(s.id);
        const analista = normalizaAnalista(
          lista?.[0]?.responsavel_interno || s.analista_obra
        );

        if (!lista || lista.length === 0) {
          acomp[analista].push({
            id: s.id,
            nome: s.nome,
            ultimaAtualizacaoAt: s.ultima_atualizacao_at || null,
          });
          continue;
        }

        const oldest = lista[0]; // ordenada asc
        const dias = daysBetween(oldest.criado_em);
        buckets[analista].push({
          id: s.id,
          nome: s.nome,
          franqueado: s.franqueado || "",
          analista,
          pendenciaId: oldest.id,
          pendenciaCurta: oldest.descricao,
          extraCount: lista.length - 1,
          severity: dias > 14 ? "alta" : "media",
          diasParado: dias,
          semUpdate: false,
          jaCobrada: oldest.status === "cobrada",
        });
      }

      for (const k of ANALISTAS_ORDEM) {
        buckets[k].sort((a, b) => b.diasParado - a.diasParado);
        acomp[k].sort((a, b) => {
          const da = a.ultimaAtualizacaoAt ? new Date(a.ultimaAtualizacaoAt).getTime() : 0;
          const db = b.ultimaAtualizacaoAt ? new Date(b.ultimaAtualizacaoAt).getTime() : 0;
          return db - da;
        });
      }
      setGrupos(buckets);
      setAcompanhamento(acomp);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [tick]);

  const totalLojas = useMemo(
    () => ANALISTAS_ORDEM.reduce((s, a) => s + grupos[a].length, 0),
    [grupos]
  );

  return { grupos, acompanhamento, totalLojas, loading, error, refresh };
}
