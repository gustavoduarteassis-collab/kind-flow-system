import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format, parse, isValid, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const METAS_CUSTO: Record<string, number> = { TRADICIONAL: 3250, LIGHT: 3500, OUTLET: 2900 };

type MonthlyData = {
  lojasLight: number;
  lojasTrad: number;
  lojasOutlet: number;
  totalLojas: number;
  custoTotalTrad: number;
  areaTrad: number;
  custoTotalLight: number;
  areaLight: number;
  custoTotalOutlet: number;
  areaOutlet: number;
  prazoTotal: number;
  prazoCount: number;
  prazoNegociacaoTotal: number;
  prazoNegociacaoCount: number;
  fornecedores: number;
};

const emptyMonth = (): MonthlyData => ({
  lojasLight: 0, lojasTrad: 0, lojasOutlet: 0, totalLojas: 0,
  custoTotalTrad: 0, areaTrad: 0, custoTotalLight: 0, areaLight: 0,
  custoTotalOutlet: 0, areaOutlet: 0,
  prazoTotal: 0, prazoCount: 0, prazoNegociacaoTotal: 0, prazoNegociacaoCount: 0,
  fornecedores: 0,
});

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  let d = parse(dateStr, "yyyy-MM-dd", new Date());
  if (isValid(d)) return d;
  d = parse(dateStr, "dd/MM/yyyy", new Date());
  if (isValid(d)) return d;
  d = new Date(dateStr);
  return isValid(d) ? d : null;
};

function sumMonths(data: MonthlyData[]): MonthlyData {
  return data.reduce((acc, m) => ({
    lojasLight: acc.lojasLight + m.lojasLight,
    lojasTrad: acc.lojasTrad + m.lojasTrad,
    lojasOutlet: acc.lojasOutlet + m.lojasOutlet,
    totalLojas: acc.totalLojas + m.totalLojas,
    custoTotalTrad: acc.custoTotalTrad + m.custoTotalTrad,
    areaTrad: acc.areaTrad + m.areaTrad,
    custoTotalLight: acc.custoTotalLight + m.custoTotalLight,
    areaLight: acc.areaLight + m.areaLight,
    custoTotalOutlet: acc.custoTotalOutlet + m.custoTotalOutlet,
    areaOutlet: acc.areaOutlet + m.areaOutlet,
    prazoTotal: acc.prazoTotal + m.prazoTotal,
    prazoCount: acc.prazoCount + m.prazoCount,
    prazoNegociacaoTotal: acc.prazoNegociacaoTotal + m.prazoNegociacaoTotal,
    prazoNegociacaoCount: acc.prazoNegociacaoCount + m.prazoNegociacaoCount,
    fornecedores: acc.fornecedores + m.fornecedores,
  }), emptyMonth());
}

function custoM2(custo: number, area: number): string {
  if (area <= 0) return "-";
  return `R$ ${Math.round(custo / area).toLocaleString("pt-BR")}`;
}

function prazoMedio(total: number, count: number): string {
  if (count <= 0) return "-";
  return String(Math.round(total / count));
}

type IndicatorRow = {
  label: string;
  type: "header" | "meta" | "realizado";
  values: string[];
  metaValues?: number[];
};

