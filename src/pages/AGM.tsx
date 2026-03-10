import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Lock, Plus, Trash2, Sparkles, Download, Target,
  Building2, DollarSign, Clock, Users, Loader2, Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoConstance from "@/assets/logo-constance.svg";

const AGM_PASSWORD = "agm2026";

const indicadores = [
  { id: "abertura_lojas", label: "Abertura de Novas Lojas", icon: Building2, color: "text-primary" },
  { id: "custo_m2", label: "Custo/m²", icon: DollarSign, color: "text-[hsl(var(--success))]" },
  { id: "prazo_implantacao", label: "Prazo Médio de Implantação", icon: Clock, color: "text-[hsl(var(--accent))]" },
  { id: "novos_fornecedores", label: "Novos Fornecedores", icon: Users, color: "text-destructive" },
];

const farolColors: Record<string, string> = {
  verde: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  amarelo: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  vermelho: "bg-destructive text-destructive-foreground",
};

const getCurrentMonth = () => format(new Date(), "yyyy-MM");

type AgmEntry = {
  id: string; user_id: string; mes_referencia: string; indicador: string;
  meta_valor: string; realizado_valor: string; observacoes: string;
  detalhes: any; created_at: string; updated_at: string;
};

type ActionPlan = {
  id: string; user_id: string; mes_referencia: string; indicador: string;
  causa: string; fenomeno: string; acao: string; como: string;
  responsavel: string; prazo_inicial: string; prazo_final: string;
  farol: string; ai_generated: boolean; created_at: string;
};

