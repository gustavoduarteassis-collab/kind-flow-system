import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useStores } from "@/hooks/useStores";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { checklistCategories, StatusType } from "@/data/checklistData";
import {
  visitaTecnicaCategories,
  visitaStatusLabels,
  VisitaStatusType,
  VisitaTecnicaData,
  createDefaultVisitaTecnica,
} from "@/data/visitaTecnicaData";
import {
  cronogramaCategorias,
  TOTAL_DAYS,
  CronogramaDayStatus,
} from "@/data/cronogramaData";
import { CustosData, createDefaultCustos } from "@/data/custosData";
import {
  getInaugChecklist,
  migrateInaugData,
  inaugStatusLabels,
  InaugChecklistDataV2,
  InaugStatusType,
} from "@/data/inauguracaoChecklistData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoConstance from "@/assets/logo-constance.svg";

type WorkerEntry = { type: string; count: number };
type DiaryEntryReport = {
  id: string; entry_date: string; description: string;
  weather: string; workers_count: number;
};
type DiaryPhotoReport = {
  id: string; diary_id: string; photo_url: string; caption: string;
};

const statusLabels: Record<StatusType, string> = {
  "NÃO INICIADO": "⬜ Não Iniciado",
  "EM COTAÇÃO": "🟡 Em Cotação",
  "EM TRANSPORTE": "🔵 Em Transporte",
  "REALIZADO": "✅ Realizado",
  "REALIZANDO": "🟢 Realizando",
  "ATRASADO": "🔴 Atrasado",
  "NÃO SE APLICA": "⚪ N/A",
  "CONSTRUTORA": "🟣 Construtora",
  "EM ELABORAÇÃO": "🟠 Em Elaboração",
  "EM ANÁLISE": "🔵 Em Análise",
  "EM CONTRATAÇÃO": "🟣 Em Contratação",
  "EM ANDAMENTO": "🟡 Em Andamento",
};

const statusPrintColors: Record<StatusType, string> = {
  "NÃO INICIADO": "bg-gray-100",
  "EM COTAÇÃO": "bg-[hsl(38,90%,85%)]",
  "EM TRANSPORTE": "bg-[hsl(210,80%,88%)]",
  "REALIZADO": "bg-[hsl(142,60%,88%)]",
  "REALIZANDO": "bg-[hsl(152,40%,85%)]",
  "ATRASADO": "bg-[hsl(0,72%,90%)]",
  "NÃO SE APLICA": "bg-gray-50",
  "CONSTRUTORA": "bg-[hsl(270,50%,90%)]",
  "EM ELABORAÇÃO": "bg-[hsl(38,70%,88%)]",
  "EM ANÁLISE": "bg-[hsl(200,60%,88%)]",
  "EM CONTRATAÇÃO": "bg-[hsl(280,50%,88%)]",
  "EM ANDAMENTO": "bg-[hsl(45,90%,85%)]",
};

