import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PartyPopper, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInauguracoesPendentes } from "@/hooks/useInauguracoesPendentes";

export function InauguracaoBanner({ compact = false }: { compact?: boolean }) {
  const { items, loading, dismiss, dismissAll } = useInauguracoesPendentes();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  if (loading || items.length === 0) return null;

  return (
    <div className="rounded-lg border border-[hsl(30,90%,55%)]/40 bg-[hsl(30,90%,55%)]/10 p-3 sm:p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[hsl(30,80%,35%)] dark:text-[hsl(35,90%,65%)] font-semibold text-sm">
          <PartyPopper className="h-4 w-4" />
          {items.length === 1
            ? `${items[0].nome} inaugurada! Custo ou contrato pendente.`
            : `${items.length} lojas inauguradas com custo/contrato pendente`}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
        >
          {expanded ? "Recolher" : "Expandir"} {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {expanded && (
        <div className={compact ? "space-y-1.5" : "space-y-2"}>
          {items.map((it) => (
            <div
              key={it.key}
              className="rounded border bg-background/60 p-2 flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <button
                onClick={() => it.storeId ? navigate(`/loja/${it.storeId}`) : navigate("/lojas?tab=inauguradas")}
                className="text-left flex-1 min-w-0"
              >
                <p className="text-sm font-semibold truncate">🎉 {it.nome}{it.filial ? ` · Filial ${it.filial}` : ""}</p>
                <p className="text-xs text-muted-foreground">
                  Pendências:{" "}
                  {it.semCusto && <span className="mr-2">⚠️ Planilha de Custo não registrada</span>}
                  {it.semContrato && <span>📄 Contrato pendente</span>}
                </p>
              </button>
              <div className="flex gap-1 shrink-0">
                {it.semCusto && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => dismiss(it.key, "custoOk")}>
                    <Check className="h-3 w-3 mr-1" /> Custo OK
                  </Button>
                )}
                {it.semContrato && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => dismiss(it.key, "contratoOk")}>
                    <Check className="h-3 w-3 mr-1" /> Contrato OK
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => dismissAll(it.key)} title="Dispensar tudo">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
