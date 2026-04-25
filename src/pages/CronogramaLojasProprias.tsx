import { useState, useEffect, useMemo } from "react";
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
  Building2, ArrowLeft, Calendar, Clock, CheckCircle2, AlertCircle, HardHat, Download, Eye
} from "lucide-react";
import { format, isWithinInterval, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths, isSameMonth, parseISO, isValid } from "date-fns";
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

  useEffect(() => {
    const fetchStores = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("stores")
        .select("id, nome, filial, inauguracao, tipo_loja, franqueado")
        .order('nome');

      if (data) {
        // Dados do cronograma fixo 2025 fornecido pelo usuário
        const cronogramaFixo = [
          { nome: "Recife Outlet", inicio: "2025-01-13", inauguracao: "2025-02-14", tipo: "reforma" },
          { nome: "Shopping Ibirapuera", inicio: "2025-01-27", inauguracao: "2025-03-20", tipo: "reforma" },
          { nome: "Shopping Interlagos", inicio: "2025-01-27", inauguracao: "2025-03-20", tipo: "reforma" },
          { nome: "Plaza Campos Gerais", inicio: "2025-02-17", inauguracao: "2025-03-27", tipo: "reforma" },
          { nome: "Boulevard", inicio: "2025-03-10", inauguracao: "2025-04-10", tipo: "nova" },
          { nome: "Trindade", inicio: "2025-04-14", inauguracao: "2025-05-15", tipo: "reforma" }
        ];

        setStores(data.map(s => {
          const nomeLower = (s.nome || "").toLowerCase().trim();
          const franqueadoLower = (s.franqueado || "").toLowerCase().trim();
          const tipoLower = (s.tipo_loja || "").toLowerCase().trim();

          const fixo = cronogramaFixo.find(f => nomeLower.includes(f.nome.toLowerCase()));
          
          const isReforma = fixo ? fixo.tipo === "reforma" : (
            nomeLower.includes("reforma") || 
            tipoLower.includes("reforma")
          );
          
          const isPropriaManual = nomeLower.includes("boulevard") || (fixo && fixo.tipo === "nova");
          const isNotPropriaManual = nomeLower.includes("trindade") && !fixo;

          const isPropria = (franqueadoLower.includes("própria") || 
                            franqueadoLower.includes("propria") || 
                            isPropriaManual) && !isNotPropriaManual;

          // Prioritize fixed dates if they match the store
          const dataInauguracao = fixo ? fixo.inauguracao : s.inauguracao;
          let dataInicio = fixo ? fixo.inicio : null;
          
          if (!dataInicio && dataInauguracao) {
            const date = new Date(dataInauguracao);
            date.setMonth(date.getMonth() - 2);
            dataInicio = date.toISOString().split('T')[0];
          }

          return {
            ...s,
            status: isReforma ? "Em Reforma" : "Em Andamento",
            is_propria: isPropria,
            is_reforma: isReforma,
            data_inicio: dataInicio,
            inauguracao: dataInauguracao ? (dataInauguracao.includes('T') ? dataInauguracao.split('T')[0] : dataInauguracao) : null
          };
        }).filter(s => s.is_propria || s.is_reforma || cronogramaFixo.some(f => (s.nome || "").toLowerCase().includes(f.nome.toLowerCase()))));
      }
      setLoading(false);
    };

    fetchStores();
  }, [user]);

  const updateStoreDate = (id: string, field: 'data_inicio' | 'inauguracao', value: string) => {
    setStores(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const exportToExcel = () => {
    const exportData = stores.map(s => ({
      Loja: s.nome,
      Filial: s.filial,
      Tipo: s.is_reforma ? 'Reforma' : 'Nova',
      'Data de Início': s.data_inicio ? format(new Date(s.data_inicio), 'dd/MM/yyyy') : '',
      'Data de Inauguração': s.inauguracao ? format(new Date(s.inauguracao), 'dd/MM/yyyy') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `cronograma_obras_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  const timelineMonths = useMemo(() => {
    // Definimos o início como Janeiro de 2025 para bater com o cronograma solicitado
    const start = new Date(2025, 0, 1);
    const end = addMonths(start, 11); // Mostrar o ano de 2025 inteiro
    return eachMonthOfInterval({ start, end });
  }, []);

  const renderTimeline = (store: CronogramaStore) => {
    if (!store.data_inicio || !store.inauguracao) return null;
    
    const start = parseISO(store.data_inicio);
    const end = parseISO(store.inauguracao);
    
    if (!isValid(start) || !isValid(end)) return null;

    return (
      <div className="flex w-full gap-1 h-8 mt-2">
        {timelineMonths.map((month, idx) => {
          const isMonthActive = (
            (isSameMonth(month, start) || month > start) && 
            (isSameMonth(month, end) || month < end)
          );
          
          const isStart = isSameMonth(month, start);
          const isEnd = isSameMonth(month, end);

          return (
            <div 
              key={idx} 
              className={`flex-1 rounded-sm transition-all duration-300 ${
                isMonthActive 
                  ? store.is_reforma ? 'bg-amber-400' : 'bg-emerald-400'
                  : 'bg-muted/30'
              } ${isStart ? 'ring-2 ring-primary ring-offset-1' : ''} ${isEnd ? 'ring-2 ring-destructive ring-offset-1' : ''}`}
              title={`${format(month, 'MMM/yy', { locale: ptBR })} - ${store.nome}`}
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
            <div className="flex justify-between items-end mb-4 overflow-x-auto">
              <div className="w-48 flex-shrink-0 font-semibold text-sm">Loja</div>
              <div className="flex flex-1 gap-1 min-w-[600px]">
                {timelineMonths.map((month, i) => (
                  <div key={i} className="flex-1 text-[10px] text-center text-muted-foreground border-l pl-1">
                    {format(month, 'MMM/yy', { locale: ptBR })}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-emerald-600 mb-2 uppercase tracking-wider">Obras Novas</h3>
                {proprias.map(s => (
                  <div key={s.id} className="flex items-center gap-4 py-2 border-t group">
                    <div className="w-48 flex-shrink-0">
                      <p className="text-sm font-medium truncate" title={s.nome}>{s.nome}</p>
                      <p className="text-[10px] text-muted-foreground italic">Início: {s.data_inicio ? format(parseISO(s.data_inicio), 'dd/MM') : '--'}</p>
                    </div>
                    <div className="flex-1">
                      {renderTimeline(s)}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-600 mb-2 mt-4 uppercase tracking-wider">Reformas</h3>
                {reformas.map(s => (
                  <div key={s.id} className="flex items-center gap-4 py-2 border-t group">
                    <div className="w-48 flex-shrink-0">
                      <p className="text-sm font-medium truncate" title={s.nome}>{s.nome}</p>
                      <p className="text-[10px] text-muted-foreground italic">Início: {s.data_inicio ? format(parseISO(s.data_inicio), 'dd/MM') : '--'}</p>
                    </div>
                    <div className="flex-1">
                      {renderTimeline(s)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 pt-4 border-t flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-400 rounded-sm" /> Obra Nova
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-400 rounded-sm" /> Reforma
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 ring-2 ring-primary" /> Marcador: Início
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 ring-2 ring-destructive" /> Marcador: Inauguração
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
