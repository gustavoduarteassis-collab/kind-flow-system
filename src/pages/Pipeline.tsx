import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft, Plus, Trash2, LogOut, CheckCircle2, Clock, AlertCircle, ArrowRightCircle, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createDefaultChecklist } from "@/data/checklistData";
import { createDefaultCronograma } from "@/data/cronogramaData";
import { createDefaultCustos } from "@/data/custosData";

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
  projeto_arquitetonico: string;
  projeto_eletrico: string;
  projeto_incendio: string;
  projeto_estrutural: string;
  projeto_ar_condicionado: string;
  orcamento_obra: string;
  contratos: string;
  observacoes: string;
  transferido: boolean;
};

const PHASES = [
  { key: "projeto_arquitetonico", label: "Proj. Arquitetônico" },
  { key: "projeto_eletrico", label: "Proj. Elétrico" },
  { key: "projeto_incendio", label: "Proj. Incêndio" },
  { key: "projeto_estrutural", label: "Proj. Estrutural" },
  { key: "projeto_ar_condicionado", label: "Proj. Ar Condicionado" },
  { key: "orcamento_obra", label: "Orçamento de Obra" },
  { key: "contratos", label: "Contratos" },
] as const;

const PHASE_STATUSES = [
  { value: "pendente", label: "Pendente", color: "bg-muted text-muted-foreground", icon: Clock },
  { value: "em_andamento", label: "Em Andamento", color: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]", icon: AlertCircle },
  { value: "aprovado", label: "Aprovado", color: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]", icon: CheckCircle2 },
];

const getPhaseColor = (status: string) => PHASE_STATUSES.find((s) => s.value === status)?.color || "bg-muted text-muted-foreground";
const getPhaseLabel = (status: string) => PHASE_STATUSES.find((s) => s.value === status)?.label || "Pendente";

