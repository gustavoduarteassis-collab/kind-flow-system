import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStores } from "@/hooks/useStores";
import { checklistCategories, StatusType } from "@/data/checklistData";
import { SOLICITACOES_ITEMS } from "@/data/solicitacoesData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus, Store, Calendar, User, Search, Trash2, ChevronRight, Building2, ArrowLeft, Pencil,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { buildInauguradasFiliais } from "@/utils/inauguradaFilter";
import { formatBR, daysUntil } from "@/utils/safeDate";
import { AlertTriangle } from "lucide-react";

const Lojas = () => {
  const { stores, addStore, deleteStore, updateStore } = useStores();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAnalista, setFilterAnalista] = useState(searchParams.get("analista") || "");
  const [filterStatus, setFilterStatus] = useState<"todas" | "andamento" | "pronta" | "sem-progresso" | "atrasada">("todas");
  const [form, setForm] = useState({ nome: "", filial: "", franqueado: "", construtor: "", analistaObra: "", inauguracao: "", tipoLoja: "" as "rua" | "shopping" | "", inauguracaoChecklist: {} as any });
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [inauguradasFiliais, setInauguradasFiliais] = useState<Set<string>>(new Set());
  const [inauguradasNomes, setInauguradasNomes] = useState<Set<string>>(new Set());
  const [showInauguradas, setShowInauguradas] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", nome: "", filial: "", franqueado: "", construtor: "", analistaObra: "", inauguracao: "" });

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase.rpc("is_authorized_team", { check_user_id: user.id });
      setIsTeamMember(!!data);
    };
    check();
  }, [user]);

  useEffect(() => {
    const loadInauguradas = async () => {
      const { data } = await supabase.from("pipeline_stores").select("filial,local,status_geral");
      setInauguradasFiliais(buildInauguradasFiliais(data as any));
      const norm = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const nomes = new Set<string>();
      (data || []).forEach((r: any) => {
        const status = String(r.status_geral || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        if (status.startsWith("inaugurada") && r.local) {
          nomes.add(norm(String(r.local)));
        }
      });
      setInauguradasNomes(nomes);
    };
    loadInauguradas();
  }, []);

  const openEditStore = (store: typeof stores[0]) => {
    setEditForm({ id: store.id, nome: store.nome, filial: store.filial, franqueado: store.franqueado, construtor: store.construtor, analistaObra: store.analistaObra, inauguracao: store.inauguracao });
    setEditOpen(true);
  };

  const saveEditStore = async () => {
    await updateStore(editForm.id, { nome: editForm.nome, filial: editForm.filial, franqueado: editForm.franqueado, construtor: editForm.construtor, analistaObra: editForm.analistaObra, inauguracao: editForm.inauguracao });
    setEditOpen(false);
  };

  const analistas = Array.from(new Set(stores.map((s) => s.analistaObra).filter(Boolean)));

  const handleAdd = async () => {
    if (!form.nome) return;
    const id = await addStore(form);
    setForm({ nome: "", filial: "", franqueado: "", construtor: "", analistaObra: "", inauguracao: "", tipoLoja: "", inauguracaoChecklist: {} });
    setOpen(false);
    if (id) navigate(`/loja/${id}`);
  };

  const getProgress = (store: typeof stores[0]) => {
    const totalItems = checklistCategories.flatMap((c) => c.items).length;
    const doneItems = Object.values(store.checklist).filter(
      (c) => c.status === "REALIZADO" || c.status === "NÃO SE APLICA"
    ).length;
    return Math.round((doneItems / totalItems) * 100);
  };

  const getStatusCounts = (store: typeof stores[0]) => {
    const counts: Partial<Record<StatusType, number>> = {};
    Object.values(store.checklist).forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  };

  const normName = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const isInaugurada = (s: typeof stores[0]) => {
    if (s.filial && inauguradasFiliais.has(String(s.filial))) return true;
    if (s.nome) {
      const n = normName(s.nome);
      for (const pn of inauguradasNomes) {
        if (pn.includes(n) || n.includes(pn)) return true;
      }
    }
    return false;
  };

  const classifyStatus = (store: typeof stores[0]) => {
    const counts = getStatusCounts(store);
    const atrasados = counts["ATRASADO"] || 0;
    const progress = getProgress(store);
    const days = daysUntil(store.inauguracao);
    if (atrasados > 0 || (days !== null && days < 0 && progress < 100)) return "atrasada";
    if (progress >= 100) return "pronta";
    if (progress === 0) return "sem-progresso";
    return "andamento";
  };

  const visible = stores.filter((s) => showInauguradas || !isInaugurada(s));
  const kpis = {
    total: visible.length,
    andamento: visible.filter((s) => classifyStatus(s) === "andamento").length,
    pronta: visible.filter((s) => classifyStatus(s) === "pronta").length,
    sem: visible.filter((s) => classifyStatus(s) === "sem-progresso").length,
    atrasada: visible.filter((s) => classifyStatus(s) === "atrasada").length,
  };

  const filtered = visible.filter(
    (s) =>
      (s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.franqueado.toLowerCase().includes(search.toLowerCase()) ||
      s.filial.toLowerCase().includes(search.toLowerCase())) &&
      (!filterAnalista || s.analistaObra === filterAnalista) &&
      (filterStatus === "todas" || classifyStatus(s) === filterStatus)
  );
  const hiddenInauguradasCount = stores.filter(isInaugurada).length;

  const progressColor = (p: number, atrasados: number) => {
    if (atrasados > 0) return "bg-destructive";
    if (p >= 100) return "bg-[hsl(152,60%,40%)]";
    if (p > 0) return "bg-[hsl(38,90%,55%)]";
    return "bg-muted-foreground/40";
  };

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
                <h1 className="text-xl font-bold tracking-tight">Lojas</h1>
                <p className="text-sm text-muted-foreground">Checklist e Cronograma</p>
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Nova Loja
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Loja</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Nome da Loja *</Label>
                    <Input placeholder="Ex: Shopping Center Norte" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Filial</Label>
                    <Input placeholder="Ex: 001" value={form.filial} onChange={(e) => setForm({ ...form, filial: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Franqueado</Label>
                    <Input placeholder="Nome do franqueado" value={form.franqueado} onChange={(e) => setForm({ ...form, franqueado: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Construtor</Label>
                    <Input placeholder="Nome do construtor" value={form.construtor} onChange={(e) => setForm({ ...form, construtor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Analista de Obra</Label>
                    <Input placeholder="Nome da analista de obra" value={form.analistaObra} onChange={(e) => setForm({ ...form, analistaObra: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Inauguração</Label>
                    <Input type="date" value={form.inauguracao} onChange={(e) => setForm({ ...form, inauguracao: e.target.value })} />
                  </div>
                  <Button onClick={handleAdd} className="w-full">Criar Loja</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stores.length > 0 && (
          <>
            {/* KPI summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {[
                { key: "todas", label: "Total", value: kpis.total, color: "text-foreground", dot: "bg-muted-foreground/40" },
                { key: "andamento", label: "Em andamento", value: kpis.andamento, color: "text-[hsl(38,90%,40%)]", dot: "bg-[hsl(38,90%,55%)]" },
                { key: "pronta", label: "Prontas", value: kpis.pronta, color: "text-[hsl(152,60%,30%)]", dot: "bg-[hsl(152,60%,40%)]" },
                { key: "sem-progresso", label: "Sem progresso", value: kpis.sem, color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
                { key: "atrasada", label: "Atrasadas", value: kpis.atrasada, color: "text-destructive", dot: "bg-destructive" },
              ].map((k) => (
                <button
                  key={k.key}
                  onClick={() => setFilterStatus(k.key as any)}
                  className={`text-left rounded-lg border p-3 transition-all hover:border-primary/40 ${
                    filterStatus === k.key ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`w-2 h-2 rounded-full ${k.dot}`} />
                    {k.label}
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar loja, franqueado, filial..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {analistas.length > 0 && (
                <Select value={filterAnalista || "all"} onValueChange={(v) => setFilterAnalista(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filtrar por analista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as analistas</SelectItem>
                    {analistas.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {hiddenInauguradasCount > 0 && (
                <Button
                  variant={showInauguradas ? "default" : "outline"}
                  onClick={() => setShowInauguradas((v) => !v)}
                  className="gap-2"
                >
                  {showInauguradas ? "Ocultar inauguradas" : `Mostrar inauguradas (${hiddenInauguradasCount})`}
                </Button>
              )}
              {(filterStatus !== "todas" || filterAnalista || search) && (
                <Button variant="ghost" onClick={() => { setFilterStatus("todas"); setFilterAnalista(""); setSearch(""); }}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </>
        )}

        {stores.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhuma loja cadastrada</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Adicione sua primeira loja para começar a acompanhar o checklist de implantação.
            </p>
            <Button onClick={() => setOpen(true)} size="lg" className="gap-2">
              <Plus className="h-5 w-5" /> Adicionar Primeira Loja
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((store) => {
            const progress = getProgress(store);
            const counts = getStatusCounts(store);
            return (
              <Card
                key={store.id}
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30"
                onClick={() => navigate(`/loja/${store.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg leading-tight">{store.nome}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {store.filial && (
                          <span className="flex items-center gap-1">
                            <Store className="h-3.5 w-3.5" /> {store.filial}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isTeamMember && (
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); openEditStore(store); }}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); if (confirm("Excluir esta loja?")) deleteStore(store.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {store.analistaObra && (
                    <div
                      className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onClick={(e) => { e.stopPropagation(); setFilterAnalista(store.analistaObra); }}
                    >
                      📋 {store.analistaObra}
                    </div>
                  )}
                  {store.franqueado && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" /> {store.franqueado}
                    </div>
                  )}
                  {store.inauguracao && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(store.inauguracao + "T00:00:00").toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {counts["REALIZADO"] && (
                      <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-xs">✓ {counts["REALIZADO"]}</Badge>
                    )}
                    {counts["ATRASADO"] && (
                      <Badge variant="destructive" className="text-xs">! {counts["ATRASADO"]}</Badge>
                    )}
                    {counts["NÃO INICIADO"] && (
                      <Badge variant="secondary" className="text-xs">○ {counts["NÃO INICIADO"]}</Badge>
                    )}
                  </div>
                  {/* Solicitations summary per item */}
                  {(() => {
                    const sol = (store as any).solicitacoes || {};
                    const total = SOLICITACOES_ITEMS.length;
                    const done = SOLICITACOES_ITEMS.filter((i) => sol[i.id]?.status === "concluido").length;
                    const pending = SOLICITACOES_ITEMS.filter((i) => sol[i.id]?.status === "solicitado").length;
                    return (
                      <div className="space-y-1.5 border-t pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">📋 Solicitações: {done}/{total}</span>
                          {pending > 0 && <Badge className="bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)] text-[10px]">{pending} em andamento</Badge>}
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                          {SOLICITACOES_ITEMS.map((item) => {
                            const status = sol[item.id]?.status || "pendente";
                            return (
                              <div key={item.id} className="flex items-center gap-1.5 text-[10px]">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  status === "concluido" ? "bg-[hsl(152,60%,40%)]" :
                                  status === "solicitado" ? "bg-[hsl(38,90%,55%)]" :
                                  "bg-muted-foreground/30"
                                }`} />
                                <span className={`truncate ${status === "concluido" ? "line-through text-muted-foreground/60" : "text-muted-foreground"}`}>
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex justify-end">
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Edit Store Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Loja</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Nome da Loja</Label>
              <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Filial</Label>
              <Input value={editForm.filial} onChange={(e) => setEditForm({ ...editForm, filial: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Franqueado</Label>
              <Input value={editForm.franqueado} onChange={(e) => setEditForm({ ...editForm, franqueado: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Construtor</Label>
              <Input value={editForm.construtor} onChange={(e) => setEditForm({ ...editForm, construtor: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Analista de Obra</Label>
              <Input value={editForm.analistaObra} onChange={(e) => setEditForm({ ...editForm, analistaObra: e.target.value })} />
            </div>
            <div className="space-y-2"><Label>Data de Inauguração</Label>
              <Input type="date" value={editForm.inauguracao} onChange={(e) => setEditForm({ ...editForm, inauguracao: e.target.value })} />
            </div>
            <Button onClick={saveEditStore} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lojas;
