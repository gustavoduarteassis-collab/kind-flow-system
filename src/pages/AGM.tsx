import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Lock, Trash2, Download,
  Building2, DollarSign, Clock, Users, Loader2, Save,
  MessageCircle, Send, CheckCircle2, RefreshCw, Store,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, differenceInDays, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoConstance from "@/assets/logo-constance.svg";
import { generateAGMPptx } from "@/utils/generateAGMPptx";
import { MatrizResultados } from "@/components/MatrizResultados";
import { MatrizAnalistas } from "@/components/MatrizAnalistas";
import { isStoreLiberated } from "@/utils/inaugurationStatus";



const METAS_CUSTO: Record<string, number> = {
  TRADICIONAL: 3250,
  LIGHT: 3500,
  OUTLET: 2900,
};

const farolColors: Record<string, string> = {
  verde: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  amarelo: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  vermelho: "bg-destructive text-destructive-foreground",
};

const getCurrentMonth = () => format(new Date(), "yyyy-MM");

type CustoEntry = {
  id: string; nome: string; tipo: string; area_loja: number; area_total: number;
  mao_de_obra: number; moveis: number; piso: number; iluminacao: number;
  informatica: number; demais_itens: number;
};

type PipelineStore = {
  id: string; filial: string; local: string; inicio_obra: string;
  data_inauguracao: string; previsao_inauguracao: string;
  data_liberacao_orcamento: string; prazo_conclusao_orcamento: string;
  padrao: string; estado: string; cidade: string; status_geral: string;
  analista_obra: string; franqueado: string;
};

type StoreRow = {
  id: string; nome: string; inauguracao: string; tipo_loja: string;
  inauguracao_checklist: any;
};

type StoreAGMData = {
  nome: string;
  tipo: string;
  custoTotal: number;
  areaLoja: number;
  custoM2: number;
  metaCustoM2: number;
  inicioObra: string;
  dataInauguracao: string;
  prazoDias: number;
  dataLiberacaoOrcamento: string;
  prazoConclusaoOrcamento: string;
  origem: "inaugurada" | "funil";
  statusGeral?: string;
  analistaObra?: string;
  franqueado?: string;
  previsaoInauguracao?: string;
  cidade?: string;
  estado?: string;
};

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

type ChatMessage = { role: "user" | "assistant"; content: string };

// Try to parse various date formats
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  // Try yyyy-MM-dd
  let d = parse(dateStr, "yyyy-MM-dd", new Date());
  if (isValid(d)) return d;
  // Try dd/MM/yyyy
  d = parse(dateStr, "dd/MM/yyyy", new Date());
  if (isValid(d)) return d;
  // Try MM/yyyy
  d = parse(dateStr, "MM/yyyy", new Date());
  if (isValid(d)) return d;
  // Try native
  d = new Date(dateStr);
  if (isValid(d)) return d;
  return null;
};

const matchesMonth = (dateStr: string, mesRef: string): boolean => {
  const d = parseDate(dateStr);
  if (!d) return false;
  return format(d, "yyyy-MM") === mesRef;
};

