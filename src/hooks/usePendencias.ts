import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PendenciaAguardando =
  | "franqueado" | "juridico" | "fornecedor" | "shopping" | "interno";
export type PendenciaStatus = "aberta" | "cobrada" | "resolvida";

export type Pendencia = {
  id: string;
  store_id: string;
  descricao: string;
  aguardando_quem: PendenciaAguardando;
  responsavel_interno: string | null;
  prazo_cobranca: string | null;
  status: PendenciaStatus;
  resolvido_em: string | null;
  criado_em: string;
  criado_por: string | null;
  updated_at: string;
  deleted_at: string | null;
};

export type PendenciaInput = {
  descricao: string;
  aguardando_quem: PendenciaAguardando;
  responsavel_interno?: string | null;
  prazo_cobranca?: string | null;
};

const table = () => (supabase as any).from("pendencias");

export function usePendencias(storeId?: string) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!storeId) { setPendencias([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await table()
      .select("*")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .order("criado_em", { ascending: false });
    if (error) setError(error.message);
    else { setError(null); setPendencias((data || []) as Pendencia[]); }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = async (input: PendenciaInput) => {
    if (!storeId) return { error: "sem loja" };
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await table().insert({
      store_id: storeId,
      descricao: input.descricao.trim(),
      aguardando_quem: input.aguardando_quem,
      responsavel_interno: input.responsavel_interno?.trim() || null,
      prazo_cobranca: input.prazo_cobranca || null,
      criado_por: user?.id || null,
    });
    if (!error) await refetch();
    return { error: error?.message };
  };

  const update = async (id: string, patch: Partial<PendenciaInput> & { status?: PendenciaStatus }) => {
    const p: any = { ...patch };
    if (p.descricao) p.descricao = p.descricao.trim();
    if (patch.status === "resolvida") p.resolvido_em = new Date().toISOString();
    if (patch.status && patch.status !== "resolvida") p.resolvido_em = null;
    const { error } = await table().update(p).eq("id", id);
    if (!error) await refetch();
    return { error: error?.message };
  };

  const remove = async (id: string) => {
    const { error } = await table()
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) await refetch();
    return { error: error?.message };
  };

  return { pendencias, loading, error, refetch, create, update, remove };
}

export const AGUARDANDO_LABEL: Record<PendenciaAguardando, string> = {
  franqueado: "Franqueado",
  juridico: "Jurídico",
  fornecedor: "Fornecedor",
  shopping: "Shopping",
  interno: "Interno",
};

export const STATUS_LABEL: Record<PendenciaStatus, string> = {
  aberta: "Aberta",
  cobrada: "Cobrada",
  resolvida: "Resolvida",
};
