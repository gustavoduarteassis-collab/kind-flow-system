import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Store, checklistCategories, StatusType, createDefaultChecklist } from "@/data/checklistData";
import { createDefaultCronograma } from "@/data/cronogramaData";
import CronogramaObra from "@/components/CronogramaObra";
import CustosObra from "@/components/CustosObra";
import DiarioObra from "@/components/DiarioObra";
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
  "NÃO INICIADO": "bg-secondary text-secondary-foreground",
  "EM COTAÇÃO": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  "EM TRANSPORTE": "bg-[hsl(200,70%,50%)] text-[hsl(0,0%,100%)]",
  "REALIZADO": "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]",
  "ATRASADO": "bg-destructive text-destructive-foreground",
  "NÃO SE APLICA": "bg-muted text-muted-foreground",
  "CONSTRUTORA": "bg-[hsl(270,50%,50%)] text-[hsl(0,0%,100%)]",
  "EM ELABORAÇÃO": "bg-[hsl(38,70%,60%)] text-[hsl(38,90%,15%)]",
  "EM ANÁLISE": "bg-[hsl(200,60%,55%)] text-[hsl(0,0%,100%)]",
  "EM CONTRATAÇÃO": "bg-[hsl(280,50%,55%)] text-[hsl(0,0%,100%)]",
};

type Permissions = {
  can_view_checklist: boolean;
  can_edit_checklist: boolean;
  can_view_cronograma: boolean;
  can_edit_cronograma: boolean;
  can_view_diario: boolean;
  can_edit_diario: boolean;
  can_view_custos: boolean;
  can_edit_custos: boolean;
};

const FranqueadoPortal = () => {
  const { user, signOut } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({
    can_view_checklist: true, can_edit_checklist: true,
    can_view_cronograma: true, can_edit_cronograma: true,
    can_view_diario: true, can_edit_diario: true,
    can_view_custos: true, can_edit_custos: true,
  });
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
    const perms: Permissions = {
      can_view_checklist: acc.can_view_checklist ?? true,
      can_edit_checklist: acc.can_edit_checklist ?? true,
      can_view_cronograma: acc.can_view_cronograma ?? true,
      can_edit_cronograma: acc.can_edit_cronograma ?? true,
      can_view_diario: acc.can_view_diario ?? true,
      can_edit_diario: acc.can_edit_diario ?? true,
      can_view_custos: acc.can_view_custos ?? true,
      can_edit_custos: acc.can_edit_custos ?? true,
    };
    setPermissions(perms);

    // Set default active tab based on permissions
    if (perms.can_view_cronograma) setActiveTab("cronograma");
    else if (perms.can_view_checklist) setActiveTab(checklistCategories[0]?.id || "");
    else if (perms.can_view_diario) setActiveTab("diario");
    else if (perms.can_view_custos) setActiveTab("custos");

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

  const totalItems = checklistCategories.flatMap((c) => c.items).length;
  const doneItems = Object.values(store.checklist).filter(
    (c) => c.status === "REALIZADO" || c.status === "NÃO SE APLICA"
  ).length;
  const progress = Math.round((doneItems / totalItems) * 100);

  const handleStatusChange = (itemId: number, status: StatusType) => {
    if (!permissions.can_edit_checklist) return;
    const newChecklist = { ...store.checklist };
    newChecklist[itemId] = { ...newChecklist[itemId], status };
    updateStore({ checklist: newChecklist });
  };

  const handleFieldChange = (itemId: number, field: "prazoInicial" | "prazoFinal" | "observacoes", value: string) => {
    if (!permissions.can_edit_checklist) return;
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

  const canEdit = permissions.can_edit_checklist;

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
              <p className="text-sm text-muted-foreground">Portal do Franqueado</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
          {permissions.can_view_checklist && (
            <div className="flex items-center gap-4">
              <Progress value={progress} className="h-2.5 flex-1" />
              <span className="font-semibold text-sm">{progress}%</span>
              <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]">✓ {doneItems}/{totalItems}</Badge>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              {permissions.can_view_cronograma && (
                <TabsTrigger value="cronograma" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                  📊 Cronograma
                </TabsTrigger>
              )}
              {permissions.can_view_checklist && checklistCategories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                  {cat.nome}
                  <span className="ml-1.5 text-[10px] opacity-70">{getCategoryProgress(cat.id)}%</span>
                </TabsTrigger>
              ))}
              {permissions.can_view_diario && (
                <TabsTrigger value="diario" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                  📋 Diário de Obra
                </TabsTrigger>
              )}
              {permissions.can_view_custos && (
                <TabsTrigger value="custos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                  💰 Custos
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {permissions.can_view_cronograma && (
            <TabsContent value="cronograma" className="mt-4">
              <CronogramaObra
                store={store}
                onUpdate={permissions.can_edit_cronograma ? (cronograma) => updateStore({ cronograma }) : () => {}}
              />
            </TabsContent>
          )}

          {permissions.can_view_checklist && checklistCategories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="mt-4">
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead className="min-w-[280px]">Atividade</TableHead>
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
                        const data = store.checklist[item.id] || { status: "NÃO INICIADO" as StatusType, prazoInicial: "", prazoFinal: "", observacoes: "" };
                        const isImpeditivo = item.atividade.includes("IMPEDITIVO");
                        return (
                          <TableRow key={item.id} className={
                            data.status === "ATRASADO" ? "bg-destructive/5" :
                            data.status === "REALIZADO" ? "bg-[hsl(152,60%,95%)]" :
                            isImpeditivo ? "bg-[hsl(38,90%,97%)]" : ""
                          }>
                            <TableCell className="text-center font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {item.atividade}
                                {isImpeditivo && <Badge variant="outline" className="ml-2 text-[10px] border-[hsl(38,90%,55%)] text-[hsl(38,90%,40%)]">IMPEDITIVO</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.preRequisito || "—"}</TableCell>
                            <TableCell>
                              {canEdit ? (
                                <Input type="date" className="h-8 text-xs" value={data.prazoInicial} onChange={(e) => handleFieldChange(item.id, "prazoInicial", e.target.value)} />
                              ) : (
                                <span className="text-xs">{data.prazoInicial || "—"}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {canEdit ? (
                                <Input type="date" className="h-8 text-xs" value={data.prazoFinal} onChange={(e) => handleFieldChange(item.id, "prazoFinal", e.target.value)} />
                              ) : (
                                <span className="text-xs">{data.prazoFinal || "—"}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {canEdit ? (
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
                              ) : (
                                <Badge className={`${statusColors[data.status]} text-[10px]`}>{data.status}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{item.responsavel}</TableCell>
                            <TableCell>
                              {canEdit ? (
                                <Input className="h-8 text-xs" placeholder="Obs..." value={data.observacoes} onChange={(e) => handleFieldChange(item.id, "observacoes", e.target.value)} />
                              ) : (
                                <span className="text-xs">{data.observacoes || "—"}</span>
                              )}
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

          {permissions.can_view_diario && (
            <TabsContent value="diario" className="mt-4">
              <DiarioObra storeId={store.id} />
            </TabsContent>
          )}

          {permissions.can_view_custos && (
            <TabsContent value="custos" className="mt-4">
              <CustosObra store={store} onUpdate={permissions.can_edit_custos ? (custos) => updateStore({ custos } as any) : () => {}} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default FranqueadoPortal;