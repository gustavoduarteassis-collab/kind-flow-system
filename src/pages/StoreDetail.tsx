import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logoConstanceSvg from "@/assets/logo-constance.svg";

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

const StoreDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getStore, updateStore } = useStores();
  const store = getStore(id || "");

  const [activeTab, setActiveTab] = useState("cronograma");
  const { user } = useAuth();
  const [isTeamMember, setIsTeamMember] = useState(false);
  const phaseCategories = [
    { id: 'pre-obra', label: '1. Pré-Obra', categories: ['documental-fiscal', 'projetos'] },
    { id: 'obra', label: '2. Obra', categories: ['obra-aquisicao', 'obra-execucao'] },
    { id: 'setup', label: '3. Setup / Contas', categories: ['informatica', 'mobiliario-apoio', 'papelaria-contratos', 'contratacao-pessoal'] },
    { id: 'abertura', label: '4. Abertura / Campo', categories: ['marketing'] }
  ];

  const [editingHeader, setEditingHeader] = useState(false);
  const [headerFields, setHeaderFields] = useState({
    franqueado: store?.franqueado || "",
    construtor: store?.construtor || "",
    analistaObra: store?.analistaObra || "",
    inauguracao: store?.inauguracao || "",
    razaoSocial: store?.razaoSocial || "",
    porte: store?.porte || "",
    cidade: store?.cidade || "",
    uf: store?.uf || "",
    filial: store?.filial || "",
  });

  useEffect(() => {
    if (!user?.email) return;
    const check = async () => {
      const { data } = await supabase.rpc("is_authorized_team", { check_user_id: user.id });
      setIsTeamMember(!!data);
    };
    check();
  }, [user]);

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

  const allChecklistItems = checklistCategories.flatMap((c) => c.items);
  const applicableItems = allChecklistItems.filter(item => store.checklist[item.id]?.status !== "NÃO SE APLICA");
  const totalItems = allChecklistItems.length;
  const getStatusScore = (status?: StatusType): number => {
    if (status === "REALIZADO") return 100;
    if (status === "NÃO SE APLICA") return 0;
    if (!status || status === "NÃO REALIZADO" || status === "ATRASADO") return 0;
    return 50; // All other "in progress" statuses
  };

  const totalScore = allChecklistItems.reduce((acc, item) => acc + getStatusScore(store.checklist[item.id]?.status), 0);
  const maxScore = applicableItems.length * 100;
  const progress = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const doneItems = allChecklistItems.filter(item => store.checklist[item.id]?.status === "REALIZADO").length;
  const atrasados = allChecklistItems.filter((item) => store.checklist[item.id]?.status === "ATRASADO").length;

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
    const applicable = cat.items.filter(item => store.checklist[item.id]?.status !== "NÃO SE APLICA");
    const totalScore = cat.items.reduce((acc, item) => acc + getStatusScore(store.checklist[item.id]?.status), 0);
    const maxScore = applicable.length * 100;
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
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
      "NÃO REALIZADO": { bg: "FFE0E0E0", font: "FF555555" },
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
    infoCell.value = `Franqueado: ${store.franqueado || "—"}  |  Construtor: ${store.construtor || "—"}  |  Analista: ${store.analistaObra || "—"}  |  Inauguração: ${store.inauguracao ? new Date(store.inauguracao + "T00:00:00").toLocaleDateString("pt-BR") : "—"}`;
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
        const status = data.status || "NÃO REALIZADO";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
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
                        {new Date(store.inauguracao + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {isTeamMember && (
                      <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => {
                        setHeaderFields({
                          franqueado: store.franqueado || "",
                          construtor: store.construtor || "",
                          analistaObra: store.analistaObra || "",
                          inauguracao: store.inauguracao || "",
                          razaoSocial: store.razaoSocial || "",
                          porte: store.porte || "",
                          cidade: store.cidade || "",
                          uf: store.uf || "",
                          filial: store.filial || "",
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                onClick={() => {
                  const msg = `Olá! Seguem os dados para implantação da loja ${store.nome} (${store.filial}):\nRazão Social: ${store.razaoSocial || 'N/A'}\nCidade/UF: ${store.cidade || 'N/A'}/${store.uf || 'N/A'}\nInauguração: ${store.inauguracao || 'N/A'}`;
                  navigator.clipboard.writeText(msg);
                  toast.success("Mensagem padrão copiada!");
                }}
              >
                <svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.556 5.332-11.891 11.891-11.891 3.181 0 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.481 8.403 0 6.556-5.332 11.891-11.891 11.891-1.992 0-3.951-.499-5.688-1.447l-6.305 1.665zm6.357-3.935c1.513.899 3.178 1.373 4.884 1.373 5.085 0 9.224-4.141 9.224-9.224 0-2.465-.96-4.782-2.704-6.526s-4.061-2.704-6.52-2.704c-5.085 0-9.226 4.141-9.226 9.224 0 1.817.534 3.593 1.543 5.132l-1.011 3.693 3.794-1.001zm11.366-6.143c-.071-.117-.259-.187-.541-.327-.281-.14-.1.664-.819.865-.328.093-.655.023-.843-.047-.187-.07-.79-.292-1.503-.927-.556-.496-.931-1.108-1.041-1.296-.11-.188-.012-.289.082-.382.085-.085.187-.222.281-.334.094-.111.125-.187.188-.313.062-.125.031-.234-.016-.327-.047-.094-.421-1.015-.578-1.393-.153-.367-.308-.317-.421-.323l-.36-.006c-.125 0-.328.047-.5.234-.172.187-.656.641-.656 1.562 0 .921.671 1.812.766 1.937.094.125 1.32 2.015 3.197 2.825.447.192.795.307 1.068.394.448.142.855.122 1.177.074.359-.054 1.107-.452 1.263-.889.155-.437.155-.812.108-.889z"/></svg>
                Copiar Msg WhatsApp
              </Button>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-slate-700">{progress}%</span>
              <Badge className="bg-green-500 text-white border-none">
                ✓ {doneItems}/{totalItems}
              </Badge>
              {atrasados > 0 && (
                <Badge variant="destructive">! {atrasados} atrasados</Badge>
              )}
            </div>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Phase Timeline */}
        <div className="bg-white rounded-xl p-6 border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Pipeline de Implantação</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Fase Atual:</span>
              <Select 
                value={store.faseAtual || "Pré-Obra"} 
                onValueChange={(v) => updateStore(store.id, { faseAtual: v as any })}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs font-bold border-none bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pré-Obra">Pré-Obra</SelectItem>
                  <SelectItem value="Obra">Obra</SelectItem>
                  <SelectItem value="Setup">Setup</SelectItem>
                  <SelectItem value="Abertura">Abertura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
            <div className="relative flex justify-between">
              {['Pré-Obra', 'Obra', 'Setup', 'Abertura'].map((phase, idx) => {
                const phases = ['Pré-Obra', 'Obra', 'Setup', 'Abertura'];
                const currentIdx = phases.indexOf(store.faseAtual || "Pré-Obra");
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                
                return (
                  <div key={phase} className="flex flex-col items-center gap-3 relative z-10">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-4 transition-all ${
                      isCompleted ? 'bg-green-500 border-green-100 text-white' :
                      isCurrent ? 'bg-[hsl(38,70%,50%)] border-[hsl(38,70%,90%)] text-white scale-110 shadow-lg' :
                      'bg-white border-slate-100 text-slate-300'
                    }`}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-tight ${
                      isCurrent ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      {phase}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>

          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              <TabsTrigger
                value="cronograma"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                📊 Cronograma de Obra
              </TabsTrigger>
              <TabsTrigger
                value="custos"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                💰 Custos
              </TabsTrigger>
              <TabsTrigger
                value="diario"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                📓 Diário de Obra
              </TabsTrigger>
              <TabsTrigger
                value="fornecedores"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                🏭 Fornecedores
              </TabsTrigger>
              <TabsTrigger
                value="visita-tecnica"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                🔍 Visita Técnica
              </TabsTrigger>
              <TabsTrigger
                value="solicitacoes"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                📋 Solicitações
              </TabsTrigger>
              <TabsTrigger
                value="inauguracao"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                🎉 Checklist Inauguração
              </TabsTrigger>
              {phaseCategories.map((phase) => {
                const isCurrentPhase = (store.faseAtual === 'Pré-Obra' && phase.id === 'pre-obra') ||
                                     (store.faseAtual === 'Obra' && phase.id === 'obra') ||
                                     (store.faseAtual === 'Setup' && phase.id === 'setup') ||
                                     (store.faseAtual === 'Abertura' && phase.id === 'abertura');
                return (
                  <TabsTrigger
                    key={phase.id}
                    value={phase.id}
                    className={`data-[state=active]:bg-[hsl(38,70%,50%)] data-[state=active]:text-white rounded-lg px-3 py-2 text-xs sm:text-sm whitespace-nowrap font-bold ${
                      isCurrentPhase ? 'border-b-2 border-b-[hsl(38,70%,30%)] shadow-sm' : ''
                    }`}
                  >
                    {phase.label}
                  </TabsTrigger>
                );
              })}

            </TabsList>
          </div>

          <TabsContent value="cronograma" className="mt-4">
            <CronogramaObra
              store={store}
              onUpdate={(cronograma) => updateStore(store.id, { cronograma })}
            />
          </TabsContent>

          <TabsContent value="custos" className="mt-4">
            <CustosObra
              store={store}
              onUpdate={(custos) => updateStore(store.id, { custos } as any)}
            />
          </TabsContent>

          <TabsContent value="diario" className="mt-4">
            <DiarioObra storeId={store.id} />
          </TabsContent>

          <TabsContent value="fornecedores" className="mt-4">
            <FornecedoresObra />
          </TabsContent>

          <TabsContent value="visita-tecnica" className="mt-4">
            <ChecklistVisitaTecnica
              storeId={store.id}
              storeInauguracao={store.inauguracao || ""}
              data={(store as any).visitaTecnica || {}}
              onDataChange={(visitaTecnica) => updateStore(store.id, { visitaTecnica } as any)}
            />
          </TabsContent>

          <TabsContent value="solicitacoes" className="mt-4">
            <SolicitacoesLoja
              data={(store as any).solicitacoes || {}}
              onUpdate={(solicitacoes) => updateStore(store.id, { solicitacoes } as any)}
            />
          </TabsContent>

          <TabsContent value="inauguracao" className="mt-4">
            <ChecklistInauguracao
              tipoLoja={store.tipoLoja as "rua" | "shopping" | ""}
              data={store.inauguracaoChecklist || { rounds: [] }}
              onTipoChange={(tipo) => updateStore(store.id, { tipoLoja: tipo } as any)}
              onDataChange={(inaugData) => updateStore(store.id, { inauguracaoChecklist: inaugData } as any)}
            />
          </TabsContent>

          {phaseCategories.map((phase) => (
            <TabsContent key={phase.id} value={phase.id} className="mt-4 space-y-8">
              {phase.categories.map((catId) => {
                const cat = checklistCategories.find(c => c.id === catId);
                if (!cat) return null;
                return (
                  <div key={cat.id} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[hsl(38,70%,50%)]" />
                        {getCategoryName(cat.id, cat.nome)}
                      </h4>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {getCategoryProgress(cat.id)}% Concluído
                      </Badge>
                    </div>
                    
                    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="w-12 text-center text-[10px] uppercase font-bold text-slate-500">#</TableHead>
                              <TableHead className="min-w-[350px] text-[10px] uppercase font-bold text-slate-500">Atividade</TableHead>
                              <TableHead className="w-[130px] text-[10px] uppercase font-bold text-slate-500">Prazo Final</TableHead>
                              <TableHead className="w-[170px] text-[10px] uppercase font-bold text-slate-500">Status</TableHead>
                              <TableHead className="w-[140px] text-[10px] uppercase font-bold text-slate-500">Responsável</TableHead>
                              <TableHead className="min-w-[160px] text-[10px] uppercase font-bold text-slate-500">Observações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cat.items.map((item) => {
                              const data = store.checklist[item.id] || {
                                status: "NÃO REALIZADO" as StatusType,
                                prazoInicial: "",
                                prazoFinal: "",
                                observacoes: "",
                              };
                              const isImpeditivo = item.atividade.includes("IMPEDITIVO");
                              
                              const statusStyles: Record<string, string> = {
                                "REALIZADO": "bg-green-50 text-green-700 border-green-200",
                                "EM ANDAMENTO": "bg-amber-50 text-amber-700 border-amber-200",
                                "NÃO REALIZADO": "bg-red-50 text-red-700 border-red-200",
                                "NÃO SE APLICA": "bg-slate-50 text-slate-500 border-slate-200",
                              };

                              return (
                                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                  <TableCell className="text-center font-mono text-[10px] text-slate-400">
                                    {item.id}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      <p className="text-xs font-medium text-slate-900 leading-tight">
                                        {data.atividade || item.atividade}
                                      </p>
                                  {isImpeditivo && (
                                    <Badge className="w-fit bg-red-100 text-red-700 text-[8px] font-bold border-none h-4">
                                      IMPEDITIVO
                                    </Badge>
                                  )}
                                  {(item.id === 5 || item.id === 6) && store.inauguracao && (
                                    (() => {
                                      const opening = new Date(store.inauguracao + "T00:00:00");
                                      const diffDays = Math.ceil((opening.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                      if (diffDays > 30) {
                                        return (
                                          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                                            <AlertTriangle className="h-3 w-3" />
                                            AGUARDAR (Faltam {diffDays} dias)
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()
                                  )}

                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="date"
                                      className="h-8 text-[10px] border-none bg-slate-50"
                                      value={data.prazoFinal}
                                      onChange={(e) => handleFieldChange(item.id, "prazoFinal", e.target.value)}
                                      disabled={!isTeamMember}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={data.status}
                                      onValueChange={(v: StatusType) => handleStatusChange(item.id, v)}
                                      disabled={!isTeamMember}
                                    >
                                      <SelectTrigger className={`h-8 text-[10px] font-bold ${statusStyles[data.status] || "bg-slate-100"}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="REALIZADO">REALIZADO</SelectItem>
                                        <SelectItem value="EM ANDAMENTO">EM ANDAMENTO</SelectItem>
                                        <SelectItem value="NÃO REALIZADO">NÃO REALIZADO</SelectItem>
                                        <SelectItem value="NÃO SE APLICA">NÃO SE APLICA</SelectItem>
                                        {cat.statusOptions.filter(o => !["REALIZADO", "EM ANDAMENTO", "NÃO REALIZADO", "NÃO SE APLICA"].includes(o)).map(opt => (
                                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-[10px] text-slate-500 font-medium">
                                    {item.responsavel}
                                  </TableCell>
                                  <TableCell>
                                    <Textarea
                                      className="min-h-[32px] text-[10px] border-none bg-slate-50 resize-none"
                                      placeholder="Adicionar observação..."
                                      value={data.observacoes}
                                      onChange={(e) => handleFieldChange(item.id, "observacoes", e.target.value)}
                                      disabled={!isTeamMember}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}

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