export function MatrizResultados({ year }: { year: number }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(Array(12).fill(null).map(() => emptyMonth()));

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [storesRes, pipelineRes, custosRes, fornecRes] = await Promise.all([
        supabase.from("stores").select("id, nome, inauguracao, tipo_loja, inauguracao_checklist"),
        supabase.from("pipeline_stores").select("id, filial, local, inicio_obra, data_inauguracao, previsao_inauguracao, data_liberacao_orcamento, padrao"),
        supabase.from("custos_geral_entries").select("id, nome, tipo, area_loja, mao_de_obra, moveis, piso, iluminacao, informatica, demais_itens"),
        supabase.from("fornecedores_prospeccao").select("id, created_at, mes_referencia"),
      ]);

      const stores = storesRes.data || [];
      const pipeline = pipelineRes.data || [];
      const custos = custosRes.data || [];
      const fornecedores = fornecRes.data || [];

      const data: MonthlyData[] = Array(12).fill(null).map(() => emptyMonth());

      // Process stores inaugurated per month
      const processedNames = new Set<string>();

      stores.forEach((s: any) => {
        const d = parseDate(s.inauguracao);
        if (!d || d.getFullYear() !== year) return;
        // Only count as inaugurated if checklist is liberated
        if (!isStoreLiberated(s.inauguracao_checklist, s.tipo_loja)) return;
        const mi = d.getMonth();
        const nome = (s.nome || "").toUpperCase().trim();
        if (processedNames.has(nome)) return;
        processedNames.add(nome);

        const tipo = (s.tipo_loja || "").toUpperCase();
        if (tipo.includes("LIGHT")) data[mi].lojasLight++;
        else if (tipo.includes("OUTLET")) data[mi].lojasOutlet++;
        else data[mi].lojasTrad++;
        data[mi].totalLojas++;

        // Find cost data
        const custoMatch = custos.find((c: any) => c.nome.toUpperCase().trim() === nome);
        if (custoMatch) {
          const total = (custoMatch as any).mao_de_obra + (custoMatch as any).moveis + (custoMatch as any).piso + (custoMatch as any).iluminacao + (custoMatch as any).informatica + (custoMatch as any).demais_itens;
          const area = (custoMatch as any).area_loja || 0;
          if (tipo.includes("LIGHT")) { data[mi].custoTotalLight += total; data[mi].areaLight += area; }
          else if (tipo.includes("OUTLET")) { data[mi].custoTotalOutlet += total; data[mi].areaOutlet += area; }
          else { data[mi].custoTotalTrad += total; data[mi].areaTrad += area; }
        }

        // Find prazo data
        const pipeMatch = pipeline.find((p: any) => {
          const pName = ((p as any).local || (p as any).filial || "").toUpperCase().trim();
          return pName === nome;
        });
        if (pipeMatch) {
          const inicioDate = parseDate((pipeMatch as any).inicio_obra);
          const inaugDate = d;
          if (inicioDate) {
            const dias = differenceInDays(inaugDate, inicioDate);
            if (dias > 0) { data[mi].prazoTotal += dias; data[mi].prazoCount++; }
          }
          const libDate = parseDate((pipeMatch as any).data_liberacao_orcamento);
          const inicioObra = parseDate((pipeMatch as any).inicio_obra);
          if (libDate && inicioObra) {
            const negDias = differenceInDays(inicioObra, libDate);
            if (negDias > 0) { data[mi].prazoNegociacaoTotal += negDias; data[mi].prazoNegociacaoCount++; }
          }
        }
      });

      // Also check pipeline for inaugurations
      pipeline.forEach((p: any) => {
        const d = parseDate(p.data_inauguracao);
        if (!d || d.getFullYear() !== year) return;
        const nome = ((p as any).local || (p as any).filial || "").toUpperCase().trim();
        if (!nome || processedNames.has(nome)) return;
        processedNames.add(nome);
        const mi = d.getMonth();
        const tipo = ((p as any).padrao || "").toUpperCase();
        if (tipo.includes("LIGHT")) data[mi].lojasLight++;
        else if (tipo.includes("OUTLET")) data[mi].lojasOutlet++;
        else data[mi].lojasTrad++;
        data[mi].totalLojas++;

        const custoMatch = custos.find((c: any) => c.nome.toUpperCase().trim() === nome);
        if (custoMatch) {
          const total = (custoMatch as any).mao_de_obra + (custoMatch as any).moveis + (custoMatch as any).piso + (custoMatch as any).iluminacao + (custoMatch as any).informatica + (custoMatch as any).demais_itens;
          const area = (custoMatch as any).area_loja || 0;
          if (tipo.includes("LIGHT")) { data[mi].custoTotalLight += total; data[mi].areaLight += area; }
          else if (tipo.includes("OUTLET")) { data[mi].custoTotalOutlet += total; data[mi].areaOutlet += area; }
          else { data[mi].custoTotalTrad += total; data[mi].areaTrad += area; }
        }

        const inicioDate = parseDate((p as any).inicio_obra);
        if (inicioDate) {
          const dias = differenceInDays(d, inicioDate);
          if (dias > 0) { data[mi].prazoTotal += dias; data[mi].prazoCount++; }
        }
      });

      // Fornecedores
      fornecedores.forEach((f: any) => {
        let monthIdx = -1;
        if (f.mes_referencia) {
          const parts = f.mes_referencia.split("-");
          if (parts.length >= 2 && parseInt(parts[0]) === year) {
            monthIdx = parseInt(parts[1]) - 1;
          }
        }
        if (monthIdx < 0 && f.created_at) {
          const cd = new Date(f.created_at);
          if (cd.getFullYear() === year) monthIdx = cd.getMonth();
        }
        if (monthIdx >= 0 && monthIdx < 12) data[monthIdx].fornecedores++;
      });

      setMonthlyData(data);
    } catch (err) {
      console.error("MatrizResultados error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const aggregated = useMemo(() => {
    const q1 = sumMonths(monthlyData.slice(0, 3));
    const q2 = sumMonths(monthlyData.slice(3, 6));
    const sem1 = sumMonths(monthlyData.slice(0, 6));
    const q3 = sumMonths(monthlyData.slice(6, 9));
    const q4 = sumMonths(monthlyData.slice(9, 12));
    const annual = sumMonths(monthlyData);
    return { q1, q2, sem1, q3, q4, annual };
  }, [monthlyData]);

  // Metas por indicador (from the xlsx)
  const metaAberturaAnual = 10;

  const buildRows = (): IndicatorRow[] => {
    const md = monthlyData;
    const { q1, q2, sem1, q3, q4, annual } = aggregated;

    const allCols = (fn: (d: MonthlyData) => string): string[] => [
      ...md.map(fn), fn(q1), fn(q2), fn(sem1), fn(q3), fn(q4), fn(annual),
    ];

    return [
      // 1. Abertura de Lojas
      { label: "Abertura de Loja", type: "header" as const, values: [] },
      { label: "Qnt Lojas Light", type: "realizado" as const, values: allCols((d) => d.lojasLight > 0 ? String(d.lojasLight) : "-") },
      { label: "Qnt Lojas Tradicionais", type: "realizado" as const, values: allCols((d) => d.lojasTrad > 0 ? String(d.lojasTrad) : "-") },
      { label: "Qnt Lojas Outlet", type: "realizado" as const, values: allCols((d) => d.lojasOutlet > 0 ? String(d.lojasOutlet) : "-") },
      { label: "Total Indicador", type: "realizado" as const, values: allCols((d) => d.totalLojas > 0 ? String(d.totalLojas) : "-") },

      // 2. Custo/m² Tradicional
      { label: "Custo/m² Tradicional", type: "header" as const, values: [] },
      { label: "Meta", type: "meta" as const, values: Array(18).fill(`R$ ${METAS_CUSTO.TRADICIONAL.toLocaleString("pt-BR")}`) },
      { label: "Realizado", type: "realizado" as const, values: allCols((d) => custoM2(d.custoTotalTrad, d.areaTrad)) },

      // 3. Custo/m² Light
      { label: "Custo/m² Light", type: "header" as const, values: [] },
      { label: "Meta", type: "meta" as const, values: Array(18).fill(`R$ ${METAS_CUSTO.LIGHT.toLocaleString("pt-BR")}`) },
      { label: "Realizado", type: "realizado" as const, values: allCols((d) => custoM2(d.custoTotalLight, d.areaLight)) },

      // 4. Custo/m² Outlet
      { label: "Custo/m² Outlet", type: "header" as const, values: [] },
      { label: "Meta", type: "meta" as const, values: Array(18).fill(`R$ ${METAS_CUSTO.OUTLET.toLocaleString("pt-BR")}`) },
      { label: "Realizado", type: "realizado" as const, values: allCols((d) => custoM2(d.custoTotalOutlet, d.areaOutlet)) },

      // 5. Prazo médio de Implantação
      { label: "Prazo Médio Implantação (dias)", type: "header" as const, values: [] },
      { label: "Meta", type: "meta" as const, values: Array(18).fill("40") },
      { label: "Realizado", type: "realizado" as const, values: allCols((d) => prazoMedio(d.prazoTotal, d.prazoCount)) },

      // 6. Prazo negociação e início de obra
      { label: "Prazo Negociação → Início Obra (dias)", type: "header" as const, values: [] },
      { label: "Realizado", type: "realizado" as const, values: allCols((d) => prazoMedio(d.prazoNegociacaoTotal, d.prazoNegociacaoCount)) },

      // 7. Novos Fornecedores
      { label: "Novos Fornecedores", type: "header" as const, values: [] },
      { label: "Realizado", type: "realizado" as const, values: allCols((d) => d.fornecedores > 0 ? String(d.fornecedores) : "-") },
    ];
  };

  const rows = buildRows();
  const colHeaders = [...MONTHS.map((m) => `${m}/${String(year).slice(2)}`), "1º Tri", "2º Tri", "1º Sem", "3º Tri", "4º Tri", "Anual"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Matriz de Resultados — Supervisão Implantação ({year})
          <Badge variant="outline" className="text-[10px]">Gustavo</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-semibold min-w-[220px]">Indicador</th>
                <th className="sticky left-[220px] z-10 bg-muted px-2 py-2 text-center font-semibold min-w-[50px]">R/M</th>
                {colHeaders.map((h, i) => (
                  <th key={i} className={`px-2 py-2 text-center font-semibold whitespace-nowrap ${i >= 12 ? "bg-primary/10" : "bg-muted"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                if (row.type === "header") {
                  return (
                    <tr key={ri} className="border-t-2 border-primary/20">
                      <td colSpan={20} className="sticky left-0 z-10 bg-primary/5 px-3 py-2 font-bold text-primary text-[11px]">
                        {row.label}
                      </td>
                    </tr>
                  );
                }

                const isMeta = row.type === "meta";
                return (
                  <tr key={ri} className={`border-b ${isMeta ? "bg-muted/30" : "hover:bg-muted/20"}`}>
                    <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium">{row.label}</td>
                    <td className="sticky left-[220px] z-10 bg-card px-2 py-1.5 text-center">
                      <Badge variant={isMeta ? "secondary" : "default"} className="text-[9px] px-1.5">
                        {isMeta ? "M" : "R"}
                      </Badge>
                    </td>
                    {row.values.map((v, ci) => {
                      let colorClass = "";
                      if (!isMeta && v !== "-" && row.label === "Realizado") {
                        // Check if realizado exceeds meta for custo indicators
                        const numVal = parseFloat(v.replace(/[R$\s.]/g, "").replace(",", "."));
                        // For prazo, check if > 40 (meta)
                        if (!isNaN(numVal) && numVal > 0) {
                          // Simple color: green if good, red if bad — context-dependent
                        }
                      }
                      return (
                        <td key={ci} className={`px-2 py-1.5 text-center whitespace-nowrap ${ci >= 12 ? "bg-primary/5 font-semibold" : ""} ${colorClass}`}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
