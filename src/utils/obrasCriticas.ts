/**
 * Pure logic for grouping "Obras Críticas" alerts per store.
 * Extracted from src/pages/Index.tsx so it can be regression-tested.
 */

export type Sem = "red" | "amber" | "green" | "muted";

export type CriticalMetric = {
  store: { id: string; nome: string; analistaObra?: string | null };
  days: number | null;
  vtPct: number;
  cron: boolean;
  pct: number;
  atrasados: number;
  custo?: { hasCusto: boolean } | null;
};

export type CriticalAlert = {
  label: string;
  tone: Sem;
  tab?: string;
  sort: number;
};

export type GroupedCriticalAlert = {
  storeId: string;
  storeName: string;
  analista: string;
  alerts: CriticalAlert[];
  worstTone: Sem;
  minSort: number;
};

const toneRank: Record<Sem, number> = { red: 3, amber: 2, green: 1, muted: 0 };

export function groupObrasCriticas(metrics: CriticalMetric[]): GroupedCriticalAlert[] {
  const byStore = new Map<string, GroupedCriticalAlert>();

  const push = (m: CriticalMetric, a: CriticalAlert) => {
    const key = m.store.id;
    const g =
      byStore.get(key) ||
      {
        storeId: key,
        storeName: m.store.nome,
        analista: m.store.analistaObra || "—",
        alerts: [],
        worstTone: "muted" as Sem,
        minSort: 999,
      };
    g.alerts.push(a);
    if (toneRank[a.tone] > toneRank[g.worstTone]) g.worstTone = a.tone;
    if (a.sort < g.minSort) g.minSort = a.sort;
    byStore.set(key, g);
  };

  metrics.forEach((m) => {
    if (m.days !== null && m.days >= 0 && m.days <= 7) {
      push(m, {
        label: `⏳ ${m.days === 0 ? "Inaugura hoje" : `${m.days}d p/ inaugurar`}`,
        tone: "red",
        sort: m.days,
      });
    }
    if (m.vtPct === 0 && m.days !== null && m.days >= 0 && m.days < 30) {
      push(m, { label: "🔍 Visita pendente", tone: "red", tab: "visita-tecnica", sort: 10 });
    }
    if (!m.cron) {
      push(m, { label: "📅 Sem cronograma", tone: "amber", tab: "cronograma", sort: 20 });
    }
    if (!m.custo?.hasCusto && m.pct > 20) {
      push(m, { label: "💰 Sem custo", tone: "amber", tab: "custos", sort: 30 });
    }
    if (m.atrasados > 10) {
      push(m, { label: `⚠️ ${m.atrasados} atrasados`, tone: "red", sort: 5 });
    }
  });

  return Array.from(byStore.values()).sort((a, b) => a.minSort - b.minSort);
}

/** Total of stores with at least one active alert. */
export function countUniqueAlertStores(grouped: GroupedCriticalAlert[]): number {
  return grouped.length;
}
