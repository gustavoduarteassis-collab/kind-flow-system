import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { pipelineImportData } from "@/data/pipelineImportData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Plus, Trash2, LogOut, CheckCircle2, Clock, AlertCircle,
  ArrowRightCircle, Search, Pencil, AlertTriangle, CalendarIcon, PartyPopper, Undo2, Hammer, Eye,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type PipelineStore = {
  id: string;
  filial: string;
  local: string;
  cidade: string;
  estado: string;
  padrao: string;
  localizacao: string;
  franqueado: string;
  contato_franqueado: string;
  email_franqueado: string;
  previsao_inauguracao: string;
  data_inauguracao: string;
  inicio_obra: string;
  status_geral: string;
  cd_origem: string;
  analista_obra: string;
  projeto_arquitetonico: string;
  projeto_eletrico: string;
  projeto_incendio: string;
  projeto_estrutural: string;
  projeto_ar_condicionado: string;
  orcamento_obra: string;
  contratos: string;
  prazo_projeto_arquitetonico: string;
  prazo_projeto_eletrico: string;
  prazo_projeto_incendio: string;
  prazo_projeto_estrutural: string;
  prazo_projeto_ar_condicionado: string;
  prazo_orcamento_obra: string;
  prazo_contratos: string;
  data_liberacao_orcamento: string;
  prazo_conclusao_orcamento: string;
  inicio_projeto_arquitetonico: string;
  inicio_projeto_eletrico: string;
  inicio_projeto_incendio: string;
  inicio_projeto_estrutural: string;
  inicio_projeto_ar_condicionado: string;
  inicio_orcamento_obra: string;
  inicio_contratos: string;
  observacoes: string;
  transferido: boolean;
};

const PHASES = [
  { key: "projeto_arquitetonico", label: "Proj. Arquitetônico", deadlineKey: "prazo_projeto_arquitetonico", startKey: "inicio_projeto_arquitetonico" },
  { key: "projeto_eletrico", label: "Proj. Elétrico", deadlineKey: "prazo_projeto_eletrico", startKey: "inicio_projeto_eletrico" },
  { key: "projeto_incendio", label: "Proj. Incêndio", deadlineKey: "prazo_projeto_incendio", startKey: "inicio_projeto_incendio" },
  { key: "projeto_estrutural", label: "Proj. Estrutural", deadlineKey: "prazo_projeto_estrutural", startKey: "inicio_projeto_estrutural" },
  { key: "projeto_ar_condicionado", label: "Proj. Ar Condicionado", deadlineKey: "prazo_projeto_ar_condicionado", startKey: "inicio_projeto_ar_condicionado" },
  { key: "orcamento_obra", label: "Orçamento de Obra", deadlineKey: "prazo_orcamento_obra", startKey: "inicio_orcamento_obra" },
  { key: "contratos", label: "Contratos", deadlineKey: "prazo_contratos", startKey: "inicio_contratos" },
] as const;

