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

const Lojas = () => {
  const { stores, addStore, deleteStore, updateStore } = useStores();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAnalista, setFilterAnalista] = useState(searchParams.get("analista") || "");
  const [filterPorte, setFilterPorte] = useState("");
  const [filterFase, setFilterFase] = useState("");
  const [form, setForm] = useState({ 
    nome: "", 
    filial: "", 
    franqueado: "", 
    construtor: "", 
    analistaObra: "", 
    inauguracao: "", 
    tipoLoja: "" as "rua" | "shopping" | "", 
    razaoSocial: "",
    porte: "" as "Compacta" | "Padrão" | "Ampliada" | "",
    cidade: "",
    uf: "",
    faseAtual: "Pré-Obra" as any,
    inauguracaoChecklist: {} as any 
  });

  const [isTeamMember, setIsTeamMember] = useState(false);
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
    setForm({ 
      nome: "", 
      filial: "", 
      franqueado: "", 
      construtor: "", 
      analistaObra: "", 
      inauguracao: "", 
      tipoLoja: "", 
      razaoSocial: "",
      porte: "",
      cidade: "",
      uf: "",
      faseAtual: "Pré-Obra",
      inauguracaoChecklist: {} 
    });

    setOpen(false);
    if (id) navigate(`/loja/${id}`);
  };

  const getProgress = (store: typeof stores[0]) => {
    const allChecklistItems = checklistCategories.flatMap((c) => c.items);
    const applicableItems = allChecklistItems.filter(item => store.checklist[item.id]?.status !== "NÃO SE APLICA");
    
    const getStatusScore = (status?: StatusType): number => {
      if (status === "REALIZADO") return 100;
      if (status === "NÃO SE APLICA") return 0;
      if (!status || status === "NÃO REALIZADO" || status === "ATRASADO") return 0;
      return 50; // In progress variants
    };

    const totalScore = allChecklistItems.reduce((acc, item) => acc + getStatusScore(store.checklist[item.id]?.status), 0);
    const maxScore = applicableItems.length * 100;
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  };

  const getStatusCounts = (store: typeof stores[0]) => {
    const counts: Partial<Record<StatusType, number>> = {};
    const allChecklistItems = checklistCategories.flatMap((c) => c.items);
    allChecklistItems.forEach((item) => {
      const status = store.checklist[item.id]?.status;
      if (status) {
        counts[status] = (counts[status] || 0) + 1;
      }
    });
    return counts;
  };

  const filtered = stores
    .filter(
      (s) =>
        (s.nome.toLowerCase().includes(search.toLowerCase()) ||
        s.franqueado.toLowerCase().includes(search.toLowerCase()) ||
        s.filial.toLowerCase().includes(search.toLowerCase())) &&
        (!filterAnalista || s.analistaObra === filterAnalista) &&
        (!filterPorte || s.porte === filterPorte) &&
        (!filterFase || s.faseAtual === filterFase)
    )

    .sort((a, b) => {
      const aHasChecklist = Object.keys(a.checklist || {}).length > 0;
      const bHasChecklist = Object.keys(b.checklist || {}).length > 0;
      if (aHasChecklist && !bHasChecklist) return -1;
      if (!aHasChecklist && bHasChecklist) return 1;
      return 0;
    });

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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Filial</Label>
                      <Input placeholder="Ex: 001" value={form.filial} onChange={(e) => setForm({ ...form, filial: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Porte</Label>
                      <Select value={form.porte} onValueChange={(v: any) => setForm({ ...form, porte: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o porte" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Compacta">Compacta</SelectItem>
                          <SelectItem value="Padrão">Padrão</SelectItem>
                          <SelectItem value="Ampliada">Ampliada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Razão Social</Label>
                    <Input placeholder="Razão Social da Loja" value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input placeholder="Ex: MG" maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Franqueado</Label>
                    <Input placeholder="Nome do franqueado" value={form.franqueado} onChange={(e) => setForm({ ...form, franqueado: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Analista de Obra</Label>
                    <Input placeholder="Nome da analista de obra" value={form.analistaObra} onChange={(e) => setForm({ ...form, analistaObra: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Inauguração</Label>
                    <Input type="date" value={form.inauguracao} onChange={(e) => setForm({ ...form, inauguracao: e.target.value })} />
                  </div>
                  <Button onClick={handleAdd} className="w-full bg-[hsl(38,70%,50%)] hover:bg-[hsl(38,70%,45%)] text-white">Criar Loja</Button>

                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stores.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar loja, franqueado..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterPorte} onValueChange={(v) => setFilterPorte(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Porte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Portes</SelectItem>
                <SelectItem value="Compacta">Compacta</SelectItem>
                <SelectItem value="Padrão">Padrão</SelectItem>
                <SelectItem value="Ampliada">Ampliada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFase} onValueChange={(v) => setFilterFase(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Fases</SelectItem>
                <SelectItem value="Pré-Obra">Pré-Obra</SelectItem>
                <SelectItem value="Obra">Obra</SelectItem>
                <SelectItem value="Setup">Setup</SelectItem>
                <SelectItem value="Abertura">Abertura</SelectItem>
              </SelectContent>
            </Select>
            {analistas.length > 0 && (
              <Select value={filterAnalista} onValueChange={(v) => setFilterAnalista(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Analista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as analistas</SelectItem>
                  {analistas.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

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
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          progress >= 90 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                          progress >= 50 ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' :
                          'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        }`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{store.faseAtual || 'Pré-Obra'}</span>
                        {store.porte && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] font-medium text-slate-500">{store.porte}</span>
                          </>
                        )}
                      </div>
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
