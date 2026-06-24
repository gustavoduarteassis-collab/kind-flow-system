import { describe, it, expect } from "vitest";
import {
  isInauguradaStatus,
  buildInauguradasFiliais,
} from "@/utils/inauguradaFilter";

describe("isInauguradaStatus", () => {
  it("retorna true para 'Inaugurada' simples", () => {
    expect(isInauguradaStatus("Inaugurada")).toBe(true);
  });

  it("retorna true para status do markInaugurada com data", () => {
    expect(isInauguradaStatus("Inaugurada em 24/06/2026")).toBe(true);
    expect(
      isInauguradaStatus("Inaugurada em 24/06/2026\n---\nstatus antigo")
    ).toBe(true);
  });

  it("é insensível a caixa e acentos", () => {
    expect(isInauguradaStatus("inaugurada")).toBe(true);
    expect(isInauguradaStatus("INAUGURADA")).toBe(true);
    expect(isInauguradaStatus("InAuGuRaDa em 01/01/2026")).toBe(true);
    // mesmo sem o acento esperado, ainda considera (variação digitada)
    expect(isInauguradaStatus("Ináugurada")).toBe(true);
  });

  it("ignora espaços em branco no início", () => {
    expect(isInauguradaStatus("   Inaugurada em 10/05/2026")).toBe(true);
  });

  it("retorna false para status que apenas mencionam inauguração", () => {
    expect(isInauguradaStatus("Previsão de inauguração 05/2026")).toBe(false);
    expect(isInauguradaStatus("Pré-inauguração")).toBe(false);
    expect(isInauguradaStatus("A inaugurar em breve")).toBe(false);
  });

  it("retorna false para status comuns de andamento", () => {
    expect(isInauguradaStatus("Em andamento, instalações e estrutura")).toBe(
      false
    );
    expect(isInauguradaStatus("Complementares em análise")).toBe(false);
    expect(isInauguradaStatus("")).toBe(false);
    expect(isInauguradaStatus(null)).toBe(false);
    expect(isInauguradaStatus(undefined)).toBe(false);
  });
});

describe("buildInauguradasFiliais", () => {
  it("retorna Set vazio para entrada vazia ou nula", () => {
    expect(buildInauguradasFiliais([]).size).toBe(0);
    expect(buildInauguradasFiliais(null).size).toBe(0);
    expect(buildInauguradasFiliais(undefined).size).toBe(0);
  });

  it("inclui apenas filiais com status iniciando por Inaugurada", () => {
    const rows = [
      { filial: "140", status_geral: "Em andamento" },
      { filial: "222", status_geral: "Inaugurada em 10/05/2026" },
      { filial: "362", status_geral: "INAUGURADA" },
      { filial: "545", status_geral: "Complementares em análise" },
      { filial: "807", status_geral: "inaugurada em 01/06/2026\n---\nanterior" },
    ];
    const set = buildInauguradasFiliais(rows);
    expect(set.has("222")).toBe(true);
    expect(set.has("362")).toBe(true);
    expect(set.has("807")).toBe(true);
    expect(set.has("140")).toBe(false);
    expect(set.has("545")).toBe(false);
    expect(set.size).toBe(3);
  });

  it("ignora linhas sem filial", () => {
    const rows = [
      { filial: null, status_geral: "Inaugurada" },
      { filial: "", status_geral: "Inaugurada" },
      { filial: "999", status_geral: "Inaugurada" },
    ];
    const set = buildInauguradasFiliais(rows);
    expect(set.size).toBe(1);
    expect(set.has("999")).toBe(true);
  });

  it("garante exclusão do resumo: filial inaugurada nunca passa no filtro", () => {
    // Simula o filtro do Resumo das Lojas em Index.tsx
    const pipeline = [
      { filial: "140", status_geral: "Em andamento" },
      { filial: "222", status_geral: "Inaugurada em 10/05/2026" },
      { filial: "362", status_geral: "inaugurada" },
    ];
    const inauguradas = buildInauguradasFiliais(pipeline);

    const stores = [
      { filial: "140", pct: 45 },
      { filial: "222", pct: 80 }, // inaugurada via texto com data
      { filial: "362", pct: 10 }, // inaugurada via importação Excel
      { filial: "545", pct: 30 },
    ];

    const visiveis = stores.filter((s) => {
      if (s.filial && inauguradas.has(s.filial)) return false;
      return s.pct < 100;
    });

    expect(visiveis.map((s) => s.filial)).toEqual(["140", "545"]);
  });
});