const statusTextColors: Record<StatusType, string> = {
  "NÃO INICIADO": "text-gray-600",
  "EM COTAÇÃO": "text-[hsl(38,90%,30%)]",
  "EM TRANSPORTE": "text-[hsl(210,80%,35%)]",
  "REALIZADO": "text-[hsl(142,60%,25%)]",
  "REALIZANDO": "text-[hsl(152,50%,20%)]",
  "ATRASADO": "text-[hsl(0,72%,35%)]",
  "NÃO SE APLICA": "text-gray-400",
  "CONSTRUTORA": "text-[hsl(270,50%,35%)]",
  "EM ELABORAÇÃO": "text-[hsl(38,70%,30%)]",
  "EM ANÁLISE": "text-[hsl(200,60%,30%)]",
  "EM CONTRATAÇÃO": "text-[hsl(280,50%,30%)]",
  "EM ANDAMENTO": "text-[hsl(45,90%,25%)]",
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseWorkers = (weather: string): WorkerEntry[] => {
  try {
    const parsed = JSON.parse(weather);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
};

const cronCellSymbol: Record<CronogramaDayStatus, string> = {
  none: "",
  planned: "▓",
  done: "█",
  delayed: "▒",
};

const secaoLabels: Record<string, string> = {
  cronograma: "Cronograma de Obra",
  custos: "Custos da Obra",
  diario: "Diário de Obra",
  inauguracao: "Checklist de Inauguração",
  fornecedores: "Fornecedores",
  "visita-tecnica": "Visita Técnica de Obra",
};

const StoreReport = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const secao = searchParams.get("secao"); // null = full report
  const { getStore } = useStores();
  const { user } = useAuth();
  const store = getStore(id || "");

  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryReport[]>([]);
  const [diaryPhotos, setDiaryPhotos] = useState<Record<string, DiaryPhotoReport[]>>({});

  useEffect(() => {
    if (!user || !id) return;
    const fetchDiary = async () => {
      const { data: entries } = await supabase
        .from("construction_diary").select("*").eq("store_id", id)
        .order("entry_date", { ascending: true });
      if (entries) {
        setDiaryEntries(entries as DiaryEntryReport[]);
        const ids = entries.map((e: any) => e.id);
        if (ids.length > 0) {
          const { data: photosData } = await supabase.from("diary_photos").select("*").in("diary_id", ids);
          if (photosData) {
            const grouped: Record<string, DiaryPhotoReport[]> = {};
            (photosData as DiaryPhotoReport[]).forEach((p) => {
              if (!grouped[p.diary_id]) grouped[p.diary_id] = [];
              grouped[p.diary_id].push(p);
            });
            setDiaryPhotos(grouped);
          }
        }
      }
    };
    fetchDiary();
  }, [user, id]);

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h2>Loja não encontrada</h2>
        <Button onClick={() => navigate("/")}>Voltar</Button>
      </div>
    );
  }

  const allItemsArr = checklistCategories.flatMap((c) => c.items);
  const applicableItemsArr = allItemsArr.filter(i => store.checklist[i.id]?.status !== "NÃO SE APLICA");
  const totalItems = allItemsArr.length;
  const doneItems = Object.values(store.checklist).filter(
    (c) => c.status === "REALIZADO"
  ).length;
  const progress = applicableItemsArr.length > 0 ? Math.round((doneItems / applicableItemsArr.length) * 100) : 0;
  const atrasados = Object.values(store.checklist).filter(
    (c) => c.status === "ATRASADO"
  ).length;
  const emAndamento = Object.values(store.checklist).filter(
    (c) =>
      c.status !== "REALIZADO" &&
      c.status !== "NÃO SE APLICA" &&
      c.status !== "NÃO INICIADO" &&
      c.status !== "ATRASADO"
  ).length;
  const naoIniciados = Object.values(store.checklist).filter(
    (c) => c.status === "NÃO INICIADO"
  ).length;

  const today = new Date().toLocaleDateString("pt-BR");

  const cronograma = {
    cells: store.cronograma?.cells || {},
    startDate: store.cronograma?.startDate || "",
    itemDates: store.cronograma?.itemDates || {},
  };
  const cronStartDate = cronograma.startDate
    ? new Date(cronograma.startDate + "T00:00:00")
    : null;
  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1);
  const dayDates = cronStartDate
    ? days.map((d) => addDays(cronStartDate, d - 1))
    : null;

  return (
    <div className="bg-white text-black min-h-screen">
      {/* No-print toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/loja/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold flex-1">
          {secao ? `Relatório de ${secaoLabels[secao] || secao}` : "Relatório Completo"} - {store.nome}
        </h2>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </Button>
      </div>

      {/* Printable content */}
      <div className="max-w-[210mm] mx-auto px-6 py-8 print:px-0 print:py-4 print:max-w-full">
        {/* ===== HEADER ===== */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <div className="flex justify-center mb-3">
            <img
              src={logoConstance}
              alt="Constance"
              className="h-10 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold">
            {secao ? `RELATÓRIO — ${(secaoLabels[secao] || secao).toUpperCase()}` : "RELATÓRIO DIÁRIO DE OBRA"}
          </h1>
          <p className="text-lg font-semibold mt-1">{store.nome}</p>
          <div className="flex justify-center gap-6 text-sm mt-2">
            {store.filial && <span>Filial: {store.filial}</span>}
            {store.franqueado && <span>Franqueado: {store.franqueado}</span>}
            {store.inauguracao && (
              <span>
                Inauguração:{" "}
                {new Date(store.inauguracao + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          <p className="text-sm mt-1">Data do relatório: {today}</p>
        </div>

        {/* ===== RESUMO GERAL ===== */}
        {!secao && (
          <section className="mb-6">
            <h2 className="text-lg font-bold border-b border-black mb-3">
              1. RESUMO GERAL
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="border rounded p-3">
                <div className="text-2xl font-bold text-green-700">{progress}%</div>
                <div className="text-xs">Progresso Total</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-2xl font-bold text-green-600">{doneItems}</div>
                <div className="text-xs">Realizados</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-2xl font-bold text-red-600">{atrasados}</div>
                <div className="text-xs">Atrasados</div>
              </div>
              <div className="border rounded p-3">
                <div className="text-2xl font-bold text-blue-600">{emAndamento}</div>
                <div className="text-xs">Em Andamento</div>
              </div>
            </div>
          </section>
        )}

        {/* ===== ITENS ATRASADOS ===== */}
        {!secao && atrasados > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold border-b border-black mb-3 text-red-700">
              ⚠ ITENS ATRASADOS
            </h2>
            <table className="w-full text-xs border-collapse border border-black">
              <thead>
                <tr className="bg-red-100">
                  <th className="border border-black px-2 py-1 text-left">Atividade</th>
                  <th className="border border-black px-2 py-1 w-24">Prazo Final</th>
                  <th className="border border-black px-2 py-1 w-28">Responsável</th>
                  <th className="border border-black px-2 py-1">Obs</th>
                </tr>
              </thead>
              <tbody>
                {checklistCategories.flatMap((cat) =>
                  cat.items
                    .filter((item) => store.checklist[item.id]?.status === "ATRASADO")
                    .map((item) => {
                      const data = store.checklist[item.id];
                      return (
                        <tr key={item.id}>
                          <td className="border border-black px-2 py-1">{item.atividade}</td>
                          <td className="border border-black px-2 py-1 text-center">
                            {data.prazoFinal
                              ? new Date(data.prazoFinal + "T00:00:00").toLocaleDateString("pt-BR")
                              : "—"}
                          </td>
                          <td className="border border-black px-2 py-1">{item.responsavel}</td>
                          <td className="border border-black px-2 py-1">{data.observacoes}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* ===== CRONOGRAMA DE OBRA ===== */}
        {(!secao || secao === "cronograma") && (
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b border-black mb-3">
            2. CRONOGRAMA DE OBRA
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] border-collapse border border-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black px-1 py-1 text-left min-w-[30px]">Item</th>
                  <th className="border border-black px-1 py-1 text-left min-w-[150px]">Atividade</th>
                  <th className="border border-black px-1 py-1 w-16">Início</th>
                  <th className="border border-black px-1 py-1 w-16">Término</th>
                  {days.map((d) => (
                    <th key={d} className="border border-black px-0 py-1 w-4 text-center">
                      {dayDates ? format(dayDates[d - 1], "dd") : d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cronogramaCategorias.map((cat) => (
                  <>
                    <tr key={cat.id} className="bg-gray-100 font-bold">
                      <td className="border border-black px-1 py-0.5">{cat.numero}</td>
                      <td className="border border-black px-1 py-0.5" colSpan={3}>
                        {cat.nome}
                      </td>
                      {days.map((d) => (
                        <td key={d} className="border border-black" />
                      ))}
                    </tr>
                    {cat.items.map((item) => {
                      const itemDate = cronograma.itemDates?.[item.id] || { inicio: "", fim: "" };
                      return (
                        <tr key={item.id}>
                          <td className="border border-black px-1 py-0.5">{item.id}</td>
                          <td className="border border-black px-1 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                            {item.descricao}
                          </td>
                          <td className="border border-black px-1 py-0.5 text-center text-[8px]">
                            {itemDate.inicio
                              ? new Date(itemDate.inicio + "T00:00:00").toLocaleDateString("pt-BR")
                              : ""}
                          </td>
                          <td className="border border-black px-1 py-0.5 text-center text-[8px]">
                            {itemDate.fim
                              ? new Date(itemDate.fim + "T00:00:00").toLocaleDateString("pt-BR")
                              : ""}
                          </td>
                          {days.map((d) => {
                            const key = `${item.id}-${d}`;
                            const status = (cronograma.cells[key] || "none") as CronogramaDayStatus;
                            const bg =
                              status === "planned"
                                ? "bg-blue-400"
                                : status === "done"
                                ? "bg-green-500"
                                : status === "delayed"
                                ? "bg-red-500"
                                : "";
                            return (
                              <td key={d} className={`border border-black ${bg}`} />
                            );
                          })}
                        </tr>
                      );
                    })}
                    {cat.items.length === 0 && (
                      <tr key={`${cat.id}-e`}>
                        <td className="border border-black px-1 py-0.5">{cat.numero}</td>
                        <td className="border border-black px-1 py-0.5 italic" colSpan={3}>
                          {cat.nome}
                        </td>
                        {days.map((d) => {
                          const key = `${cat.id}-${d}`;
                          const status = (cronograma.cells[key] || "none") as CronogramaDayStatus;
                          const bg =
                            status === "planned"
                              ? "bg-blue-400"
                              : status === "done"
                              ? "bg-green-500"
                              : status === "delayed"
                              ? "bg-red-500"
                              : "";
                          return (
                            <td key={d} className={`border border-black ${bg}`} />
                          );
                        })}
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 text-[9px] mt-1">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-blue-400 border border-black" /> Planejado</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-green-500 border border-black" /> Realizado</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-red-500 border border-black" /> Atrasado</span>
          </div>
        </section>
        )}

        {/* ===== CHECKLIST COMPLETO ===== */}
        {(!secao || checklistCategories.some(c => c.id === secao)) && (
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b border-black mb-3">
            3. CHECKLIST COMPLETO
          </h2>
          {checklistCategories.map((cat) => {
            const catDone = cat.items.filter(
              (item) =>
                store.checklist[item.id]?.status === "REALIZADO" ||
                store.checklist[item.id]?.status === "NÃO SE APLICA"
            ).length;
            const catPct = Math.round((catDone / cat.items.length) * 100);

            return (
              <div key={cat.id} className="mb-4 break-inside-avoid print:break-inside-auto">
                <h3 className="text-sm font-bold bg-gray-100 px-2 py-1 border border-black">
                  {cat.nome} — {catPct}% concluído
                </h3>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-black px-1 py-0.5 w-8">#</th>
                      <th className="border border-black px-1 py-0.5 text-left">Atividade</th>
                      <th className="border border-black px-1 py-0.5 w-24">Status</th>
                      <th className="border border-black px-1 py-0.5 w-20">Prazo Ini.</th>
                      <th className="border border-black px-1 py-0.5 w-20">Prazo Fim</th>
                      <th className="border border-black px-1 py-0.5 w-24">Responsável</th>
                      <th className="border border-black px-1 py-0.5">Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.map((item) => {
                      const data = store.checklist[item.id] || {
                        status: "NÃO INICIADO" as StatusType,
                        prazoInicial: "",
                        prazoFinal: "",
                        observacoes: "",
                      };
                      return (
                        <tr
                          key={item.id}
                          className={statusPrintColors[data.status] || ""}
                        >
                          <td className="border border-black px-1 py-0.5 text-center">
                            {item.id}
                          </td>
                          <td className="border border-black px-1 py-0.5">
                            {data.atividade || item.atividade}
                          </td>
                          <td className={`border border-black px-1 py-0.5 text-center font-semibold ${statusTextColors[data.status] || ""}`}>
                            {statusLabels[data.status] || data.status}
                          </td>
                          <td className="border border-black px-1 py-0.5 text-center">
                            {data.prazoInicial
                              ? new Date(data.prazoInicial + "T00:00:00").toLocaleDateString("pt-BR")
                              : "—"}
                          </td>
                          <td className="border border-black px-1 py-0.5 text-center">
                            {data.prazoFinal
                              ? new Date(data.prazoFinal + "T00:00:00").toLocaleDateString("pt-BR")
                              : "—"}
                          </td>
                          <td className="border border-black px-1 py-0.5">
                            {item.responsavel}
                          </td>
                          <td className="border border-black px-1 py-0.5">
                            {data.observacoes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>
        )}

        {/* ===== CUSTOS ===== */}
        {(!secao || secao === "custos") && (() => {
          const custos: CustosData = (store as any).custos && (store as any).custos.categorias
            ? (store as any).custos
            : createDefaultCustos();
          const grandPrev = custos.categorias.reduce((s, cat) => s + cat.items.reduce((ss, it) => ss + (it.valorPrevisto || 0), 0), 0);
          const grandReal = custos.categorias.reduce((s, cat) => s + cat.items.reduce((ss, it) => ss + (it.valorRealizado || 0), 0), 0);
          return (
            <section className={`mb-6 ${secao ? "" : "break-before-page"}`}>
              <h2 className="text-lg font-bold border-b border-black mb-3">4. CUSTOS DA OBRA</h2>
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div className="border rounded p-3">
                  <div className="text-xs">Área</div>
                  <div className="text-lg font-bold">{custos.areaMt2 || 0} m²</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs">Total Previsto</div>
                  <div className="text-lg font-bold text-blue-700">{formatCurrency(grandPrev)}</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-xs">Total Realizado</div>
                  <div className="text-lg font-bold text-green-700">{formatCurrency(grandReal)}</div>
                </div>
              </div>
              <table className="w-full text-xs border-collapse border border-black mb-4">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black px-2 py-1 text-left">Categoria</th>
                    <th className="border border-black px-2 py-1 text-right w-28">Previsto</th>
                    <th className="border border-black px-2 py-1 text-right w-28">Realizado</th>
                    <th className="border border-black px-2 py-1 text-right w-28">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {custos.categorias.map((cat) => {
                    const prev = cat.items.reduce((s, it) => s + (it.valorPrevisto || 0), 0);
                    const real = cat.items.reduce((s, it) => s + (it.valorRealizado || 0), 0);
                    const diff = real - prev;
                    return (
                      <tr key={cat.id}>
                        <td className="border border-black px-2 py-1">{cat.nome}</td>
                        <td className="border border-black px-2 py-1 text-right">{formatCurrency(prev)}</td>
                        <td className="border border-black px-2 py-1 text-right font-semibold">{formatCurrency(real)}</td>
                        <td className={`border border-black px-2 py-1 text-right ${diff > 0 ? "text-red-600" : diff < 0 ? "text-green-600" : ""}`}>
                          {diff !== 0 ? (diff > 0 ? "+" : "") + formatCurrency(diff) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-black px-2 py-1">TOTAL</td>
                    <td className="border border-black px-2 py-1 text-right">{formatCurrency(grandPrev)}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatCurrency(grandReal)}</td>
                    <td className={`border border-black px-2 py-1 text-right ${grandReal - grandPrev > 0 ? "text-red-600" : "text-green-600"}`}>
                      {grandReal - grandPrev !== 0 ? (grandReal - grandPrev > 0 ? "+" : "") + formatCurrency(grandReal - grandPrev) : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
              {custos.categorias.map((cat) => {
                const hasValues = cat.items.some((it) => it.valorPrevisto > 0 || it.valorRealizado > 0);
                if (!hasValues) return null;
                return (
                  <div key={cat.id} className="mb-3 break-inside-avoid">
                    <h3 className="text-sm font-bold bg-gray-100 px-2 py-1 border border-black">{cat.nome}</h3>
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-black px-1 py-0.5 text-left">Item</th>
                          <th className="border border-black px-1 py-0.5">Observação</th>
                          <th className="border border-black px-1 py-0.5 w-24 text-right">Previsto</th>
                          <th className="border border-black px-1 py-0.5 w-24 text-right">Realizado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map((item) => (
                          <tr key={item.id}>
                            <td className="border border-black px-1 py-0.5">{item.nome}</td>
                            <td className="border border-black px-1 py-0.5">{item.fornecedor || "—"}</td>
                            <td className="border border-black px-1 py-0.5 text-right">{formatCurrency(item.valorPrevisto)}</td>
                            <td className="border border-black px-1 py-0.5 text-right font-semibold">{formatCurrency(item.valorRealizado)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </section>
          );
        })()}

        {/* ===== DIÁRIO DE OBRA ===== */}
        {(!secao || secao === "diario") && diaryEntries.length > 0 && (
          <section className={`mb-6 ${secao ? "" : "break-before-page"}`}>
            <h2 className="text-lg font-bold border-b border-black mb-3">5. DIÁRIO DE OBRA</h2>
            <p className="text-xs mb-3 text-gray-600">
              Total de registros: {diaryEntries.length} | Total de fotos: {Object.values(diaryPhotos).reduce((s, arr) => s + arr.length, 0)}
            </p>
            {diaryEntries.map((entry) => {
              const entryPhotos = diaryPhotos[entry.id] || [];
              const workers = parseWorkers(entry.weather);
              return (
                <div key={entry.id} className="mb-4 break-inside-avoid border border-black rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold capitalize">
                      {new Date(entry.entry_date + "T00:00:00").toLocaleDateString("pt-BR", {
                        weekday: "long", day: "2-digit", month: "long", year: "numeric",
                      })}
                    </h3>
                    <span className="text-xs text-gray-600">
                      {entry.workers_count > 0 ? `👷 ${entry.workers_count} funcionários` : ""}
                    </span>
                  </div>
                  {workers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {workers.map((w, i) => (
                        <span key={i} className="text-[10px] border border-black rounded px-1.5 py-0.5">
                          {w.type}: {w.count}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs whitespace-pre-wrap">{entry.description}</p>
                  {entryPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {entryPhotos.map((photo) => (
                        <img key={photo.id} src={photo.photo_url} alt={photo.caption || "Foto"} className="h-20 w-20 object-cover rounded border border-black print:h-16 print:w-16" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* ===== CHECKLIST DE INAUGURAÇÃO ===== */}
        {(!secao || secao === "inauguracao") && (() => {
          const tipoLoja = (store as any).tipoLoja as "rua" | "shopping" | "";
          if (!tipoLoja) return null;
          const inaugData: InaugChecklistDataV2 = migrateInaugData(
            (store as any).inauguracaoChecklist || {},
            tipoLoja
          );
          const inaugChecklist = getInaugChecklist(tipoLoja);
          return (
            <section className={`mb-6 ${secao ? "" : "break-before-page"}`}>
              <h2 className="text-lg font-bold border-b border-black mb-3">
                {secao ? "" : "6. "}CHECKLIST DE INAUGURAÇÃO — {tipoLoja === "rua" ? "Loja de Rua" : "Loja de Shopping"}
              </h2>
              {inaugData.rounds.length === 0 && (
                <p className="text-sm italic text-gray-500">Nenhuma conferência realizada até o momento.</p>
              )}
              {inaugData.rounds.map((round) => {
                const allItems = inaugChecklist.categories.flatMap(c => c.items);
                const applicableItems = allItems.filter(i => round.items[i.id]?.status !== "NAO_SE_APLICA");
                const getStatusScore = (status?: string): number => {
                  switch (status) {
                    case "TOTALMENTE_ATENDIDO": return 100;
                    case "EM_ANDAMENTO": return 50;
                    default: return 0;
                  }
                };
                const totalScore = allItems.reduce((acc, i) => acc + getStatusScore(round.items[i.id]?.status), 0);
                const maxScore = applicableItems.length * 100;
                const roundProg = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
                const impItems = allItems.filter(i => i.impeditivo);
                const impPendentes = impItems.filter(i => {
                  const s = round.items[i.id]?.status;
                  return s !== "TOTALMENTE_ATENDIDO" && s !== "NAO_SE_APLICA";
                }).length;
                const libStatus = roundProg >= 95 && impPendentes === 0
                  ? "LIBERADO" : (roundProg >= 85 && impPendentes === 0 ? "RESSALVAS" : "NAO_LIBERADO");
                return (
                  <div key={round.id} className="mb-6 break-inside-avoid">
                    <h3 className="text-sm font-bold bg-gray-100 px-2 py-1 border border-black">
                      {round.label} — {roundProg}% concluído
                      {round.date && ` | Data: ${new Date(round.date + "T00:00:00").toLocaleDateString("pt-BR")}`}
                      {round.deadline && ` | Prazo: ${new Date(round.deadline + "T00:00:00").toLocaleDateString("pt-BR")}`}
                    </h3>
                    {inaugChecklist.categories.map(cat => {
                      const catItems = cat.items;
                      if (catItems.length === 0) return null;
                      return (
                        <div key={cat.id} className="mb-2">
                          <h4 className="text-xs font-bold bg-gray-50 px-2 py-0.5 border-x border-black">
                            {cat.nome}
                          </h4>
                          <table className="w-full text-[10px] border-collapse">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-black px-1 py-0.5 text-left">Item</th>
                                <th className="border border-black px-1 py-0.5 w-28">Status</th>
                                <th className="border border-black px-1 py-0.5 w-20">Prazo</th>
                                <th className="border border-black px-1 py-0.5">Obs</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.items.map(item => {
                                const iData = round.items[item.id] || { status: "NAO_ATENDIDO" as InaugStatusType, observacoes: "", photos: [] };
                                return (
                                  <tr key={item.id} className={item.impeditivo ? "bg-red-50" : ""}>
                                    <td className="border border-black px-1 py-0.5">
                                      {item.nome}
                                      {item.impeditivo && " ⚠"}
                                    </td>
                                    <td className="border border-black px-1 py-0.5 text-center">
                                      {inaugStatusLabels[iData.status]}
                                    </td>
                                    <td className="border border-black px-1 py-0.5 text-center">
                                      {iData.prazo ? new Date(iData.prazo + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                                    </td>
                                    <td className="border border-black px-1 py-0.5">{iData.observacoes || ""}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                    {/* Liberation Status */}
                    <div className={`mt-3 p-2 border border-black text-center text-sm font-bold ${
                      libStatus === "LIBERADO" ? "bg-green-100" : libStatus === "RESSALVAS" ? "bg-yellow-100" : "bg-red-100"
                    }`}>
                      {libStatus === "LIBERADO" && "✅ LIBERADO PARA INAUGURAÇÃO"}
                      {libStatus === "RESSALVAS" && "⚠️ LIBERADO COM RESSALVAS"}
                      {libStatus === "NAO_LIBERADO" && "❌ NÃO LIBERADO PARA INAUGURAÇÃO"}
                      {` — ${roundProg}%`}
                    </div>
                    {/* Signatures */}
                    {round.signatures && (
                      <div className="grid grid-cols-3 gap-8 mt-6 pt-4">
                        <div className="text-center">
                          <div className="border-b border-black pt-8" />
                          <p className="text-[10px] mt-1">{round.signatures.franqueado || "Franqueado"}</p>
                        </div>
                        <div className="text-center">
                          <div className="border-b border-black pt-8" />
                          <p className="text-[10px] mt-1">{round.signatures.analistaObra || "Analista de Obra"}</p>
                        </div>
                        <div className="text-center">
                          <div className="border-b border-black pt-8" />
                          <p className="text-[10px] mt-1">{round.signatures.construtor || "Construtor"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })()}

        {/* ===== VISITA TÉCNICA ===== */}
        {(!secao || secao === "visita-tecnica") && (() => {
          const vtData: VisitaTecnicaData = { ...createDefaultVisitaTecnica(), ...((store as any).visitaTecnica || {}) };
          const allVtItems = visitaTecnicaCategories.flatMap((c) => c.items);
          const vtTotal = allVtItems.length;
          const vtDone = allVtItems.filter((i) => {
            const s = vtData.items[i.id]?.status;
            return s === "CONCLUIDO" || s === "NAO_SE_APLICA";
          }).length;
          const vtProgress = vtTotal > 0 ? Math.round((vtDone / vtTotal) * 100) : 0;
          const formatDate = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

          return (
            <section className={`mb-6 ${secao ? "" : "break-before-page"}`}>
              <h2 className="text-lg font-bold border-b border-black mb-3">
                CHECKLIST DE VISITA TÉCNICA — {vtProgress}%
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-4 border p-2">
                <div><strong>Data da Visita:</strong> {formatDate(vtData.dataVisita)}</div>
                <div><strong>Inauguração Prevista:</strong> {formatDate(store.inauguracao)}</div>
                <div><strong>Inauguração Após Visita:</strong> {formatDate(vtData.dataInaugAposVisita)}</div>
                <div><strong>Chegada Móveis:</strong> {formatDate(vtData.chegadaMoveis)}</div>
                <div><strong>Chegada Produtos:</strong> {formatDate(vtData.chegadaProdutos)}</div>
              </div>
              {visitaTecnicaCategories.map((cat) => (
                <div key={cat.id} className="mb-3 break-inside-avoid">
                  <h3 className="text-sm font-bold bg-gray-100 px-2 py-1 border border-black">{cat.nome}</h3>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-black px-1 py-0.5 text-left">Item</th>
                        <th className="border border-black px-1 py-0.5 text-left">Orientação</th>
                        <th className="border border-black px-1 py-0.5 w-24">Status</th>
                        <th className="border border-black px-1 py-0.5">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.items.map((item) => {
                        const d = vtData.items[item.id] || { status: "NAO_INICIADO" as VisitaStatusType, observacoes: "", photos: [] };
                        return (
                          <tr key={item.id} className={d.status === "CONCLUIDO" ? "bg-green-50" : d.status === "EM_ANDAMENTO" ? "bg-yellow-50" : ""}>
                            <td className="border border-black px-1 py-0.5">{item.nome}</td>
                            <td className="border border-black px-1 py-0.5 text-[9px]">{item.orientacao}</td>
                            <td className="border border-black px-1 py-0.5 text-center">{visitaStatusLabels[d.status]}</td>
                            <td className="border border-black px-1 py-0.5">{d.observacoes}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-8 mt-6 pt-4">
                <div className="text-center text-xs">
                  <div className="border-b border-black pb-1 mb-1">{vtData.signatures.construtora || " "}</div>
                  <span>Construtora</span>
                </div>
                <div className="text-center text-xs">
                  <div className="border-b border-black pb-1 mb-1">{vtData.signatures.analista || " "}</div>
                  <span>Analista</span>
                </div>
                <div className="text-center text-xs">
                  <div className="border-b border-black pb-1 mb-1">{vtData.signatures.franqueado || " "}</div>
                  <span>Franqueado</span>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Footer */}
        <div className="text-center text-xs border-t border-black pt-3 mt-8">
          <p>Relatório gerado em {today} — {secao ? secaoLabels[secao] || "Relatório" : "Checklist de Implantação"}</p>
        </div>
      </div>
    </div>
  );
};

export default StoreReport;
