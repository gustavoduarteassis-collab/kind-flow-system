import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft, Plus, Trash2, Star, Upload, ExternalLink, Search, Filter,
  TrendingUp, Users, Package, Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoConstance from "@/assets/logo-constance.svg";
import PassoAPasso from "@/components/PassoAPasso";

type Fornecedor = {
  id: string;
  nome_empresa: string;
  contato: string;
  telefone: string;
  email: string;
  produto_servico: string;
  proposta_url: string;
  avaliacao: number;
  status: string;
  observacoes: string;
  analista_responsavel: string;
  mes_referencia: string;
  created_at: string;
};

type TeamMember = { id: string; name: string };

const statusLabels: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const statusColors: Record<string, string> = {
  novo: "bg-secondary text-secondary-foreground",
  em_analise: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  aprovado: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  reprovado: "bg-destructive text-destructive-foreground",
};

const getCurrentMonth = () => format(new Date(), "yyyy-MM");

const Diversos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterAnalista, setFilterAnalista] = useState("todos");
  const [filterMes, setFilterMes] = useState(getCurrentMonth());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome_empresa: "", contato: "", telefone: "", email: "",
    produto_servico: "", proposta_url: "", avaliacao: 0,
    status: "novo", observacoes: "", analista_responsavel: "",
    mes_referencia: getCurrentMonth(),
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [f, m] = await Promise.all([
      supabase.from("fornecedores_prospeccao").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("team_members").select("id, name").is("deleted_at", null),
    ]);
    if (f.data) setFornecedores(f.data as Fornecedor[]);
    if (m.data) setMembers(m.data);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({
      nome_empresa: "", contato: "", telefone: "", email: "",
      produto_servico: "", proposta_url: "", avaliacao: 0,
      status: "novo", observacoes: "", analista_responsavel: "",
      mes_referencia: getCurrentMonth(),
    });
    setEditingId(null);
  };

  const saveFornecedor = async () => {
    if (!user || !form.nome_empresa.trim()) {
      toast({ title: "Erro", description: "Nome da empresa é obrigatório.", variant: "destructive" });
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("fornecedores_prospeccao")
        .update({ ...form })
        .eq("id", editingId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Atualizado!", description: "Fornecedor atualizado com sucesso." });
    } else {
      const { error } = await supabase
        .from("fornecedores_prospeccao")
        .insert({ ...form, user_id: user.id });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Cadastrado!", description: `${form.nome_empresa} adicionado à prospecção.` });
    }
    resetForm();
    setDialogOpen(false);
    fetchData();
  };

  const deleteFornecedor = async (id: string) => {
    await supabase.from("fornecedores_prospeccao").delete().eq("id", id);
    fetchData();
  };

  const editFornecedor = (f: Fornecedor) => {
    setForm({
      nome_empresa: f.nome_empresa, contato: f.contato, telefone: f.telefone,
      email: f.email, produto_servico: f.produto_servico, proposta_url: f.proposta_url,
      avaliacao: f.avaliacao, status: f.status, observacoes: f.observacoes,
      analista_responsavel: f.analista_responsavel, mes_referencia: f.mes_referencia,
    });
    setEditingId(f.id);
    setDialogOpen(true);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("fornecedores_prospeccao").update({ status }).eq("id", id);
    fetchData();
  };

  // Filtering
  const filtered = fornecedores.filter((f) => {
    if (searchTerm && !f.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !f.produto_servico.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== "todos" && f.status !== filterStatus) return false;
    if (filterAnalista !== "todos" && f.analista_responsavel !== filterAnalista) return false;
    if (filterMes && f.mes_referencia !== filterMes) return false;
    return true;
  });

  // Meta tracking: 5 fornecedores per analyst per month
  const META_MENSAL = 5;
  const getMetaByAnalista = () => {
    const map: Record<string, number> = {};
    fornecedores
      .filter((f) => f.mes_referencia === filterMes)
      .forEach((f) => {
        if (f.analista_responsavel) {
          map[f.analista_responsavel] = (map[f.analista_responsavel] || 0) + 1;
        }
      });
    return map;
  };
  const metaData = getMetaByAnalista();

  const renderStars = (rating: number, onChange?: (v: number) => void) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= rating ? "text-[hsl(38,70%,50%)] fill-[hsl(38,70%,50%)]" : "text-muted-foreground/30"} ${onChange ? "cursor-pointer" : ""}`}
          onClick={() => onChange?.(s)}
        />
      ))}
    </div>
  );

  return (
    <div className="bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <img src={logoConstance} alt="Constance" className="h-8 opacity-80" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Diversos</h1>
            <p className="text-xs text-muted-foreground">Prospecção de Fornecedores & Metas</p>
          </div>
        </div>

        <Tabs defaultValue="fornecedores" className="space-y-6">
          <TabsList>
            <TabsTrigger value="fornecedores">Prospecção de Fornecedores</TabsTrigger>
            <TabsTrigger value="passos">Passo a Passo</TabsTrigger>
          </TabsList>

          <TabsContent value="fornecedores" className="space-y-6">
            {/* Meta Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{fornecedores.filter(f => f.mes_referencia === filterMes).length}</p>
                      <p className="text-xs text-muted-foreground">Fornecedores no mês</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-[hsl(var(--success))]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{fornecedores.filter(f => f.mes_referencia === filterMes && f.status === "aprovado").length}</p>
                      <p className="text-xs text-muted-foreground">Aprovados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Search className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{fornecedores.filter(f => f.mes_referencia === filterMes && f.status === "em_analise").length}</p>
                      <p className="text-xs text-muted-foreground">Em Análise</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{fornecedores.filter(f => f.mes_referencia === filterMes && f.status === "reprovado").length}</p>
                      <p className="text-xs text-muted-foreground">Reprovados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Meta por Analista */}
            {members.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Meta Mensal por Analista — {META_MENSAL} fornecedores/mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {members.map((m) => {
                      const count = metaData[m.name] || 0;
                      const pct = Math.min(100, Math.round((count / META_MENSAL) * 100));
                      const reached = count >= META_MENSAL;
                      return (
                        <div key={m.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{m.name}</span>
                            <span className={`text-sm font-bold ${reached ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
                              {count}/{META_MENSAL}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${reached ? "bg-[hsl(var(--success))]" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {reached && <p className="text-xs text-[hsl(var(--success))] mt-1 font-medium">✓ Meta atingida!</p>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters + Add */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresa ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAnalista} onValueChange={setFilterAnalista}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Analistas</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="month"
                value={filterMes}
                onChange={(e) => setFilterMes(e.target.value)}
                className="w-[160px]"
              />
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Fornecedor</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingId ? "Editar Fornecedor" : "Cadastrar Fornecedor"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Empresa *</Label>
                        <Input value={form.nome_empresa} onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })} />
                      </div>
                      <div>
                        <Label>Contato</Label>
                        <Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Telefone</Label>
                        <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                      </div>
                      <div>
                        <Label>E-mail</Label>
                        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>Produto / Serviço</Label>
                      <Input value={form.produto_servico} onChange={(e) => setForm({ ...form, produto_servico: e.target.value })} />
                    </div>
                    <div>
                      <Label>Link da Proposta</Label>
                      <Input placeholder="https://..." value={form.proposta_url} onChange={(e) => setForm({ ...form, proposta_url: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Analista Responsável</Label>
                        <Select value={form.analista_responsavel} onValueChange={(v) => setForm({ ...form, analista_responsavel: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Mês Referência</Label>
                        <Input type="month" value={form.mes_referencia} onChange={(e) => setForm({ ...form, mes_referencia: e.target.value })} />
                      </div>
                      <div>
                        <Label>Avaliação</Label>
                        <div className="pt-2">{renderStars(form.avaliacao, (v) => setForm({ ...form, avaliacao: v }))}</div>
                      </div>
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
                    </div>
                    <Button onClick={saveFornecedor} className="w-full">{editingId ? "Salvar Alterações" : "Cadastrar"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Fornecedores Table */}
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Produto/Serviço</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Analista</TableHead>
                      <TableHead className="text-center">Avaliação</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Proposta</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhum fornecedor encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((f) => (
                        <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => editFornecedor(f)}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{f.nome_empresa}</p>
                              {f.email && <p className="text-xs text-muted-foreground">{f.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{f.produto_servico || "—"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{f.contato || "—"}</p>
                              {f.telefone && <p className="text-xs text-muted-foreground">{f.telefone}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{f.analista_responsavel || "—"}</TableCell>
                          <TableCell className="text-center">{renderStars(f.avaliacao)}</TableCell>
                          <TableCell className="text-center">
                            <Select
                              value={f.status}
                              onValueChange={(v) => { updateStatus(f.id, v); }}
                            >
                              <SelectTrigger className="h-7 text-xs w-[110px] mx-auto" onClick={(e) => e.stopPropagation()}>
                                <Badge className={`${statusColors[f.status] || ""} text-xs`}>
                                  {statusLabels[f.status] || f.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusLabels).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            {f.proposta_url ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); window.open(f.proposta_url, "_blank"); }}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteFornecedor(f.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="passos">
            <PassoAPasso />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Diversos;
