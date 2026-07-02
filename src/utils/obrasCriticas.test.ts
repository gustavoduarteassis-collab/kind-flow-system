import { describe, it, expect } from "vitest";
import {
  groupObrasCriticas,
  countUniqueAlertStores,
  type CriticalMetric,
} from "./obrasCriticas";

const baseStore = (id: string, nome = `Loja ${id}`, analistaObra: string | null = "Ana") => ({
  id,
  nome,
  analistaObra,
});

const metric = (overrides: Partial<CriticalMetric> & Pick<CriticalMetric, "store">): CriticalMetric => ({
  days: null,
  vtPct: 50,
  cron: true,
  pct: 0,
  atrasados: 0,
  custo: { hasCusto: true },
  ...overrides,
});

describe("groupObrasCriticas", () => {
  it("agrupa múltiplos alertas da mesma loja em um único card", () => {
    const m: CriticalMetric[] = [
      metric({
        store: baseStore("s1"),
        days: 3,
        vtPct: 0,
        cron: false,
        pct: 50,
        custo: { hasCusto: false },
        atrasados: 15,
      }),
    ];
    const grouped = groupObrasCriticas(m);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].storeId).toBe("s1");
    // 5 alertas: inauguração, visita, cronograma, custo, atrasados
    expect(grouped[0].alerts).toHaveLength(5);
    const labels = grouped[0].alerts.map((a) => a.label);
    expect(labels.some((l) => l.includes("3d p/ inaugurar"))).toBe(true);
    expect(labels).toContain("🔍 Visita pendente");
    expect(labels).toContain("📅 Sem cronograma");
    expect(labels).toContain("💰 Sem custo");
    expect(labels.some((l) => l.includes("15 atrasados"))).toBe(true);
  });

  it("nunca duplica a mesma loja — total de lojas únicas = número de storeIds distintos", () => {
    const m: CriticalMetric[] = [
      metric({ store: baseStore("s1"), cron: false, pct: 50, custo: { hasCusto: false } }),
      metric({ store: baseStore("s2"), cron: false }),
      metric({ store: baseStore("s3"), days: 0, vtPct: 0 }),
      metric({ store: baseStore("s3"), days: 0, vtPct: 0 }), // repetição defensiva
    ];
    const grouped = groupObrasCriticas(m);
    expect(countUniqueAlertStores(grouped)).toBe(3);
    expect(new Set(grouped.map((g) => g.storeId)).size).toBe(grouped.length);
  });

  it("omite lojas sem alertas", () => {
    const m: CriticalMetric[] = [
      metric({ store: baseStore("ok"), days: 60, vtPct: 80, cron: true, pct: 90, custo: { hasCusto: true } }),
    ];
    expect(groupObrasCriticas(m)).toHaveLength(0);
  });

  it("worstTone reflete o pior alerta (red > amber > green > muted)", () => {
    const m: CriticalMetric[] = [
      // apenas amarelos
      metric({ store: baseStore("s1"), cron: false, pct: 50, custo: { hasCusto: false } }),
      // vermelho + amarelo
      metric({ store: baseStore("s2"), days: 2, cron: false }),
    ];
    const grouped = groupObrasCriticas(m);
    const s1 = grouped.find((g) => g.storeId === "s1")!;
    const s2 = grouped.find((g) => g.storeId === "s2")!;
    expect(s1.worstTone).toBe("amber");
    expect(s2.worstTone).toBe("red");
  });

  it("ordena grupos por minSort ascendente (mais urgentes primeiro)", () => {
    const m: CriticalMetric[] = [
      metric({ store: baseStore("far"), cron: false }), // amber sort=20
      metric({ store: baseStore("today"), days: 0 }),   // red sort=0
      metric({ store: baseStore("soon"), days: 4 }),    // red sort=4
    ];
    const grouped = groupObrasCriticas(m);
    expect(grouped.map((g) => g.storeId)).toEqual(["today", "soon", "far"]);
  });

  it("não gera alerta de custo quando pct <= 20 mesmo sem custo lançado", () => {
    const m: CriticalMetric[] = [
      metric({ store: baseStore("s1"), pct: 10, custo: { hasCusto: false } }),
    ];
    expect(groupObrasCriticas(m)).toHaveLength(0);
  });

  it("não gera alerta de visita pendente quando loja não tem data de inauguração", () => {
    const m: CriticalMetric[] = [
      metric({ store: baseStore("s1"), days: null, vtPct: 0 }),
    ];
    expect(groupObrasCriticas(m)).toHaveLength(0);
  });

  it("preserva o nome e analista da loja no grupo", () => {
    const m: CriticalMetric[] = [
      metric({ store: baseStore("s1", "MEGA BH", "Carlos"), cron: false }),
      metric({ store: { id: "s2", nome: "LOJA X", analistaObra: null }, cron: false }),
    ];
    const grouped = groupObrasCriticas(m);
    expect(grouped.find((g) => g.storeId === "s1")?.storeName).toBe("MEGA BH");
    expect(grouped.find((g) => g.storeId === "s1")?.analista).toBe("Carlos");
    expect(grouped.find((g) => g.storeId === "s2")?.analista).toBe("—");
  });
});
