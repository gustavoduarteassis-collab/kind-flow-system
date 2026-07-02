import { useState, useEffect, useCallback } from "react";
import { Store, createDefaultChecklist } from "@/data/checklistData";
import { createDefaultCronograma } from "@/data/cronogramaData";
import { createDefaultCustos } from "@/data/custosData";
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
      .is("deleted_at", null)
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
        tipoLoja: row.tipo_loja || "",
        checklist: row.checklist || createDefaultChecklist(),
        cronograma: row.cronograma || createDefaultCronograma(),
        custos: row.custos || createDefaultCustos(),
        inauguracaoChecklist: row.inauguracao_checklist || {},
        solicitacoes: row.solicitacoes || {},
        visitaTecnica: row.visita_tecnica || {},
        isReforma: row.is_reforma === true,
        dataContratoLocacao: row.data_contrato_locacao || "",
        dataLiberacaoChaves: row.data_liberacao_chaves || "",
        demolicaoPrev: row.demolicao_prev || "",
        demolicaoReal: row.demolicao_real || "",
        obraInicioPrev: row.obra_inicio_prev || "",
        obraInicioReal: row.obra_inicio_real || "",
        moveisPrev: row.moveis_prev || "",
        moveisReal: row.moveis_real || "",
        produtosPrev: row.produtos_prev || "",
        produtosReal: row.produtos_real || "",
        inauguracaoReal: row.inauguracao_real || "",
        visitaTecnicaReal: row.visita_tecnica_real || "",
        ultimaAtualizacao: row.ultima_atualizacao || "",
        ultimaAtualizacaoAt: row.ultima_atualizacao_at || "",
        ultimaAtualizacaoAutor: row.ultima_atualizacao_autor || "",
        cidade: row.cidade || "",
        uf: row.uf || "",
        endereco: row.endereco || "",
        cep: row.cep || "",
        telefone: row.telefone || "",
        emailLoja: row.email_loja || "",
        cnpj: row.cnpj || "",
        razaoSocial: row.razao_social || "",
        marca: row.marca || "",
        shoppingNome: row.shopping_nome || "",
        metragemM2: row.metragem_m2 ?? null,
        observacoesGerais: row.observacoes_gerais || "",
        porte: row.porte || "",
        localizacao: row.localizacao || "",
        stageStatus: (row.stage_status && typeof row.stage_status === "object") ? row.stage_status : {},
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const addStore = useCallback(async (data: Omit<Store, "id" | "checklist" | "cronograma">) => {
    if (!user) return "";
    const checklist = createDefaultChecklist();
    const cronograma = createDefaultCronograma();
    const custos = createDefaultCustos();
    const { data: inserted, error } = await supabase.from("stores").insert({
      user_id: user.id,
      nome: data.nome,
      filial: data.filial,
      franqueado: data.franqueado,
      construtor: data.construtor,
      analista_obra: data.analistaObra,
      inauguracao: data.inauguracao,
      tipo_loja: (data as any).tipoLoja || "",
      checklist: checklist as any,
      cronograma: cronograma as any,
      custos: custos as any,
      inauguracao_checklist: (data as any).inauguracaoChecklist || {} as any,
    }).select("id").single();
    if (inserted) {
      await fetchStores();
      return inserted.id;
    }
    return "";
  }, [user, fetchStores]);

  const updateStore = useCallback(async (id: string, updates: Partial<Store>) => {
    // Optimistic update FIRST so UI reflects changes immediately
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));

    const dbUpdates: any = {};
    if (updates.nome !== undefined) dbUpdates.nome = updates.nome;
    if (updates.filial !== undefined) dbUpdates.filial = updates.filial;
    if (updates.franqueado !== undefined) dbUpdates.franqueado = updates.franqueado;
    if (updates.construtor !== undefined) dbUpdates.construtor = updates.construtor;
    if (updates.analistaObra !== undefined) dbUpdates.analista_obra = updates.analistaObra;
    if (updates.inauguracao !== undefined) dbUpdates.inauguracao = updates.inauguracao;
    if (updates.tipoLoja !== undefined) dbUpdates.tipo_loja = updates.tipoLoja;
    if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist;
    if (updates.cronograma !== undefined) dbUpdates.cronograma = updates.cronograma;
    if ((updates as any).custos !== undefined) dbUpdates.custos = (updates as any).custos;
    if ((updates as any).inauguracaoChecklist !== undefined) dbUpdates.inauguracao_checklist = (updates as any).inauguracaoChecklist;
    if ((updates as any).solicitacoes !== undefined) dbUpdates.solicitacoes = (updates as any).solicitacoes;
    if ((updates as any).visitaTecnica !== undefined) dbUpdates.visita_tecnica = (updates as any).visitaTecnica;
    const dateMap: Record<string, string> = {
      dataContratoLocacao: "data_contrato_locacao",
      dataLiberacaoChaves: "data_liberacao_chaves",
      demolicaoPrev: "demolicao_prev",
      demolicaoReal: "demolicao_real",
      obraInicioPrev: "obra_inicio_prev",
      obraInicioReal: "obra_inicio_real",
      moveisPrev: "moveis_prev",
      moveisReal: "moveis_real",
      produtosPrev: "produtos_prev",
      produtosReal: "produtos_real",
      inauguracaoReal: "inauguracao_real",
      visitaTecnicaReal: "visita_tecnica_real",
    };
    for (const [k, col] of Object.entries(dateMap)) {
      const v = (updates as any)[k];
      if (v !== undefined) dbUpdates[col] = v || null;
    }

    const textMap: Record<string, string> = {
      cidade: "cidade",
      uf: "uf",
      endereco: "endereco",
      cep: "cep",
      telefone: "telefone",
      emailLoja: "email_loja",
      cnpj: "cnpj",
      razaoSocial: "razao_social",
      marca: "marca",
      shoppingNome: "shopping_nome",
      observacoesGerais: "observacoes_gerais",
      porte: "porte",
      localizacao: "localizacao",
    };
    for (const [k, col] of Object.entries(textMap)) {
      const v = (updates as any)[k];
      if (v !== undefined) dbUpdates[col] = v ?? null;
    }
    if ((updates as any).metragemM2 !== undefined) {
      const n = (updates as any).metragemM2;
      dbUpdates.metragem_m2 = (n === "" || n === null || n === undefined) ? null : Number(n);
    }
    if ((updates as any).stageStatus !== undefined) dbUpdates.stage_status = (updates as any).stageStatus;

    await supabase.from("stores").update(dbUpdates).eq("id", id);
  }, []);

  const deleteStore = useCallback(async (id: string) => {
    // Soft delete: nunca remove permanentemente. Use "Itens excluídos" para restaurar.
    await supabase
      .from("stores")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as any)
      .eq("id", id);
    setStores((prev) => prev.filter((s) => s.id !== id));
  }, [user]);

  const getStore = useCallback((id: string) => stores.find((s) => s.id === id), [stores]);

  return { stores, loading, addStore, updateStore, deleteStore, getStore, refetch: fetchStores };
}
