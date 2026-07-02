import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/useStores";
import { buildInauguradasFiliais } from "@/utils/inauguradaFilter";
import Pipeline from "./Pipeline";
import Lojas from "./Lojas";

type TabKey = "funil" | "checklist" | "inauguradas";

const VALID_TABS: TabKey[] = ["funil", "checklist", "inauguradas"];
const STORAGE_KEY = "lojas:lastTab";

const LojasUnificadas = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial: TabKey =
    (VALID_TABS.includes(searchParams.get("tab") as TabKey) && (searchParams.get("tab") as TabKey)) ||
    ((typeof window !== "undefined" && (sessionStorage.getItem(STORAGE_KEY) as TabKey)) as TabKey) ||
    "funil";
  const [tab, setTab] = useState<TabKey>(VALID_TABS.includes(initial) ? initial : "funil");

  // Counts
  const { stores } = useStores();
  const [funilCount, setFunilCount] = useState<number | null>(null);
  const [inauguradasFiliais, setInauguradasFiliais] = useState<Set<string>>(new Set());
  const [inauguradasNomes, setInauguradasNomes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("pipeline_stores")
        .select("id", { count: "exact", head: true })
        .eq("transferido", false)
        .is("deleted_at", null);
      if (typeof count === "number") setFunilCount(count);

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
    };
    load();
  }, []);

  const { checklistCount, inauguradasCount } = useMemo(() => {
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
    let inaug = 0;
    let other = 0;
    for (const s of stores) (isInaug(s) ? inaug++ : other++);
    return { checklistCount: other, inauguradasCount: inaug };
  }, [stores, inauguradasFiliais, inauguradasNomes]);

  const handleChange = (v: string) => {
    const next = (VALID_TABS.includes(v as TabKey) ? v : "funil") as TabKey;
    setTab(next);
    sessionStorage.setItem(STORAGE_KEY, next);
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };

  const fmtCount = (n: number | null) => (n === null ? "…" : n);

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Lojas</h1>
          <p className="text-xs text-muted-foreground">Funil, Checklist &amp; Cronograma e Inauguradas</p>
        </div>
        <Tabs value={tab} onValueChange={handleChange}>
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="funil">Funil ({fmtCount(funilCount)})</TabsTrigger>
            <TabsTrigger value="checklist">Checklist &amp; Cronograma ({checklistCount})</TabsTrigger>
            <TabsTrigger value="inauguradas">Inauguradas ({inauguradasCount})</TabsTrigger>
          </TabsList>

          {/* Render each tab only when active to avoid duplicate queries */}
          <TabsContent value="funil" className="mt-4">
            {tab === "funil" && <Pipeline />}
          </TabsContent>
          <TabsContent value="checklist" className="mt-4">
            {tab === "checklist" && <Lojas forceMode="andamento" hideHeader />}
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