const AGM = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [mesRef, setMesRef] = useState(getCurrentMonth());
  const [entries, setEntries] = useState<AgmEntry[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<Record<string, { meta: string; realizado: string; obs: string }>>({});

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [e, p] = await Promise.all([
      supabase.from("agm_entries").select("*").eq("mes_referencia", mesRef).order("created_at"),
      supabase.from("agm_action_plans").select("*").eq("mes_referencia", mesRef).order("created_at"),
    ]);
    if (e.data) {
      setEntries(e.data as AgmEntry[]);
      const edit: Record<string, { meta: string; realizado: string; obs: string }> = {};
      (e.data as AgmEntry[]).forEach((entry) => {
        edit[entry.indicador] = { meta: entry.meta_valor, realizado: entry.realizado_valor, obs: entry.observacoes };
      });
      // Fill missing indicators
      indicadores.forEach((ind) => {
        if (!edit[ind.id]) edit[ind.id] = { meta: "", realizado: "", obs: "" };
      });
      setEditingEntry(edit);
    } else {
      const edit: Record<string, { meta: string; realizado: string; obs: string }> = {};
      indicadores.forEach((ind) => { edit[ind.id] = { meta: "", realizado: "", obs: "" }; });
      setEditingEntry(edit);
    }
    if (p.data) setPlans(p.data as ActionPlan[]);
  }, [user, mesRef]);

  useEffect(() => { if (authenticated) fetchData(); }, [authenticated, fetchData]);

  const handleLogin = () => {
    if (password === AGM_PASSWORD) {
      setAuthenticated(true);
    } else {
      toast({ title: "Senha incorreta", variant: "destructive" });
    }
  };

  const saveEntry = async (indicadorId: string) => {
    if (!user) return;
    const data = editingEntry[indicadorId];
    if (!data) return;

    const existing = entries.find((e) => e.indicador === indicadorId);
    if (existing) {
      await supabase.from("agm_entries").update({
        meta_valor: data.meta, realizado_valor: data.realizado, observacoes: data.obs,
      }).eq("id", existing.id);
    } else {
      await supabase.from("agm_entries").insert({
        user_id: user.id, mes_referencia: mesRef, indicador: indicadorId,
        meta_valor: data.meta, realizado_valor: data.realizado, observacoes: data.obs,
      });
    }
    toast({ title: "Salvo!" });
    fetchData();
  };

  const generateAIPlans = async (indicadorId: string) => {
    if (!user) return;
    const data = editingEntry[indicadorId];
    const indLabel = indicadores.find((i) => i.id === indicadorId)?.label || indicadorId;
    setAiLoading(indicadorId);

    try {
      const { data: result, error } = await supabase.functions.invoke("agm-ai", {
        body: {
          indicador: indLabel,
          meta: data?.meta || "",
          realizado: data?.realizado || "",
          observacoes: data?.obs || "",
          contexto: "Setor de Expansão da Constance Calçados. Responsável: Gustavo Duarte.",
        },
      });

      if (error) throw error;

      if (result?.planos?.length) {
        const today = format(new Date(), "yyyy-MM-dd");
        const inserts = result.planos.map((p: any) => ({
          user_id: user.id,
          mes_referencia: mesRef,
          indicador: indicadorId,
          causa: p.causa || "",
          fenomeno: p.fenomeno || "",
          acao: p.acao || "",
          como: p.como || "",
          responsavel: p.responsavel || "Gustavo",
          prazo_inicial: today,
          prazo_final: format(addDays(new Date(), p.prazo_dias || 30), "yyyy-MM-dd"),
          farol: "amarelo",
          ai_generated: true,
        }));

        await supabase.from("agm_action_plans").insert(inserts);
        toast({ title: "Planos gerados!", description: result.analise?.substring(0, 100) });
        fetchData();
      } else {
        toast({ title: "Nenhum plano gerado", variant: "destructive" });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao gerar planos", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

  const deletePlan = async (id: string) => {
    await supabase.from("agm_action_plans").delete().eq("id", id);
    fetchData();
  };

  const updatePlanFarol = async (id: string, farol: string) => {
    await supabase.from("agm_action_plans").update({ farol }).eq("id", id);
    fetchData();
  };

  const generatePDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;

    const mesLabel = mesRef ? format(new Date(mesRef + "-01"), "MMMM yyyy", { locale: ptBR }) : mesRef;

    const entriesHTML = indicadores.map((ind) => {
      const data = editingEntry[ind.id];
      const indPlans = plans.filter((p) => p.indicador === ind.id);
      return `
        <div class="indicator">
          <h2>${ind.label}</h2>
          <div class="meta-row">
            <div class="meta-box"><h4>Meta</h4><p>${data?.meta || "—"}</p></div>
            <div class="meta-box"><h4>Realizado</h4><p>${data?.realizado || "—"}</p></div>
          </div>
          ${data?.obs ? `<p class="obs"><strong>Observações:</strong> ${data.obs}</p>` : ""}
          ${indPlans.length ? `
            <h3>Planos de Ação</h3>
            <table>
              <thead><tr><th>Causa</th><th>Ação</th><th>Como</th><th>Responsável</th><th>Prazo</th><th>Farol</th></tr></thead>
              <tbody>${indPlans.map((p) => `
                <tr>
                  <td>${p.causa}</td><td>${p.acao}</td><td>${p.como}</td>
                  <td>${p.responsavel}</td><td>${p.prazo_final}</td>
                  <td><span class="farol farol-${p.farol}">${p.farol}</span></td>
                </tr>`).join("")}
              </tbody>
            </table>` : ""}
        </div>`;
    }).join("");

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>AGM - ${mesLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; }
  .header { text-align: center; border-bottom: 3px solid #8B6914; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 28px; color: #8B6914; }
  .header p { color: #666; margin-top: 4px; }
  .indicator { margin-bottom: 30px; page-break-inside: avoid; }
  .indicator h2 { font-size: 18px; color: #8B6914; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; margin-bottom: 12px; }
  .indicator h3 { font-size: 14px; margin: 12px 0 8px; }
  .meta-row { display: flex; gap: 16px; margin-bottom: 8px; }
  .meta-box { flex: 1; background: #f8f6f0; border-left: 3px solid #8B6914; padding: 10px 14px; border-radius: 4px; }
  .meta-box h4 { font-size: 11px; text-transform: uppercase; color: #8B6914; }
  .meta-box p { font-size: 14px; font-weight: 600; }
  .obs { font-size: 12px; color: #666; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f5f5f5; padding: 6px 8px; text-align: left; border: 1px solid #ddd; }
  td { padding: 6px 8px; border: 1px solid #ddd; }
  .farol { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
  .farol-verde { background: #22c55e; color: white; }
  .farol-amarelo { background: #eab308; color: white; }
  .farol-vermelho { background: #ef4444; color: white; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="header">
    <h1>AGM — Análise Gerencial Mensal</h1>
    <p>Setor: Expansão | Responsável: Gustavo Duarte | ${mesLabel}</p>
  </div>
  ${entriesHTML}
  <div class="footer">Constance Calçados — Documento gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  // Password screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>AGM — Acesso Restrito</CardTitle>
            <p className="text-sm text-muted-foreground">Análise Gerencial Mensal</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Senha de Acesso</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Digite a senha..."
              />
            </div>
            <Button onClick={handleLogin} className="w-full">Acessar</Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoConstance} alt="Constance" className="h-8 opacity-80" />
            <div>
              <h1 className="text-xl font-bold">AGM</h1>
              <p className="text-xs text-muted-foreground">Análise Gerencial Mensal — Expansão</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="month"
              value={mesRef}
              onChange={(e) => setMesRef(e.target.value)}
              className="w-[160px]"
            />
            <Button variant="outline" className="gap-2" onClick={generatePDF}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="indicadores" className="space-y-6">
          <TabsList>
            <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
            <TabsTrigger value="planos">Planos de Ação</TabsTrigger>
          </TabsList>

          {/* INDICADORES TAB */}
          <TabsContent value="indicadores" className="space-y-4">
            {indicadores.map((ind) => {
              const data = editingEntry[ind.id] || { meta: "", realizado: "", obs: "" };
              const Icon = ind.icon;
              return (
                <Card key={ind.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${ind.color}`} />
                      {ind.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Meta</Label>
                        <Input
                          value={data.meta}
                          onChange={(e) => setEditingEntry((prev) => ({
                            ...prev,
                            [ind.id]: { ...prev[ind.id], meta: e.target.value },
                          }))}
                          placeholder="Ex: 3 lojas, R$ 3.000/m²..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Realizado</Label>
                        <Input
                          value={data.realizado}
                          onChange={(e) => setEditingEntry((prev) => ({
                            ...prev,
                            [ind.id]: { ...prev[ind.id], realizado: e.target.value },
                          }))}
                          placeholder="Ex: 2 lojas, R$ 2.962/m²..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Observações</Label>
                        <Input
                          value={data.obs}
                          onChange={(e) => setEditingEntry((prev) => ({
                            ...prev,
                            [ind.id]: { ...prev[ind.id], obs: e.target.value },
                          }))}
                          placeholder="Comentários..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-1.5" onClick={() => saveEntry(ind.id)}>
                        <Save className="h-3.5 w-3.5" /> Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => generateAIPlans(ind.id)}
                        disabled={aiLoading === ind.id}
                      >
                        {aiLoading === ind.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Gerar Plano de Ação com IA
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* PLANOS DE AÇÃO TAB */}
          <TabsContent value="planos" className="space-y-4">
            {indicadores.map((ind) => {
              const indPlans = plans.filter((p) => p.indicador === ind.id);
              if (indPlans.length === 0) return null;
              const Icon = ind.icon;
              return (
                <Card key={ind.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${ind.color}`} />
                      {ind.label}
                      <Badge variant="secondary" className="text-[10px]">{indPlans.length} planos</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Causa</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Como</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Prazo</TableHead>
                            <TableHead className="text-center">Farol</TableHead>
                            <TableHead className="text-center">Origem</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {indPlans.map((plan) => (
                            <TableRow key={plan.id}>
                              <TableCell className="text-xs max-w-[200px]">{plan.causa}</TableCell>
                              <TableCell className="text-xs max-w-[200px]">{plan.acao}</TableCell>
                              <TableCell className="text-xs max-w-[200px]">{plan.como}</TableCell>
                              <TableCell className="text-xs">{plan.responsavel}</TableCell>
                              <TableCell className="text-xs">{plan.prazo_final}</TableCell>
                              <TableCell className="text-center">
                                <Select value={plan.farol} onValueChange={(v) => updatePlanFarol(plan.id, v)}>
                                  <SelectTrigger className="h-7 w-[90px] mx-auto">
                                    <Badge className={`${farolColors[plan.farol]} text-[10px]`}>
                                      {plan.farol}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="verde">Verde</SelectItem>
                                    <SelectItem value="amarelo">Amarelo</SelectItem>
                                    <SelectItem value="vermelho">Vermelho</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center">
                                {plan.ai_generated ? (
                                  <Badge variant="secondary" className="text-[10px] gap-1">
                                    <Sparkles className="h-3 w-3" /> IA
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">Manual</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePlan(plan.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {plans.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p>Nenhum plano de ação criado para este mês.</p>
                  <p className="text-xs mt-1">Preencha os indicadores e use a IA para gerar planos automaticamente.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AGM;
