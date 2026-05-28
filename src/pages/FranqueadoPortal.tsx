import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Store, checklistCategories, StatusType, createDefaultChecklist } from "@/data/checklistData";
import { createDefaultCronograma } from "@/data/cronogramaData";
import CronogramaObra from "@/components/CronogramaObra";
import CustosObra from "@/components/CustosObra";
import DiarioObra from "@/components/DiarioObra";
import ChecklistVisitaTecnica from "@/components/ChecklistVisitaTecnica";
import SolicitacoesLoja from "@/components/SolicitacoesLoja";
import ChecklistInauguracao from "@/components/ChecklistInauguracao";
import FornecedoresObra from "@/components/FornecedoresObra";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LogOut, ClipboardCheck } from "lucide-react";

const statusColors: Record<StatusType, string> = {
  "NÃO REALIZADO": "bg-destructive text-destructive-foreground",
  "EM COTAÇÃO": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  "EM TRANSPORTE": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  "REALIZADO": "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]",
  "REALIZANDO": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  "ATRASADO": "bg-destructive text-destructive-foreground",
  "NÃO SE APLICA": "bg-muted text-muted-foreground",
  "CONSTRUTORA": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  "EM ELABORAÇÃO": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  "EM ANÁLISE": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  "EM CONTRATAÇÃO": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  "EM ANDAMENTO": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
};

type AccessType = "franqueado" | "construtor";

