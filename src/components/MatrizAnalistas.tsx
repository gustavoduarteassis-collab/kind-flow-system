import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const ANALYSTS = ["Thainara Araújo", "Deise Medeiros", "Gizelia Gomide"];

type GoalRow = {
  id: string;
  analyst_name: string;
  indicador: string;
  polaridade: string;
  valor_ano: string;
  peso: number;
  metas_mensais: Record<string, number>;
  realizados_mensais: Record<string, number>;
};

export function MatrizAnalistas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAnalyst, setSelectedAnalyst] = useState(ANALYSTS[0]);
  const [editedRealizados, setEditedRealizados] = useState<Record<string, Record<string, number>>>({});

  const fetchGoals = useCallback(async () => {
    const { data } = await supabase
      .from("analyst_goals")
      .select("*")
      .is("deleted_at", null)
      .order("peso", { ascending: false });
    if (data) {
      setGoals(data as unknown as GoalRow[]);
      const edits: Record<string, Record<string, number>> = {};
      data.forEach((g: any) => {
        edits[g.id] = { ...(g.realizados_mensais as Record<string, number>) };
      });
      setEditedRealizados(edits);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const analystGoals = goals.filter((g) => g.analyst_name === selectedAnalyst);

  const handleRealizadoChange = (goalId: string, month: string, value: string) => {
    setEditedRealizados((prev) => ({
      ...prev,
      [goalId]: { ...(prev[goalId] || {}), [month]: parseFloat(value) || 0 },
    }));
  };

  const saveRealizados = async () => {
    setSaving(true);
    for (const goal of analystGoals) {
      const realizados = editedRealizados[goal.id];
      if (realizados) {
        await supabase
          .from("analyst_goals")
          .update({ realizados_mensais: realizados as any })
          .eq("id", goal.id);
      }
    }
    toast({ title: "Salvo!", description: `Dados de ${selectedAnalyst} atualizados.` });
    setSaving(false);
  };

  const getFarol = (meta: number, realizado: number, polaridade: string, isPercent: boolean) => {
    if (realizado === 0 && meta === 0) return "neutral";
    if (realizado === 0) return "neutral";
    if (polaridade === "↑") {
      const ratio = realizado / meta;
      if (ratio >= 1) return "verde";
      if (ratio >= 0.8) return "amarelo";
      return "vermelho";
    } else {
      if (realizado <= meta) return "verde";
      if (realizado <= meta * 1.2) return "amarelo";
      return "vermelho";
    }
  };

  const farolClass: Record<string, string> = {
    verde: "bg-green-500/20 text-green-700",
    amarelo: "bg-yellow-500/20 text-yellow-700",
    vermelho: "bg-red-500/20 text-red-700",
    neutral: "bg-muted text-muted-foreground",
  };

  const getAccumulated = (data: Record<string, number>) => {
    return MONTHS.reduce((sum, m) => sum + (data[m] || 0), 0);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={selectedAnalyst} onValueChange={setSelectedAnalyst}>
          <TabsList>
            {ANALYSTS.map((a) => (
              <TabsTrigger key={a} value={a}>{a}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button onClick={saveRealizados} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Matriz de Resultados — {selectedAnalyst}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Área: Expansão · Cargo: Analista de Obra</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[180px]">Indicador</TableHead>
                  <TableHead className="text-center w-8">↕</TableHead>
                  <TableHead className="text-center w-16">Ano</TableHead>
                  <TableHead className="text-center w-12">Peso</TableHead>
                  <TableHead className="text-center w-8"></TableHead>
                  {MONTH_LABELS.map((m) => (
                    <TableHead key={m} className="text-center w-16">{m}</TableHead>
                  ))}
                  <TableHead className="text-center w-16 font-bold">ACUM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analystGoals.map((goal) => {
                  const metas = goal.metas_mensais || {};
                  const realizados = editedRealizados[goal.id] || {};
                  const isPercent = goal.valor_ano.includes("%");
                  const accumMeta = isPercent
                    ? (MONTHS.reduce((s, m) => s + (metas[m] || 0), 0) / MONTHS.filter((m) => (metas[m] || 0) > 0).length || 0)
                    : getAccumulated(metas);
                  const activeMonths = MONTHS.filter((m) => (realizados[m] || 0) > 0);
                  const accumReal = isPercent
                    ? (activeMonths.length > 0 ? activeMonths.reduce((s, m) => s + (realizados[m] || 0), 0) / activeMonths.length : 0)
                    : getAccumulated(realizados);

                  return (
                    <>
                      {/* Meta row */}
                      <TableRow key={`${goal.id}-m`} className="border-b-0">
                        <TableCell rowSpan={2} className="sticky left-0 bg-background z-10 font-medium border-b">
                          {goal.indicador}
                        </TableCell>
                        <TableCell rowSpan={2} className="text-center border-b">{goal.polaridade}</TableCell>
                        <TableCell rowSpan={2} className="text-center border-b">{goal.valor_ano}</TableCell>
                        <TableCell rowSpan={2} className="text-center border-b">{goal.peso}%</TableCell>
                        <TableCell className="text-center font-semibold text-muted-foreground">M</TableCell>
                        {MONTHS.map((m) => (
                          <TableCell key={m} className="text-center text-muted-foreground">
                            {isPercent ? `${metas[m] || 0}%` : metas[m] || 0}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-semibold text-muted-foreground">
                          {isPercent ? `${accumMeta.toFixed(1)}%` : accumMeta}
                        </TableCell>
                      </TableRow>
                      {/* Realizado row */}
                      <TableRow key={`${goal.id}-r`}>
                        <TableCell className="text-center font-semibold">R</TableCell>
                        {MONTHS.map((m) => {
                          const meta = metas[m] || 0;
                          const real = realizados[m] || 0;
                          const farol = getFarol(meta, real, goal.polaridade, isPercent);
                          return (
                            <TableCell key={m} className="text-center p-1">
                              <Input
                                type="number"
                                step={isPercent ? "0.1" : "1"}
                                value={realizados[m] || ""}
                                onChange={(e) => handleRealizadoChange(goal.id, m, e.target.value)}
                                className={`h-7 w-14 text-center text-xs mx-auto ${real > 0 ? farolClass[farol] : ""}`}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${farolClass[getFarol(accumMeta, accumReal, goal.polaridade, isPercent)]}`}>
                            {isPercent ? `${accumReal.toFixed(1)}%` : accumReal}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
