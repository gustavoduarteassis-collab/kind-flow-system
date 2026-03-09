import { useState, useEffect, useCallback } from "react";
import { Store, createDefaultChecklist } from "@/data/checklistData";
import { createDefaultCronograma } from "@/data/cronogramaData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useStores() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    if (!user) { setStores([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setStores(data.map((row: any) => ({
        id: row.id,
        nome: row.nome,
        filial: row.filial || "",
        franqueado: row.franqueado || "",
        construtor: row.construtor || "",
        analistaObra: row.analista_obra || "",
        inauguracao: row.inauguracao || "",
        checklist: row.checklist || createDefaultChecklist(),
        cronograma: row.cronograma || createDefaultCronograma(),
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const addStore = useCallback(async (data: Omit<Store, "id" | "checklist" | "cronograma">) => {
    if (!user) return "";
    const checklist = createDefaultChecklist();
    const cronograma = createDefaultCronograma();
    const { data: inserted, error } = await supabase.from("stores").insert({
      user_id: user.id,
      nome: data.nome,
      filial: data.filial,
      franqueado: data.franqueado,
      construtor: data.construtor,
      analista_obra: data.analistaObra,
      inauguracao: data.inauguracao,
      checklist: checklist as any,
      cronograma: cronograma as any,
    }).select("id").single();
    if (inserted) {
      await fetchStores();
      return inserted.id;
    }
    return "";
  }, [user, fetchStores]);

  const updateStore = useCallback(async (id: string, updates: Partial<Store>) => {
    const dbUpdates: any = {};
    if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
    if (updates.filial !== undefined) dbUpdates.filial = updates.filial;
    if (updates.franqueado !== undefined) dbUpdates.franqueado = updates.franqueado;
    if (updates.construtor !== undefined) dbUpdates.construtor = updates.construtor;
    if (updates.analistaObra !== undefined) dbUpdates.analista_obra = updates.analistaObra;
    if (updates.inauguracao !== undefined) dbUpdates.inauguracao = updates.inauguracao;
    if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist;
    if (updates.cronograma !== undefined) dbUpdates.cronograma = updates.cronograma;

    await supabase.from("stores").update(dbUpdates).eq("id", id);
    // Optimistic update
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const deleteStore = useCallback(async (id: string) => {
    await supabase.from("stores").delete().eq("id", id);
    setStores((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getStore = useCallback((id: string) => stores.find((s) => s.id === id), [stores]);

  return { stores, loading, addStore, updateStore, deleteStore, getStore, refetch: fetchStores };
}
