import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/useStores";
import { buildInauguradasFiliais } from "@/utils/inauguradaFilter";
import Lojas from "./Lojas";

type TabKey = "novas" | "reformas" | "inauguradas";

const VALID_TABS: TabKey[] = ["novas", "reformas", "inauguradas"];
const STORAGE_KEY = "lojas:lastTab";

const LojasUnificadas = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial: TabKey =
    (VALID_TABS.includes(searchParams.get("tab") as TabKey) && (searchParams.get("tab") as TabKey)) ||
    ((typeof window !== "undefined" && (sessionStorage.getItem(STORAGE_KEY) as TabKey)) as TabKey) ||
    "novas";
  const [tab, setTab] = useState<TabKey>(VALID_TABS.includes(initial) ? initial : "novas");

  const { stores } = useStores();
  const [inauguradasFiliais, setInauguradasFiliais] = useState<Set<string>>(new Set());
  const [inauguradasNomes, setInauguradasNomes] = useState<Set<string>>(new Set());
  const [inauguradasCount, setInauguradasCount] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("pipeline_stores")
        .select("filial,local,status_geral")
        .is("deleted_at", null);
      setInauguradasFiliais(buildInauguradasFiliais(data as any));
      const norm = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const nomes = new Set<string>();
      (data || []).forEach((r: any) => {
        const status = String(r.status_geral || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        if (status.startsWith("inaugurada") && r.local) nomes.add(norm(String(r.local)));
      });
      setInauguradasNomes(nomes);

      const { count: sc } = await supabase
        .from("stores")
        .select("id", { count: "exact", head: true })
        .not("inauguracao_real", "is", null)
        .is("deleted_at", null);
      if (typeof sc === "number") setInauguradasCount(sc);
    };
    load();
  }, []);

  const { novasCount, reformasCount } = useMemo(() => {
    const normName = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const isInaug = (s: typeof stores[0]) => {
      if (s.filial && inauguradasFiliais.has(String(s.filial))) return true;
      if (s.nome) {
        const n = normName(s.nome);
        for (const pn of inauguradasNomes) if (pn.includes(n) || n.includes(pn)) return true;
      }
      return false;
    };
    let novas = 0;
    let reformas = 0;
    for (const s of stores) {
      if (isInaug(s)) continue;
      const t = (s.tipoRegistro || "").toLowerCase();
      if (t === "reforma") reformas++;
      else novas++;
    }
    return { novasCount: novas, reformasCount: reformas };
  }, [stores, inauguradasFiliais, inauguradasNomes]);

  const handleChange = (v: string) => {
    const next = (VALID_TABS.includes(v as TabKey) ? v : "novas") as TabKey;
    setTab(next);
    sessionStorage.setItem(STORAGE_KEY, next);
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-3">
        <div className="mb-2 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lojas & Obras</h1>
            <p className="text-xs text-muted-foreground">Clique em qualquer loja para ver checklists, custos, pendências e mais.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/obras")}>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              📊 Painel gerencial
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/atualizar-planilha")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              📥 Atualizar via Excel
            </Button>
          </div>
        </div>
        <Tabs value={tab} onValueChange={handleChange}>
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="novas">🆕 Novas Lojas ({novasCount})</TabsTrigger>
            <TabsTrigger value="reformas">🔨 Reformas ({reformasCount})</TabsTrigger>
            <TabsTrigger value="inauguradas">🎉 Inauguradas ({inauguradasCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="novas" className="mt-4">
            {tab === "novas" && <Lojas forceMode="andamento" tipoFilter="novas" hideHeader />}
          </TabsContent>
          <TabsContent value="reformas" className="mt-4">
            {tab === "reformas" && <Lojas forceMode="andamento" tipoFilter="reformas" hideHeader />}
          </TabsContent>
          <TabsContent value="inauguradas" className="mt-4">
            {tab === "inauguradas" && <Lojas forceMode="inauguradas" hideHeader />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LojasUnificadas;
