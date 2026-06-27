import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { META_POR_M2 } from "@/data/custosGeralData";
import { Store } from "@/data/checklistData";
import { DollarSign, Ruler, TrendingDown, TrendingUp, Target, Activity } from "lucide-react";

interface Props {
  store: Store;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtBRL2 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Mapeamento categoria local ↔ coluna no custos_geral_entries
const CAT_TO_DB: Record<string, string> = {
  execucao: "mao_de_obra",
  moveis: "moveis",
  piso: "piso",
  iluminacao: "iluminacao",
  informatica: "informatica",
  demais: "demais_itens",
};

const CAT_LABEL: Record<string, string> = {
  execucao: "Mão de Obra",
  moveis: "Móveis",
  piso: "Piso",
  iluminacao: "Iluminação",
  informatica: "Informática",
  demais: "Demais Itens",
};

type Tone = "ok" | "warn" | "bad" | "neutral";

const toneClass: Record<Tone, string> = {
  ok: "bg-[hsl(142,60%,95%)] text-[hsl(142,60%,25%)] border-[hsl(142,60%,75%)]",
  warn: "bg-[hsl(45,90%,95%)] text-[hsl(45,90%,25%)] border-[hsl(45,90%,75%)]",
  bad: "bg-destructive/10 text-destructive border-destructive/40",
  neutral: "bg-muted text-muted-foreground border-border",
};

const toneLabel: Record<Tone, string> = {
  ok: "Dentro da meta",
  warn: "Atenção",
  bad: "Acima da meta",
  neutral: "Sem dados",
};

function KpiTile({
  label, value, hint, tone, icon,
}: { label: string; value: string; hint?: string; tone: Tone; icon: React.ReactNode }) {
  return (
    <Card className={`px-3 py-2 border ${toneClass[tone]} flex items-center gap-2`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide opacity-80 leading-none">{label}</p>
        <p className="text-sm font-bold leading-tight truncate">{value}</p>
        {hint && <p className="text-[10px] opacity-75 truncate">{hint}</p>}
      </div>
    </Card>
  );
}

export default function StoreCustosSummary({ store }: Props) {
  const [dbRow, setDbRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store?.nome) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("custos_geral_entries")
        .select("mao_de_obra, moveis, piso, iluminacao, informatica, demais_itens, area_loja, area_total, tipo")
        .ilike("nome", store.nome)
        .is("deleted_at", null)
        .limit(1);
      if (cancelled) return;
      setDbRow(data && data.length ? data[0] : null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [store?.nome]);

  const local = (store as any)?.custos as
    | { areaMt2?: number; categorias?: Array<{ id: string; nome: string; items: Array<{ valorPrevisto: number; valorRealizado: number }> }> }
    | undefined;

  const tipo = (
    dbRow?.tipo ||
    (store as any)?.tipoLojaModelo ||
    (store as any)?.tipo_loja_modelo ||
    "TRADICIONAL"
  ).toString().toUpperCase();
  const metaM2 = META_POR_M2[tipo] || META_POR_M2.TRADICIONAL;

  const area =
    Number(dbRow?.area_loja) ||
    Number(dbRow?.area_total) ||
    Number(local?.areaMt2) ||
    0;

  // Totais por categoria (previsto local, realizado prefere DB)
  const categorias = useMemo(() => {
    const ids = Object.keys(CAT_TO_DB);
    return ids.map((id) => {
      const localCat = local?.categorias?.find((c) => c.id === id);
      const previsto =
        localCat?.items?.reduce((s, it) => s + (Number(it.valorPrevisto) || 0), 0) || 0;
      const realizadoLocal =
        localCat?.items?.reduce((s, it) => s + (Number(it.valorRealizado) || 0), 0) || 0;
      const realizadoDb = dbRow ? Number(dbRow[CAT_TO_DB[id]]) || 0 : 0;
      const realizado = realizadoDb || realizadoLocal;
      const diff = realizado - previsto;
      const pct = previsto > 0 ? (realizado / previsto) * 100 : 0;
      let tone: Tone = "neutral";
      if (previsto > 0 || realizado > 0) {
        if (previsto === 0 && realizado > 0) tone = "warn";
        else if (pct <= 95) tone = "ok";
        else if (pct <= 105) tone = "warn";
        else tone = "bad";
      }
      return {
        id,
        nome: CAT_LABEL[id] || id,
        previsto,
        realizado,
        diff,
        pct,
        tone,
      };
    });
  }, [local, dbRow]);

  const totalPrevisto = categorias.reduce((s, c) => s + c.previsto, 0);
  const totalRealizado = categorias.reduce((s, c) => s + c.realizado, 0);
  const totalDiff = totalRealizado - totalPrevisto;
  const execPct = totalPrevisto > 0 ? Math.min(100, (totalRealizado / totalPrevisto) * 100) : 0;

  const metaTotal = area * metaM2;
  const custoM2 = area > 0 ? totalRealizado / area : 0;
  const desvioM2 = custoM2 - metaM2; // positivo = acima da meta

  let metaTone: Tone = "neutral";
  let metaHint = "Sem dados";
  if (area > 0 && totalRealizado > 0) {
    const pct = (custoM2 / metaM2) * 100;
    metaTone = pct <= 95 ? "ok" : pct <= 105 ? "warn" : "bad";
    metaHint = `${pct.toFixed(0)}% da meta (${tipo})`;
  }

  let execTone: Tone = "neutral";
  if (totalPrevisto > 0) {
    if (execPct >= 100 && totalRealizado > totalPrevisto * 1.05) execTone = "bad";
    else if (execPct >= 80) execTone = "warn";
    else execTone = "ok";
  }

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Visão Resumo (somente leitura)
          {loading && <span className="text-xs text-muted-foreground font-normal">carregando…</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiTile
            label="Área"
            value={area > 0 ? `${area.toLocaleString("pt-BR")} m²` : "—"}
            tone={area > 0 ? "neutral" : "warn"}
            icon={<Ruler className="h-4 w-4" />}
          />
          <KpiTile
            label="Orçamento"
            value={fmtBRL(totalPrevisto)}
            hint="Previsto total"
            tone={totalPrevisto > 0 ? "neutral" : "warn"}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KpiTile
            label="Custo Real"
            value={fmtBRL(totalRealizado)}
            hint={custoM2 > 0 ? `${fmtBRL(custoM2)}/m²` : "—"}
            tone={totalRealizado > 0 ? "neutral" : "warn"}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KpiTile
            label={`Meta ${tipo}`}
            value={area > 0 ? fmtBRL(metaTotal) : "—"}
            hint={`${fmtBRL(metaM2)}/m²`}
            tone={metaTone}
            icon={<Target className="h-4 w-4" />}
          />
          <KpiTile
            label="Desvio /m²"
            value={area > 0 && totalRealizado > 0 ? (desvioM2 >= 0 ? "+" : "") + fmtBRL(desvioM2) : "—"}
            hint={metaHint}
            tone={metaTone}
            icon={desvioM2 > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          />
          <KpiTile
            label="Execução"
            value={totalPrevisto > 0 ? `${execPct.toFixed(0)}%` : "—"}
            hint={totalPrevisto > 0 ? `${fmtBRL(totalRealizado)} de ${fmtBRL(totalPrevisto)}` : "Sem orçamento"}
            tone={execTone}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        {/* Barra geral */}
        {totalPrevisto > 0 && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Execução do orçamento</span>
              <span className="font-semibold">{execPct.toFixed(0)}%</span>
            </div>
            <Progress value={execPct} className="h-2" />
          </div>
        )}

        {/* Status por categoria */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">Categoria</TableHead>
                <TableHead className="text-right text-xs">Previsto</TableHead>
                <TableHead className="text-right text-xs">Realizado</TableHead>
                <TableHead className="text-right text-xs">Diferença</TableHead>
                <TableHead className="text-right text-xs">% Execução</TableHead>
                <TableHead className="text-right text-xs">R$/m²</TableHead>
                <TableHead className="text-center text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.map((c) => {
                const m2 = area > 0 ? c.realizado / area : 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.nome}</TableCell>
                    <TableCell className="text-right text-xs">{fmtBRL2(c.previsto)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{fmtBRL2(c.realizado)}</TableCell>
                    <TableCell
                      className={`text-right text-xs font-semibold ${
                        c.diff > 0 ? "text-destructive" : c.diff < 0 ? "text-[hsl(152,60%,40%)]" : ""
                      }`}
                    >
                      {c.previsto > 0 || c.realizado > 0
                        ? (c.diff > 0 ? "+" : "") + fmtBRL2(c.diff)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {c.previsto > 0 ? `${c.pct.toFixed(0)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {m2 > 0 ? fmtBRL(m2) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-[10px] ${toneClass[c.tone]}`}>
                        {toneLabel[c.tone]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell className="text-xs">TOTAL</TableCell>
                <TableCell className="text-right text-xs">{fmtBRL2(totalPrevisto)}</TableCell>
                <TableCell className="text-right text-xs">{fmtBRL2(totalRealizado)}</TableCell>
                <TableCell
                  className={`text-right text-xs ${
                    totalDiff > 0 ? "text-destructive" : totalDiff < 0 ? "text-[hsl(152,60%,40%)]" : ""
                  }`}
                >
                  {totalPrevisto > 0 || totalRealizado > 0
                    ? (totalDiff > 0 ? "+" : "") + fmtBRL2(totalDiff)
                    : "—"}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {totalPrevisto > 0 ? `${execPct.toFixed(0)}%` : "—"}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {custoM2 > 0 ? fmtBRL(custoM2) : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-[10px] ${toneClass[metaTone]}`}>
                    {toneLabel[metaTone]}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Fonte: Custos Geral (realizado) + aba Custos (previsto). Os valores não são alterados por esta visão.
        </p>
      </CardContent>
    </Card>
  );
}
