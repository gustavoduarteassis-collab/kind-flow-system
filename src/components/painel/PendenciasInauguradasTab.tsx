import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle2, Store as StoreIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AGUARDANDO_LABEL, STATUS_LABEL, type Pendencia } from "@/hooks/usePendencias";

type StoreLite = {
  id: string;
  nome: string;
  franqueado: string | null;
  analista_obra: string | null;
  inauguracao_real: string | null;
};

type Group = {
  storeId: string;
  storeNome: string;
  franqueado: string;
  analista: string;
  inauguracaoReal: string | null;
  pendencias: Pendencia[];
};

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default function PendenciasInauguradasTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [openAll, setOpenAll] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: pends, error: e1 }, { data: stores, error: e2 }] = await Promise.all([
        (supabase as any).from("pendencias")
          .select("*")
          .in("status", ["aberta", "cobrada"])
          .is("deleted_at", null)
          .order("criado_em", { ascending: true }),
        supabase.from("stores")
          .select("id,nome,franqueado,analista_obra,inauguracao_real")
          .not("inauguracao_real", "is", null)
          .is("deleted_at", null),
      ]);
      if (e1 || e2) { setError((e1 || e2)?.message || "erro"); setLoading(false); return; }

      const inauguradas = new Map<string, StoreLite>();
      for (const s of (stores || []) as StoreLite[]) inauguradas.set(s.id, s);

      const byStore = new Map<string, Pendencia[]>();
      for (const p of ((pends || []) as Pendencia[])) {
        if (!inauguradas.has(p.store_id)) continue;
        if (!byStore.has(p.store_id)) byStore.set(p.store_id, []);
        byStore.get(p.store_id)!.push(p);
      }

      const list: Group[] = [];
      for (const [storeId, ps] of byStore.entries()) {
        const s = inauguradas.get(storeId)!;
        list.push({
          storeId,
          storeNome: s.nome,
          franqueado: s.franqueado || "",
          analista: s.analista_obra || "—",
          inauguracaoReal: s.inauguracao_real,
          pendencias: ps,
        });
      }
      list.sort((a, b) => b.pendencias.length - a.pendencias.length || a.storeNome.localeCompare(b.storeNome));
      setGroups(list);
      setLoading(false);
    })();
  }, []);

  const total = useMemo(() => groups.reduce((s, g) => s + g.pendencias.length, 0), [groups]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Card key={i}><CardContent className="p-3">
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
          </CardContent></Card>
        ))}
      </div>
    );
  }
  if (error) return <Card className="border-destructive"><CardContent className="p-4 text-sm text-destructive">Não foi possível carregar as pendências. Tente novamente em instantes.</CardContent></Card>;

  if (groups.length === 0) {
    return (
      <Card><CardContent className="p-10 flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="font-semibold">Nenhuma pendência registrada em lojas inauguradas.</p>
        <p className="text-xs text-muted-foreground">Esta lista mostra apenas pendências abertas manualmente na aba "Pendências" de cada loja. O banner do topo usa outra regra (custo/contrato).</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <StoreIcon className="h-5 w-5" /> Pendências registradas em lojas inauguradas
          </h2>
          <p className="text-xs text-muted-foreground">
            {total} pendência(s) em {groups.length} loja(s) · fonte: aba "Pendências" de cada loja
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpenAll(v => !v)}>
          {openAll ? "Recolher todas" : "Expandir todas"}
        </Button>
      </div>

      <div className="space-y-2">
        {groups.map((g) => (
          <StoreGroup key={g.storeId} group={g} forceOpen={openAll} />
        ))}
      </div>
    </div>
  );
}

function StoreGroup({ group, forceOpen }: { group: Group; forceOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const abertas = group.pendencias.filter(p => p.status === "aberta").length;
  const cobradas = group.pendencias.filter(p => p.status === "cobrada").length;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors">
            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{group.storeNome}</p>
              <p className="text-[11px] text-muted-foreground">
                {group.analista} · Inaugurada em {fmt(group.inauguracaoReal)}
                {group.franqueado && ` · ${group.franqueado}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="secondary">{group.pendencias.length}</Badge>
              {abertas > 0 && <Badge variant="destructive" className="text-[10px]">{abertas} aberta(s)</Badge>}
              {cobradas > 0 && <Badge variant="outline" className="text-[10px]">{cobradas} cobrada(s)</Badge>}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-3 py-2 space-y-2">
            {group.pendencias.map(p => (
              <div key={p.id} className="rounded-md border bg-muted/20 p-2.5 text-xs space-y-1">
                <p className="whitespace-pre-line text-sm">{p.descricao}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline">{STATUS_LABEL[p.status]}</Badge>
                  <Badge variant="outline">Aguardando: {AGUARDANDO_LABEL[p.aguardando_quem]}</Badge>
                  {p.responsavel_interno && <Badge variant="outline">Resp: {p.responsavel_interno}</Badge>}
                  <span>Aberta há {daysSince(p.criado_em)}d ({fmt(p.criado_em)})</span>
                  {p.prazo_cobranca && <span>Prazo: {fmt(p.prazo_cobranca)}</span>}
                </div>
              </div>
            ))}
            <div className="pt-1">
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link to={`/loja/${group.storeId}?tab=pendencias`}>
                  Abrir loja <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
