import { getAllInaugItems, migrateInaugData } from "@/data/inauguracaoChecklistData";

export type InaugurationLibStatus = "LIBERADO" | "LIBERADO_COM_RESSALVAS" | "NAO_LIBERADO" | "SEM_CHECKLIST";

/**
 * Determines if a store is liberated for inauguration based on its checklist data.
 * Uses the last round of the checklist.
 * Returns the liberation status.
 */
export function getInaugurationLibStatus(inaugChecklistRaw: any, tipoLoja?: string): InaugurationLibStatus {
  if (!inaugChecklistRaw || (typeof inaugChecklistRaw === "object" && Object.keys(inaugChecklistRaw).length === 0)) {
    return "SEM_CHECKLIST";
  }

  // Determine tipo (rua or shopping) from tipoLoja string
  const tipo: "rua" | "shopping" = (tipoLoja || "").toUpperCase().includes("SHOPPING") ? "shopping" : "rua";

  const data = migrateInaugData(inaugChecklistRaw, tipo);
  if (!data.rounds || data.rounds.length === 0) {
    return "SEM_CHECKLIST";
  }

  // Use the last round
  const currentRound = data.rounds[data.rounds.length - 1];
  const allItems = getAllInaugItems(tipo);
  const totalItems = allItems.length;
  if (totalItems === 0) return "SEM_CHECKLIST";

  const getStatusScore = (status?: string): number => {
    switch (status) {
      case "TOTALMENTE_ATENDIDO": return 100;
      case "EM_ANDAMENTO": return 50;
      case "NAO_SE_APLICA": return 100;
      default: return 0;
    }
  };

  const applicableItems = allItems.filter(item => currentRound.items[item.id]?.status !== "NAO_SE_APLICA");
  const totalScore = allItems.reduce(
    (acc, item) => acc + getStatusScore(currentRound.items[item.id]?.status),
    0
  );
  
  // Exclude NAO_SE_APLICA from max possible score
  const maxScore = applicableItems.length * 100;
  const progress = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const impeditivos = allItems.filter((i) => i.impeditivo);
  const impeditivosPendentes = impeditivos.filter((i) => {
    const s = currentRound.items[i.id]?.status;
    return s !== "TOTALMENTE_ATENDIDO" && s !== "NAO_SE_APLICA";
  }).length;

  const hasRessalva = !!currentRound.ressalva && currentRound.ressalva.trim().length > 0;

  if (progress >= 90 && impeditivosPendentes === 0) return "LIBERADO";
  if (hasRessalva || (progress >= 80 && impeditivosPendentes === 0)) return "LIBERADO_COM_RESSALVAS";
  return "NAO_LIBERADO";
}

/**
 * Returns true if a store is considered inaugurated (LIBERADO or LIBERADO_COM_RESSALVAS).
 */
export function isStoreLiberated(inaugChecklistRaw: any, tipoLoja?: string): boolean {
  const status = getInaugurationLibStatus(inaugChecklistRaw, tipoLoja);
  return status === "LIBERADO" || status === "LIBERADO_COM_RESSALVAS";
}
