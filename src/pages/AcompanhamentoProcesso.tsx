import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, LayoutList, Download, Filter
} from "lucide-react";
import { SOLICITACOES_ITEMS } from "@/data/solicitacoesData";
import { Badge } from "@/components/ui/badge";

const AcompanhamentoProcesso = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order('nome');

      if (data) {
        setStores(data);
      }
      setLoading(false);
    };

    fetchStores();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluido": return "bg-emerald-500 border-emerald-600 shadow-emerald-200";
      case "solicitado": return "bg-amber-400 border-amber-500 shadow-amber-100";
      default: return "bg-slate-100 border-slate-300";
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="flex items-center gap-4">
              <div className="bg-[#4A3728]/10 p-2 rounded-lg"><LayoutList className="h-8 w-8 text-[#4A3728]" /></div>
              <div><h1 className="text-2xl font-black tracking-tight text-[#4A3728] uppercase">Funil de Implantação 2026</h1><p className="text-xs font-bold text-muted-foreground tracking-[0.2em] uppercase">Acompanhamento Completo do Processo</p></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="font-bold border-2"><Filter className="h-4 w-4 mr-2" />Filtrar</Button>
            <Button variant="default" size="sm" className="font-bold shadow-lg bg-primary hover:bg-primary/90"><Download className="h-4 w-4 mr-2" />Exportar</Button>
          </div>
        </div>
      </header>

      <main className="max-w-[98vw] mx-auto px-4 py-8">
        <div className="space-y-6">
          <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
              <Table>
                <TableHeader className="bg-[#4A3728] sticky top-0 z-40">
                  <TableRow>
                    <TableHead className="w-[300px] min-w-[300px] sticky left-0 bg-[#4A3728] text-white font-bold border-r z-50">LOJA / FILIAL</TableHead>
                    <TableHead className="min-w-[150px] text-white font-bold text-center">INAUGURAÇÃO</TableHead>
                    <TableHead className="min-w-[150px] text-white font-bold text-center border-r">STATUS GERAL</TableHead>
                    {SOLICITACOES_ITEMS.map(item => (
                      <TableHead key={item.id} className="min-w-[120px] text-center font-bold text-[10px] text-white uppercase tracking-tighter whitespace-nowrap px-2">
                        {item.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.length === 0 ? (
                    <TableRow><TableCell colSpan={SOLICITACOES_ITEMS.length + 3} className="text-center py-10 text-muted-foreground">Nenhuma loja encontrada.</TableCell></TableRow>
                  ) : (
                    stores.map(store => {
                      const solicitacoes = store.solicitacoes || {};
                      return (
                        <TableRow key={store.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="sticky left-0 bg-background font-black border-r z-30 text-[11px] uppercase py-4 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-col">
                              <span>{store.nome}</span>
                              <span className="text-[9px] font-normal text-muted-foreground">FILIAL: {store.filial || '---'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-[11px]">
                            {store.inauguracao ? new Date(store.inauguracao).toLocaleDateString('pt-BR') : '---'}
                          </TableCell>
                          <TableCell className="text-center border-r">
                            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors text-[9px] font-bold">
                              {store.status || 'EM ANDAMENTO'}
                            </Badge>
                          </TableCell>
                          {SOLICITACOES_ITEMS.map(item => {
                            const data = solicitacoes[item.id] || {};
                            const status = data.status || "pendente";
                            return (
                              <TableCell key={item.id} className="text-center p-2 border-r last:border-r-0">
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`w-5 h-5 rounded-full border-2 shadow-sm ${getStatusColor(status)}`} title={status.toUpperCase()} />
                                  {data.comentarios && (
                                    <span className="text-[8px] text-muted-foreground max-w-[100px] truncate" title={data.comentarios}>
                                      💬
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="flex flex-wrap gap-6 px-6 py-4 bg-card rounded-xl border-2 border-primary/5 shadow-sm text-[10px] font-bold uppercase tracking-widest w-fit ml-auto">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-100 border-2 rounded-full" /><span className="text-muted-foreground">Pendente</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-400 border-2 border-amber-500 rounded-full" /><span className="text-amber-700">Solicitado</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-500 border-2 border-emerald-600 rounded-full" /><span className="text-emerald-700">Concluído</span></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AcompanhamentoProcesso;