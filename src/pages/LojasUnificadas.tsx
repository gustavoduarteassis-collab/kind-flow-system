import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStores } from "@/hooks/useStores";
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

  const { novasCount, reformasCount, inauguradasCount } = useMemo(() => {
    let novas = 0, reformas = 0, inaug = 0;
    for (const s of stores) {
      const t = (s.tipoRegistro || "").toLowerCase();
      if (t === "inaugurada") inaug++;
      else if (t === "reforma") reformas++;
      else if (t === "nova" || t === "") novas++;
      // repasse/troca/encerramento/interno ficam fora dos 3 grupos principais
    }
    return { novasCount: novas, reformasCount: reformas, inauguradasCount: inaug };
  }, [stores]);


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
