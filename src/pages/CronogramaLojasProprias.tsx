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
        // Mapeamento das lojas para o cronograma
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

        // Criamos a lista baseada no cronogramaManual
        const storesList = cronogramaManual.map((m, index) => {
          // Tenta encontrar uma loja no banco que combine com o termo de busca
          const dbStore = data.find(s => (s.nome || "").toLowerCase().includes(m.busca.toLowerCase()));
          
          const isReforma = m.tipo === "reforma";
          
          return {
            id: dbStore?.id || `manual-${index}`,
            nome: m.display,
            filial: dbStore?.filial || "S/F",
            inauguracao: dbStore?.inauguracao ? dbStore.inauguracao.split('T')[0] : "2026-12-31",
            data_inicio: dbStore?.inauguracao ? addDays(new Date(dbStore.inauguracao), -60).toISOString().split('T')[0] : "2026-10-01",
            tipo_loja: dbStore?.tipo_loja || (isReforma ? "reforma" : "nova"),
            status: isReforma ? "Em Reforma" : "Em Andamento",
            is_propria: !isReforma,
            is_reforma: isReforma,
          };
        });

        setStores(storesList);
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
    // Definimos o cabeçalho e os dados básicos
    const header = [
      ["", "", "", "", "CRONOGRAMA DE OBRAS E REFORMAS 2026", "", "", "", "", "", ""],
      ["", "", "", "", "Modelo de Gestão de Lojas Próprias", "", "", "", "", "", ""],
      [],
      ["Loja", "Tipo", "Data de Início", "Data de Inauguração", "Prazo Estimado (Dias)", "Status", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    ];

    const dataRows = stores.map(s => {
      const start = s.data_inicio ? parseISO(s.data_inicio) : null;
      const end = s.inauguracao ? parseISO(s.inauguracao) : null;
      const diffTime = start && end ? Math.abs(end.getTime() - start.getTime()) : 0;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const row = [
        s.nome,
        s.is_reforma ? 'Reforma' : 'Nova',
        s.data_inicio ? format(parseISO(s.data_inicio), 'dd/MM/yyyy') : '',
        s.inauguracao ? format(parseISO(s.inauguracao), 'dd/MM/yyyy') : '',
        diffDays > 0 ? `${diffDays} dias` : 'N/A',
        s.status
      ];

      // Preenchimento do "gráfico" simplificado por meses no Excel
      const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      months.forEach(m => {
        const monthDate = new Date(2026, m, 1);
        const isActive = start && end && (
          (isSameMonth(monthDate, start) || monthDate > start) && 
          (isSameMonth(monthDate, end) || monthDate < end)
        );
        row.push(isActive ? "■■■■■" : "");
      });

      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([...header, ...dataRows]);

    // Estilização básica (largura das colunas)
    const wscols = [
      { wch: 35 }, // Loja
      { wch: 10 }, // Tipo
      { wch: 15 }, // Início
      { wch: 15 }, // Inauguração
      { wch: 20 }, // Prazo
      { wch: 15 }, // Status
      { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, 
      { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cronograma 2026");
    XLSX.writeFile(wb, `cronograma_executivo_2026.xlsx`);
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
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <HardHat className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-primary uppercase">Modelo de Gestão de Lojas</h1>
                <p className="text-xs font-bold text-muted-foreground tracking-[0.2em] uppercase">Cronograma Executivo 2026</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="font-bold border-2" onClick={() => setViewGantt(!viewGantt)}>
              <Eye className="h-4 w-4 mr-2" />
              {viewGantt ? "Ver Tabela" : "Ver Linha do Tempo"}
            </Button>
            <Button variant="default" className="font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar XLS Executivo
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
                  <div className="w-48 p-2 font-bold text-xs border-r sticky left-0 bg-background z-20 flex items-center justify-center">Loja</div>
                  <div className="flex flex-1 flex-col">
                    <div className="w-full text-center py-1 font-bold text-[10px] border-b bg-primary/5 capitalize">
                      {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </div>
                    <div className="flex w-full">
                      {timelineDays.map((day, i) => (
                        <div key={i} className={`flex-1 text-[9px] text-center p-1 border-r last:border-r-0 ${[0, 6].includes(day.getDay()) ? 'bg-muted/50' : ''}`}>
                          {format(day, 'dd')}
                        </div>
                      ))}
                    </div>
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
                  <TableHead>Prazo Estimado</TableHead>
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
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      {(() => {
                        if (!store.data_inicio || !store.inauguracao) return "--";
                        const start = parseISO(store.data_inicio);
                        const end = parseISO(store.inauguracao);
                        if (!isValid(start) || !isValid(end)) return "--";
                        const diff = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        return `${diff} dias`;
                      })()}
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
