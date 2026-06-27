import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { META_POR_M2 } from "@/data/custosGeralData";
import { Store } from "@/data/checklistData";
import { DollarSign, CalendarClock, Search, GanttChartSquare } from "lucide-react";

type Tone = "ok" | "warn" | "bad" | "neutral";

const toneClasses: Record<Tone, string> = {
  ok: "bg-[hsl(142,60%,95%)] text-[hsl(142,60%,25%)] border-[hsl(142,60%,75%)]",
  warn: "bg-[hsl(45,90%,95%)] text-[hsl(45,90%,25%)] border-[hsl(45,90%,75%)]",
  bad: "bg-destructive/10 text-destructive border-destructive/40",
  neutral: "bg-muted text-muted-foreground border-border",
};

function KpiCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: Tone;
  icon: React.ReactNode;
}) {
  return (
    <Card className={`px-3 py-2 border ${toneClasses[tone]} flex items-center gap-2 min-w-0`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide opacity-80 leading-none">{label}</p>
        <p className="text-sm font-bold leading-tight truncate">{value}</p>
        {hint && <p className="text-[10px] opacity-75 truncate">{hint}</p>}
      </div>
    </Card>
  );
}

interface Props {
  store: Store;
  progress: number;
  atrasados: number;
}

export default function StoreHeaderKPIs({ store, progress, atrasados }: Props) {
  // Custos reais da loja (custos_geral_entries) — leitura simples
  const [custoReal, setCustoReal] = useState<number | null>(null);
  const [areaM2, setAreaM2] = useState<number>(0);

  useEffect(() => {
    if (!store?.filial) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("custos_geral_entries")
        .select("valor_realizado, area_m2")
        .eq("filial", store.filial)
        .is("deleted_at", null);
      if (cancelled || !data) return;
      const total = data.reduce((s, r: any) => s + (Number(r.valor_realizado) || 0), 0);
      const area = data.find((r: any) => Number(r.area_m2) > 0)?.area_m2 || 0;
      setCustoReal(total);
      setAreaM2(Number(area) || 0);
    })();
    return () => { cancelled = true; };
  }, [store?.filial]);

  // Fallback: área da aba Custos local
  const areaLocal = (store as any)?.custos?.areaMt2 || 0;
  const area = areaM2 || areaLocal;

  // Realizado local (aba Custos) se não houver geral
  const realizadoLocal = useMemo(() => {
    const cats = (store as any)?.custos?.categorias || [];
    return cats.reduce(
      (s: number, c: any) =>
        s + (c.items || []).reduce((ss: number, it: any) => ss + (Number(it.valorRealizado) || 0), 0),
      0
    );
  }, [store]);

  const realizado = custoReal ?? realizadoLocal;
  const tipo = ((store as any)?.tipoLojaModelo || (store as any)?.tipo_loja_modelo || "TRADICIONAL")
    .toString()
    .toUpperCase();
  const metaM2 = META_POR_M2[tipo] || META_POR_M2.TRADICIONAL;
  const custoM2 = area > 0 ? realizado / area : 0;

  let orcTone: Tone = "neutral";
  let orcHint = "Sem dados";
  if (area > 0 && realizado > 0) {
    const pct = (custoM2 / metaM2) * 100;
    orcTone = pct <= 95 ? "ok" : pct <= 105 ? "warn" : "bad";
    orcHint = `${pct.toFixed(0)}% da meta (${tipo})`;
  }
  const custoLabel = custoM2 > 0
    ? custoM2.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) + "/m²"
    : "—";

  // Prazo: dias até inauguração
  let prazoTone: Tone = "neutral";
  let prazoValue = "—";
  let prazoHint = "Sem data";
  if (store.inauguracao) {
    const dias = Math.ceil(
      (new Date(store.inauguracao).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    prazoValue = dias >= 0 ? `${dias}d` : `${Math.abs(dias)}d`;
    prazoHint = dias >= 0 ? "para inauguração" : "em atraso";
    if (atrasados > 5 || dias < 0) prazoTone = "bad";
    else if (dias <= 14) prazoTone = "warn";
    else prazoTone = "ok";
  }

  // Qualidade da Visita Técnica
  const vt = (store as any)?.visitaTecnica || {};
  const vtItems = Object.values(vt).filter((v: any) => v && typeof v === "object");
  const vtConformes = vtItems.filter((v: any) => v.conformidade === "conforme").length;
  const vtNaoConformes = vtItems.filter((v: any) => v.conformidade === "nao_conforme").length;
  const vtTotal = vtItems.length;
  let vtTone: Tone = "neutral";
  let vtValue = "—";
  let vtHint = "Não realizada";
  if (vtTotal > 0) {
    const pct = Math.round((vtConformes / vtTotal) * 100);
    vtValue = `${pct}%`;
    vtHint = `${vtNaoConformes} não conformes`;
    vtTone = vtNaoConformes === 0 ? "ok" : pct >= 80 ? "warn" : "bad";
  }

  // Cronograma
  const cronograma = (store as any)?.cronograma || {};
  const cronTasks = Object.values(cronograma).filter((t: any) => t && (t.inicio || t.fim));
  let cronTone: Tone = cronTasks.length > 0 ? "ok" : "warn";
  const cronValue = cronTasks.length > 0 ? `${cronTasks.length} marcos` : "Pendente";
  const cronHint = cronTasks.length > 0 ? `${progress}% concluído` : "Definir início";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
      <KpiCard
        label="Orçamento"
        value={custoLabel}
        hint={orcHint}
        tone={orcTone}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <KpiCard
        label="Prazo"
        value={prazoValue}
        hint={prazoHint}
        tone={prazoTone}
        icon={<CalendarClock className="h-4 w-4" />}
      />
      <KpiCard
        label="Visita Técnica"
        value={vtValue}
        hint={vtHint}
        tone={vtTone}
        icon={<Search className="h-4 w-4" />}
      />
      <KpiCard
        label="Cronograma"
        value={cronValue}
        hint={cronHint}
        tone={cronTone}
        icon={<GanttChartSquare className="h-4 w-4" />}
      />
    </div>
  );
}