const FranqueadoPortal = () => {
  const { user, signOut } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [accessType, setAccessType] = useState<AccessType>("franqueado");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");

  const fetchStore = useCallback(async () => {
    if (!user?.email) return;
    const { data: access } = await supabase
      .from("franchisee_access")
      .select("*")
      .ilike("franchisee_email", user.email);
    
    if (!access || access.length === 0) { setLoading(false); return; }
    
    const acc = access[0] as any;
    const type: AccessType = acc.access_type === "construtor" ? "construtor" : "franqueado";
    setAccessType(type);

    // Set default tab based on access type
    if (type === "construtor") {
      setActiveTab("cronograma");
    } else {
      setActiveTab("cronograma");
    }

    const { data: storeData } = await supabase
      .from("stores")
      .select("*")
      .eq("id", acc.store_id)
      .single();

    if (storeData) {
      const storeObj: Store = {
        id: storeData.id,
        nome: storeData.nome,
        filial: storeData.filial || "",
        franqueado: storeData.franqueado || "",
        construtor: storeData.construtor || "",
        analistaObra: storeData.analista_obra || "",
        inauguracao: storeData.inauguracao || "",
        tipoLoja: (storeData as any).tipo_loja || "",
        checklist: (storeData.checklist as any) || createDefaultChecklist(),
        cronograma: (storeData.cronograma as any) || createDefaultCronograma(),
        inauguracaoChecklist: (storeData as any).inauguracao_checklist || {},
      };
      setStore(storeObj);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  const updateStore = async (updates: Partial<Store>) => {
    if (!store) return;
    const dbUpdates: any = {};
    if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist;
    if (updates.cronograma !== undefined) dbUpdates.cronograma = updates.cronograma;
    if ((updates as any).custos !== undefined) dbUpdates.custos = (updates as any).custos;
    if ((updates as any).visitaTecnica !== undefined) dbUpdates.visita_tecnica = (updates as any).visitaTecnica;
    if ((updates as any).solicitacoes !== undefined) dbUpdates.solicitacoes = (updates as any).solicitacoes;
    if ((updates as any).inauguracaoChecklist !== undefined) dbUpdates.inauguracao_checklist = (updates as any).inauguracaoChecklist;
    if ((updates as any).tipoLoja !== undefined) dbUpdates.tipo_loja = (updates as any).tipoLoja;
    await supabase.from("stores").update(dbUpdates).eq("id", store.id);
    setStore((prev) => prev ? { ...prev, ...updates } : prev);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  if (!store) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold">Sem acesso a lojas</h2>
        <p className="text-muted-foreground">Sua conta ainda não foi vinculada a nenhuma loja.<br />Entre em contato com a equipe.</p>
        <Button variant="outline" onClick={() => signOut()}>Sair</Button>
      </div>
    </div>
  );

  const isConstrutor = accessType === "construtor";
  const isFranqueado = accessType === "franqueado";

  // Franqueado: full access to everything with edit
  // Construtor: view-only access to cronograma, diário, visita técnica
  const canEditChecklist = isFranqueado;
  const canEditCronograma = isFranqueado;
  const canEditDiario = isFranqueado;
  const canEditCustos = isFranqueado;

  const allItems = checklistCategories.flatMap((c) => c.items);
  const applicableItems = allItems.filter(item => store.checklist[item.id]?.status !== "NÃO SE APLICA");
  
  const getStatusScore = (status?: StatusType): number => {
    if (status === "REALIZADO") return 100;
    if (status === "NÃO SE APLICA") return 0;
    if (!status || status === "NÃO REALIZADO" || status === "ATRASADO") return 0;
    return 50;
  };

  const totalScore = allItems.reduce((acc, item) => acc + getStatusScore(store.checklist[item.id]?.status), 0);
  const maxScore = applicableItems.length * 100;
  const progress = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const doneItems = Object.values(store.checklist).filter(c => c.status === "REALIZADO").length;

  const handleStatusChange = (itemId: number, status: StatusType) => {
    if (!canEditChecklist) return;
    const newChecklist = { ...store.checklist };
    newChecklist[itemId] = { ...newChecklist[itemId], status };
    updateStore({ checklist: newChecklist });
  };

  const handleFieldChange = (itemId: number, field: "prazoInicial" | "prazoFinal" | "observacoes", value: string) => {
    if (!canEditChecklist) return;
    const newChecklist = { ...store.checklist };
    newChecklist[itemId] = { ...newChecklist[itemId], [field]: value };
    updateStore({ checklist: newChecklist });
  };

  const getCategoryProgress = (categoryId: string) => {
    const cat = checklistCategories.find((c) => c.id === categoryId);
    if (!cat) return 0;
    const done = cat.items.filter(
      (item) => store.checklist[item.id]?.status === "REALIZADO" || store.checklist[item.id]?.status === "NÃO SE APLICA"
    ).length;
    return Math.round((done / cat.items.length) * 100);
  };

  const portalLabel = isConstrutor ? "Portal do Construtor" : "Portal do Franqueado";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">{store.nome}</h1>
              <p className="text-sm text-muted-foreground">{portalLabel}</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {isConstrutor ? "🏗️ Construtor" : "👤 Franqueado"}
            </Badge>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
          {isFranqueado && (
            <div className="flex items-center gap-4">
              <Progress value={progress} className="h-2.5 flex-1" />
              <span className="font-semibold text-sm">{progress}%</span>
              <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]">✓ {doneItems}/{allItems.length}</Badge>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              {/* Cronograma - both franqueado and construtor */}
              <TabsTrigger value="cronograma" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                📊 Cronograma
              </TabsTrigger>

              {/* Diário de Obra - both */}
              <TabsTrigger value="diario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                📋 Diário de Obra
              </TabsTrigger>

              {/* Visita Técnica - both */}
              <TabsTrigger value="visita-tecnica" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                🔍 Visita Técnica
              </TabsTrigger>

              {/* Franqueado-only tabs */}
              {isFranqueado && (
                <>
                  <TabsTrigger value="custos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                    💰 Custos
                  </TabsTrigger>
                  <TabsTrigger value="solicitacoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                    📋 Solicitações
                  </TabsTrigger>
                  <TabsTrigger value="inauguracao" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                    🎉 Inauguração
                  </TabsTrigger>
                  {checklistCategories.map((cat) => (
                    <TabsTrigger key={cat.id} value={cat.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                      {cat.nome}
                      <span className="ml-1.5 text-[10px] opacity-70">{getCategoryProgress(cat.id)}%</span>
                    </TabsTrigger>
                  ))}
                </>
              )}
            </TabsList>
          </div>

          {/* Cronograma */}
          <TabsContent value="cronograma" className="mt-4">
            <CronogramaObra
              store={store}
              onUpdate={canEditCronograma ? (cronograma) => updateStore({ cronograma }) : () => {}}
            />
          </TabsContent>

          {/* Diário de Obra */}
          <TabsContent value="diario" className="mt-4">
            <DiarioObra storeId={store.id} />
          </TabsContent>

          {/* Visita Técnica */}
          <TabsContent value="visita-tecnica" className="mt-4">
            <ChecklistVisitaTecnica
              storeId={store.id}
              storeInauguracao={store.inauguracao || ""}
              data={(store as any).visitaTecnica || {}}
              onDataChange={isFranqueado ? (visitaTecnica) => updateStore({ visitaTecnica } as any) : () => {}}
            />
          </TabsContent>

          {/* Franqueado-only tabs content */}
          {isFranqueado && (
            <>
              <TabsContent value="custos" className="mt-4">
                <CustosObra store={store} onUpdate={(custos) => updateStore({ custos } as any)} />
              </TabsContent>

              <TabsContent value="solicitacoes" className="mt-4">
                <SolicitacoesLoja
                  data={(store as any).solicitacoes || {}}
                  onUpdate={(solicitacoes) => updateStore({ solicitacoes } as any)}
                />
              </TabsContent>

              <TabsContent value="inauguracao" className="mt-4">
                <ChecklistInauguracao
                  tipoLoja={store.tipoLoja as "rua" | "shopping" | ""}
                  data={store.inauguracaoChecklist || { rounds: [] }}
                  onTipoChange={(tipo) => updateStore({ tipoLoja: tipo } as any)}
                  onDataChange={(inaugData) => updateStore({ inauguracaoChecklist: inaugData } as any)}
                />
              </TabsContent>

              {checklistCategories.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="mt-4">
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead className="min-w-[350px]">Atividade</TableHead>
                            <TableHead className="min-w-[140px]">Pré-requisito</TableHead>
                            <TableHead className="w-[130px]">Prazo Inicial</TableHead>
                            <TableHead className="w-[130px]">Prazo Final</TableHead>
                            <TableHead className="w-[170px]">Status</TableHead>
                            <TableHead className="w-[140px]">Responsável</TableHead>
                            <TableHead className="min-w-[160px]">Observações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cat.items.map((item) => {
                            const data = store.checklist[item.id] || { status: "NÃO REALIZADO" as StatusType, prazoInicial: "", prazoFinal: "", observacoes: "" };
                            const isImpeditivo = item.atividade.includes("IMPEDITIVO");
                            return (
                              <TableRow key={item.id} className={
                                data.status === "ATRASADO" ? "bg-destructive/5" :
                                data.status === "REALIZADO" ? "bg-[hsl(152,60%,95%)]" :
                                isImpeditivo ? "bg-[hsl(38,90%,97%)]" : ""
                              }>
                                <TableCell className="text-center font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                                <TableCell>
                                  <div className="text-sm break-words whitespace-normal">
                                    {item.atividade}
                                    {isImpeditivo && <Badge variant="outline" className="ml-2 text-[10px] border-[hsl(38,90%,55%)] text-[hsl(38,90%,40%)]">IMPEDITIVO</Badge>}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.preRequisito || "—"}</TableCell>
                                <TableCell>
                                  <Input type="date" className="h-8 text-xs" value={data.prazoInicial} onChange={(e) => handleFieldChange(item.id, "prazoInicial", e.target.value)} />
                                </TableCell>
                                <TableCell>
                                  <Input type="date" className="h-8 text-xs" value={data.prazoFinal} onChange={(e) => handleFieldChange(item.id, "prazoFinal", e.target.value)} />
                                </TableCell>
                                <TableCell>
                                  <Select value={data.status} onValueChange={(v) => handleStatusChange(item.id, v as StatusType)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {cat.statusOptions.map((s) => (
                                        <SelectItem key={s} value={s}>
                                          <Badge className={`${statusColors[s]} text-[10px]`}>{s}</Badge>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-xs">{item.responsavel}</TableCell>
                                <TableCell>
                                  <Textarea className="min-h-[36px] text-xs resize-none overflow-hidden" rows={2} placeholder="Obs..." value={data.observacoes} onChange={(e) => handleFieldChange(item.id, "observacoes", e.target.value)} />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default FranqueadoPortal;
