import { useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { pipelineImportData } from "@/data/pipelineImportData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, CheckCircle2, Clock, AlertCircle,
  ArrowRightCircle, Search, Pencil, AlertTriangle, CalendarIcon, PartyPopper, Undo2, Hammer, Eye,
  LayoutList, Columns,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Checkbox } from "@/components/ui/checkbox";

type PipelineStore = {
  id: string;
  filial: string; local: string; cidade: string; estado: string;
  padrao: string; localizacao: string; franqueado: string;
  contato_franqueado: string; email_franqueado: string;
  previsao_inauguracao: string; data_inauguracao: string;
  inicio_obra: string; status_geral: string; cd_origem: string;
  analista_obra: string;
  projeto_arquitetonico: string; projeto_eletrico: string; projeto_incendio: string;
  projeto_estrutural: string; projeto_ar_condicionado: string;
  orcamento_obra: string; contratos: string;
  prazo_projeto_arquitetonico: string; prazo_projeto_eletrico: string;
  prazo_projeto_incendio: string; prazo_projeto_estrutural: string;
  prazo_projeto_ar_condicionado: string; prazo_orcamento_obra: string; prazo_contratos: string;
  data_liberacao_orcamento: string; prazo_conclusao_orcamento: string;
  inicio_projeto_arquitetonico: string; inicio_projeto_eletrico: string;
  inicio_projeto_incendio: string; inicio_projeto_estrutural: string;
  inicio_projeto_ar_condicionado: string; inicio_orcamento_obra: string; inicio_contratos: string;
  observacoes: string; transferido: boolean;
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
const parseDateForSort = (d: string) => parseDate(d) || new Date("2099-12-31");
const isOverdue = (deadline: string, status: string) => {
  if (status === "aprovado" || status === "nao_se_aplica" || !deadline) return false;
  const d = parseDate(deadline);
  return d ? new Date() > d : false;
};
const ddmmToDate = (s: string): Date | undefined => (s ? parseDate(s) || undefined : undefined);
const dateToDdmm = (d: Date | undefined): string => {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
};

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const getMonthKey = (s: string) => {
  const d = parseDate(s);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Format status_geral: highlight "DD/MM:" dates in bold, keep line breaks. */
function FormattedNotes({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed">
      {text.split("\n").map((line, i) => {
        const parts = line.split(/(\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:?)/g);
        return (
          <div key={i}>
            {parts.map((p, j) =>
              /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:?$/.test(p)
                ? <strong key={j} className="text-foreground font-semibold">{p}</strong>
                : <span key={j}>{p}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Tricolor progress: gray (0%) / amber (1-99%) / emerald (100%). */
function TriProgress({ value }: { value: number }) {
  const color = value === 0 ? "bg-slate-300" : value === 100 ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full transition-all", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

const DeadlinePicker = ({ value, onChange, className, compact }: { value: string; onChange: (v: string) => void; className?: string; compact?: boolean }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className={cn(
        "justify-start text-left font-normal",
        compact ? "h-6 text-[10px] px-1 gap-1" : "h-8 text-xs gap-1",
        !value && "text-muted-foreground", className
      )}>
        <CalendarIcon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {value || (compact ? "Prazo" : "dd/mm/aa")}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" selected={ddmmToDate(value)} onSelect={(d) => onChange(dateToDdmm(d))} initialFocus className="p-3 pointer-events-auto" />
    </PopoverContent>
  </Popover>
);

const emptyForm = {
  filial: "", local: "", cidade: "", estado: "", padrao: "Tradicional",
  localizacao: "Shopping", franqueado: "", contato_franqueado: "",
  email_franqueado: "", previsao_inauguracao: "", cd_origem: "",
  status_geral: "", observacoes: "", inicio_obra: "", analista_obra: "",
};

type StatusFilter = "todas" | "prontas" | "andamento" | "pendentes" | "atrasadas";

const Pipeline = () => {
  usePageTitle("Funil de Lojas");
  const { user } = useAuth();
  const { addStore } = useStores();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stores, setStores] = useState<PipelineStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<PipelineStore | null>(null);
  const [historyStore, setHistoryStore] = useState<PipelineStore | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });

  // Filters
  const [fAnalista, setFAnalista] = useState<string>("todos");
  const [fStatus, setFStatus] = useState<StatusFilter>("todas");
  const [fTipo, setFTipo] = useState<string>("todos");
  const [fMes, setFMes] = useState<string>("todos");
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [tab, setTab] = useState("novas");

  // Duplicates preview
  const [dupOpen, setDupOpen] = useState(false);
  const [dupPreview, setDupPreview] = useState<{ keep: PipelineStore; remove: PipelineStore[] }[]>([]);
  const [dupSelected, setDupSelected] = useState<Set<string>>(new Set());

  const fetchStores = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pipeline_stores").select("*").eq("transferido", false)
      .is("deleted_at", null)
      .order("previsao_inauguracao", { ascending: true });
    if (data) setStores(data as PipelineStore[]);
    setLoading(false);
  }, [user]);
  useEffect(() => { fetchStores(); }, [fetchStores]);

  const addPipelineStore = async () => {
    if (!user || !form.local) return;
    const { error } = await supabase.from("pipeline_stores").insert({ user_id: user.id, ...form } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Loja adicionada ao funil!" });
    setForm({ ...emptyForm }); setAddOpen(false); fetchStores();
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

  const openEdit = (store: PipelineStore) => { setEditingStore(store); setEditOpen(true); };
  const saveEdit = async () => {
    if (!editingStore) return;
    const { id, transferido, ...rest } = editingStore;
    await supabase.from("pipeline_stores").update(rest as any).eq("id", id);
    setStores((prev) => prev.map((s) => s.id === id ? editingStore : s));
    toast({ title: "Loja atualizada!" }); setEditOpen(false); setEditingStore(null);
  };
  const deleteStore = async (id: string) => {
    // Soft delete: registro fica recuperável via soft_restore.
    await supabase
      .from("pipeline_stores")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as any)
      .eq("id", id);
    setStores((prev) => prev.filter((s) => s.id !== id));
  };
  const markInaugurada = async (store: PipelineStore) => {
    const dateStr = format(new Date(), "dd/MM/yyyy");
    const prefix = `Inaugurada em ${dateStr}`;
    const prev = (store.status_geral || "").trim();
    const newStatus = prev ? `${prefix}\n---\n${prev}` : prefix;
    const { error } = await supabase.from("pipeline_stores").update({ status_geral: newStatus } as any).eq("id", store.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setStores((p) => p.map((s) => s.id === store.id ? { ...s, status_geral: newStatus } : s));
    toast({ title: "Loja marcada como Inaugurada 🎉" });
  };
  const revertInaugurada = async (store: PipelineStore) => {
    const cur = store.status_geral || "";
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
  const isReadyToTransfer = (s: PipelineStore) => PHASES.every((p) => {
    const v = (s as any)[p.key]; return v === "aprovado" || v === "nao_se_aplica";
  });
  const hasOverdueAny = (s: PipelineStore) => PHASES.some((p) => isOverdue((s as any)[p.deadlineKey], (s as any)[p.key]));
  const isAndamento = (s: PipelineStore) => !isReadyToTransfer(s) && PHASES.some((p) => (s as any)[p.key] === "em_andamento");

  const transferToLojas = async (pipelineStore: PipelineStore) => {
    if (!user) return;
    const newStoreId = await addStore({
      nome: pipelineStore.local, filial: pipelineStore.filial,
      franqueado: pipelineStore.franqueado, construtor: "",
      analistaObra: pipelineStore.analista_obra || "",
      inauguracao: pipelineStore.previsao_inauguracao, tipoLoja: "",
      inauguracaoChecklist: { rounds: [] } as any,
    } as any);
    if (newStoreId) {
      if (pipelineStore.email_franqueado) {
        await supabase.from("franchisee_access").insert({
          store_id: newStoreId, franchisee_email: pipelineStore.email_franqueado,
          created_by: user.id, access_type: "franqueado",
          can_view_checklist: true, can_edit_checklist: false,
          can_view_cronograma: true, can_edit_cronograma: false,
          can_view_diario: true, can_edit_diario: false,
          can_view_custos: true, can_edit_custos: false,
        } as any);
      }
      await supabase.from("pipeline_stores").update({ transferido: true } as any).eq("id", pipelineStore.id);
      toast({ title: "Loja transferida!", description: `${pipelineStore.local} foi movida para Lojas.` });
      fetchStores();
    }
  };

  const importFromSpreadsheet = async () => {
    if (!user) return;
    if (!confirm(`Importar ${pipelineImportData.length} lojas da planilha?`)) return;
    for (const item of pipelineImportData) {
      const { data: existing } = await supabase.from("pipeline_stores").select("id").eq("local", item.local).is("deleted_at", null).limit(1);
      if (existing && existing.length > 0) continue;
      await supabase.from("pipeline_stores").insert({ user_id: user.id, ...item } as any);
    }
    toast({ title: "Importação concluída!" });
    fetchStores();
  };

  // Duplicates preview
  const openDuplicatesPreview = () => {
    const groups = new Map<string, PipelineStore[]>();
    for (const s of stores) {
      const key = (s.local || "").toLowerCase().trim();
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    const dups: { keep: PipelineStore; remove: PipelineStore[] }[] = [];
    for (const list of groups.values()) {
      if (list.length > 1) dups.push({ keep: list[0], remove: list.slice(1) });
    }
    if (dups.length === 0) { toast({ title: "Nenhuma duplicata encontrada." }); return; }
    setDupPreview(dups); setDupSelected(new Set()); setDupOpen(true);
  };
  const confirmRemoveDuplicates = async () => {
    const ids = Array.from(dupSelected);
    if (ids.length === 0) { toast({ title: "Selecione ao menos uma loja para remover." }); return; }
    for (const id of ids) await supabase.from("pipeline_stores").update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as any).eq("id", id);
    toast({ title: `${ids.length} duplicata(s) removida(s)!` });
    setDupOpen(false); setDupPreview([]); setDupSelected(new Set()); fetchStores();
  };
  const toggleDupSelected = (id: string) =>
    setDupSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Computed filter lists
  const isInaugurada = (s: PipelineStore) => (s.status_geral || "").toLowerCase().startsWith("inaugurada");
  const isReforma = (s: PipelineStore) => (s as any).reforma === true && !isInaugurada(s);
  const isNova = (s: PipelineStore) => !isInaugurada(s) && !isReforma(s);
  const getStoreTimelineDate = (s: PipelineStore) => (isInaugurada(s) ? (s.data_inauguracao || s.previsao_inauguracao) : s.previsao_inauguracao);

  const analistas = useMemo(() => Array.from(new Set(stores.map((s) => s.analista_obra).filter(Boolean))).sort(), [stores]);
  const meses = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores) { const k = getMonthKey(getStoreTimelineDate(s)); if (k) set.add(k); }
    return Array.from(set).sort();
  }, [stores]);

  const matchesSearch = (s: PipelineStore) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return s.local?.toLowerCase().includes(q) || s.filial?.toLowerCase().includes(q)
      || s.franqueado?.toLowerCase().includes(q) || s.cidade?.toLowerCase().includes(q);
  };
  const matchesFilters = (s: PipelineStore) => {
    if (fAnalista !== "todos" && s.analista_obra !== fAnalista) return false;
    if (fTipo !== "todos" && s.padrao !== fTipo) return false;
    if (fMes !== "todos" && getMonthKey(getStoreTimelineDate(s)) !== fMes) return false;
    if (fStatus === "prontas" && !isReadyToTransfer(s)) return false;
    if (fStatus === "andamento" && !isAndamento(s)) return false;
    if (fStatus === "pendentes" && getProgress(s) !== 0) return false;
    if (fStatus === "atrasadas" && !hasOverdueAny(s)) return false;
    return true;
  };

  const sorted = [...stores].sort((a, b) => parseDateForSort(getStoreTimelineDate(a)).getTime() - parseDateForSort(getStoreTimelineDate(b)).getTime());
  const visible = sorted.filter((s) => matchesSearch(s) && matchesFilters(s));
  const filteredNovas = visible.filter(isNova);
  const filteredReformas = visible.filter(isReforma);
  const filteredInauguradas = visible.filter(isInaugurada);

  const summary = {
    total: stores.length,
    prontas: stores.filter(isReadyToTransfer).length,
    andamento: stores.filter(isAndamento).length,
    atrasadas: stores.filter(hasOverdueAny).length,
  };

  const StoreFormFields = ({ data, onChange }: { data: any; onChange: (d: any) => void }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Filial</Label><Input value={data.filial} onChange={(e) => onChange({ ...data, filial: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Local / Nome *</Label><Input value={data.local} onChange={(e) => onChange({ ...data, local: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Cidade</Label><Input value={data.cidade} onChange={(e) => onChange({ ...data, cidade: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Estado</Label><Input value={data.estado} onChange={(e) => onChange({ ...data, estado: e.target.value })} maxLength={2} /></div>
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
            <SelectContent><SelectItem value="Shopping">Shopping</SelectItem><SelectItem value="Rua">Rua</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Franqueado</Label><Input value={data.franqueado} onChange={(e) => onChange({ ...data, franqueado: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold text-primary">E-mail do Franqueado *</Label>
          <Input type="email" value={data.email_franqueado} onChange={(e) => onChange({ ...data, email_franqueado: e.target.value })} placeholder="email@franqueado.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Contato</Label><Input value={data.contato_franqueado} onChange={(e) => onChange({ ...data, contato_franqueado: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs font-semibold text-primary">Analista *</Label><Input value={data.analista_obra || ""} onChange={(e) => onChange({ ...data, analista_obra: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Previsão Inauguração</Label><Input value={data.previsao_inauguracao} onChange={(e) => onChange({ ...data, previsao_inauguracao: e.target.value })} placeholder="dd/mm/aa" /></div>
        <div className="space-y-1"><Label className="text-xs">CD de Origem</Label><Input value={data.cd_origem} onChange={(e) => onChange({ ...data, cd_origem: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Início Obra</Label><Input value={data.inicio_obra} onChange={(e) => onChange({ ...data, inicio_obra: e.target.value })} /></div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Status Geral</Label><Textarea value={data.status_geral} onChange={(e) => onChange({ ...data, status_geral: e.target.value })} rows={2} /></div>
      <div className="space-y-1"><Label className="text-xs">Observações</Label><Textarea value={data.observacoes || ""} onChange={(e) => onChange({ ...data, observacoes: e.target.value })} rows={2} /></div>
    </div>
  );

  const renderCard = (store: PipelineStore) => {
    const progress = getProgress(store);
    const ready = isReadyToTransfer(store);
    const overdueAny = hasOverdueAny(store);
    const inaug = isInaugurada(store);
    const reform = isReforma(store);
    return (
      <Card key={store.id} className={cn(
        inaug && "border-emerald-300 bg-emerald-50/30 cursor-pointer hover:bg-emerald-50/60 transition-colors",
        ready && !inaug && "border-emerald-300 bg-emerald-50/50",
        overdueAny && !inaug && !ready && "border-destructive/50"
      )}
        onClick={inaug ? (e) => { if ((e.target as HTMLElement).closest("button")) return; setHistoryStore(store); } : undefined}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {store.filial && <Badge variant="outline" className="font-mono text-xs">{store.filial}</Badge>}
                <h3 className="font-semibold text-sm">{store.local}</h3>
                {inaug && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] h-5">Inaugurada</Badge>}
                {reform && <Badge className="bg-amber-600 hover:bg-amber-600 text-[10px] h-5">Reforma</Badge>}
                {!inaug && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Badge variant="outline" className="text-[10px] h-5 gap-1 border-primary/40 text-primary bg-primary/5 cursor-pointer hover:bg-primary/10" title="Clique para alterar previsão">
                        <CalendarIcon className="h-3 w-3" /> Previsão: {store.previsao_inauguracao || "definir"}
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={ddmmToDate(store.previsao_inauguracao)} onSelect={(d) => updateDeadline(store.id, "previsao_inauguracao", dateToDdmm(d))} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                )}
                {overdueAny && !inaug && <Badge variant="destructive" className="text-[10px] h-5 gap-1"><AlertTriangle className="h-3 w-3" /> Atrasado</Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span>{store.cidade}{store.estado ? `/${store.estado}` : ""}</span>
                {store.franqueado && <span>👤 {store.franqueado}</span>}
                {store.email_franqueado && <span>✉️ {store.email_franqueado}</span>}
                {store.analista_obra && <span>📋 {store.analista_obra}</span>}
                {store.padrao && <Badge variant="secondary" className="text-[10px] h-5">{store.padrao}</Badge>}
              </div>
              {store.status_geral && (
                <div className="mt-2 max-h-24 overflow-y-auto pr-1">
                  <FormattedNotes text={store.status_geral} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex items-center gap-2 mr-2 w-28">
                <TriProgress value={progress} />
                <span className="text-xs font-bold w-8 text-right">{progress}%</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(store)} title="Editar loja"><Pencil className="h-4 w-4" /></Button>
              {ready && !inaug && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Ver detalhes / Transferir para Lojas"
                  onClick={() => { if (confirm(`Transferir "${store.local}" para Lojas?`)) transferToLojas(store); }}>
                  <ArrowRightCircle className="h-4 w-4" />
                </Button>
              )}
              {!inaug ? (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Marcar como inaugurada"
                  onClick={() => { if (confirm(`Marcar "${store.local}" como Inaugurada?`)) markInaugurada(store); }}>
                  <PartyPopper className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" title="Reverter inauguração"
                  onClick={() => { if (confirm("Reverter status?")) revertInaugurada(store); }}>
                  <Undo2 className="h-4 w-4" />
                </Button>
              )}
              {inaug && <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-700" title="Ver histórico" onClick={() => setHistoryStore(store)}><Eye className="h-4 w-4" /></Button>}
              {!inaug && (
                <Button variant="ghost" size="icon" className={cn("h-8 w-8", reform ? "text-amber-700" : "text-amber-600")}
                  title={reform ? "Desmarcar reforma (fixar)" : "Marcar como reforma / fixar"} onClick={() => toggleReforma(store)}>
                  <Hammer className="h-4 w-4" />
                </Button>
              )}
              <ConfirmDelete itemName={`a loja ${store.local}${store.filial ? ` (${store.filial})` : ""}`} onConfirm={() => deleteStore(store.id)}>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Excluir loja">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </ConfirmDelete>
            </div>
          </div>

          {!inaug && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {PHASES.map((p) => {
                const status = (store as any)[p.key];
                const deadline = (store as any)[p.deadlineKey] || "";
                const start = (store as any)[p.startKey] || "";
                const overdue = isOverdue(deadline, status);
                const missingDeadline = status === "em_andamento" && !deadline;
                return (
                  <div key={p.key} className={cn(
                    "space-y-1 p-2 rounded-md border relative",
                    overdue ? "border-destructive/50 bg-destructive/5" : missingDeadline ? "border-amber-400/60 bg-amber-50/40" : "border-border/50"
                  )}>
                    {(overdue || missingDeadline) && (
                      <AlertTriangle className={cn("absolute top-1 right-1 h-3 w-3", overdue ? "text-destructive" : "text-amber-600")} />
                    )}
                    <p className="text-[10px] font-medium text-muted-foreground truncate">{p.label}</p>
                    <Select value={status} onValueChange={(v) => updatePhase(store.id, p.key, v)}>
                      <SelectTrigger className="h-7 text-[10px] px-2">
                        <Badge className={`${getPhaseColor(status)} text-[9px] px-1.5`}>{getPhaseLabel(status)}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {PHASE_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}><Badge className={`${s.color} text-[10px]`}>{s.label}</Badge></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div><p className="text-[9px] text-muted-foreground">Início</p>
                      <DeadlinePicker compact value={start} onChange={(v) => updateDeadline(store.id, p.startKey, v)} />
                    </div>
                    <div><p className="text-[9px] text-muted-foreground">Prazo</p>
                      <DeadlinePicker compact value={deadline} onChange={(v) => updateDeadline(store.id, p.deadlineKey, v)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderList = (list: PipelineStore[], emptyLabel: string) =>
    list.length === 0
      ? <Card><CardContent className="py-12 text-center text-muted-foreground">{emptyLabel}</CardContent></Card>
      : <div className="space-y-4">{list.map(renderCard)}</div>;

  // Kanban
  const kanbanColumns = (list: PipelineStore[]) => {
    const cols: { key: string; label: string; color: string; items: PipelineStore[] }[] = [
      { key: "pendente", label: "Pendente", color: "border-slate-300", items: [] },
      { key: "em_andamento", label: "Em Andamento", color: "border-amber-400", items: [] },
      { key: "complementares", label: "Complementares", color: "border-blue-400", items: [] },
      { key: "contratado", label: "Contratado", color: "border-purple-400", items: [] },
      { key: "inaugurado", label: "Inaugurado", color: "border-emerald-500", items: [] },
    ];
    for (const s of list) {
      if (isInaugurada(s)) { cols[4].items.push(s); continue; }
      const contractStatus = (s as any).contratos;
      const arq = (s as any).projeto_arquitetonico;
      const complementaresOk = ["projeto_eletrico", "projeto_incendio", "projeto_estrutural", "projeto_ar_condicionado"]
        .every((k) => { const v = (s as any)[k]; return v === "aprovado" || v === "nao_se_aplica"; });
      if (contractStatus === "aprovado") cols[3].items.push(s);
      else if (complementaresOk && arq === "aprovado") cols[2].items.push(s);
      else if (isAndamento(s)) cols[1].items.push(s);
      else cols[0].items.push(s);
    }
    return cols;
  };

  const renderKanban = (list: PipelineStore[]) => {
    const cols = kanbanColumns(list);
    return (
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3 lg:grid-cols-5">
        {cols.map((c) => (
          <div key={c.key} className={cn("rounded-lg border-t-4 bg-muted/30 p-2 min-h-[200px]", c.color)}>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold uppercase tracking-wider">{c.label}</p>
              <Badge variant="secondary" className="text-[10px]">{c.items.length}</Badge>
            </div>
            <div className="space-y-2">
              {c.items.length === 0
                ? <p className="text-[10px] text-muted-foreground px-2 py-4 text-center">Sem lojas</p>
                : c.items.map((s) => {
                  const prog = getProgress(s);
                  return (
                    <div key={s.id} className="bg-card border rounded p-2 text-xs cursor-pointer hover:shadow" onClick={() => openEdit(s)}>
                      <div className="flex items-center gap-1 mb-1">
                        {s.filial && <Badge variant="outline" className="font-mono text-[9px] h-4">{s.filial}</Badge>}
                        {hasOverdueAny(s) && <AlertTriangle className="h-3 w-3 text-destructive" />}
                      </div>
                      <p className="font-medium truncate">{s.local}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.cidade}{s.estado ? `/${s.estado}` : ""}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TriProgress value={prog} />
                        <span className="text-[10px] font-semibold">{prog}%</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const FilterPill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
    <button onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted border-border"
      )}>
      {children}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funil de Lojas</h1>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className="text-muted-foreground">{summary.total} no funil</span>
            <span className="text-emerald-600">● {summary.prontas} Prontas</span>
            <span className="text-amber-600">● {summary.andamento} Em Andamento</span>
            <span className="text-destructive">● {summary.atrasadas} Atrasadas</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex border rounded-md p-0.5 bg-muted">
            <Button variant={view === "lista" ? "default" : "ghost"} size="sm" className="h-7 gap-1" onClick={() => setView("lista")}>
              <LayoutList className="h-3.5 w-3.5" /> Lista
            </Button>
            <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" className="h-7 gap-1" onClick={() => setView("kanban")}>
              <Columns className="h-3.5 w-3.5" /> Kanban
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/funil-importar")}>
            <Plus className="h-4 w-4" /> Importar (.xlsx)
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={openDuplicatesPreview}>
            <Trash2 className="h-4 w-4" /> Duplicatas
          </Button>
          {stores.length === 0 && <Button variant="outline" size="sm" onClick={importFromSpreadsheet}>Importar Planilha</Button>}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova Loja</Button></DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader><DialogTitle>Adicionar Loja ao Funil</DialogTitle></DialogHeader>
              <StoreFormFields data={form} onChange={setForm} />
              <Button onClick={addPipelineStore} className="w-full mt-2">Adicionar</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar loja, cidade, franqueado..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground mr-1">Status:</span>
          {([
            ["todas", `Todas (${stores.length})`],
            ["prontas", `Prontas (${summary.prontas})`],
            ["andamento", `Em Andamento (${summary.andamento})`],
            ["pendentes", `Pendentes (${stores.filter((s) => getProgress(s) === 0).length})`],
            ["atrasadas", `Atrasadas (${summary.atrasadas})`],
          ] as [StatusFilter, string][]).map(([k, label]) => (
            <FilterPill key={k} active={fStatus === k} onClick={() => setFStatus(k)}>{label}</FilterPill>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground mr-1">Tipo:</span>
          {(["todos", "Tradicional", "Light", "Outlet"] as const).map((t) => {
            const n = t === "todos" ? stores.length : stores.filter((s) => s.padrao === t).length;
            return <FilterPill key={t} active={fTipo === t} onClick={() => setFTipo(t)}>{t === "todos" ? "Todos" : t} ({n})</FilterPill>;
          })}
        </div>

        {analistas.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground mr-1">Analista:</span>
            <FilterPill active={fAnalista === "todos"} onClick={() => setFAnalista("todos")}>Todos ({stores.length})</FilterPill>
            {analistas.map((a) => {
              const n = stores.filter((s) => s.analista_obra === a).length;
              return <FilterPill key={a} active={fAnalista === a} onClick={() => setFAnalista(a)}>{a} ({n})</FilterPill>;
            })}
          </div>
        )}

        {meses.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground mr-1">Mês Inauguração:</span>
            <FilterPill active={fMes === "todos"} onClick={() => setFMes("todos")}>Todos</FilterPill>
            {meses.map((m) => {
              const [y, mo] = m.split("-");
              const label = `${MONTH_LABELS[parseInt(mo) - 1]}/${y.slice(-2)}`;
              const n = stores.filter((s) => getMonthKey(s.previsao_inauguracao) === m).length;
              return <FilterPill key={m} active={fMes === m} onClick={() => setFMes(m)}>{label} ({n})</FilterPill>;
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="novas">Novas Lojas ({filteredNovas.length})</TabsTrigger>
            <TabsTrigger value="reformas">Reformas ({filteredReformas.length})</TabsTrigger>
            <TabsTrigger value="inauguradas">Inauguradas ({filteredInauguradas.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="novas" className="mt-4">{view === "lista" ? renderList(filteredNovas, "Nenhuma loja nova encontrada.") : renderKanban(filteredNovas)}</TabsContent>
          <TabsContent value="reformas" className="mt-4">{view === "lista" ? renderList(filteredReformas, "Nenhuma reforma encontrada.") : renderKanban(filteredReformas)}</TabsContent>
          <TabsContent value="inauguradas" className="mt-4">{view === "lista" ? renderList(filteredInauguradas, "Nenhuma loja inaugurada.") : renderKanban(filteredInauguradas)}</TabsContent>
        </Tabs>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingStore(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Loja</DialogTitle></DialogHeader>
          {editingStore && (
            <>
              <StoreFormFields data={editingStore} onChange={setEditingStore} />
              <div className="pt-3 border-t space-y-3">
                <p className="text-sm font-semibold">Fases de Aprovação</p>
                {PHASES.map((p) => {
                  const status = (editingStore as any)[p.key];
                  const deadline = (editingStore as any)[p.deadlineKey] || "";
                  const overdue = isOverdue(deadline, status);
                  return (
                    <div key={p.key} className={cn("flex items-center gap-3 p-2 rounded-md", overdue && "bg-destructive/5 border border-destructive/30")}>
                      <Label className="text-xs flex-1 min-w-0">{p.label}{overdue && <span className="text-destructive text-[10px] ml-1">ATRASADO</span>}</Label>
                      <DeadlinePicker value={deadline} onChange={(v) => setEditingStore({ ...editingStore, [p.deadlineKey]: v })} className="w-28" />
                      <Select value={status} onValueChange={(v) => setEditingStore({ ...editingStore, [p.key]: v })}>
                        <SelectTrigger className="w-36 h-8"><Badge className={`${getPhaseColor(status)} text-[10px]`}>{getPhaseLabel(status)}</Badge></SelectTrigger>
                        <SelectContent>{PHASE_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}><Badge className={`${s.color} text-[10px]`}>{s.label}</Badge></SelectItem>
                        ))}</SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              <Button onClick={saveEdit} className="w-full mt-2">Salvar</Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyStore} onOpenChange={(open) => { if (!open) setHistoryStore(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PartyPopper className="h-5 w-5 text-emerald-600" /> Histórico — {historyStore?.local}</DialogTitle></DialogHeader>
          {historyStore && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-md border bg-muted/30">
                {historyStore.filial && <div><p className="text-[10px] text-muted-foreground uppercase">Filial</p><p className="font-medium">{historyStore.filial}</p></div>}
                <div><p className="text-[10px] text-muted-foreground uppercase">Local</p><p className="font-medium">{historyStore.local}</p></div>
                {historyStore.cidade && <div><p className="text-[10px] text-muted-foreground uppercase">Cidade/UF</p><p className="font-medium">{historyStore.cidade}{historyStore.estado ? `/${historyStore.estado}` : ""}</p></div>}
                {historyStore.franqueado && <div><p className="text-[10px] text-muted-foreground uppercase">Franqueado</p><p className="font-medium">{historyStore.franqueado}</p></div>}
                {historyStore.email_franqueado && <div><p className="text-[10px] text-muted-foreground uppercase">E-mail</p><p className="font-medium break-all">{historyStore.email_franqueado}</p></div>}
                {historyStore.analista_obra && <div><p className="text-[10px] text-muted-foreground uppercase">Analista</p><p className="font-medium">{historyStore.analista_obra}</p></div>}
              </div>
              {historyStore.status_geral && (
                <div><h4 className="font-semibold mb-2">Status / Histórico</h4>
                  <div className="p-3 rounded-md border bg-muted/30"><FormattedNotes text={historyStore.status_geral} /></div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { const s = historyStore; setHistoryStore(null); openEdit(s); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button onClick={() => setHistoryStore(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicates Preview Dialog */}
      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Duplicatas Detectadas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Encontradas <strong>{dupPreview.reduce((acc, d) => acc + d.remove.length, 0)}</strong> duplicata(s) em <strong>{dupPreview.length}</strong> grupo(s).
            A primeira de cada grupo é mantida. Selecione abaixo quais cópias deseja remover.
          </p>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{dupSelected.size} selecionada(s)</span>
            <button className="underline text-primary" onClick={() => {
              const all = new Set(dupPreview.flatMap(d => d.remove.map(r => r.id)));
              setDupSelected(dupSelected.size === all.size ? new Set() : all);
            }}>
              {dupSelected.size === dupPreview.flatMap(d => d.remove).length ? "Desmarcar todas" : "Selecionar todas"}
            </button>
          </div>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {dupPreview.map((g, i) => (
              <div key={i} className="border rounded-md p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-emerald-600 text-[10px]">MANTER</Badge>
                  <span className="font-medium">{g.keep.local}</span>
                  {g.keep.filial && <span className="text-xs text-muted-foreground">({g.keep.filial})</span>}
                </div>
                {g.remove.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm pl-2 cursor-pointer hover:bg-muted/40 rounded p-1">
                    <Checkbox checked={dupSelected.has(r.id)} onCheckedChange={() => toggleDupSelected(r.id)} />
                    <Badge variant="destructive" className="text-[10px]">EXCLUIR</Badge>
                    <span className={cn("text-muted-foreground", dupSelected.has(r.id) && "line-through")}>{r.local}</span>
                    {r.filial && <span className="text-xs text-muted-foreground">({r.filial})</span>}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDupOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmRemoveDuplicates} disabled={dupSelected.size === 0}>
              Excluir {dupSelected.size > 0 ? `${dupSelected.size} selecionada(s)` : "selecionadas"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pipeline;
