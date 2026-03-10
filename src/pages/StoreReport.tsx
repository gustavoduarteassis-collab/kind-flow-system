import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useStores } from "@/hooks/useStores";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { checklistCategories, StatusType } from "@/data/checklistData";
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
  "ATRASADO": "🔴 Atrasado",
  "NÃO SE APLICA": "⚪ N/A",
  "CONSTRUTORA": "🟣 Construtora",
  "EM ELABORAÇÃO": "🟠 Em Elaboração",
  "EM ANÁLISE": "🔵 Em Análise",
  "EM CONTRATAÇÃO": "🟣 Em Contratação",
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

  const totalItems = checklistCategories.flatMap((c) => c.items).length;
  const doneItems = Object.values(store.checklist).filter(
    (c) => c.status === "REALIZADO" || c.status === "NÃO SE APLICA"
  ).length;
  const progress = Math.round((doneItems / totalItems) * 100);
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

  const cronograma = store.cronograma || { cells: {}, startDate: "", itemDates: {} };
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

        {/* ===== ITENS ATRASADOS ===== */}
        {atrasados > 0 && (
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

        {/* ===== CHECKLIST COMPLETO ===== */}
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
              <div key={cat.id} className="mb-4 break-inside-avoid">
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
                          className={
                            data.status === "ATRASADO"
                              ? "bg-red-50"
                              : data.status === "REALIZADO"
                              ? "bg-green-50"
                              : ""
                          }
                        >
                          <td className="border border-black px-1 py-0.5 text-center">
                            {item.id}
                          </td>
                          <td className="border border-black px-1 py-0.5">
                            {item.atividade}
                          </td>
                          <td className="border border-black px-1 py-0.5 text-center">
                            {data.status}
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

        {/* ===== CUSTOS ===== */}
        {(() => {
          const custos: CustosData = (store as any).custos && (store as any).custos.categorias
            ? (store as any).custos
            : createDefaultCustos();
          const grandPrev = custos.categorias.reduce((s, cat) => s + cat.items.reduce((ss, it) => ss + (it.valorPrevisto || 0), 0), 0);
          const grandReal = custos.categorias.reduce((s, cat) => s + cat.items.reduce((ss, it) => ss + (it.valorRealizado || 0), 0), 0);
          return (
            <section className="mb-6 break-before-page">
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
        {diaryEntries.length > 0 && (
          <section className="mb-6 break-before-page">
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

        {/* Footer */}
        <div className="text-center text-xs border-t border-black pt-3 mt-8">
          <p>Relatório gerado em {today} — Checklist de Implantação</p>
        </div>
      </div>
    </div>
  );
};

export default StoreReport;
