import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/useStores";
import { checklistCategories, StatusType } from "@/data/checklistData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TabsScrollableList } from "@/components/TabsScrollableList";
import CronogramaObra from "@/components/CronogramaObra";
import CustosObra from "@/components/CustosObra";
import DiarioObra from "@/components/DiarioObra";
import FornecedoresObra from "@/components/FornecedoresObra";
import ChecklistInauguracao from "@/components/ChecklistInauguracao";
import SolicitacoesLoja from "@/components/SolicitacoesLoja";
import ChecklistVisitaTecnica from "@/components/ChecklistVisitaTecnica";
import { InaugChecklistData } from "@/data/inauguracaoChecklistData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  User,
  Store,
  ClipboardCheck,
  Save,
  FileText,
  DollarSign,
  Printer,
  Pencil,
  Check,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logoConstanceSvg from "@/assets/logo-constance.svg";
import StorePhaseProgress from "@/components/StorePhaseProgress";
import EtapasTab from "@/components/etapas/EtapasTab";
import StoreHeaderKPIs from "@/components/store/StoreHeaderKPIs";
import StoreCommunication from "@/components/store/StoreCommunication";
import StoreCustosSummary from "@/components/store/StoreCustosSummary";
import HistoricoAtualizacoes from "@/components/store/HistoricoAtualizacoes";
import DatasTab from "@/components/store/DatasTab";
import TarefasTab from "@/components/store/TarefasTab";
import { useAutoMarkInaugurada } from "@/hooks/useAutoMarkInaugurada";
import { formatBR } from "@/utils/safeDate";

const statusColors: Record<StatusType, string> = {
  "NÃO INICIADO": "bg-secondary text-secondary-foreground",
  "EM COTAÇÃO": "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  "EM TRANSPORTE": "bg-[hsl(210,80%,55%)] text-[hsl(0,0%,100%)]",
  "REALIZADO": "bg-[hsl(142,60%,45%)] text-[hsl(0,0%,100%)]",
  "REALIZANDO": "bg-[hsl(152,50%,28%)] text-[hsl(0,0%,100%)]",
  "ATRASADO": "bg-destructive text-destructive-foreground",
  "NÃO SE APLICA": "bg-muted text-muted-foreground",
  "CONSTRUTORA": "bg-[hsl(270,50%,50%)] text-[hsl(0,0%,100%)]",
  "EM ELABORAÇÃO": "bg-[hsl(38,70%,60%)] text-[hsl(38,90%,15%)]",
  "EM ANÁLISE": "bg-[hsl(200,60%,55%)] text-[hsl(0,0%,100%)]",
  "EM CONTRATAÇÃO": "bg-[hsl(280,50%,55%)] text-[hsl(0,0%,100%)]",
  "EM ANDAMENTO": "bg-[hsl(45,90%,55%)] text-[hsl(45,90%,15%)]",
};

const StoreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getStore, updateStore } = useStores();
  const store = getStore(id || "");

  const [activeTab, setActiveTab] = useState("etapas");
  const { user } = useAuth();
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerFields, setHeaderFields] = useState({
    franqueado: "",
    construtor: "",
    analistaObra: "",
    inauguracao: "",
  });
  useEffect(() => {
    if (!user?.email) return;
    const check = async () => {
      const { data } = await supabase.rpc("is_authorized_team", { check_user_id: user.id });
      setIsTeamMember(!!data);
    };
    check();
  }, [user]);

  // Lê marcação de Inaugurada no Funil (pipeline_stores) para a barra de fases
  const [inauguradaInPipeline, setInauguradaInPipeline] = useState(false);
  useEffect(() => {
    if (!store?.filial) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("pipeline_stores")
        .select("status_geral")
        .eq("filial", store.filial)
        .is("deleted_at", null)
        .maybeSingle();
      if (cancelled) return;
      const sg = (data?.status_geral || "").toLowerCase();
      setInauguradaInPipeline(sg.startsWith("inaugurada"));
    })();
    return () => { cancelled = true; };
  }, [store?.filial]);

  // Auto-marca como Inaugurada no Funil quando o checklist atinge LIBERADO
  // (somente append; nunca apaga histórico)
  useAutoMarkInaugurada({
    filial: store?.filial,
    storeName: store?.nome,
    franqueado: store?.franqueado,
    analistaObra: store?.analistaObra,
    inauguracao: store?.inauguracao,
    inauguracaoChecklist: store?.inauguracaoChecklist,
    tipoLoja: store?.tipoLoja,
    onMarked: () => setInauguradaInPipeline(true),
  });

  // Category name editing with sync-to-all dialog
  const [pendingCatRename, setPendingCatRename] = useState<{ catId: string; newName: string } | null>(null);

  const getCategoryName = (catId: string, defaultName: string) => {
    const customNames = (store?.checklist as any)?._categoryNames as Record<string, string> | undefined;
    return customNames?.[catId] || defaultName;
  };

  const handleCategoryNameChange = (catId: string, newName: string) => {
    if (!store || !isTeamMember) return;
    // Save locally first
    const newChecklist = { ...store.checklist, _categoryNames: { ...((store.checklist as any)._categoryNames || {}), [catId]: newName } } as any;
    updateStore(store.id, { checklist: newChecklist });
  };

  const handleCategoryNameBlur = (catId: string, newName: string) => {
    if (!store || !isTeamMember) return;
    const originalName = checklistCategories.find(c => c.id === catId)?.nome || "";
    const currentCustom = ((store.checklist as any)?._categoryNames as Record<string, string>)?.[catId];
    // Only prompt if name actually changed from original
    if (newName && newName !== originalName && newName !== currentCustom) {
      setPendingCatRename({ catId, newName });
    }
  };

  const applyCatRenameToAll = useCallback(async () => {
    if (!pendingCatRename) return;
    const { data: allStores } = await supabase.from("stores").select("id, checklist");
    if (allStores) {
      for (const s of allStores) {
        if (s.id === store?.id) continue;
        const existingChecklist = (s.checklist as any) || {};
        const updated = {
          ...existingChecklist,
          _categoryNames: { ...(existingChecklist._categoryNames || {}), [pendingCatRename.catId]: pendingCatRename.newName },
        };
        await supabase.from("stores").update({ checklist: updated }).eq("id", s.id);
      }
      toast.success("Nome da categoria atualizado em todas as lojas!");
    }
    setPendingCatRename(null);
  }, [pendingCatRename, store]);

  const applyCatRenameOnlyHere = () => {
    toast.success("Nome alterado apenas nesta loja.");
    setPendingCatRename(null);
  };

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Loja não encontrada</h2>
          <Button onClick={() => navigate("/")}>Voltar</Button>
        </div>
      </div>
    );
  }

  const totalItems = checklistCategories.flatMap((c) => c.items).length;
  const doneItems = Object.values(store.checklist).filter(
    (c) => c.status === "REALIZADO" || c.status === "NÃO SE APLICA"
  ).length;
  const progress = Math.round((doneItems / totalItems) * 100);
  const atrasados = Object.values(store.checklist).filter((c) => c.status === "ATRASADO").length;

  const handleStatusChange = (itemId: number, status: StatusType) => {
    const newChecklist = { ...store.checklist };
    newChecklist[itemId] = { ...newChecklist[itemId], status };
    updateStore(store.id, { checklist: newChecklist });
  };

  const handleFieldChange = (itemId: number, field: "prazoInicial" | "prazoFinal" | "observacoes" | "descricao" | "atividade", value: string) => {
    const newChecklist = { ...store.checklist };
    newChecklist[itemId] = { ...newChecklist[itemId], [field]: value };
    updateStore(store.id, { checklist: newChecklist });
  };

  const getCategoryProgress = (categoryId: string) => {
    const cat = checklistCategories.find((c) => c.id === categoryId);
    if (!cat) return 0;
    const done = cat.items.filter(
      (item) =>
        store.checklist[item.id]?.status === "REALIZADO" ||
        store.checklist[item.id]?.status === "NÃO SE APLICA"
    ).length;
    return Math.round((done / cat.items.length) * 100);
  };

  const exportChecklistToExcel = async () => {
    if (!store) return;
    const categoryNames = (store.checklist as any)?._categoryNames || {};

    const statusExcelColors: Record<string, { bg: string; font: string }> = {
      "REALIZADO": { bg: "FF4CAF50", font: "FFFFFFFF" },
      "REALIZANDO": { bg: "FF2E7D47", font: "FFFFFFFF" },
      "EM ANDAMENTO": { bg: "FFFFC107", font: "FF333333" },
      "ATRASADO": { bg: "FFF44336", font: "FFFFFFFF" },
      "EM TRANSPORTE": { bg: "FF2196F3", font: "FFFFFFFF" },
      "EM COTAÇÃO": { bg: "FFFF9800", font: "FF333333" },
      "NÃO INICIADO": { bg: "FFE0E0E0", font: "FF555555" },
      "NÃO SE APLICA": { bg: "FF9E9E9E", font: "FFFFFFFF" },
      "CONSTRUTORA": { bg: "FF7E57C2", font: "FFFFFFFF" },
      "EM ELABORAÇÃO": { bg: "FFFFB74D", font: "FF333333" },
      "EM ANÁLISE": { bg: "FF42A5F5", font: "FFFFFFFF" },
      "EM CONTRATAÇÃO": { bg: "FFAB47BC", font: "FFFFFFFF" },
    };

    // Convert SVG logo to PNG base64
    const svgToBase64Png = (): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 300;
          canvas.height = 48;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, 300, 48);
          resolve(canvas.toDataURL("image/png").split(",")[1]);
        };
        img.onerror = () => resolve("");
        img.src = logoConstanceSvg;
      });
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = "Constance";
    const ws = wb.addWorksheet("Checklist");

    // Add logo
    const logoBase64 = await svgToBase64Png();
    if (logoBase64) {
      const logoId = wb.addImage({ base64: logoBase64, extension: "png" });
      ws.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 220, height: 35 },
      });
    }

    // Logo row height
    ws.getRow(1).height = 40;

    // Title row (row 2)
    ws.mergeCells("A2:H2");
    const titleCell = ws.getCell("A2");
    titleCell.value = `Checklist — ${store.nome}`;
    titleCell.font = { bold: true, size: 16, color: { argb: "FF1A1A2E" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
    ws.getRow(2).height = 32;

    // Store info row (row 3)
    ws.mergeCells("A3:H3");
    const infoCell = ws.getCell("A3");
    infoCell.value = `Franqueado: ${store.franqueado || "—"}  |  Construtor: ${store.construtor || "—"}  |  Analista: ${store.analistaObra || "—"}  |  Inauguração: ${formatBR(store.inauguracao)}`;
    infoCell.font = { size: 10, color: { argb: "FF666666" } };
    infoCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(3).height = 22;

    // Empty row
    ws.addRow([]);

    const obraIds = ["obra-aquisicao", "obra-execucao"];
    const headersWithPrazoInicial = ["#", "Atividade", "Responsável", "Status", "Prazo Inicial", "Prazo Final", "Descrição", "Observações"];
    const headersWithoutPrazoInicial = ["#", "Atividade", "Responsável", "Status", "Prazo Final", "Descrição", "Observações"];
    const colWidthsWithPrazo = [6, 55, 22, 18, 14, 14, 30, 30];
    const colWidthsWithoutPrazo = [6, 55, 22, 18, 14, 30, 30];

    checklistCategories.forEach((cat) => {
      const catName = categoryNames[cat.id] || cat.nome;
      const isObra = obraIds.includes(cat.id);
      const catHeaders = isObra ? headersWithPrazoInicial : headersWithoutPrazoInicial;
      const numCols = catHeaders.length;

      // Category header row
      const catRow = ws.addRow([catName]);
      ws.mergeCells(catRow.number, 1, catRow.number, numCols);
      const catCell = catRow.getCell(1);
      catCell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
      catCell.alignment = { horizontal: "left", vertical: "middle" };
      catRow.height = 24;

      // Column headers
      const headerRow = ws.addRow(catHeaders);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3949AB" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCCCCCC" } },
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
          left: { style: "thin", color: { argb: "FFCCCCCC" } },
          right: { style: "thin", color: { argb: "FFCCCCCC" } },
        };
      });
      headerRow.height = 20;

      // Data rows
      cat.items.forEach((item, idx) => {
        const data = store.checklist[item.id] || {} as any;
        const status = data.status || "NÃO INICIADO";
        const rowData = isObra
          ? [item.id, data.atividade || item.atividade, item.responsavel, status, data.prazoInicial || "", data.prazoFinal || "", data.descricao || "", data.observacoes || ""]
          : [item.id, data.atividade || item.atividade, item.responsavel, status, data.prazoFinal || "", data.descricao || "", data.observacoes || ""];
        const row = ws.addRow(rowData);

        const statusColNum = 4;
        const stripeBg = idx % 2 === 0 ? "FFFFFFFF" : "FFF8F9FA";
        row.eachCell((cell, colNum) => {
          cell.font = { size: 10 };
          cell.alignment = { vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE0E0E0" } },
            bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
            left: { style: "thin", color: { argb: "FFE0E0E0" } },
            right: { style: "thin", color: { argb: "FFE0E0E0" } },
          };

          if (colNum === statusColNum) {
            const colors = statusExcelColors[status] || { bg: "FFE0E0E0", font: "FF555555" };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.bg } };
            cell.font = { size: 10, bold: true, color: { argb: colors.font } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripeBg } };
          }

          if (colNum === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
        });
      });

      // Spacer row between categories
      ws.addRow([]);
    });

    // Set column widths (use the wider set)
    colWidthsWithPrazo.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Checklist_${store.nome.replace(/\s+/g, "_")}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };


  return (
    <div className="bg-background">
      <header className="border-b bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">{store.nome}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5 flex-wrap">
                {store.filial && (
                  <span className="flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" /> Filial: {store.filial}
                  </span>
                )}
                {editingHeader && isTeamMember ? (
                  <>
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      <Input className="h-7 text-xs w-36" placeholder="Franqueado" value={headerFields.franqueado} onChange={(e) => setHeaderFields(p => ({ ...p, franqueado: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>🏗️</span>
                      <Input className="h-7 text-xs w-36" placeholder="Construtor" value={headerFields.construtor} onChange={(e) => setHeaderFields(p => ({ ...p, construtor: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📋</span>
                      <Input className="h-7 text-xs w-36" placeholder="Analista" value={headerFields.analistaObra} onChange={(e) => setHeaderFields(p => ({ ...p, analistaObra: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <Input type="date" className="h-7 text-xs w-36" value={headerFields.inauguracao} onChange={(e) => setHeaderFields(p => ({ ...p, inauguracao: e.target.value }))} />
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                      updateStore(store.id, {
                        franqueado: headerFields.franqueado,
                        construtor: headerFields.construtor,
                        analistaObra: headerFields.analistaObra,
                        inauguracao: headerFields.inauguracao,
                      });
                      setEditingHeader(false);
                      toast.success("Dados atualizados!");
                    }}>
                      <Check className="h-3.5 w-3.5 text-[hsl(142,60%,45%)]" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingHeader(false)}>
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <>
                    {store.franqueado && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {store.franqueado}
                      </span>
                    )}
                    {store.construtor && (
                      <span className="flex items-center gap-1">
                        🏗️ {store.construtor}
                      </span>
                    )}
                    {store.analistaObra && (
                      <span className="flex items-center gap-1">
                        📋 {store.analistaObra}
                      </span>
                    )}
                    {store.inauguracao && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatBR(store.inauguracao)}
                      </span>
                    )}
                    {isTeamMember && (
                      <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => {
                        setHeaderFields({
                          franqueado: store.franqueado || "",
                          construtor: store.construtor || "",
                          analistaObra: store.analistaObra || "",
                          inauguracao: store.inauguracao || "",
                        });
                        setEditingHeader(true);
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(`/loja/${store.id}/relatorio`)}
              >
                <FileText className="h-4 w-4" /> Relatório Completo
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(`/loja/${store.id}/relatorio?secao=${activeTab}`)}
              >
                <Printer className="h-4 w-4" /> PDF da Aba
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={exportChecklistToExcel}
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel Checklist
              </Button>
            </div>
          </div>
          {/* Strip de KPIs da Loja */}
          <StoreHeaderKPIs store={store} progress={progress} atrasados={atrasados} />
          {/* Barra de Fases (Funil → Inaugurada) */}
          <div className="mb-3 px-1">
            <StorePhaseProgress store={store} inauguradaInPipeline={inauguradaInPipeline} />
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={progress} className="h-2.5" />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold">{progress}%</span>
              <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]">
                ✓ {doneItems}/{totalItems}
              </Badge>
              {atrasados > 0 && (
                <Badge variant="destructive">! {atrasados} atrasados</Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsScrollableList>
            <TabsTrigger value="dados" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors">
              📇 Dados
            </TabsTrigger>
            <TabsTrigger value="datas" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors">
              📅 Datas
            </TabsTrigger>
            <TabsTrigger value="etapas" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors">
              🧭 Etapas
            </TabsTrigger>
            <TabsTrigger value="obra" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors">
              🏗️ Obra
            </TabsTrigger>
            <TabsTrigger value="checklist-final" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors">
              🎉 Checklist Final
            </TabsTrigger>
            <TabsTrigger value="custos" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors">
              💰 Custos
            </TabsTrigger>
            <TabsTrigger value="diario" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors">
              📓 Diário
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium transition-colors">
              ✅ Tarefas
            </TabsTrigger>
          </TabsScrollableList>

          {/* 1. DADOS — cadastro/mestre da loja */}
          <TabsContent value="dados" className="mt-4">
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Dados da Loja</h3>
                <p className="text-sm text-muted-foreground">Informações mestre. Edições aparecem em todos os módulos.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome</label>
                  <Input value={store.nome} disabled={!isTeamMember} onChange={(e) => updateStore(store.id, { nome: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Filial</label>
                  <Input value={store.filial || ""} disabled={!isTeamMember} onChange={(e) => updateStore(store.id, { filial: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Franqueado</label>
                  <Input value={store.franqueado || ""} disabled={!isTeamMember} onChange={(e) => updateStore(store.id, { franqueado: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Construtor</label>
                  <Input value={store.construtor || ""} disabled={!isTeamMember} onChange={(e) => updateStore(store.id, { construtor: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Analista de Obra</label>
                  <Input value={store.analistaObra || ""} disabled={!isTeamMember} onChange={(e) => updateStore(store.id, { analistaObra: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tipo de Loja</label>
                  <Select value={(store.tipoLoja as any) || ""} disabled={!isTeamMember} onValueChange={(v) => updateStore(store.id, { tipoLoja: v } as any)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rua">Rua</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 2. DATAS — linha do tempo de datas-chave */}
          <TabsContent value="datas" className="mt-4">
            <DatasTab
              store={store}
              canEdit={isTeamMember}
              onUpdate={(patch) => updateStore(store.id, patch)}
            />
          </TabsContent>

          {/* 3. ETAPAS */}
          <TabsContent value="etapas" className="mt-4">
            <EtapasTab
              store={store}
              inauguradaInPipeline={inauguradaInPipeline}
              doneItems={doneItems}
              totalItems={totalItems}
              atrasados={atrasados}
              progress={progress}
              onJumpTab={(t) => setActiveTab(t)}
            />
          </TabsContent>

          {/* 4. OBRA — agrupa Cronograma, Visita Técnica, Fornecedores, Solicitações, Comunicação e categorias do checklist */}
          <TabsContent value="obra" className="mt-4">
            <Tabs defaultValue="cronograma">
              <TabsScrollableList>
                <TabsTrigger value="cronograma" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium">
                  📊 Cronograma
                </TabsTrigger>
                <TabsTrigger value="visita-tecnica" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium">
                  🔍 Visita Técnica
                </TabsTrigger>
                <TabsTrigger value="fornecedores" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium">
                  🏭 Fornecedores
                </TabsTrigger>
                <TabsTrigger value="solicitacoes" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium">
                  📋 Solicitações
                </TabsTrigger>
                <TabsTrigger value="comunicacao" className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium">
                  💬 Comunicação
                </TabsTrigger>
                {checklistCategories.map((cat) => {
                  const catProgress = getCategoryProgress(cat.id);
                  return (
                    <TabsTrigger key={cat.id} value={cat.id} className="bg-muted/50 text-muted-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-medium">
                      {getCategoryName(cat.id, cat.nome)}
                      <span className="ml-1.5 text-[10px] opacity-70">{catProgress}%</span>
                    </TabsTrigger>
                  );
                })}
              </TabsScrollableList>

              <TabsContent value="cronograma" className="mt-4">
                <CronogramaObra store={store} onUpdate={(cronograma) => updateStore(store.id, { cronograma })} />
              </TabsContent>
              <TabsContent value="visita-tecnica" className="mt-4">
                <ChecklistVisitaTecnica
                  storeId={store.id}
                  storeInauguracao={store.inauguracao || ""}
                  data={(store as any).visitaTecnica || {}}
                  onDataChange={(visitaTecnica) => updateStore(store.id, { visitaTecnica } as any)}
                />
              </TabsContent>
              <TabsContent value="fornecedores" className="mt-4">
                <FornecedoresObra />
              </TabsContent>
              <TabsContent value="solicitacoes" className="mt-4">
                <SolicitacoesLoja
                  data={(store as any).solicitacoes || {}}
                  onUpdate={(solicitacoes) => updateStore(store.id, { solicitacoes } as any)}
                />
              </TabsContent>
              <TabsContent value="comunicacao" className="mt-4">
                <StoreCommunication storeId={store.id} storeName={store.nome} franqueado={store.franqueado} />
              </TabsContent>

              {checklistCategories.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="mt-4">
                  {isTeamMember && (
                    <div className="mb-3">
                      <Input
                        className="h-9 text-sm font-semibold max-w-md"
                        value={getCategoryName(cat.id, cat.nome)}
                        onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)}
                        onBlur={(e) => handleCategoryNameBlur(cat.id, e.target.value)}
                      />
                    </div>
                  )}
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead className="min-w-[350px]">Atividade</TableHead>
                            <TableHead className="min-w-[140px]">Pré-requisito</TableHead>
                            {(cat.id === "obra-aquisicao" || cat.id === "obra-execucao") && (
                              <TableHead className="w-[130px]">Prazo Inicial</TableHead>
                            )}
                            <TableHead className="w-[130px]">Prazo Final</TableHead>
                            <TableHead className="w-[170px]">Status</TableHead>
                            <TableHead className="w-[140px]">Responsável</TableHead>
                            <TableHead className="min-w-[160px]">Observações</TableHead>
                            <TableHead className="min-w-[200px]">Passo a Passo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cat.items.map((item) => {
                            const data = store.checklist[item.id] || {
                              status: "NÃO INICIADO" as StatusType,
                              prazoInicial: "",
                              prazoFinal: "",
                              observacoes: "",
                            };
                            const isImpeditivo = item.atividade.includes("IMPEDITIVO");
                            return (
                              <TableRow
                                key={item.id}
                                className={
                                  data.status === "ATRASADO" ? "bg-destructive/5"
                                  : data.status === "REALIZADO" ? "bg-[hsl(142,60%,95%)]"
                                  : data.status === "REALIZANDO" ? "bg-[hsl(152,40%,92%)]"
                                  : data.status === "EM ANDAMENTO" ? "bg-[hsl(45,90%,95%)]"
                                  : isImpeditivo ? "bg-[hsl(38,90%,97%)]" : ""
                                }
                              >
                                <TableCell className="text-center font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                                <TableCell>
                                  <div className="text-sm break-words whitespace-normal">
                                    {isTeamMember ? (
                                      <Textarea
                                        className="min-h-[36px] text-xs font-medium resize-none overflow-hidden"
                                        rows={2}
                                        value={data.atividade || item.atividade}
                                        onChange={(e) => handleFieldChange(item.id, "atividade", e.target.value)}
                                      />
                                    ) : (
                                      <span className="whitespace-pre-line">{data.atividade || item.atividade}</span>
                                    )}
                                    {isImpeditivo && (
                                      <Badge variant="outline" className="ml-2 mt-1 text-[10px] border-[hsl(38,90%,55%)] text-[hsl(38,90%,40%)]">IMPEDITIVO</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.preRequisito || "—"}</TableCell>
                                {(cat.id === "obra-aquisicao" || cat.id === "obra-execucao") && (
                                  <TableCell>
                                    <Input type="date" className="h-8 text-xs" value={data.prazoInicial} onChange={(e) => handleFieldChange(item.id, "prazoInicial", e.target.value)} />
                                  </TableCell>
                                )}
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
                                <TableCell>
                                  <Textarea className="min-h-[36px] text-xs resize-none overflow-hidden" rows={2} placeholder="Instruções detalhadas..." value={data.descricao || ""} onChange={(e) => handleFieldChange(item.id, "descricao", e.target.value)} disabled={!isTeamMember} />
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
            </Tabs>
          </TabsContent>

          {/* 5. CHECKLIST FINAL */}
          <TabsContent value="checklist-final" className="mt-4">
            <ChecklistInauguracao
              tipoLoja={store.tipoLoja as "rua" | "shopping" | ""}
              data={store.inauguracaoChecklist || { rounds: [] }}
              onTipoChange={(tipo) => updateStore(store.id, { tipoLoja: tipo } as any)}
              onDataChange={(inaugData) => updateStore(store.id, { inauguracaoChecklist: inaugData } as any)}
            />
          </TabsContent>

          {/* 6. CUSTOS */}
          <TabsContent value="custos" className="mt-4 space-y-4">
            <StoreCustosSummary store={store} />
            <CustosObra store={store} onUpdate={(custos) => updateStore(store.id, { custos } as any)} />
          </TabsContent>

          {/* 7. DIÁRIO */}
          <TabsContent value="diario" className="mt-4 space-y-4">
            <HistoricoAtualizacoes storeId={store.id} storeFilial={store.filial} />
            <DiarioObra storeId={store.id} />
          </TabsContent>

          {/* 8. TAREFAS DA LOJA */}
          <TabsContent value="tarefas" className="mt-4">
            <TarefasTab storeId={store.id} storeName={store.nome} canEdit={isTeamMember} />
          </TabsContent>
        </Tabs>

        {/* Dialog for syncing category name to all stores */}
        <AlertDialog open={!!pendingCatRename} onOpenChange={(open) => !open && setPendingCatRename(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alterar nome em todas as lojas?</AlertDialogTitle>
              <AlertDialogDescription>
                Você alterou o nome da categoria para "<strong>{pendingCatRename?.newName}</strong>". 
                Deseja aplicar esta alteração em todas as lojas ou apenas nesta?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={applyCatRenameOnlyHere}>Apenas nesta loja</AlertDialogCancel>
              <AlertDialogAction onClick={applyCatRenameToAll}>Aplicar em todas</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default StoreDetail;