const AGM = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mesRef, setMesRef] = useState(getCurrentMonth());
  const [entries, setEntries] = useState<AgmEntry[]>([]);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [gustavoPlans, setGustavoPlans] = useState<ActionPlan[]>([]);
  const [storesData, setStoresData] = useState<StoreAGMData[]>([]);
  const [fornecedoresCount, setFornecedoresCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Manual overrides per indicator
  const [editingEntry, setEditingEntry] = useState<Record<string, { meta: string; realizado: string; obs: string }>>({});

  // 5 Whys chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatIndicador, setChatIndicador] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingPlans, setGeneratingPlans] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch all data from existing tables
  const fetchAutoData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [storesRes, pipelineRes, custosRes, fornecedoresRes] = await Promise.all([
        supabase.from("stores").select("id, nome, inauguracao, tipo_loja, inauguracao_checklist"),
        supabase.from("pipeline_stores").select("id, filial, local, inicio_obra, data_inauguracao, previsao_inauguracao, data_liberacao_orcamento, prazo_conclusao_orcamento, padrao, estado, cidade, status_geral, analista_obra, franqueado"),
        supabase.from("custos_geral_entries").select("id, nome, tipo, area_loja, area_total, mao_de_obra, moveis, piso, iluminacao, informatica, demais_itens"),
        supabase.from("fornecedores_prospeccao").select("id, created_at, mes_referencia"),
      ]);

      const stores = (storesRes.data || []) as StoreRow[];
      const pipeline = (pipelineRes.data || []) as PipelineStore[];
      const custos = (custosRes.data || []) as CustoEntry[];
      const fornecedores = fornecedoresRes.data || [];

      const storeDataList: StoreAGMData[] = [];
      const processedNames = new Set<string>();

      // 1. Inaugurated stores for this month (from stores table)
      stores.forEach((s) => {
        if (!matchesMonth(s.inauguracao, mesRef)) return;
        // Only consider inaugurated if checklist is LIBERADO or LIBERADO COM RESSALVAS
        if (!isStoreLiberated(s.inauguracao_checklist, s.tipo_loja)) return;

        const nome = s.nome.toUpperCase().trim();
        if (processedNames.has(nome)) return;
        processedNames.add(nome);

        const custoMatch = custos.find((c) => c.nome.toUpperCase().trim() === nome);
        const pipeMatch = pipeline.find((p) => (p.local || p.filial || "").toUpperCase().trim() === nome);

        const tipo = custoMatch?.tipo || pipeMatch?.padrao?.toUpperCase() || s.tipo_loja?.toUpperCase() || "TRADICIONAL";
        const tipoKey = tipo.includes("LIGHT") ? "LIGHT" : tipo.includes("OUTLET") ? "OUTLET" : "TRADICIONAL";
        const custoTotal = custoMatch ? (custoMatch.mao_de_obra + custoMatch.moveis + custoMatch.piso + custoMatch.iluminacao + custoMatch.informatica + custoMatch.demais_itens) : 0;
        const areaLoja = custoMatch?.area_loja || 0;
        const inicioObra = pipeMatch?.inicio_obra || "";
        const dataInauguracao = pipeMatch?.data_inauguracao || s.inauguracao || "";
        const inicioDate = parseDate(inicioObra);
        const inaugDate = parseDate(dataInauguracao);

        storeDataList.push({
          nome, tipo: tipoKey, custoTotal, areaLoja,
          custoM2: areaLoja > 0 ? Math.round(custoTotal / areaLoja) : 0,
          metaCustoM2: METAS_CUSTO[tipoKey] || 3250,
          inicioObra, dataInauguracao,
          prazoDias: inicioDate && inaugDate ? differenceInDays(inaugDate, inicioDate) : 0,
          dataLiberacaoOrcamento: pipeMatch?.data_liberacao_orcamento || "",
          prazoConclusaoOrcamento: pipeMatch?.prazo_conclusao_orcamento || "",
          origem: "inaugurada",
        });
      });

      // 2. ALL pipeline stores (funil) - include all, mark inaugurated ones
      pipeline.forEach((p) => {
        const nome = (p.local || p.filial || "").toUpperCase().trim();
        if (!nome || processedNames.has(nome)) return;
        processedNames.add(nome);

        // Check if pipeline store has a matching store with liberated checklist
        const matchingStore = stores.find((s) => s.nome.toUpperCase().trim() === nome);
        const isInaugurated = matchesMonth(p.data_inauguracao, mesRef) && 
          matchingStore ? isStoreLiberated(matchingStore.inauguracao_checklist, matchingStore.tipo_loja) : false;
        const custoMatch = custos.find((c) => c.nome.toUpperCase().trim() === nome);
        const tipo = custoMatch?.tipo || p.padrao?.toUpperCase() || "TRADICIONAL";
        const tipoKey = tipo.includes("LIGHT") ? "LIGHT" : tipo.includes("OUTLET") ? "OUTLET" : "TRADICIONAL";
        const custoTotal = custoMatch ? (custoMatch.mao_de_obra + custoMatch.moveis + custoMatch.piso + custoMatch.iluminacao + custoMatch.informatica + custoMatch.demais_itens) : 0;
        const areaLoja = custoMatch?.area_loja || 0;
        const inicioDate = parseDate(p.inicio_obra);
        const inaugDate = parseDate(p.data_inauguracao);

        storeDataList.push({
          nome, tipo: tipoKey, custoTotal, areaLoja,
          custoM2: areaLoja > 0 ? Math.round(custoTotal / areaLoja) : 0,
          metaCustoM2: METAS_CUSTO[tipoKey] || 3250,
          inicioObra: p.inicio_obra || "",
          dataInauguracao: p.data_inauguracao || "",
          prazoDias: inicioDate && inaugDate ? differenceInDays(inaugDate, inicioDate) : 0,
          dataLiberacaoOrcamento: p.data_liberacao_orcamento || "",
          prazoConclusaoOrcamento: p.prazo_conclusao_orcamento || "",
          origem: isInaugurated ? "inaugurada" : "funil",
          statusGeral: p.status_geral,
          analistaObra: p.analista_obra,
          franqueado: p.franqueado,
          previsaoInauguracao: p.previsao_inauguracao,
          cidade: p.cidade,
          estado: p.estado,
        });
      });

      setStoresData(storeDataList);

      // Count fornecedores for this month
      const fCount = fornecedores.filter((f: any) => {
        if (f.mes_referencia && f.mes_referencia.startsWith(mesRef)) return true;
        if (f.created_at && matchesMonth(f.created_at, mesRef)) return true;
        return false;
      }).length;
      setFornecedoresCount(fCount);

    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [user, mesRef]);

  const fetchAGMData = useCallback(async () => {
    if (!user) return;
    const [e, p, g] = await Promise.all([
      supabase.from("agm_entries").select("*").eq("mes_referencia", mesRef).order("created_at"),
      supabase.from("agm_action_plans").select("*").eq("mes_referencia", mesRef).order("created_at"),
      supabase.from("agm_action_plans").select("*").ilike("responsavel", "%Gustavo%").order("prazo_final"),
    ]);
    if (e.data) {
      setEntries(e.data as AgmEntry[]);
      const edit: Record<string, { meta: string; realizado: string; obs: string }> = {};
      (e.data as AgmEntry[]).forEach((entry) => {
        edit[entry.indicador] = { meta: entry.meta_valor, realizado: entry.realizado_valor, obs: entry.observacoes };
      });
      setEditingEntry(edit);
    }
    if (p.data) setPlans(p.data as ActionPlan[]);
    if (g.data) setGustavoPlans(g.data as ActionPlan[]);
  }, [user, mesRef]);

  // Check if user is authorized team member
  useEffect(() => {
    if (!user) { setCheckingAuth(false); return; }
    const checkTeamAccess = async () => {
      const { data } = await supabase.rpc("is_authorized_team", { check_user_id: user.id });
      setAuthenticated(!!data);
      setCheckingAuth(false);
    };
    checkTeamAccess();
  }, [user]);

  useEffect(() => {
    if (authenticated) {
      fetchAutoData();
      fetchAGMData();
    }
  }, [authenticated, fetchAutoData, fetchAGMData]);
  
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);


  // Computed summaries
  const inauguradas = useMemo(() => storesData.filter((s) => s.origem === "inaugurada"), [storesData]);
  const funilStores = useMemo(() => storesData.filter((s) => s.origem === "funil"), [storesData]);

  const summary = useMemo(() => {
    const totalLojas = inauguradas.length;
    const byTipo: Record<string, StoreAGMData[]> = {};
    inauguradas.forEach((s) => {
      if (!byTipo[s.tipo]) byTipo[s.tipo] = [];
      byTipo[s.tipo].push(s);
    });

    const custoMediaByTipo: Record<string, number> = {};
    Object.entries(byTipo).forEach(([tipo, stores]) => {
      const withCost = stores.filter((s) => s.custoM2 > 0);
      custoMediaByTipo[tipo] = withCost.length > 0
        ? Math.round(withCost.reduce((a, s) => a + s.custoM2, 0) / withCost.length)
        : 0;
    });

    const withPrazo = inauguradas.filter((s) => s.prazoDias > 0);
    const prazoMedio = withPrazo.length > 0
      ? Math.round(withPrazo.reduce((a, s) => a + s.prazoDias, 0) / withPrazo.length)
      : 0;

    return { totalLojas, byTipo, custoMediaByTipo, prazoMedio };
  }, [inauguradas]);

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
    fetchAGMData();
  };

  // 5 Whys
  const startFiveWhys = (indicadorId: string, label: string, meta: string, realizado: string) => {
    setChatIndicador(indicadorId);
    setChatMessages([{
      role: "assistant",
      content: `Vamos iniciar a análise dos **5 Porquês** para **${label}**.\n\n📊 **Meta:** ${meta || "não informada"}\n📈 **Realizado:** ${realizado || "não informado"}\n\nMe conte: **O que você acredita que causou esse resultado?**`,
    }]);
    setChatInput("");
    setChatOpen(true);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading || !chatIndicador) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("agm-5whys", {
        body: { messages: newMessages, indicador: chatIndicador, meta: "", realizado: "", mode: "chat" },
      });
      if (error) throw error;
      if (result?.reply) setChatMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err: any) {
      toast({ title: "Erro na conversa", description: err.message, variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  };

  const generatePlansFromChat = async () => {
    if (!user || !chatIndicador) return;
    setGeneratingPlans(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("agm-5whys", {
        body: { messages: chatMessages, indicador: chatIndicador, meta: "", realizado: "", mode: "generate_plan" },
      });
      if (error) throw error;
      if (result?.planos?.length) {
        const today = format(new Date(), "yyyy-MM-dd");
        const inserts = result.planos.map((p: any) => ({
          user_id: user.id, mes_referencia: mesRef, indicador: chatIndicador,
          causa: result.causa_raiz || p.causa || "", fenomeno: p.fenomeno || "",
          acao: p.acao || "", como: p.como || "",
          responsavel: p.responsavel || "Gustavo", prazo_inicial: today,
          prazo_final: format(addDays(new Date(), p.prazo_dias || 30), "yyyy-MM-dd"),
          farol: "amarelo", ai_generated: true,
        }));
        await supabase.from("agm_action_plans").insert(inserts);
        toast({ title: "Planos criados!", description: `${result.planos.length} planos gerados.` });
        setChatOpen(false);
        fetchAGMData();
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar planos", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPlans(false);
    }
  };

  const deletePlan = async (id: string) => {
    await supabase.from("agm_action_plans").delete().eq("id", id);
    fetchAGMData();
  };

  const updatePlanFarol = async (id: string, farol: string) => {
    await supabase.from("agm_action_plans").update({ farol }).eq("id", id);
    fetchAGMData();
  };

  const generatePDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const mesLabel = format(new Date(mesRef + "-01"), "MMMM yyyy", { locale: ptBR });

    const storesHTML = storesData.map((s) => `
      <div class="store-card">
        <h3>${s.nome} <span class="tipo">${s.tipo}</span></h3>
        <div class="meta-row">
          <div class="meta-box"><h4>Custo/m²</h4><p class="${s.custoM2 > s.metaCustoM2 ? 'red' : 'green'}">R$ ${s.custoM2.toLocaleString("pt-BR")}</p><small>Meta: R$ ${s.metaCustoM2.toLocaleString("pt-BR")}</small></div>
          <div class="meta-box"><h4>Área</h4><p>${s.areaLoja} m²</p></div>
          <div class="meta-box"><h4>Custo Total</h4><p>R$ ${s.custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
          <div class="meta-box"><h4>Prazo Obra</h4><p>${s.prazoDias} dias</p></div>
        </div>
      </div>`).join("");

    const plansHTML = plans.length ? `
      <h2>Planos de Ação</h2>
      <table><thead><tr><th>Indicador</th><th>Causa</th><th>Ação</th><th>Como</th><th>Responsável</th><th>Prazo</th><th>Farol</th></tr></thead>
      <tbody>${plans.map((p) => `<tr><td>${p.indicador}</td><td>${p.causa}</td><td>${p.acao}</td><td>${p.como}</td><td>${p.responsavel}</td><td>${p.prazo_final}</td><td><span class="farol farol-${p.farol}">${p.farol}</span></td></tr>`).join("")}</tbody></table>` : "";

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>AGM - ${mesLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; }
  .header { text-align: center; border-bottom: 3px solid #8B6914; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 28px; color: #8B6914; }
  .summary { display: flex; gap: 16px; margin-bottom: 30px; }
  .summary-box { flex: 1; background: #f8f6f0; border-left: 3px solid #8B6914; padding: 12px; border-radius: 4px; }
  .summary-box h4 { font-size: 11px; text-transform: uppercase; color: #8B6914; }
  .summary-box p { font-size: 20px; font-weight: bold; }
  .store-card { margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; page-break-inside: avoid; }
  .store-card h3 { font-size: 16px; margin-bottom: 10px; color: #333; }
  .tipo { font-size: 11px; background: #8B6914; color: white; padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
  .meta-row { display: flex; gap: 12px; }
  .meta-box { flex: 1; background: #fafafa; padding: 8px 12px; border-radius: 4px; border: 1px solid #eee; }
  .meta-box h4 { font-size: 10px; text-transform: uppercase; color: #888; }
  .meta-box p { font-size: 14px; font-weight: 600; }
  .meta-box small { font-size: 10px; color: #999; }
  .red { color: #ef4444; }
  .green { color: #22c55e; }
  h2 { font-size: 18px; color: #8B6914; margin: 24px 0 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
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
  <div class="summary">
    <div class="summary-box"><h4>Lojas Inauguradas</h4><p>${summary.totalLojas}</p></div>
    <div class="summary-box"><h4>Prazo Médio</h4><p>${summary.prazoMedio} dias</p></div>
    <div class="summary-box"><h4>Novos Fornecedores</h4><p>${fornecedoresCount}</p></div>
  </div>
  <h2>Lojas do Mês</h2>
  ${storesHTML || "<p>Nenhuma loja inaugurada neste mês.</p>"}
  ${plansHTML}
  <div class="footer">Constance Calçados — ${new Date().toLocaleDateString("pt-BR")}</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const hasRootCause = chatMessages.some((m) => m.role === "assistant" && m.content.includes("✅"));

  // Loading / Access denied screen
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>AGM — Acesso Restrito</CardTitle>
            <p className="text-sm text-muted-foreground">Acesso permitido somente para membros da equipe.</p>
          </CardHeader>
          <CardContent>
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
            <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} className="w-[160px]" />
            <Button variant="outline" size="icon" onClick={() => { fetchAutoData(); fetchAGMData(); }} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" className="gap-2" onClick={generatePDF}>
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button variant="default" className="gap-2" onClick={() => generateAGMPptx(mesRef, storesData, plans, fornecedoresCount, summary)}>
              <Download className="h-4 w-4" /> PPTX
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Lojas Inauguradas</span>
              </div>
              <p className="text-2xl font-bold">{summary.totalLojas}</p>
              <p className="text-[10px] text-muted-foreground">No funil: {funilStores.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-[hsl(var(--accent))]" />
                <span className="text-xs font-medium text-muted-foreground">Prazo Médio</span>
              </div>
              <p className="text-2xl font-bold">{summary.prazoMedio} <span className="text-sm font-normal text-muted-foreground">dias</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-destructive" />
                <span className="text-xs font-medium text-muted-foreground">Novos Fornecedores</span>
              </div>
              <p className="text-2xl font-bold">{fornecedoresCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="text-xs font-medium text-muted-foreground">Custo/m² Médio</span>
              </div>
              {Object.entries(summary.custoMediaByTipo).map(([tipo, media]) => (
                <div key={tipo} className="flex items-center justify-between text-sm">
                  <span className="text-xs text-muted-foreground">{tipo}</span>
                  <span className={`font-semibold ${media > (METAS_CUSTO[tipo] || 3250) ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                    R$ {media.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="lojas" className="space-y-6">
          <TabsList>
            <TabsTrigger value="lojas">Lojas do Mês</TabsTrigger>
            <TabsTrigger value="matriz">Matriz de Resultados</TabsTrigger>
            <TabsTrigger value="analistas">Metas Analistas</TabsTrigger>
            <TabsTrigger value="indicadores">Indicadores Extras</TabsTrigger>
            <TabsTrigger value="planos">Planos de Ação ({plans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="lojas" className="space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Inaugurated stores */}
            {!loading && inauguradas.length > 0 && (
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Lojas Inauguradas ({inauguradas.length})
              </h3>
            )}
            {inauguradas.map((store) => (
              <Card key={store.nome}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      {store.nome}
                      <Badge variant="secondary" className="text-[10px]">{store.tipo}</Badge>
                      <Badge className="text-[10px] bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">Inaugurada</Badge>
                    </CardTitle>
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => startFiveWhys(`loja_${store.nome}`, store.nome, `Meta custo/m²: R$ ${store.metaCustoM2}`, `Realizado: R$ ${store.custoM2}/m², Prazo: ${store.prazoDias} dias`)}>
                      <MessageCircle className="h-3.5 w-3.5" /> 5 Porquês
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] uppercase text-muted-foreground font-medium">Custo/m²</p>
                      <p className={`text-lg font-bold ${store.custoM2 > store.metaCustoM2 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                        R$ {store.custoM2.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Meta: R$ {store.metaCustoM2.toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] uppercase text-muted-foreground font-medium">Área Loja</p>
                      <p className="text-lg font-bold">{store.areaLoja} <span className="text-xs font-normal">m²</span></p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] uppercase text-muted-foreground font-medium">Custo Total</p>
                      <p className="text-lg font-bold">R$ {(store.custoTotal / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] uppercase text-muted-foreground font-medium">Prazo de Obra</p>
                      <p className="text-lg font-bold">{store.prazoDias} <span className="text-xs font-normal">dias</span></p>
                      {store.inicioObra && <p className="text-[10px] text-muted-foreground">Início: {store.inicioObra}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pipeline (funil) stores */}
            {!loading && funilStores.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mt-6">
                  <Building2 className="h-4 w-4" /> Lojas no Funil ({funilStores.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loja</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cidade/UF</TableHead>
                        <TableHead>Franqueado</TableHead>
                        <TableHead>Analista</TableHead>
                        <TableHead>Início Obra</TableHead>
                        <TableHead>Prev. Inauguração</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funilStores.map((store) => (
                        <TableRow key={store.nome}>
                          <TableCell className="font-medium text-xs">{store.nome}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{store.tipo}</Badge></TableCell>
                          <TableCell className="text-xs">{[store.cidade, store.estado].filter(Boolean).join("/") || "-"}</TableCell>
                          <TableCell className="text-xs">{store.franqueado || "-"}</TableCell>
                          <TableCell className="text-xs">{store.analistaObra || "-"}</TableCell>
                          <TableCell className="text-xs">{store.inicioObra || "-"}</TableCell>
                          <TableCell className="text-xs">{store.previsaoInauguracao || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">{store.statusGeral || "Em andamento"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                              onClick={() => startFiveWhys(`loja_${store.nome}`, store.nome, "Loja em andamento", `Status: ${store.statusGeral || "Em andamento"}, Prev: ${store.previsaoInauguracao || "N/A"}`)}>
                              <MessageCircle className="h-3 w-3" /> 5 Porquês
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {!loading && storesData.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Store className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma loja encontrada.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MATRIZ DE RESULTADOS TAB */}
          <TabsContent value="matriz">
            <MatrizResultados year={parseInt(mesRef.split("-")[0])} />
          </TabsContent>

          {/* METAS ANALISTAS TAB */}
          <TabsContent value="analistas">
            <MatrizAnalistas />
          </TabsContent>

          {/* INDICADORES EXTRAS TAB - for manual overrides */}
          <TabsContent value="indicadores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observações e Ajustes Manuais</CardTitle>
                <CardDescription className="text-xs">Adicione observações ou ajuste valores que não foram puxados automaticamente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: "abertura_lojas", label: "Abertura de Novas Lojas", auto: `${summary.totalLojas} lojas` },
                  { id: "custo_m2", label: "Custo/m² (geral)", auto: Object.entries(summary.custoMediaByTipo).map(([t, v]) => `${t}: R$ ${v}`).join(", ") },
                  { id: "prazo_implantacao", label: "Prazo Médio", auto: `${summary.prazoMedio} dias` },
                  { id: "novos_fornecedores", label: "Novos Fornecedores", auto: `${fornecedoresCount} fornecedores` },
                ].map((ind) => {
                  const data = editingEntry[ind.id] || { meta: "", realizado: "", obs: "" };
                  return (
                    <div key={ind.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">{ind.label}</Label>
                        <Badge variant="outline" className="text-[10px]">Auto: {ind.auto}</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input placeholder="Meta..." value={data.meta}
                          onChange={(e) => setEditingEntry((prev) => ({ ...prev, [ind.id]: { ...prev[ind.id] || { meta: "", realizado: "", obs: "" }, meta: e.target.value } }))} />
                        <Input placeholder="Realizado (override)..." value={data.realizado}
                          onChange={(e) => setEditingEntry((prev) => ({ ...prev, [ind.id]: { ...prev[ind.id] || { meta: "", realizado: "", obs: "" }, realizado: e.target.value } }))} />
                        <Input placeholder="Observações..." value={data.obs}
                          onChange={(e) => setEditingEntry((prev) => ({ ...prev, [ind.id]: { ...prev[ind.id] || { meta: "", realizado: "", obs: "" }, obs: e.target.value } }))} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1.5" onClick={() => saveEntry(ind.id)}>
                          <Save className="h-3.5 w-3.5" /> Salvar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5"
                          onClick={() => startFiveWhys(ind.id, ind.label, data.meta || ind.auto, data.realizado || ind.auto)}>
                          <MessageCircle className="h-3.5 w-3.5" /> 5 Porquês
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PLANOS DE AÇÃO TAB */}
          <TabsContent value="planos" className="space-y-4">
            {plans.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p>Nenhum plano de ação criado para este mês.</p>
                  <p className="text-xs mt-1">Use os 5 Porquês em cada loja ou indicador para gerar planos.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Indicador/Loja</TableHead>
                          <TableHead>Causa Raiz</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Como</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Prazo</TableHead>
                          <TableHead className="text-center">Farol</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell className="text-xs font-medium">{plan.indicador}</TableCell>
                            <TableCell className="text-xs max-w-[150px]">{plan.causa}</TableCell>
                            <TableCell className="text-xs max-w-[150px]">{plan.acao}</TableCell>
                            <TableCell className="text-xs max-w-[150px]">{plan.como}</TableCell>
                            <TableCell className="text-xs">{plan.responsavel}</TableCell>
                            <TableCell className="text-xs">{plan.prazo_final}</TableCell>
                            <TableCell className="text-center">
                              <Select value={plan.farol} onValueChange={(v) => updatePlanFarol(plan.id, v)}>
                                <SelectTrigger className="h-7 w-[90px] mx-auto">
                                  <Badge className={`${farolColors[plan.farol]} text-[10px]`}>{plan.farol}</Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="verde">Verde</SelectItem>
                                  <SelectItem value="amarelo">Amarelo</SelectItem>
                                  <SelectItem value="vermelho">Vermelho</SelectItem>
                                </SelectContent>
                              </Select>
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
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* 5 WHYS CHAT DIALOG */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-primary" />
              5 Porquês — {chatIndicador}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Explique o que causou o resultado. Vamos aprofundar até a causa raiz.</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1"
                      dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t px-6 py-4 space-y-3">
            {hasRootCause && (
              <Button className="w-full gap-2" onClick={generatePlansFromChat} disabled={generatingPlans}>
                {generatingPlans ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Gerar Planos de Ação a partir da Causa Raiz
              </Button>
            )}
            <div className="flex gap-2">
              <Textarea value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                placeholder="Explique o que você acha que causou..."
                className="min-h-[44px] max-h-[100px] resize-none" rows={1} />
              <Button size="icon" onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AGM;