const PHASE_STATUSES = [
  { value: "pendente", label: "Pendente", color: "bg-muted text-muted-foreground", icon: Clock },
  { value: "em_andamento", label: "Em Andamento", color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  { value: "aprovado", label: "Aprovado", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  { value: "nao_se_aplica", label: "Não se Aplica", color: "bg-slate-100 text-slate-500", icon: Clock },
];

const getPhaseColor = (status: string) => PHASE_STATUSES.find((s) => s.value === status)?.color || "bg-muted text-muted-foreground";
const getPhaseLabel = (status: string) => PHASE_STATUSES.find((s) => s.value === status)?.label || "Pendente";

const parseDate = (dateStr: string) => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return null;
};

const parseDateForSort = (dateStr: string) => parseDate(dateStr) || new Date("2099-12-31");

const isOverdue = (deadlineStr: string, status: string) => {
  if (status === "aprovado" || status === "nao_se_aplica" || !deadlineStr) return false;
  const deadline = parseDate(deadlineStr);
  if (!deadline) return false;
  return new Date() > deadline;
};

// Convert dd/mm/aa string to Date
const ddmmToDate = (s: string): Date | undefined => {
  if (!s) return undefined;
  const d = parseDate(s);
  return d || undefined;
};

// Convert Date to dd/mm/aa string
const dateToDdmm = (d: Date | undefined): string => {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

// Reusable date picker for deadlines
const DeadlinePicker = ({ value, onChange, className, compact }: { value: string; onChange: (v: string) => void; className?: string; compact?: boolean }) => {
  const dateVal = ddmmToDate(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn(
          "justify-start text-left font-normal",
          compact ? "h-6 text-[10px] px-1 gap-1" : "h-8 text-xs gap-1",
          !value && "text-muted-foreground",
          className
        )}>
          <CalendarIcon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {value || (compact ? "Prazo" : "dd/mm/aa")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateVal}
          onSelect={(d) => onChange(dateToDdmm(d))}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};

const emptyForm = {
  filial: "", local: "", cidade: "", estado: "", padrao: "Tradicional",
  localizacao: "Shopping", franqueado: "", contato_franqueado: "",
  email_franqueado: "", previsao_inauguracao: "", cd_origem: "",
  status_geral: "", observacoes: "", inicio_obra: "", analista_obra: "",
};

const Pipeline = () => {
  const { user, signOut } = useAuth();
  const { addStore } = useStores();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stores, setStores] = useState<PipelineStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<PipelineStore | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });

  const fetchStores = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pipeline_stores")
      .select("*")
      .eq("transferido", false)
      .order("previsao_inauguracao", { ascending: true });
    if (data) setStores(data as PipelineStore[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const addPipelineStore = async () => {
    if (!user || !form.local) return;
    const { error } = await supabase.from("pipeline_stores").insert({
      user_id: user.id, ...form,
    } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Loja adicionada ao funil!" });
    setForm({ ...emptyForm });
    setAddOpen(false);
    fetchStores();
  };

  const updatePhase = async (id: string, phase: string, value: string) => {
    const { error } = await supabase.from("pipeline_stores").update({ [phase]: value } as any).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar fase", description: error.message, variant: "destructive" }); return; }
    setStores((prev) => prev.map((s) => s.id === id ? { ...s, [phase]: value } : s));
  };

  const updateDeadline = async (id: string, deadlineKey: string, value: string) => {
    const { error } = await supabase.from("pipeline_stores").update({ [deadlineKey]: value } as any).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar prazo", description: error.message, variant: "destructive" }); return; }
    setStores((prev) => prev.map((s) => s.id === id ? { ...s, [deadlineKey]: value } : s));
  };

  const openEdit = (store: PipelineStore) => {
    setEditingStore(store);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingStore) return;
    const { id, transferido, ...rest } = editingStore;
    await supabase.from("pipeline_stores").update(rest as any).eq("id", id);
    setStores((prev) => prev.map((s) => s.id === id ? editingStore : s));
    toast({ title: "Loja atualizada!" });
    setEditOpen(false);
    setEditingStore(null);
  };

  const deleteStore = async (id: string) => {
    await supabase.from("pipeline_stores").delete().eq("id", id);
    setStores((prev) => prev.filter((s) => s.id !== id));
  };

  const markInaugurada = async (store: PipelineStore) => {
    const dateStr = format(new Date(), "dd/MM/yyyy");
    const prefix = `Inaugurada em ${dateStr}`;
    const prev = (store.status_geral || "").trim();
    // Preserva histórico anterior abaixo do marcador
    const newStatus = prev
      ? `${prefix}\n---\n${prev}`
      : prefix;
    const { error } = await supabase.from("pipeline_stores").update({ status_geral: newStatus } as any).eq("id", store.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setStores((p) => p.map((s) => s.id === store.id ? { ...s, status_geral: newStatus } : s));
    toast({ title: "Loja marcada como Inaugurada 🎉", description: "Histórico preservado." });
  };

  const revertInaugurada = async (store: PipelineStore) => {
    const cur = store.status_geral || "";
    // Remove o primeiro bloco "Inaugurada em ...\n---\n" (ou só a linha)
    const newStatus = cur.replace(/^Inaugurada em \d{2}\/\d{2}\/\d{4}(\n---\n)?/, "").trim();
    const { error } = await supabase.from("pipeline_stores").update({ status_geral: newStatus } as any).eq("id", store.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setStores((p) => p.map((s) => s.id === store.id ? { ...s, status_geral: newStatus } : s));
    toast({ title: "Status de inauguração revertido" });
  };

  const toggleReforma = async (store: PipelineStore) => {
    const next = !((store as any).reforma === true);
    const { error } = await supabase.from("pipeline_stores").update({ reforma: next } as any).eq("id", store.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setStores((p) => p.map((s) => s.id === store.id ? { ...s, reforma: next } as any : s));
    toast({ title: next ? "Marcada como Reforma 🔨" : "Reforma desmarcada" });
  };

  const getProgress = (store: PipelineStore) => {
    const done = PHASES.filter((p) => {
      const s = (store as any)[p.key];
      return s === "aprovado" || s === "nao_se_aplica";
    }).length;
    return Math.round((done / PHASES.length) * 100);
  };

  const isReadyToTransfer = (store: PipelineStore) => {
    return PHASES.every((p) => {
      const s = (store as any)[p.key];
      return s === "aprovado" || s === "nao_se_aplica";
    });
  };

  const transferToLojas = async (pipelineStore: PipelineStore) => {
    if (!user) return;
    const newStoreId = await addStore({
      nome: pipelineStore.local,
      filial: pipelineStore.filial,
      franqueado: pipelineStore.franqueado,
      construtor: "",
      analistaObra: pipelineStore.analista_obra || "",
      inauguracao: pipelineStore.previsao_inauguracao,
      tipoLoja: "",
      inauguracaoChecklist: { rounds: [] },
    });
    if (newStoreId) {
      // Auto-create franchisee access if email provided
      if (pipelineStore.email_franqueado) {
        await supabase.from("franchisee_access").insert({
          store_id: newStoreId,
          franchisee_email: pipelineStore.email_franqueado,
          created_by: user.id,
          access_type: "franqueado",
          can_view_checklist: true,
          can_edit_checklist: false,
          can_view_cronograma: true,
          can_edit_cronograma: false,
          can_view_diario: true,
          can_edit_diario: false,
          can_view_custos: true,
          can_edit_custos: false,
        } as any);
      }

      await supabase.from("pipeline_stores").update({ transferido: true } as any).eq("id", pipelineStore.id);
      toast({
        title: "Loja transferida!",
        description: `${pipelineStore.local} foi movida para Lojas.${pipelineStore.email_franqueado ? ` Acesso liberado para ${pipelineStore.email_franqueado}.` : ""}`,
      });
      fetchStores();
    }
  };

  const importFromSpreadsheet = async () => {
    if (!user) return;
    if (!confirm(`Importar ${pipelineImportData.length} lojas da planilha?`)) return;
    for (const item of pipelineImportData) {
      const { data: existing } = await supabase
        .from("pipeline_stores")
        .select("id")
        .eq("local", item.local)
        .limit(1);
      if (existing && existing.length > 0) continue;
      await supabase.from("pipeline_stores").insert({
        user_id: user.id, ...item,
      } as any);
    }
    toast({ title: "Importação concluída!", description: `Lojas importadas (duplicatas ignoradas).` });
    fetchStores();
  };

  const removeDuplicates = async () => {
    if (!user) return;
    if (!confirm("Remover lojas duplicadas?")) return;
    const seen = new Map<string, string>();
    const toDelete: string[] = [];
    for (const store of stores) {
      const key = store.local.toLowerCase().trim();
      if (seen.has(key)) toDelete.push(store.id);
      else seen.set(key, store.id);
    }
    if (toDelete.length === 0) { toast({ title: "Nenhuma duplicata encontrada." }); return; }
    for (const id of toDelete) await supabase.from("pipeline_stores").delete().eq("id", id);
    toast({ title: `${toDelete.length} duplicata(s) removida(s)!` });
    fetchStores();
  };

  const sorted = [...stores].sort((a, b) => parseDateForSort(a.previsao_inauguracao).getTime() - parseDateForSort(b.previsao_inauguracao).getTime());

  const matchesSearch = (s: PipelineStore) =>
    s.local.toLowerCase().includes(search.toLowerCase()) ||
    s.filial.toLowerCase().includes(search.toLowerCase()) ||
    s.franqueado.toLowerCase().includes(search.toLowerCase()) ||
    s.cidade.toLowerCase().includes(search.toLowerCase());

  const isInaugurada = (s: PipelineStore) => (s.status_geral || "").toLowerCase().startsWith("inaugurada");
  const isReforma = (s: PipelineStore) => (s as any).reforma === true && !isInaugurada(s);
  const isNova = (s: PipelineStore) => !isInaugurada(s) && !isReforma(s);

  const filteredNovas = sorted.filter((s) => isNova(s) && matchesSearch(s));
  const filteredReformas = sorted.filter((s) => isReforma(s) && matchesSearch(s));
  const filteredInauguradas = sorted.filter((s) => isInaugurada(s) && matchesSearch(s));

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  const StoreFormFields = ({ data, onChange }: { data: any; onChange: (d: any) => void }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Filial</Label>
          <Input value={data.filial} onChange={(e) => onChange({ ...data, filial: e.target.value })} />
        </div>
        <div className="space-y-1"><Label className="text-xs">Local / Nome *</Label>
          <Input value={data.local} onChange={(e) => onChange({ ...data, local: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Cidade</Label>
          <Input value={data.cidade} onChange={(e) => onChange({ ...data, cidade: e.target.value })} />
        </div>
        <div className="space-y-1"><Label className="text-xs">Estado</Label>
          <Input value={data.estado} onChange={(e) => onChange({ ...data, estado: e.target.value })} maxLength={2} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Padrão</Label>
          <Select value={data.padrao} onValueChange={(v) => onChange({ ...data, padrao: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Tradicional">Tradicional</SelectItem>
              <SelectItem value="Light">Light</SelectItem>
              <SelectItem value="Outlet">Outlet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Localização</Label>
          <Select value={data.localizacao} onValueChange={(v) => onChange({ ...data, localizacao: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Shopping">Shopping</SelectItem>
              <SelectItem value="Rua">Rua</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Franqueado</Label>
          <Input value={data.franqueado} onChange={(e) => onChange({ ...data, franqueado: e.target.value })} />
        </div>
        <div className="space-y-1"><Label className="text-xs font-semibold text-primary">E-mail do Franqueado *</Label>
          <Input type="email" value={data.email_franqueado} onChange={(e) => onChange({ ...data, email_franqueado: e.target.value })} placeholder="email@franqueado.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Contato</Label>
          <Input value={data.contato_franqueado} onChange={(e) => onChange({ ...data, contato_franqueado: e.target.value })} />
        </div>
        <div className="space-y-1"><Label className="text-xs font-semibold text-primary">Analista Responsável *</Label>
          <Input value={data.analista_obra || ""} onChange={(e) => onChange({ ...data, analista_obra: e.target.value })} placeholder="Nome da analista" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Previsão Inauguração</Label>
          <Input value={data.previsao_inauguracao} onChange={(e) => onChange({ ...data, previsao_inauguracao: e.target.value })} placeholder="dd/mm/aa" />
        </div>
        <div className="space-y-1"><Label className="text-xs">CD de Origem</Label>
          <Input value={data.cd_origem} onChange={(e) => onChange({ ...data, cd_origem: e.target.value })} />
        </div>
        <div className="space-y-1"><Label className="text-xs">Início Obra</Label>
          <Input value={data.inicio_obra} onChange={(e) => onChange({ ...data, inicio_obra: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Status Geral</Label>
        <Textarea value={data.status_geral} onChange={(e) => onChange({ ...data, status_geral: e.target.value })} rows={2} />
      </div>
      <div className="space-y-1"><Label className="text-xs">Observações</Label>
        <Textarea value={data.observacoes || ""} onChange={(e) => onChange({ ...data, observacoes: e.target.value })} rows={2} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Funil de Lojas</h1>
                <p className="text-sm text-muted-foreground">{stores.length} lojas em aprovação</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar loja..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/funil-importar")}>
              <Plus className="h-4 w-4" /> Importar Funil (.xlsx)
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={removeDuplicates}>
              <Trash2 className="h-4 w-4" /> Remover Duplicatas
            </Button>
            {stores.length === 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={importFromSpreadsheet}>
                Importar Planilha
              </Button>
            )}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova Loja</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader><DialogTitle>Adicionar Loja ao Funil</DialogTitle></DialogHeader>
                <StoreFormFields data={form} onChange={setForm} />
                <Button onClick={addPipelineStore} className="w-full mt-2">Adicionar ao Funil</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stores.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Prontas</p>
            <p className="text-2xl font-bold text-emerald-600">{stores.filter(isReadyToTransfer).length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Em Andamento</p>
            <p className="text-2xl font-bold text-amber-600">
              {stores.filter((s) => !isReadyToTransfer(s) && PHASES.some((p) => (s as any)[p.key] === "em_andamento")).length}
            </p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Atrasados</p>
            <p className="text-2xl font-bold text-destructive">
              {stores.filter((s) => PHASES.some((p) => isOverdue((s as any)[p.deadlineKey], (s as any)[p.key]))).length}
            </p>
          </CardContent></Card>
        </div>

        {(() => {
          const renderList = (list: PipelineStore[], emptyLabel: string) => (
            list.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">{emptyLabel}</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {list.map((store) => {
                  const progress = getProgress(store);
                  const ready = isReadyToTransfer(store);
                  const hasOverdue = PHASES.some((p) => isOverdue((store as any)[p.deadlineKey], (store as any)[p.key]));
                  const inaug = isInaugurada(store);
                  const reform = isReforma(store);
                  return (
                    <Card key={store.id} className={inaug ? "border-emerald-300 bg-emerald-50/30" : ready ? "border-emerald-300 bg-emerald-50/50" : hasOverdue ? "border-destructive/50" : ""}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {store.filial && <Badge variant="outline" className="font-mono text-xs">{store.filial}</Badge>}
                              <h3 className="font-semibold text-sm">{store.local}</h3>
                              {inaug && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] h-5">Inaugurada</Badge>}
                              {reform && <Badge className="bg-amber-600 hover:bg-amber-600 text-[10px] h-5">Reforma</Badge>}
                              {hasOverdue && !inaug && <Badge variant="destructive" className="text-[10px] h-5 gap-1"><AlertTriangle className="h-3 w-3" /> Atrasado</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>{store.cidade}{store.estado ? `/${store.estado}` : ""}</span>
                              {store.franqueado && <span>👤 {store.franqueado}</span>}
                              {store.email_franqueado && <span>✉️ {store.email_franqueado}</span>}
                              {store.analista_obra && <span>📋 {store.analista_obra}</span>}
                              {store.previsao_inauguracao && <span>📅 {store.previsao_inauguracao}</span>}
                              {store.padrao && <Badge variant="secondary" className="text-[10px] h-5">{store.padrao}</Badge>}
                            </div>
                            {store.status_geral && (
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{store.status_geral}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex items-center gap-1 mr-2">
                              <Progress value={progress} className="h-2 w-16" />
                              <span className="text-xs font-bold">{progress}%</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(store)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {ready && !inaug && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Transferir para Lojas"
                                onClick={() => { if (confirm(`Transferir "${store.local}" para Lojas?`)) transferToLojas(store); }}>
                                <ArrowRightCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {!inaug ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Marcar como Inaugurada"
                                onClick={() => { if (confirm(`Marcar "${store.local}" como Inaugurada? O histórico atual será preservado.`)) markInaugurada(store); }}>
                                <PartyPopper className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" title="Reverter inauguração"
                                onClick={() => { if (confirm(`Reverter status de inauguração de "${store.local}"?`)) revertInaugurada(store); }}>
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!inaug && (
                              <Button variant="ghost" size="icon" className={`h-8 w-8 ${reform ? "text-amber-700" : "text-amber-600"}`}
                                title={reform ? "Desmarcar Reforma" : "Marcar como Reforma"}
                                onClick={() => toggleReforma(store)}>
                                <Hammer className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Excluir?")) deleteStore(store.id); }}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {!inaug && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                            {PHASES.map((p) => {
                              const status = (store as any)[p.key];
                              const deadline = (store as any)[p.deadlineKey] || "";
                              const overdue = isOverdue(deadline, status);
                              return (
                                <div key={p.key} className={`space-y-1 p-2 rounded-md border ${overdue ? "border-destructive/50 bg-destructive/5" : "border-border/50"}`}>
                                  <p className="text-[10px] font-medium text-muted-foreground truncate">{p.label}</p>
                                  <Select value={status} onValueChange={(v) => updatePhase(store.id, p.key, v)}>
                                    <SelectTrigger className="h-7 text-[10px] px-2">
                                      <Badge className={`${getPhaseColor(status)} text-[9px] px-1.5`}>
                                        {getPhaseLabel(status)}
                                      </Badge>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PHASE_STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                          <Badge className={`${s.color} text-[10px]`}>{s.label}</Badge>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div>
                                    <p className="text-[9px] text-muted-foreground">Início</p>
                                    <DeadlinePicker compact value={(store as any)[p.startKey] || ""} onChange={(v) => updateDeadline(store.id, p.startKey, v)} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-muted-foreground">Prazo</p>
                                    <DeadlinePicker compact value={deadline} onChange={(v) => updateDeadline(store.id, p.deadlineKey, v)} />
                                  </div>
                                  {overdue && (
                                    <div className="flex items-center gap-1 text-destructive">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span className="text-[9px] font-semibold">ATRASADO</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          );

          return (
            <Tabs defaultValue="novas">
              <TabsList>
                <TabsTrigger value="novas">Novas Lojas ({filteredNovas.length})</TabsTrigger>
                <TabsTrigger value="reformas">Reformas ({filteredReformas.length})</TabsTrigger>
                <TabsTrigger value="inauguradas">Inauguradas ({filteredInauguradas.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="novas" className="mt-4">{renderList(filteredNovas, "Nenhuma loja nova no funil.")}</TabsContent>
              <TabsContent value="reformas" className="mt-4">{renderList(filteredReformas, "Nenhuma reforma cadastrada.")}</TabsContent>
              <TabsContent value="inauguradas" className="mt-4">{renderList(filteredInauguradas, "Nenhuma loja inaugurada.")}</TabsContent>
            </Tabs>
          );
        })()}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingStore(null); }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>Editar Loja</DialogTitle></DialogHeader>
            {editingStore && (
              <>
                <StoreFormFields data={editingStore} onChange={setEditingStore} />
                <div className="pt-3 border-t space-y-3">
                  <p className="text-sm font-semibold">Fases de Aprovação</p>
                  <div className="grid grid-cols-1 gap-3">
                    {PHASES.map((p) => {
                      const status = (editingStore as any)[p.key];
                      const deadline = (editingStore as any)[p.deadlineKey] || "";
                      const overdue = isOverdue(deadline, status);
                      return (
                        <div key={p.key} className={`flex items-center gap-3 p-2 rounded-md ${overdue ? "bg-destructive/5 border border-destructive/30" : ""}`}>
                          <Label className="text-xs flex-1 min-w-0">
                            {p.label}
                            {overdue && <span className="text-destructive text-[10px] ml-1">ATRASADO</span>}
                          </Label>
                          <DeadlinePicker
                            value={deadline}
                            onChange={(v) => setEditingStore({ ...editingStore, [p.deadlineKey]: v })}
                            className="w-28"
                          />
                          <Select value={status} onValueChange={(v) => setEditingStore({ ...editingStore, [p.key]: v })}>
                            <SelectTrigger className="w-36 h-8">
                              <Badge className={`${getPhaseColor(status)} text-[10px]`}>
                                {getPhaseLabel(status)}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {PHASE_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  <Badge className={`${s.color} text-[10px]`}>{s.label}</Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Button onClick={saveEdit} className="w-full mt-2">Salvar Alterações</Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Pipeline;
