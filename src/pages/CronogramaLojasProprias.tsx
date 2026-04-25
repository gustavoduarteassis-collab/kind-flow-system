import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, ArrowLeft, Calendar, Clock, CheckCircle2, AlertCircle, HardHat, Download, Eye, ChevronLeft, ChevronRight, FileText
} from "lucide-react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, 
  isSameDay, parseISO, isValid, addDays, startOfYear, endOfYear, 
  isWithinInterval, eachMonthOfInterval, subMonths, isSameMonth, differenceInDays
} from "date-fns";
import { ptBR } from "date-fns/locale";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type CronogramaStore = {

  id: string;
  nome: string;
  filial: string;
  inauguracao: string;
  data_inicio?: string;
  tipo_loja: string;
  status: string;
  is_propria: boolean;
  is_reforma: boolean;
};

const CronogramaLojasProprias = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<CronogramaStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewGantt, setViewGantt] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStores = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("stores")
        .select("id, nome, filial, inauguracao, tipo_loja, franqueado")
        .order('nome');

      if (data) {
        // Mapeamento das lojas para o cronograma
        const cronogramaManual = [
          { busca: "Riomar Recife", display: "Riomar Recife - Recife", tipo: "reforma" },
          { busca: "Boulevard", display: "Shopping Boulevard - Belo Horizonte", tipo: "reforma" },
          { busca: "Shopping Recife", display: "Shopping Recife - Recife", tipo: "reforma" },
          { busca: "Costa Dourada", display: "Shopping Costa Dourada - Cabo", tipo: "reforma" },
          { busca: "Salvador", display: "Shopping em Salvador - Salvador", tipo: "reforma" },
          { busca: "Bela Vista", display: "Shopping Bela Vista - Recife", tipo: "reforma" },
          { busca: "Minas Shopping", display: "Minas Shopping II – BH", tipo: "reforma" },
          { busca: "Ibirapuera", display: "Ibirapuera Shopping - São Paulo", tipo: "nova" },
          { busca: "Recife Outlet", display: "Recife Outlet - Moreno/PE", tipo: "nova" },
          { busca: "Aricanduva", display: "Shopping Aricanduva - SP", tipo: "nova" }
        ];

        // Criamos a lista baseada no cronogramaManual
        const storesList = cronogramaManual.map((m, index) => {
          // Tenta encontrar uma loja no banco que combine com o termo de busca
          const dbStore = data.find(s => (s.nome || "").toLowerCase().includes(m.busca.toLowerCase()));
          
          const isReforma = m.tipo === "reforma";
          
          return {
            id: dbStore?.id || `manual-${index}`,
            nome: m.display,
            filial: dbStore?.filial || "S/F",
            inauguracao: dbStore?.inauguracao ? dbStore.inauguracao.split('T')[0] : "2026-12-31",
            data_inicio: dbStore?.inauguracao ? addDays(new Date(dbStore.inauguracao), -60).toISOString().split('T')[0] : "2026-10-01",
            tipo_loja: dbStore?.tipo_loja || (isReforma ? "reforma" : "nova"),
            status: isReforma ? "Em Reforma" : "Em Andamento",
            is_propria: !isReforma,
            is_reforma: isReforma,
          };
        });

        setStores(storesList);
      }
      setLoading(false);
    };

    fetchStores();
  }, [user]);

  const timelineDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const updateStoreDate = (id: string, field: 'data_inicio' | 'inauguracao', value: string) => {
    setStores(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CRONOGRAMA DE LOJAS PRÓPRIAS 2026');

    // Inserir Logo via Base64 (Logo simplificada da Constance em texto estilizado se imagem não disponível)
    // Para inserir uma imagem real, precisaríamos do buffer da imagem. 
    // Como alternativa robusta, vamos configurar o cabeçalho para ser fixo e visível.

    // Configuração do período (Abril 2026 até Dezembro 2026)
    const startDate = new Date(2026, 3, 1); // Abril
    const endDate = new Date(2026, 11, 31); // Dezembro
    const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate });
    const monthsInInterval = eachMonthOfInterval({ start: startDate, end: endDate });
    
    // Título Principal
    const totalCols = 5 + daysInInterval.length;
    worksheet.mergeCells('A1:E1'); // Fixa o título nas colunas que não rolam
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = 'CONSTANCE - CRONOGRAMA DE LOJAS PRÓPRIAS 2026';
    titleCell.font = { name: 'Inter', family: 2, size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3728' } }; // Marrom Escuro

    // Linha dos Meses
    let currentDayCol = 6;
    monthsInInterval.forEach((month) => {
      const start = isSameMonth(month, startDate) ? startDate : startOfMonth(month);
      const end = isSameMonth(month, endDate) ? endDate : endOfMonth(month);
      const days = eachDayOfInterval({ start, end });
      
      const startCol = currentDayCol;
      const endCol = currentDayCol + days.length - 1;
      
      worksheet.mergeCells(2, startCol, 2, endCol);
      const mCell = worksheet.getCell(2, startCol);
      mCell.value = format(month, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
      mCell.font = { name: 'Inter', family: 2, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      mCell.alignment = { horizontal: 'center', vertical: 'middle' };
      mCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5A2B' } }; // Marrom Claro
      mCell.border = { left: { style: 'thin', color: { argb: 'FFFFFFFF' } } };
      
      currentDayCol += days.length;
    });

    // Cabeçalho da Tabela
    const headerRow = worksheet.getRow(3);
    const tableHeaderStyle = {
      font: { name: 'Inter', family: 2, bold: true, size: 9, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A3728' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    };

    headerRow.getCell(1).value = "LOJA";
    headerRow.getCell(2).value = "TIPO";
    headerRow.getCell(3).value = "INÍCIO";
    headerRow.getCell(4).value = "INAUGURAÇÃO";
    headerRow.getCell(5).value = "PRAZO";
    
    for (let i = 1; i <= 5; i++) {
      headerRow.getCell(i).style = tableHeaderStyle as any;
    }

    // Dias do Mês
    daysInInterval.forEach((day, i) => {
      const cell = headerRow.getCell(6 + i);
      cell.value = format(day, 'dd');
      cell.style = tableHeaderStyle as any;
    });

    // Ordenar lojas: Novas primeiro, depois Reformas
    const sortedStores = [
      ...stores.filter(s => !s.is_reforma),
      ...stores.filter(s => s.is_reforma)
    ];

    let currentExcelRow = 4;
    let hasShownNewStoresTitle = false;
    let hasShownReformTitle = false;

    // Dados das Lojas
    sortedStores.forEach((s) => {
      // Adicionar títulos de seção
      if (!s.is_reforma && !hasShownNewStoresTitle) {
        worksheet.mergeCells(currentExcelRow, 1, currentExcelRow, 5);
        const titleCell = worksheet.getCell(currentExcelRow, 1);
        titleCell.value = 'OBRAS NOVAS';
        titleCell.font = { name: 'Inter', family: 2, size: 10, bold: true, color: { argb: 'FF4A3728' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
        titleCell.border = { bottom: { style: 'thin' } };
        
        // Bordas para as colunas de dias na linha de título
        daysInInterval.forEach((_, i) => {
          const cell = worksheet.getRow(currentExcelRow).getCell(6 + i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
          cell.border = { bottom: { style: 'thin' } };
        });
        
        hasShownNewStoresTitle = true;
        currentExcelRow++;
      } else if (s.is_reforma && !hasShownReformTitle) {
        worksheet.mergeCells(currentExcelRow, 1, currentExcelRow, 5);
        const titleCell = worksheet.getCell(currentExcelRow, 1);
        titleCell.value = 'REFORMAS';
        titleCell.font = { name: 'Inter', family: 2, size: 10, bold: true, color: { argb: 'FF4A3728' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
        titleCell.border = { bottom: { style: 'thin' }, top: { style: 'medium', color: { argb: 'FF4A3728' } } };
        
        // Bordas para as colunas de dias na linha de título
        daysInInterval.forEach((_, i) => {
          const cell = worksheet.getRow(currentExcelRow).getCell(6 + i);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
          cell.border = { bottom: { style: 'thin' }, top: { style: 'medium', color: { argb: 'FF4A3728' } } };
        });
        
        hasShownReformTitle = true;
        currentExcelRow++;
      }

      const row = worksheet.getRow(currentExcelRow);
      
      row.getCell(1).value = s.nome.toUpperCase();
      row.getCell(2).value = s.is_reforma ? 'REFORMA' : 'OBRA NOVA';
      
      const startVal = s.data_inicio ? new Date(s.data_inicio) : null;
      const endVal = s.inauguracao ? new Date(s.inauguracao) : null;
      
      if (startVal) {
        const c = row.getCell(3);
        c.value = startVal;
        c.numFmt = 'dd/mm/yyyy';
      }
      if (endVal) {
        const c = row.getCell(4);
        c.value = endVal;
        c.numFmt = 'dd/mm/yyyy';
      }

      row.getCell(5).value = { formula: `IF(AND(C${currentExcelRow}<>"", D${currentExcelRow}<>""), D${currentExcelRow}-C${currentExcelRow} & " DIAS", "--")` };

      // Estilo colunas fixas
      for (let i = 1; i <= 5; i++) {
        const cell = row.getCell(i);
        cell.font = { name: 'Inter', family: 2, size: 9 };
        cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }

      // Bordas para as colunas de dias
      daysInInterval.forEach((_, i) => {
        const cell = row.getCell(6 + i);
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      currentExcelRow++;
    });

    // Formatação Condicional para cada dia (ajustado para o novo range de linhas)
    daysInInterval.forEach((day, i) => {
      const colLetter = worksheet.getColumn(6 + i).letter;
      const excelDayVal = Math.floor(day.getTime() / (24 * 60 * 60 * 1000) + 25569);

      worksheet.addConditionalFormatting({
        ref: `${colLetter}4:${colLetter}${currentExcelRow - 1}`,
        rules: [
          {
            type: 'expression',
            priority: 1,
            formulae: [`AND($B4="OBRA NOVA", $C4<=${excelDayVal}, $D4>=${excelDayVal})`],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF8B5A2B' } } }, // Marrom Claro para Obras
          },
          {
            type: 'expression',
            priority: 2,
            formulae: [`AND($B4="REFORMA", $C4<=${excelDayVal}, $D4>=${excelDayVal})`],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF4A3728' } } }, // Marrom Escuro para Reformas
          }
        ]
      });
    });

    // Largura das colunas
    worksheet.getColumn(1).width = 40;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 12;
    worksheet.getColumn(4).width = 12;
    worksheet.getColumn(5).width = 12;
    for (let i = 6; i <= 5 + daysInInterval.length; i++) {
      worksheet.getColumn(i).width = 3.5;
    }

    // Congelar painéis para facilitar navegação (Coluna A até E e as 3 primeiras linhas)
    worksheet.views = [{ state: 'frozen', xSplit: 5, ySplit: 3 }];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Cronograma_Constance_2026.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3' // A3 para ter mais espaço lateral
    });

    const startDate = new Date(2026, 3, 1);
    const endDate = new Date(2026, 11, 31);
    const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate });
    const monthsInInterval = eachMonthOfInterval({ start: startDate, end: endDate });

    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(74, 55, 40);
    doc.text('CONSTANCE - CRONOGRAMA DE LOJAS PRÓPRIAS 2026', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

    const sortedStores = [
      ...stores.filter(s => !s.is_reforma),
      ...stores.filter(s => s.is_reforma)
    ];

    // Cabeçalho de Meses (Primeira linha da tabela)
    const monthHeader: any[] = [
      { content: '', colSpan: 4 },
    ];
    
    monthsInInterval.forEach(month => {
      const monthStart = isSameMonth(month, startDate) ? startDate : startOfMonth(month);
      const monthEnd = isSameMonth(month, endDate) ? endDate : endOfMonth(month);
      const daysCount = eachDayOfInterval({ start: monthStart, end: monthEnd }).length;
      monthHeader.push({
        content: format(month, 'MMMM', { locale: ptBR }).toUpperCase(),
        colSpan: daysCount,
        styles: { halign: 'center', fillColor: [139, 90, 43], textColor: [255, 255, 255], fontStyle: 'bold' }
      });
    });

    // Cabeçalho de Dias (Segunda linha da tabela)
    const dayHeader = [
      'LOJA', 'TIPO', 'INÍCIO', 'INAUGURAÇÃO', 
      ...daysInInterval.map(d => format(d, 'd'))
    ];

    const body: any[] = [];
    let currentCategory = "";

    sortedStores.forEach((s) => {
      const category = s.is_reforma ? 'REFORMAS' : 'OBRAS NOVAS';
      
      if (category !== currentCategory) {
        body.push([
          { content: category, colSpan: 4 + daysInInterval.length, styles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [74, 55, 40] } }
        ]);
        currentCategory = category;
      }

      const storeStart = s.data_inicio ? new Date(s.data_inicio) : null;
      const storeEnd = s.inauguracao ? new Date(s.inauguracao) : null;

      const row = [
        { content: s.nome.toUpperCase(), styles: { halign: 'left' } },
        s.is_reforma ? 'REF' : 'OBRA',
        s.data_inicio ? format(new Date(s.data_inicio), 'dd/MM') : '--',
        s.inauguracao ? format(new Date(s.inauguracao), 'dd/MM') : '--',
        ...daysInInterval.map(day => {
          if (storeStart && storeEnd && isWithinInterval(day, { start: storeStart, end: storeEnd })) {
            return { content: '', styles: { fillColor: s.is_reforma ? [74, 55, 40] : [139, 90, 43] } };
          }
          return '';
        })
      ];
      body.push(row);
    });

    autoTable(doc, {
      startY: 25,
      head: [monthHeader, dayHeader],
      body: body,
      theme: 'grid',
      styles: { 
        fontSize: 5, 
        cellPadding: 0.3, 
        halign: 'center', 
        valign: 'middle',
        overflow: 'visible',
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [74, 55, 40], 
        textColor: [255, 255, 255], 
        fontSize: 5,
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 45 }, // Aumentado para o nome da loja
        1: { cellWidth: 10 },
        2: { cellWidth: 12 },
        3: { cellWidth: 12 }
      },
      margin: { left: 5, right: 5 },
      tableWidth: 'auto'
    });

    doc.save(`Cronograma_Constance_Full_2026.pdf`);
  };

  const renderTimeline = (store: CronogramaStore) => {
    if (!store.data_inicio || !store.inauguracao) return null;
    
    const start = parseISO(store.data_inicio);
    const end = parseISO(store.inauguracao);
    
    if (!isValid(start) || !isValid(end)) return null;

    return (
      <div className="flex w-full h-8 mt-1.5 bg-muted/20 rounded-lg relative overflow-hidden shadow-inner border border-black/5">
        {timelineDays.map((day, idx) => {
          const isActive = isWithinInterval(day, { start, end });
          const isStart = isSameDay(day, start);
          const isEnd = isSameDay(day, end);

          return (
            <div 
              key={idx} 
              className={`flex-1 border-r border-black/5 last:border-r-0 transition-all duration-300 ${
                isActive 
                  ? store.is_reforma 
                    ? 'bg-gradient-to-r from-[#4A3728] to-[#5D4636] shadow-sm' 
                    : 'bg-gradient-to-r from-[#8B5A2B] to-[#A67D54] shadow-sm'
                  : ''
              } ${isStart ? 'ring-2 ring-primary ring-inset z-10' : ''} ${isEnd ? 'ring-2 ring-destructive ring-inset z-10' : ''}`}
            />
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  // Only show stores that are actually "Proprias" (either by category or name)
  const proprias = stores.filter(s => s.is_propria && !s.is_reforma);
  const reformas = stores.filter(s => s.is_reforma);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-[#4A3728]/10 p-2 rounded-lg">
                <HardHat className="h-8 w-8 text-[#4A3728]" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#4A3728] uppercase">Modelo de Gestão de Lojas</h1>
                <p className="text-xs font-bold text-muted-foreground tracking-[0.2em] uppercase">Cronograma Executivo 2026</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="font-bold border-2" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Relatório PDF
            </Button>
            <Button variant="outline" className="font-bold border-2" onClick={() => setViewGantt(!viewGantt)}>
              <Eye className="h-4 w-4 mr-2" />
              {viewGantt ? "Ver Tabela" : "Ver Linha do Tempo"}
            </Button>
            <Button variant="default" className="font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar XLS Executivo
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Novas Lojas</CardTitle>
              <Building2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{proprias.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reformas</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reformas.length}</div>
            </CardContent>
          </Card>
        </div>

        {viewGantt && (
          <Card className="p-6 border-2 border-primary/10 shadow-xl bg-gradient-to-b from-background to-muted/20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4 bg-card p-2 rounded-xl border shadow-sm">
                <Button variant="ghost" size="icon" className="hover:bg-primary/10" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-5 w-5 text-primary" />
                </Button>
                <div className="text-xl font-black min-w-[180px] text-center capitalize tracking-tight text-[#4A3728]">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </div>
                <Button variant="ghost" size="icon" className="hover:bg-primary/10" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </Button>
              </div>
              <div className="flex gap-6 px-4 py-2 bg-card rounded-lg border shadow-sm text-[10px] font-bold uppercase tracking-wider">
                 <div className="flex items-center gap-2">
                   <div className="w-4 h-4 bg-[#8B5A2B] rounded-md shadow-sm shadow-[#8B5A2B]/20" />
                   <span className="text-[#8B5A2B]">Obra Nova</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-4 h-4 bg-[#4A3728] rounded-md shadow-sm shadow-[#4A3728]/20" />
                   <span className="text-[#4A3728]">Reforma</span>
                 </div>
              </div>
            </div>

            <div className="relative overflow-hidden border-2 rounded-2xl shadow-inner bg-card">
              <div className="overflow-x-auto">
                <div className="min-w-[1000px]">
                  <div className="flex border-b-2 bg-muted/50">
                    <div className="w-64 p-4 font-black text-xs border-r-2 sticky left-0 bg-muted/90 backdrop-blur-md z-20 flex items-center uppercase tracking-widest text-muted-foreground">Listagem de Lojas</div>
                    <div className="flex flex-1 flex-col">
                      <div className="w-full text-center py-2 font-black text-[11px] border-b-2 bg-[#4A3728] text-white uppercase tracking-[0.3em]">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                      </div>
                      <div className="flex w-full">
                        {timelineDays.map((day, i) => (
                          <div key={i} className={`flex-1 text-[10px] font-bold text-center py-2 border-r last:border-r-0 ${[0, 6].includes(day.getDay()) ? 'bg-black/5 text-primary/70' : 'text-muted-foreground'}`}>
                            {format(day, 'dd')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-[600px] overflow-y-auto">
                    {proprias.length > 0 && (
                      <div className="border-b-4 border-[#8B5A2B]/10">
                        <div className="p-2 px-4 text-[11px] font-black text-white bg-[#8B5A2B] uppercase tracking-[0.2em] shadow-inner">Cronograma de Obras Novas</div>
                        {proprias.map(s => (
                          <div key={s.id} className="flex border-t hover:bg-emerald-50/50 transition-all duration-200 group">
                            <div className="w-64 p-4 text-[11px] font-bold border-r-2 truncate sticky left-0 bg-background group-hover:bg-emerald-50/50 z-20 transition-colors uppercase tracking-tight" title={s.nome}>{s.nome}</div>
                            <div className="flex flex-1">
                              {renderTimeline(s)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {reformas.length > 0 && (
                      <div className="border-b-4 border-[#4A3728]/10">
                        <div className="p-2 px-4 text-[11px] font-black text-white bg-[#4A3728] uppercase tracking-[0.2em] shadow-inner">Cronograma de Reformas</div>
                        {reformas.map(s => (
                          <div key={s.id} className="flex border-t hover:bg-amber-50/50 transition-all duration-200 group">
                            <div className="w-64 p-4 text-[11px] font-bold border-r-2 truncate sticky left-0 bg-background group-hover:bg-amber-50/50 z-20 transition-colors uppercase tracking-tight" title={s.nome}>{s.nome}</div>
                            <div className="flex flex-1">
                              {renderTimeline(s)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Editar Datas de Planejamento
            </h2>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de Início</TableHead>
                  <TableHead>Inauguração</TableHead>
                  <TableHead>Prazo Estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">
                      {store.nome}
                      <p className="text-[10px] text-muted-foreground">{store.filial}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={store.is_reforma ? "outline" : "default"} className={store.is_reforma ? "border-[#4A3728] text-[#4A3728]" : "bg-[#8B5A2B] hover:bg-[#8B5A2B]/90"}>
                        {store.is_reforma ? "Reforma" : "Nova"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="w-36 h-8 text-xs"
                        value={store.data_inicio || ""}
                        onChange={(e) => updateStoreDate(store.id, 'data_inicio', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="w-36 h-8 text-xs"
                        value={store.inauguracao ? store.inauguracao : ""}
                        onChange={(e) => updateStoreDate(store.id, 'inauguracao', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      {(() => {
                        if (!store.data_inicio || !store.inauguracao) return "--";
                        const start = parseISO(store.data_inicio);
                        const end = parseISO(store.inauguracao);
                        if (!isValid(start) || !isValid(end)) return "--";
                        const diff = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        return `${diff} DIAS`;
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default CronogramaLojasProprias;
