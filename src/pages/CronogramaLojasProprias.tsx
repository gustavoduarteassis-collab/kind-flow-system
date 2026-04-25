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

  useEffect(() => {
    const fetchStores = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("stores")
        .select("id, nome, filial, inauguracao, tipo_loja, franqueado")
        .order('nome');

      if (data) {
        setStores(data.map(s => {
          const nomeLower = (s.nome || "").toLowerCase().trim();
          const franqueadoLower = (s.franqueado || "").toLowerCase().trim();
          const tipoLower = (s.tipo_loja || "").toLowerCase().trim();

          // Lojas que devem ser consideradas como reforma conforme PDF/solicitação
          const lojasReforma = [
            "recife outlet",
            "ibirapuera",
            "interlagos",
            "campos gerais",
            "trindade"
          ];
          
          const isReforma = nomeLower.includes("reforma") || 
                           tipoLower.includes("reforma") ||
                           lojasReforma.some(r => nomeLower.includes(r));
          
          // Identifica se é loja própria
          const isPropriaManual = nomeLower.includes("boulevard");
          const isNotPropriaManual = nomeLower.includes("trindade");

          const isPropria = (franqueadoLower.includes("própria") || 
                            franqueadoLower.includes("propria") || 
                            isPropriaManual) && !isNotPropriaManual;

          return {
            ...s,
            status: isReforma ? "Em Reforma" : "Em Andamento",
            is_propria: isPropria,
            is_reforma: isReforma,
          };
        }).filter(s => s.is_propria || s.is_reforma));
      }
      setLoading(false);
    };

    fetchStores();
  }, [user]);

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
              <h1 className="text-xl font-bold">Cronograma Lojas Próprias</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Lojas</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proprias.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Reformas</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reformas.length}</div>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Cronograma de Obras (Novas)
          </h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Data de Início</TableHead>
                  <TableHead>Inauguração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proprias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma loja própria encontrada.</TableCell>
                  </TableRow>
                ) : (
                  proprias.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.nome}</TableCell>
                      <TableCell>{store.filial}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {store.data_inicio ? format(new Date(store.data_inicio), "dd/MM/yyyy", { locale: ptBR }) : "Não definida"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {store.inauguracao ? format(new Date(store.inauguracao), "dd/MM/yyyy", { locale: ptBR }) : "Não definida"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Cronograma de Reformas
          </h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Data de Início</TableHead>
                  <TableHead>Inauguração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reformas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma reforma encontrada.</TableCell>
                  </TableRow>
                ) : (
                  reformas.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.nome}</TableCell>
                      <TableCell>{store.filial}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {store.data_inicio ? format(new Date(store.data_inicio), "dd/MM/yyyy", { locale: ptBR }) : "Não definida"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {store.inauguracao ? format(new Date(store.inauguracao), "dd/MM/yyyy", { locale: ptBR }) : "Não definida"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default CronogramaLojasProprias;
