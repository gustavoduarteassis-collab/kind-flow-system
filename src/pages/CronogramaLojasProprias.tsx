import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, ArrowLeft, Calendar, Clock, CheckCircle2, AlertCircle, HardHat
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type CronogramaStore = {
  id: string;
  nome: string;
  filial: string;
  inauguracao: string;
  analista_obra: string;
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
        .select("id, nome, filial, inauguracao, analista_obra, tipo_loja, franqueado")
        .order('nome');

      if (data) {
        setStores(data.map(s => {
          // Identifica se é loja própria pelo campo franqueado
          const isPropria = s.franqueado?.toLowerCase().includes("própria") || 
                           s.franqueado?.toLowerCase().includes("propria");
          
          // Identifica se é reforma se o nome ou tipo_loja contiver "reforma"
          const isReforma = s.nome?.toLowerCase().includes("reforma") || 
                           s.tipo_loja?.toLowerCase().includes("reforma");

          return {
            ...s,
            status: isReforma ? "Em Reforma" : "Em Andamento",
            is_propria: isPropria,
            is_reforma: isReforma,
            analista_obra: s.analista_obra || "Não atribuído"
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
                  <TableHead>Analista</TableHead>
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
                      <TableCell>{store.analista_obra}</TableCell>
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
                  <TableHead>Analista</TableHead>
                  <TableHead>Previsão</TableHead>
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
                      <TableCell>{store.analista_obra}</TableCell>
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
