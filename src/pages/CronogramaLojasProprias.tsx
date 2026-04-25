import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, ArrowLeft, Calendar, Clock, CheckCircle2, AlertCircle, HardHat, Download, Eye, ChevronLeft, ChevronRight
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, 
  isSameDay, parseISO, isValid, addDays, startOfYear, endOfYear, 
  isWithinInterval, eachMonthOfInterval, subMonths, isSameMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
};

const CronogramaLojasProprias = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<CronogramaStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewGantt, setViewGantt] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStores = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("stores")
        .select("id, nome, filial, inauguracao, tipo_loja, franqueado")
        .order('nome');

      if (data) {
        // Lojas específicas para 2026 conforme solicitado (copiadas do contexto XLS/PDF)
        const cronograma2026 = [
          { nome: "Recife Outlet", inicio: "2026-01-05", inauguracao: "2026-02-10", tipo: "reforma" },
          { nome: "Shopping Ibirapuera", inicio: "2026-01-15", inauguracao: "2026-03-15", tipo: "reforma" },
          { nome: "Shopping Interlagos", inicio: "2026-02-01", inauguracao: "2026-04-01", tipo: "reforma" },
          { nome: "Plaza Campos Gerais", inicio: "2026-03-01", inauguracao: "2026-05-15", tipo: "reforma" },
          { nome: "Boulevard", inicio: "2026-04-01", inauguracao: "2026-06-20", tipo: "nova" },
          { nome: "Trindade", inicio: "2026-05-10", inauguracao: "2026-07-15", tipo: "reforma" }
        ];

        const filteredStores = data.map(s => {
          const nomeLower = (s.nome || "").toLowerCase().trim();
          const fixo = cronograma2026.find(f => nomeLower.includes(f.nome.toLowerCase()));
          
          const isPropriaManual = nomeLower.includes("boulevard");
          const isReformaManual = nomeLower.includes("reforma") || 
                                (s.tipo_loja || "").toLowerCase().includes("reforma") ||
                                ["recife outlet", "ibirapuera", "interlagos", "campos gerais", "trindade"]
                                .some(r => nomeLower.includes(r));

          // Se não for uma das lojas do cronograma fixo E não for explicitamente própria/reforma, ignoramos
          if (!fixo && !isPropriaManual && !isReformaManual && !s.franqueado?.toLowerCase().includes("própria")) {
             return null;
          }

          const isReforma = fixo ? fixo.tipo === "reforma" : isReformaManual;

          return {
            ...s,
            status: isReforma ? "Em Reforma" : "Em Andamento",
            is_propria: fixo ? fixo.tipo === "nova" : !isReforma,
            is_reforma: isReforma,
            data_inicio: fixo ? fixo.inicio : (s.inauguracao ? addDays(new Date(s.inauguracao), -60).toISOString().split('T')[0] : null),
            inauguracao: fixo ? fixo.inauguracao : (s.inauguracao ? s.inauguracao.split('T')[0] : null)
          };
        }).filter(Boolean);

        setStores(filteredStores as CronogramaStore[]);
      }
      setLoading(false);
    };

    fetchStores();
  }, [user]);

  const timelineDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const updateStoreDate = (id: string, field: 'data_inicio' | 'inauguracao', value: string) => {
    setStores(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const exportToExcel = () => {
    const exportData = stores.map(s => ({
      Loja: s.nome,
      Filial: s.filial,
      Tipo: s.is_reforma ? 'Reforma' : 'Nova',
      'Data de Início': s.data_inicio ? format(parseISO(s.data_inicio), 'dd/MM/yyyy') : '',
      'Data de Inauguração': s.inauguracao ? format(parseISO(s.inauguracao), 'dd/MM/yyyy') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
    XLSX.writeFile(wb, `cronograma_2026_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  const renderTimeline = (store: CronogramaStore) => {
    if (!store.data_inicio || !store.inauguracao) return null;
    
    const start = parseISO(store.data_inicio);
    const end = parseISO(store.inauguracao);
    
    if (!isValid(start) || !isValid(end)) return null;

    return (
      <div className="flex w-full h-6 mt-1 bg-muted/20 rounded-sm relative overflow-hidden">
        {timelineDays.map((day, idx) => {
          const isActive = isWithinInterval(day, { start, end });
          const isStart = isSameDay(day, start);
          const isEnd = isSameDay(day, end);

          return (
            <div 
              key={idx} 
              className={`flex-1 border-r border-background/10 ${
                isActive 
                  ? store.is_reforma ? 'bg-amber-400' : 'bg-emerald-400'
                  : ''
              } ${isStart ? 'ring-1 ring-primary ring-inset' : ''} ${isEnd ? 'ring-1 ring-destructive ring-inset' : ''}`}
            />
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  // Only show stores that are actually "Proprias" (either by category or name)
  const proprias = stores.filter(s => s.is_propria && !s.is_reforma);
  const reformas = stores.filter(s => s.is_reforma);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Gestão de Cronogramas</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewGantt(!viewGantt)}>
              <Eye className="h-4 w-4 mr-2" />
              {viewGantt ? "Ver Tabela" : "Ver Linha do Tempo"}
            </Button>
            <Button variant="default" size="sm" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar XLS
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Novas Lojas</CardTitle>
              <Building2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proprias.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reformas</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reformas.length}</div>
            </CardContent>
          </Card>
        </div>

        {viewGantt && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-lg font-bold min-w-[150px] text-center capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </div>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-4 text-xs">
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-400 rounded-sm" /> Obra</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-400 rounded-sm" /> Reforma</div>
              </div>
            </div>

            <div className="relative overflow-x-auto border rounded-lg">
              <div className="min-w-[800px]">
                <div className="flex border-b bg-muted/30">
                  <div className="w-48 p-2 font-bold text-xs border-r sticky left-0 bg-background z-20">Loja</div>
                  <div className="flex flex-1">
                    {timelineDays.map((day, i) => (
                      <div key={i} className={`flex-1 text-[9px] text-center p-1 border-r ${[0, 6].includes(day.getDay()) ? 'bg-muted/50' : ''}`}>
                        {format(day, 'dd')}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="max-h-[500px] overflow-y-auto">
                  {proprias.length > 0 && (
                    <div className="bg-emerald-50/30">
                      <div className="p-1 px-3 text-[10px] font-bold text-emerald-700 uppercase">Obras Novas</div>
                      {proprias.map(s => (
                        <div key={s.id} className="flex border-t hover:bg-muted/10 transition-colors">
                          <div className="w-48 p-2 text-xs border-r font-medium truncate sticky left-0 bg-background z-20" title={s.nome}>{s.nome}</div>
                          <div className="flex flex-1">
                            {renderTimeline(s)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {reformas.length > 0 && (
                    <div className="bg-amber-50/30">
                      <div className="p-1 px-3 text-[10px] font-bold text-amber-700 uppercase border-t">Reformas</div>
                      {reformas.map(s => (
                        <div key={s.id} className="flex border-t hover:bg-muted/10 transition-colors">
                          <div className="w-48 p-2 text-xs border-r font-medium truncate sticky left-0 bg-background z-20" title={s.nome}>{s.nome}</div>
                          <div className="flex flex-1">
                            {renderTimeline(s)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Editar Datas de Planejamento
            </h2>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de Início</TableHead>
                  <TableHead>Inauguração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">
                      {store.nome}
                      <p className="text-[10px] text-muted-foreground">{store.filial}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={store.is_reforma ? "outline" : "default"} className={store.is_reforma ? "border-amber-500 text-amber-500" : "bg-emerald-500 hover:bg-emerald-600"}>
                        {store.is_reforma ? "Reforma" : "Nova"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="w-36 h-8 text-xs"
                        value={store.data_inicio || ""}
                        onChange={(e) => updateStoreDate(store.id, 'data_inicio', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="w-36 h-8 text-xs"
                        value={store.inauguracao ? store.inauguracao : ""}
                        onChange={(e) => updateStoreDate(store.id, 'inauguracao', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default CronogramaLojasProprias;
