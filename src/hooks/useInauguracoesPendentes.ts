import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InauguracaoPendente = {
  storeId: string | null;      // stores.id (if a checklist store exists)
  pipelineId: string | null;   // pipeline_stores.id
  key: string;                 // stable dedupe key
  nome: string;
  filial: string | null;
  analista: string | null;
  dataInauguracao: string | null;
  semCusto: boolean;
  semContrato: boolean;
};

const norm = (s: string | null | undefined) =>
  (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

const DISMISS_KEY = "inauguracao:dismissals";

type Dismissals = Record<string, { custoOk?: boolean; contratoOk?: boolean }>;

function readDismissals(): Dismissals {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}"); } catch { return {}; }
}
function writeDismissals(d: Dismissals) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(d)); } catch { /* noop */ }
}

export function useInauguracoesPendentes() {
  const [items, setItems] = useState<InauguracaoPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [ps, cg, st] = await Promise.all([
      supabase.from("pipeline_stores").select("id, filial, local, status_geral, analista_obra, data_inauguracao").is("deleted_at", null),
      supabase.from("custos_geral_entries").select("nome").is("deleted_at", null),
      supabase.from("stores").select("id, nome, filial, stage_status").is("deleted_at", null),
    ]);
    const custosNomes = new Set<string>((cg.data || []).map((c: any) => norm(c.nome)));
    const storesByFilial = new Map<string, any>();
    const storesByNome = new Map<string, any>();
    (st.data || []).forEach((s: any) => {
      if (s.filial) storesByFilial.set(String(s.filial), s);
      if (s.nome) storesByNome.set(norm(s.nome), s);
    });

    const dismissals = readDismissals();
    const out: InauguracaoPendente[] = [];
    (ps.data || []).forEach((p: any) => {
      const status = String(p.status_geral || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
      if (!status.startsWith("inaugurada")) return;
      const nome = String(p.local || "").trim() || `Filial ${p.filial ?? ""}`;
      const key = String(p.id);
      const store =
        (p.filial && storesByFilial.get(String(p.filial))) ||
        storesByNome.get(norm(nome)) ||
        null;
      const stage = (store?.stage_status || {}) as Record<string, any>;
      const contratoConcluido =
        stage?.contrato_locacao === "concluido" || stage?.contrato_locacao === true;
      const nomeKey = norm(nome);
      const hasCusto = custosNomes.has(nomeKey);

      const dm = dismissals[key] || {};
      const semCusto = !hasCusto && !dm.custoOk;
      const semContrato = !contratoConcluido && !dm.contratoOk;
      if (!semCusto && !semContrato) return;

      out.push({
        storeId: store?.id || null,
        pipelineId: String(p.id),
        key,
        nome,
        filial: p.filial ? String(p.filial) : null,
        analista: p.analista_obra || null,
        dataInauguracao: p.data_inauguracao || null,
        semCusto,
        semContrato,
      });
    });
    setItems(out);
    setLoading(false);
  }, [tick]);

  useEffect(() => { load(); }, [load]);

  const dismiss = (key: string, field: "custoOk" | "contratoOk") => {
    const d = readDismissals();
    d[key] = { ...d[key], [field]: true };
    writeDismissals(d);
    setTick((t) => t + 1);
  };
  const dismissAll = (key: string) => {
    const d = readDismissals();
    d[key] = { custoOk: true, contratoOk: true };
    writeDismissals(d);
    setTick((t) => t + 1);
  };

  return { items, loading, dismiss, dismissAll, reload: () => setTick((t) => t + 1) };
}
