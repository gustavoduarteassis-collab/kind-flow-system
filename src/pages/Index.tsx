import { useState, useEffect, useCallback } from "react";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  TrendingUp,
  Store,
  Calendar
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const Index = () => {
  const { stores } = useStores();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: m } = await supabase.from("team_members").select("*");
    if (m) setMembers(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPI Calculations
  const storesInProgress = stores.length;
  const leadTimeMedio = 45; // Placeholder value (could be calculated from historical data)
  const aderenciaCronograma = 88; // Placeholder value
  const lojasComRisco = stores.filter(s => {
    // Logic for risk: e.g., past opening date or many overdue items
    const today = new Date();
    const opening = s.inauguracao ? new Date(s.inauguracao) : null;
    return opening && opening < today && s.statusGeral !== 'REALIZADO';
  }).length;

  // Funnel Data
  const funnelData = [
    { name: 'Pré-Obra', value: stores.filter(s => s.faseAtual === 'Pré-Obra').length, color: '#94A3B8' },
    { name: 'Obra', value: stores.filter(s => s.faseAtual === 'Obra').length, color: '#3B82F6' },
    { name: 'Setup', value: stores.filter(s => s.faseAtual === 'Setup').length, color: '#F59E0B' },
    { name: 'Abertura', value: stores.filter(s => s.faseAtual === 'Abertura').length, color: '#10B981' },

  ];

  if (loading) return <div className="flex h-96 items-center justify-center text-muted-foreground">Carregando indicadores...</div>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Global</h1>
        <p className="text-slate-500">Visão consolidada da expansão e implantação de lojas.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Lojas em Andamento</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{storesInProgress}</div>
            <p className="text-xs text-slate-500 mt-1">+2 este mês</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Lead Time Médio</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{leadTimeMedio} dias</div>
            <p className="text-xs text-slate-500 mt-1">Meta: 40 dias</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">% Aderência</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{aderenciaCronograma}%</div>
            <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${aderenciaCronograma}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Risco de Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{lojasComRisco}</div>
            <p className="text-xs text-red-500 mt-1 font-medium">Atenção imediata necessária</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Funnel Chart */}
        <Card className="lg:col-span-4 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Funil de Obras</CardTitle>
            <p className="text-sm text-slate-500">Distribuição das lojas pelas 4 fases macro</p>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500 }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Allocation */}
        <Card className="lg:col-span-3 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Alocação da Equipe</CardTitle>
            <p className="text-sm text-slate-500">Carga de trabalho por analista</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {members.filter(m => m.role === 'Analista').map((analyst) => {
                const assignedStores = stores.filter(s => s.analista_obra === analyst.name);
                const count = assignedStores.length;
                const percentage = stores.length > 0 ? (count / stores.length) * 100 : 0;
                
                return (
                  <div key={analyst.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {analyst.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{analyst.name}</p>
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">Implantadora</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[hsl(38,70%,50%)]">{count} lojas</span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity / Priority Stores */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Lojas em Foco</CardTitle>
            <p className="text-sm text-slate-500">Próximas inaugurações (30 dias)</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stores
              .filter(s => s.inauguracao)
              .sort((a, b) => new Date(a.inauguracao!).getTime() - new Date(b.inauguracao!).getTime())
              .slice(0, 3)
              .map(store => (
                <div key={store.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                    <Store className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{store.nome}</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(store.inauguracao! + "T00:00:00").toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                      {store.fase_atual}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