const Pipeline = () => {
  const { user, signOut } = useAuth();
  const { addStore } = useStores();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stores, setStores] = useState<PipelineStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    filial: "", local: "", cidade: "", estado: "", padrao: "Tradicional",
    localizacao: "Shopping", franqueado: "", contato_franqueado: "",
    email_franqueado: "", previsao_inauguracao: "", cd_origem: "",
    status_geral: "", observacoes: "",
  });

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
    setForm({
      filial: "", local: "", cidade: "", estado: "", padrao: "Tradicional",
      localizacao: "Shopping", franqueado: "", contato_franqueado: "",
      email_franqueado: "", previsao_inauguracao: "", cd_origem: "",
      status_geral: "", observacoes: "",
    });
    setAddOpen(false);
    fetchStores();
  };

  const updatePhase = async (id: string, phase: string, value: string) => {
    await supabase.from("pipeline_stores").update({ [phase]: value } as any).eq("id", id);
    setStores((prev) => prev.map((s) => s.id === id ? { ...s, [phase]: value } : s));
  };

  const deleteStore = async (id: string) => {
    await supabase.from("pipeline_stores").delete().eq("id", id);
    setStores((prev) => prev.filter((s) => s.id !== id));
  };

  const getProgress = (store: PipelineStore) => {
    const approved = PHASES.filter((p) => (store as any)[p.key] === "aprovado").length;
    return Math.round((approved / PHASES.length) * 100);
  };

  const isReadyToTransfer = (store: PipelineStore) => {
    return PHASES.every((p) => (store as any)[p.key] === "aprovado");
  };

  const transferToLojas = async (pipelineStore: PipelineStore) => {
    if (!user) return;
    const newStoreId = await addStore({
      nome: pipelineStore.local,
      filial: pipelineStore.filial,
      franqueado: pipelineStore.franqueado,
      construtor: "",
      analistaObra: "",
      inauguracao: pipelineStore.previsao_inauguracao,
    });
    if (newStoreId) {
      await supabase.from("pipeline_stores").update({ transferido: true } as any).eq("id", pipelineStore.id);
      toast({ title: "Loja transferida!", description: `${pipelineStore.local} foi movida para Lojas.` });
      fetchStores();
    }
  };

  const filtered = stores.filter((s) =>
    s.local.toLowerCase().includes(search.toLowerCase()) ||
    s.filial.toLowerCase().includes(search.toLowerCase()) ||
    s.franqueado.toLowerCase().includes(search.toLowerCase()) ||
    s.cidade.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

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
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Loja no Funil</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Adicionar Loja ao Funil</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Filial</Label>
                    <Input value={form.filial} onChange={(e) => setForm({ ...form, filial: e.target.value })} />
                  </div>
                  <div className="space-y-2"><Label>Local / Nome *</Label>
                    <Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Cidade</Label>
                    <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                  </div>
                  <div className="space-y-2"><Label>Estado</Label>
                    <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} maxLength={2} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Padrão</Label>
                    <Select value={form.padrao} onValueChange={(v) => setForm({ ...form, padrao: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tradicional">Tradicional</SelectItem>
                        <SelectItem value="Light">Light</SelectItem>
                        <SelectItem value="Outlet">Outlet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Localização</Label>
                    <Select value={form.localizacao} onValueChange={(v) => setForm({ ...form, localizacao: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                        <SelectItem value="Rua">Rua</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Franqueado</Label>
                  <Input value={form.franqueado} onChange={(e) => setForm({ ...form, franqueado: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Contato</Label>
                    <Input value={form.contato_franqueado} onChange={(e) => setForm({ ...form, contato_franqueado: e.target.value })} />
                  </div>
                  <div className="space-y-2"><Label>E-mail</Label>
                    <Input type="email" value={form.email_franqueado} onChange={(e) => setForm({ ...form, email_franqueado: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Previsão Inauguração</Label>
                    <Input value={form.previsao_inauguracao} onChange={(e) => setForm({ ...form, previsao_inauguracao: e.target.value })} placeholder="dd/mm/aa" />
                  </div>
                  <div className="space-y-2"><Label>CD de Origem</Label>
                    <Input value={form.cd_origem} onChange={(e) => setForm({ ...form, cd_origem: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2"><Label>Status Geral</Label>
                  <Textarea value={form.status_geral} onChange={(e) => setForm({ ...form, status_geral: e.target.value })} rows={2} />
                </div>
                <div className="space-y-2"><Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} />
                </div>
                <Button onClick={addPipelineStore} className="w-full">Adicionar ao Funil</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total no Funil</p>
              <p className="text-2xl font-bold">{stores.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Prontas p/ Transferir</p>
              <p className="text-2xl font-bold text-[hsl(var(--success))]">{stores.filter(isReadyToTransfer).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Em Andamento</p>
              <p className="text-2xl font-bold text-[hsl(var(--accent))]">
                {stores.filter((s) => !isReadyToTransfer(s) && PHASES.some((p) => (s as any)[p.key] === "em_andamento")).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {stores.filter((s) => PHASES.every((p) => (s as any)[p.key] === "pendente")).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline table */}
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma loja no funil.</CardContent></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[60px]">Filial</TableHead>
                    <TableHead className="min-w-[200px]">Local</TableHead>
                    <TableHead className="min-w-[100px]">Cidade/UF</TableHead>
                    <TableHead className="min-w-[100px]">Franqueado</TableHead>
                    <TableHead className="min-w-[80px]">Previsão</TableHead>
                    <TableHead className="min-w-[80px] text-center">Progresso</TableHead>
                    {PHASES.map((p) => (
                      <TableHead key={p.key} className="min-w-[120px] text-center text-[10px]">{p.label}</TableHead>
                    ))}
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((store) => {
                    const progress = getProgress(store);
                    const ready = isReadyToTransfer(store);
                    return (
                      <TableRow key={store.id} className={ready ? "bg-[hsl(152,60%,95%)]" : ""}>
                        <TableCell className="font-mono text-xs">{store.filial || "—"}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{store.local}</p>
                            {store.status_geral && <p className="text-[10px] text-muted-foreground line-clamp-2">{store.status_geral}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{store.cidade}{store.estado ? `/${store.estado}` : ""}</TableCell>
                        <TableCell className="text-xs">{store.franqueado || "—"}</TableCell>
                        <TableCell className="text-xs">{store.previsao_inauguracao || "—"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <Progress value={progress} className="h-1.5 w-12" />
                            <span className="text-[10px] font-semibold">{progress}%</span>
                          </div>
                        </TableCell>
                        {PHASES.map((p) => (
                          <TableCell key={p.key} className="text-center p-1">
                            <Select value={(store as any)[p.key]} onValueChange={(v) => updatePhase(store.id, p.key, v)}>
                              <SelectTrigger className="h-7 text-[10px] px-1 min-w-[100px]">
                                <Badge className={`${getPhaseColor((store as any)[p.key])} text-[9px] px-1`}>
                                  {getPhaseLabel((store as any)[p.key])}
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
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex gap-1">
                            {ready && (
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-[hsl(var(--success))]"
                                title="Transferir para Lojas"
                                onClick={() => { if (confirm(`Transferir "${store.local}" para Lojas?`)) transferToLojas(store); }}
                              >
                                <ArrowRightCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Excluir?")) deleteStore(store.id); }}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Pipeline;