import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, HardHat, LayoutList
} from "lucide-react";
import { SOLICITACOES_ITEMS } from "@/data/solicitacoesData";

type CronogramaStore = {
  id: string;
  nome: string;
  filial: string;
  inauguracao: string;
  data_inicio?: string;
  tipo_loja: string;
  status: string;
  is_propria: boolean;
  is_reforma: boolean;
  dbData?: any;
};

const AcompanhamentoProcesso = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<CronogramaStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order('nome');

      if (data) {
        const cronogramaManual = [
          { busca: "Riomar Recife", display: "Riomar Recife - Recife", tipo: "reforma" },
          { busca: "Boulevard", display: "Shopping Boulevard - Belo Horizonte", tipo: "reforma" },
          { busca: "Shopping Recife", display: "Shopping Recife - Recife", tipo: "reforma" },
          { busca: "Costa Dourada", display: "Shopping Costa Dourada - Cabo", tipo: "reforma" },
          { busca: "Salvador", display: "Shopping em Salvador - Salvador", tipo: "reforma" },
          { busca: "Bela Vista", display: "Shopping Bela Vista - Recife", tipo: "reforma" },
          { busca: "Minas Shopping", display: "Minas Shopping II – BH", tipo: "reforma" },
          { busca: "Ibirapuera", display: "Ibirapuera Shopping - São Paulo", tipo: "nova" },
          { busca: "Recife Outlet", display: "Recife Outlet - Moreno/PE", tipo: "nova" },
          { busca: "Aricanduva", display: "Shopping Aricanduva - SP", tipo: "nova" }
        ];

        const storesList = cronogramaManual.map((m, index) => {
          const dbStore = data.find(s => (s.nome || "").toLowerCase().includes(m.busca.toLowerCase()));
          const isReforma = m.tipo === "reforma";
          
          return {
            id: dbStore?.id || `manual-${index}`,
            nome: m.display,
            filial: dbStore?.filial || "S/F",
            inauguracao: dbStore?.inauguracao ? dbStore.inauguracao.split('T')[0] : "2026-12-31",
            tipo_loja: dbStore?.tipo_loja || (isReforma ? "reforma" : "nova"),
            status: isReforma ? "Em Reforma" : "Em Andamento",
            is_propria: !isReforma,
            is_reforma: isReforma,
            dbData: dbStore
          };
        });

        setStores(storesList);
      }
      setLoading(false);
    };

    fetchStores();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="flex items-center gap-4">
              <div className="bg-[#4A3728]/10 p-2 rounded-lg"><LayoutList className="h-8 w-8 text-[#4A3728]" /></div>
              <div><h1 className="text-2xl font-black tracking-tight text-[#4A3728] uppercase">Acompanhamento de Processo</h1><p className="text-xs font-bold text-muted-foreground tracking-[0.2em] uppercase">Status de Implantação de Lojas</p></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Card className="border-2 border-primary/10 shadow-xl">
            <CardHeader className="bg-[#4A3728] text-white rounded-t-lg">
              <CardTitle className="text-xl font-bold">Acompanhamento de Processo de Implantação</CardTitle>
              <p className="text-sm text-white/70">Status de todas as solicitações por loja</p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-64 sticky left-0 bg-muted/90 backdrop-blur-md z-20 font-bold border-r">Loja</TableHead>
                    {SOLICITACOES_ITEMS.map(item => (
                      <TableHead key={item.id} className="min-w-[120px] text-center font-bold text-[10px] uppercase tracking-tighter">{item.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map(store => {
                    const solicitacoes = store.dbData?.solicitacoes || {};
                    return (
                      <TableRow key={store.id} className="hover:bg-muted/30">
                        <TableCell className="sticky left-0 bg-background font-bold border-r z-10 text-[11px] uppercase">{store.nome}</TableCell>
                        {SOLICITACOES_ITEMS.map(item => {
                          const status = solicitacoes[item.id]?.status || "pendente";
                          return (
                            <TableCell key={item.id} className="text-center p-2">
                              <div className={`mx-auto w-4 h-4 rounded-full border shadow-sm ${status === "concluido" ? "bg-emerald-500 border-emerald-600 shadow-emerald-200" : status === "solicitado" ? "bg-amber-400 border-amber-500 shadow-amber-100" : "bg-slate-100 border-slate-300"}`} title={status.toUpperCase()} />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="flex gap-4 px-4 py-3 bg-card rounded-lg border shadow-sm text-[10px] font-bold uppercase tracking-wider w-fit">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-100 border rounded-full" /><span className="text-muted-foreground">Pendente</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-400 border border-amber-500 rounded-full" /><span className="text-[#4A3728]">Solicitado</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 border border-emerald-600 rounded-full" /><span className="text-emerald-700">Concluído</span></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AcompanhamentoProcesso;